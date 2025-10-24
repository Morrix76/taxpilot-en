// backend/routes/iva.js - ROUTES LIQUIDAZIONI IVA

import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js'; // <-- CORRETTO
import IvaService from '../services/ivaService.js';

const router = express.Router();

/**
 * 📊 POST /api/iva/liquidazione
 * Calcola liquidazione IVA per periodo
 */
router.post('/liquidazione', authMiddleware, async (req, res) => {
  try {
    const { periodo, regime } = req.body;
    const userId = req.user.id;

    if (!periodo) {
      return res.status(400).json({
        error: 'Periodo obbligatorio'
      });
    }

    const liquidazione = await IvaService.calcolaLiquidazione(
      userId,
      periodo,
      regime
    );

    res.json(liquidazione);

  } catch (error) {
    console.error('Errore calcolo liquidazione:', error);
    res.status(500).json({
      error: 'Errore durante il calcolo della liquidazione'
    });
  }
});

/**
 * 📄 POST /api/iva/export/:tipo
 * Export liquidazione o registri in CSV
 */
router.post('/export/:tipo', authMiddleware, async (req, res) => {
  try {
    const { tipo } = req.params;
    const { liquidazione } = req.body;

    if (!liquidazione) {
      return res.status(400).json({
        error: 'Dati liquidazione mancanti'
      });
    }

    let csv;
    let filename;

    switch (tipo) {
      case 'liquidazione':
        csv = await IvaService.exportLiquidazioneCSV(liquidazione);
        filename = `liquidazione_iva_${liquidazione.periodo}.csv`;
        break;

      case 'registro-vendite':
        csv = await IvaService.exportRegistroVenditeCSV(
          liquidazione.registri.vendite,
          liquidazione.periodo
        );
        filename = `registro_vendite_${liquidazione.periodo}.csv`;
        break;

      case 'registro-acquisti':
        csv = await IvaService.exportRegistroAcquistiCSV(
          liquidazione.registri.acquisti,
          liquidazione.periodo
        );
        filename = `registro_acquisti_${liquidazione.periodo}.csv`;
        break;

      default:
        return res.status(400).json({
          error: 'Tipo export non valido'
        });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\ufeff' + csv); // BOM per Excel

  } catch (error) {
    console.error('Errore export IVA:', error);
    res.status(500).json({
      error: 'Errore durante l\'export'
    });
  }
});

export default router;