import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import reportBuilderService from '../services/reportBuilderService.js';

const router = express.Router();

// GET /api/report/mensile/:mese - Report mensile PDF
router.get('/mensile/:mese', async (req, res) => {
  try {
    const { mese } = req.params; // Formato: YYYY-MM
    const {
      formato = 'pdf', // pdf, html, json
      includi_dettagli = true,
      includi_grafici = true,
      template = 'standard' // standard, compatto, esteso
    } = req.query;

    if (!mese.match(/^\d{4}-\d{2}$/)) {
      return res.status(400).json({
        error: 'Formato mese non valido. Usare YYYY-MM (es: 2025-01)'
      });
    }

    const report = await reportBuilderService.generaReportMensile({
      mese,
      user_id: 1, // userId fittizio per test
      formato,
      includi_dettagli: Boolean(includi_dettagli),
      includi_grafici: Boolean(includi_grafici),
      template
    });

    // Se è PDF, restituisce il file
    if (formato === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Report_${mese}.pdf"`);
      res.setHeader('Content-Length', report.buffer.length);
      res.send(report.buffer);
    } else {
      // Altrimenti JSON o HTML
      res.json({
        success: true,
        report_generato: true,
        periodo: mese,
        formato,
        ...report
      });
    }

  } catch (error) {
    console.error('Errore generazione report mensile:', error);
    res.status(500).json({ 
      error: error.message,
      report_generato: false 
    });
  }
});

// GET /api/report/trimestrale/:trimestre - Report trimestrale IVA
router.get('/trimestrale/:trimestre', async (req, res) => {
  try {
    const { trimestre } = req.params; // Formato: YYYY-Q1, YYYY-Q2, ecc.
    const { formato = 'pdf' } = req.query;

    const report = await reportBuilderService.generaReportTrimestrale({
      trimestre,
      user_id: 1,
      formato
    });

    if (formato === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Report_IVA_${trimestre}.pdf"`);
      res.send(report.buffer);
    } else {
      res.json({
        success: true,
        ...report
      });
    }

  } catch (error) {
    console.error('Errore report trimestrale:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/report/annuale/:anno - Report annuale completo
router.get('/annuale/:anno', async (req, res) => {
  try {
    const { anno } = req.params;
    const { formato = 'pdf', includi_appendici = true } = req.query;

    const report = await reportBuilderService.generaReportAnnuale({
      anno: parseInt(anno),
      user_id: 1,
      formato,
      includi_appendici: Boolean(includi_appendici)
    });

    if (formato === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Report_Annuale_${anno}.pdf"`);
      res.send(report.buffer);
    } else {
      res.json({
        success: true,
        ...report
      });
    }

  } catch (error) {
    console.error('Errore report annuale:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/report/personalizzato - Report personalizzato
router.post('/personalizzato', async (req, res) => {
  try {
    const {
      data_inizio,
      data_fine,
      tipi_documento = ['fattura', 'ricevuta', 'busta_paga'],
      sezioni = ['riepilogo', 'dettagli', 'iva', 'anomalie'],
      formato = 'pdf',
      titolo = 'Report Personalizzato'
    } = req.body;

    if (!data_inizio || !data_fine) {
      return res.status(400).json({
        error: 'Specificare data_inizio e data_fine'
      });
    }

    const report = await reportBuilderService.generaReportPersonalizzato({
      data_inizio,
      data_fine,
      tipi_documento,
      sezioni,
      formato,
      titolo,
      user_id: 1
    });

    if (formato === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${titolo.replace(/\s/g, '_')}.pdf"`);
      res.send(report.buffer);
    } else {
      res.json({
        success: true,
        ...report
      });
    }

  } catch (error) {
    console.error('Errore report personalizzato:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/report/disponibili - Lista report disponibili
router.get('/disponibili', async (req, res) => {
  try {
    const disponibili = await reportBuilderService.getReportDisponibili(1);

    res.json({
      success: true,
      periodi_disponibili: disponibili.periodi,
      tipi_report: disponibili.tipi,
      templates: disponibili.templates,
      formati_supportati: ['pdf', 'html', 'json']
    });

  } catch (error) {
    console.error('Errore lista report:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/report/preview/:tipo/:periodo - Anteprima report
router.get('/preview/:tipo/:periodo', async (req, res) => {
  try {
    const { tipo, periodo } = req.params;

    const preview = await reportBuilderService.generaAnteprimaReport({
      tipo,
      periodo,
      user_id: 1
    });

    res.json({
      success: true,
      preview_generata: true,
      ...preview
    });

  } catch (error) {
    console.error('Errore anteprima report:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/report/modelli - Lista modelli disponibili
router.get('/modelli', (req, res) => {
  res.json({
    success: true,
    modelli: [
      {
        id: 'standard',
        nome: 'Report Standard',
        descrizione: 'Report completo con tutte le sezioni',
        sezioni: ['riepilogo', 'documenti', 'iva', 'contabilita', 'anomalie']
      },
      {
        id: 'compatto',
        nome: 'Report Compatto',
        descrizione: 'Versione condensata con solo i dati essenziali',
        sezioni: ['riepilogo', 'iva']
      },
      {
        id: 'esteso',
        nome: 'Report Esteso',
        descrizione: 'Versione dettagliata con grafici e analisi',
        sezioni: ['riepilogo', 'documenti', 'iva', 'contabilita', 'anomalie', 'grafici', 'appendici']
      },
      {
        id: 'commercialista',
        nome: 'Report per Commercialista',
        descrizione: 'Report tecnico con focus contabile',
        sezioni: ['contabilita', 'iva', 'documenti', 'anomalie']
      }
    ]
  });
});

export default router;