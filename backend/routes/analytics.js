// backend/routes/analytics.js
import express from 'express';
import { db } from '../database/db.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware autenticazione
router.use(authMiddleware);

// GET /api/analytics/overview - Statistiche generali
router.get('/overview', (req, res) => {
  try {
    const { periodo = 'mese' } = req.query;
    
    // Calcola date in base al periodo
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

    // Conta documenti processati
    const docsStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM documents 
      WHERE 1=1 ${dateFilter}
    `);
    const documentsProcessed = docsStmt.get()?.count || 0;

    // Calcola accuracy media
    const accuracyStmt = db.prepare(`
      SELECT AVG(confidence) as avg_accuracy 
      FROM documents 
      WHERE confidence IS NOT NULL ${dateFilter}
    `);
    const accuracy = accuracyStmt.get()?.avg_accuracy || 95.0;

    // Calcola ricavi (esempio basato su numero documenti)
    const monthlyRevenue = documentsProcessed * 0.5; // €0.50 per documento

    // Calcola tempo risparmiato (esempio: 5 min per documento)
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
    console.error('Errore analytics overview:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero statistiche',
      details: error.message
    });
  }
});

// GET /api/analytics/clienti-top - Top clienti per volume
router.get('/clienti-top', (req, res) => {
  try {
    const { limite = 10 } = req.query;

    const stmt = db.prepare(`
      SELECT 
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
      LIMIT ?
    `);

    const topClienti = stmt.all(limite);

    const clientiFormatted = topClienti.map(cliente => ({
      id: cliente.id,
      cliente: cliente.cliente,
      documenti: cliente.documenti,
      accuracy: cliente.accuracy_media ? parseFloat(cliente.accuracy_media.toFixed(1)) : 0,
      ultimoDocumento: cliente.ultimo_documento
    }));

    res.json({
      success: true,
      clienti: clientiFormatted,
      count: clientiFormatted.length
    });

  } catch (error) {
    console.error('Errore top clienti:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero top clienti',
      details: error.message
    });
  }
});

// GET /api/analytics/attivita - Timeline attività recenti
router.get('/attivita', (req, res) => {
  try {
    const { limite = 20 } = req.query;

    const stmt = db.prepare(`
      SELECT 
        d.id,
        d.filename,
        d.status,
        d.confidence,
        d.created_at,
        u.name as cliente
      FROM documents d
      LEFT JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
      LIMIT ?
    `);

    const attivita = stmt.all(limite);

    const attivitaFormatted = attivita.map(item => ({
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
      attivita: attivitaFormatted,
      count: attivitaFormatted.length
    });

  } catch (error) {
    console.error('Errore timeline attività:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero attività',
      details: error.message
    });
  }
});

// GET /api/analytics/trend - Dati per grafici trend
router.get('/trend', (req, res) => {
  try {
    const { periodo = 'mese', tipo = 'documenti' } = req.query;
    
    let groupBy, dateFormat;
    switch(periodo) {
      case 'settimana':
        groupBy = `strftime('%Y-%m-%d', created_at)`;
        dateFormat = '%Y-%m-%d';
        break;
      case 'mese':
        groupBy = `strftime('%Y-%m-%d', created_at)`;
        dateFormat = '%Y-%m-%d';
        break;
      case 'trimestre':
        groupBy = `strftime('%Y-%W', created_at)`;
        dateFormat = '%Y-W%W';
        break;
      case 'anno':
        groupBy = `strftime('%Y-%m', created_at)`;
        dateFormat = '%Y-%m';
        break;
      default:
        groupBy = `strftime('%Y-%m-%d', created_at)`;
        dateFormat = '%Y-%m-%d';
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

    const stmt = db.prepare(query);
    const dati = stmt.all();

    const trendFormatted = dati.map(item => ({
      data: item.periodo,
      valore: tipo === 'accuracy' ? parseFloat(item.valore.toFixed(1)) : item.valore,
      count: item.count || item.valore
    }));

    res.json({
      success: true,
      trend: trendFormatted,
      periodo,
      tipo,
      count: trendFormatted.length
    });

  } catch (error) {
    console.error('Errore trend analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero trend',
      details: error.message
    });
  }
});

// GET /api/analytics/report - Report completo
router.get('/report', (req, res) => {
  try {
    const { periodo = 'mese' } = req.query;

    // Ottieni tutte le statistiche
    const overviewStmt = db.prepare(`
      SELECT 
        COUNT(*) as totale_documenti,
        AVG(confidence) as accuracy_media,
        COUNT(DISTINCT user_id) as clienti_attivi
      FROM documents 
      WHERE created_at >= date('now', '-30 days')
    `);

    const overview = overviewStmt.get();

    // Distribuzione per tipo documento
    const tipiStmt = db.prepare(`
      SELECT 
        tipo_documento,
        COUNT(*) as count
      FROM documents 
      WHERE created_at >= date('now', '-30 days')
      GROUP BY tipo_documento
      ORDER BY count DESC
    `);

    const tipi = tipiStmt.all();

    // Performance per ora del giorno
    const oreStmt = db.prepare(`
      SELECT 
        strftime('%H', created_at) as ora,
        COUNT(*) as documenti,
        AVG(confidence) as accuracy
      FROM documents 
      WHERE created_at >= date('now', '-7 days')
      GROUP BY strftime('%H', created_at)
      ORDER BY ora
    `);

    const performanceOre = oreStmt.all();

    res.json({
      success: true,
      report: {
        overview: {
          totaleDocumenti: overview.totale_documenti || 0,
          accuracyMedia: overview.accuracy_media ? parseFloat(overview.accuracy_media.toFixed(1)) : 0,
          clientiAttivi: overview.clienti_attivi || 0
        },
        distribuzionePerTipo: tipi,
        performancePerOra: performanceOre.map(item => ({
          ora: item.ora + ':00',
          documenti: item.documenti,
          accuracy: item.accuracy ? parseFloat(item.accuracy.toFixed(1)) : 0
        }))
      },
      periodo,
      generato: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore report analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Errore generazione report',
      details: error.message
    });
  }
});

export default router;