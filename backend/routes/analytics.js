import express from 'express';
import { db } from '../db.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// GET /api/analytics/overview
router.get('/overview', async (req, res) => {
  try {
    const { periodo = 'mese' } = req.query;
    
    let dateFilter = '';
    const now = new Date();
    
    switch(periodo) {
      case 'settimana':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = `AND created_at >= '${weekAgo.toISOString()}'`;
        break;
      case 'mese':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        dateFilter = `AND created_at >= '${monthAgo.toISOString()}'`;
        break;
      case 'trimestre':
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        dateFilter = `AND created_at >= '${quarterAgo.toISOString()}'`;
        break;
      case 'anno':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        dateFilter = `AND created_at >= '${yearAgo.toISOString()}'`;
        break;
    }

    const docsResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM documents WHERE 1=1 ${dateFilter}`,
      args: []
    });
    const documentsProcessed = docsResult.rows[0]?.count || 0;

    const accuracyResult = await db.execute({
      sql: `SELECT AVG(confidence) as avg_accuracy FROM documents WHERE confidence IS NOT NULL ${dateFilter}`,
      args: []
    });
    const accuracy = accuracyResult.rows[0]?.avg_accuracy || 95.0;

    const monthlyRevenue = documentsProcessed * 0.5;
    const timeSaved = documentsProcessed * 5;

    res.json({
      success: true,
      stats: {
        documentsProcessed,
        accuracy: parseFloat(accuracy.toFixed(1)),
        monthlyRevenue: parseFloat(monthlyRevenue.toFixed(1)),
        timeSaved
      },
      periodo
    });

  } catch (error) {
    console.error('Error analytics overview:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving stats',
      details: error.message
    });
  }
});

// GET /api/analytics/clienti-top
router.get('/clienti-top', async (req, res) => {
  try {
    const { limite = 10 } = req.query;

    const result = await db.execute({
      sql: `SELECT 
              u.id,
              u.name as cliente,
              COUNT(d.id) as documenti,
              AVG(d.confidence) as accuracy_media,
              MAX(d.created_at) as ultimo_documento
            FROM users u
            LEFT JOIN documents d ON u.id = d.user_id
            GROUP BY u.id, u.name
            HAVING documenti > 0
            ORDER BY documenti DESC
            LIMIT ?`,
      args: [parseInt(limite)]
    });

    const topClienti = result.rows.map(cliente => ({
      id: cliente.id,
      cliente: cliente.cliente,
      documenti: cliente.documenti,
      accuracy: cliente.accuracy_media ? parseFloat(cliente.accuracy_media.toFixed(1)) : 0,
      ultimoDocumento: cliente.ultimo_documento
    }));

    res.json({
      success: true,
      clienti: topClienti,
      count: topClienti.length
    });

  } catch (error) {
    console.error('Error top clients:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving top clients',
      details: error.message
    });
  }
});

// GET /api/analytics/attivita
router.get('/attivita', async (req, res) => {
  try {
    const { limite = 20 } = req.query;

    const result = await db.execute({
      sql: `SELECT 
              d.id,
              d.filename,
              d.status,
              d.confidence,
              d.created_at,
              u.name as cliente
            FROM documents d
            LEFT JOIN users u ON d.user_id = u.id
            ORDER BY d.created_at DESC
            LIMIT ?`,
      args: [parseInt(limite)]
    });

    const attivita = result.rows.map(item => ({
      id: item.id,
      documento: item.filename,
      cliente: item.cliente || 'N/A',
      status: item.status,
      confidence: item.confidence,
      timestamp: item.created_at,
      tipo: 'documento_processato'
    }));

    res.json({
      success: true,
      attivita,
      count: attivita.length
    });

  } catch (error) {
    console.error('Error activity timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving activity',
      details: error.message
    });
  }
});

// GET /api/analytics/trend
router.get('/trend', async (req, res) => {
  try {
    const { periodo = 'mese', tipo = 'documenti' } = req.query;
    
    let groupBy;
    switch(periodo) {
      case 'settimana':
      case 'mese':
        groupBy = `strftime('%Y-%m-%d', created_at)`;
        break;
      case 'trimestre':
        groupBy = `strftime('%Y-%W', created_at)`;
        break;
      case 'anno':
        groupBy = `strftime('%Y-%m', created_at)`;
        break;
      default:
        groupBy = `strftime('%Y-%m-%d', created_at)`;
    }

    let query;
    if (tipo === 'accuracy') {
      query = `
        SELECT 
          ${groupBy} as periodo,
          AVG(confidence) as valore,
          COUNT(*) as count
        FROM documents 
        WHERE confidence IS NOT NULL
        AND created_at >= date('now', '-30 days')
        GROUP BY ${groupBy}
        ORDER BY periodo ASC
      `;
    } else {
      query = `
        SELECT 
          ${groupBy} as periodo,
          COUNT(*) as valore
        FROM documents 
        WHERE created_at >= date('now', '-30 days')
        GROUP BY ${groupBy}
        ORDER BY periodo ASC
      `;
    }

    const result = await db.execute({ sql: query, args: [] });

    const trend = result.rows.map(item => ({
      data: item.periodo,
      valore: tipo === 'accuracy' ? parseFloat(item.valore.toFixed(1)) : item.valore,
      count: item.count || item.valore
    }));

    res.json({
      success: true,
      trend,
      periodo,
      tipo,
      count: trend.length
    });

  } catch (error) {
    console.error('Error trend:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving trend',
      details: error.message
    });
  }
});

// GET /api/analytics/report
router.get('/report', async (req, res) => {
  try {
    const { periodo = 'mese' } = req.query;

    const overviewResult = await db.execute({
      sql: `SELECT 
              COUNT(*) as totale_documenti,
              AVG(confidence) as accuracy_media,
              COUNT(DISTINCT user_id) as clienti_attivi
            FROM documents 
            WHERE created_at >= date('now', '-30 days')`,
      args: []
    });

    const overview = overviewResult.rows[0];

    const tipiResult = await db.execute({
      sql: `SELECT 
              tipo_documento,
              COUNT(*) as count
            FROM documents 
            WHERE created_at >= date('now', '-30 days')
            GROUP BY tipo_documento
            ORDER BY count DESC`,
      args: []
    });

    const oreResult = await db.execute({
      sql: `SELECT 
              strftime('%H', created_at) as ora,
              COUNT(*) as documenti,
              AVG(confidence) as accuracy
            FROM documents 
            WHERE created_at >= date('now', '-7 days')
            GROUP BY strftime('%H', created_at)
            ORDER BY ora`,
      args: []
    });

    res.json({
      success: true,
      report: {
        overview: {
          totaleDocumenti: overview.totale_documenti || 0,
          accuracyMedia: overview.accuracy_media ? parseFloat(overview.accuracy_media.toFixed(1)) : 0,
          clientiAttivi: overview.clienti_attivi || 0
        },
        distribuzionePerTipo: tipiResult.rows,
        performancePerOra: oreResult.rows.map(item => ({
          ora: item.ora + ':00',
          documenti: item.documenti,
          accuracy: item.accuracy ? parseFloat(item.accuracy.toFixed(1)) : 0
        }))
      },
      periodo,
      generato: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error report:', error);
    res.status(500).json({
      success: false,
      error: 'Error generating report',
      details: error.message
    });
  }
});

export default router;
