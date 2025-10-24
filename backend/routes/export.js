// backend/routes/export.js - ROUTES EXPORT MULTI-FORMATO

import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js'; // <-- CORRETTO
import ExportService from '../services/exportService.js';

const router = express.Router();

/**
 * EXPORT /api/export/documenti
 * Export documenti in formato specifico
 */
router.post('/documenti', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const options = req.body;

    const risultato = await ExportService.exportDocumenti(userId, options);

    // Imposta headers appropriati
    res.setHeader('Content-Type', risultato.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${risultato.filename}"`);

    // Aggiungi BOM per Excel se CSV
    if (risultato.mimeType === 'text/csv' && risultato.encoding === 'UTF-8') {
      res.send('\ufeff' + risultato.contenuto);
    } else {
      res.send(risultato.contenuto);
    }

  } catch (error) {
    console.error('Errore export documenti:', error);
    res.status(500).json({
      error: 'Errore durante l\'export dei documenti'
    });
  }
});

/**
 * GET /api/export/gestionali
 * Lista gestionali supportati
 */
router.get('/gestionali', authMiddleware, (req, res) => {
  const gestionali = Object.entries(ExportService.GESTIONALE_CONFIGS).map(([key, config]) => ({
    codice: key,
    nome: config.nome,
    formatiSupportati: ['CSV', 'XML', 'JSON'],
    separatore: config.separatore === '\t' ? 'TAB' : config.separatore,
    encoding: config.encoding
  }));

  res.json({ gestionali });
});

/**
 * GET /api/export/template/:gestionale
 * Genera template import per gestionale
 */
router.get('/template/:gestionale', authMiddleware, async (req, res) => {
  try {
    const { gestionale } = req.params;
    const { formato = 'CSV' } = req.query;

    const template = await ExportService.generaTemplateImport(gestionale, formato);

    res.setHeader('Content-Type', template.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);

    // Includi istruzioni come header custom
    res.setHeader('X-Import-Instructions', JSON.stringify(template.istruzioni));

    res.send(template.contenuto);

  } catch (error) {
    console.error('Errore generazione template:', error);
    res.status(500).json({
      error: 'Errore durante la generazione del template'
    });
  }
});

/**
 * GET /api/export/istruzioni/:gestionale
 * Ottieni istruzioni import per gestionale
 */
router.get('/istruzioni/:gestionale', authMiddleware, async (req, res) => {
  try {
    const { gestionale } = req.params;

    const istruzioni = ExportService.generaIstruzioniImport(gestionale);
    res.json(istruzioni);

  } catch (error) {
    console.error('Errore recupero istruzioni:', error);
    res.status(500).json({
      error: 'Errore durante il recupero delle istruzioni'
    });
  }
});

/**
 * POST /api/export/preview
 * Preview export senza download
 */
router.post('/preview', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const options = { ...req.body, preview: true };

    // Limita a 10 record per preview
    const risultato = await ExportService.exportDocumenti(userId, options);

    res.json({
      preview: risultato.contenuto.split('\n').slice(0, 11).join('\n'),
      metadati: risultato.metadati,
      formato: options.formato,
      gestionale: options.gestionale
    });

  } catch (error) {
    console.error('Errore preview export:', error);
    res.status(500).json({
      error: 'Errore durante la preview'
    });
  }
});

export default router;