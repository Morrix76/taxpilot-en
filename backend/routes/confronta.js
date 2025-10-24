import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import documentCrossService from '../services/documentCrossService.js';

const router = express.Router();

// POST /api/confronta/documenti - Incrocio documenti
router.post('/documenti', async (req, res) => {
  try {
    const {
      documenti_ids, // Array di ID documenti da confrontare
      tipo_incrocio = 'automatico', // automatico, manuale, per_importo
      tolleranza_importo = 0.01, // Tolleranza per differenze importi
      tolleranza_giorni = 30, // Tolleranza per differenze date
      includi_simili = true // Include documenti simili anche se non perfetti
    } = req.body;

    if (!documenti_ids || !Array.isArray(documenti_ids) || documenti_ids.length < 2) {
      return res.status(400).json({
        error: 'Specificare almeno 2 documenti da confrontare'
      });
    }

    const risultato = await documentCrossService.confrontaDocumenti({
      documenti_ids,
      tipo_incrocio,
      tolleranza_importo,
      tolleranza_giorni,
      includi_simili
    });

    res.json({
      success: true,
      incrocio_completato: true,
      ...risultato
    });

  } catch (error) {
    console.error('Errore incrocio documenti:', error);
    res.status(500).json({ 
      error: error.message,
      incrocio_completato: false 
    });
  }
});

// POST /api/confronta/trova-corrispondenze - Trova automaticamente corrispondenze
router.post('/trova-corrispondenze', async (req, res) => {
  try {
    const {
      documento_principale_id, // Documento di riferimento (es. fattura)
      cerca_tipi = ['ricevuta', 'bonifico'], // Tipi di documento da cercare
      periodo_giorni = 90, // Periodo di ricerca in giorni
      soglia_similitudine = 0.7 // Soglia minima per considerare una corrispondenza
    } = req.body;

    if (!documento_principale_id) {
      return res.status(400).json({
        error: 'Specificare documento_principale_id'
      });
    }

    const corrispondenze = await documentCrossService.trovaCorrispondenzeAutomatiche({
      documento_principale_id,
      cerca_tipi,
      periodo_giorni,
      soglia_similitudine
    });

    res.json({
      success: true,
      documento_principale: corrispondenze.documento_principale,
      corrispondenze_trovate: corrispondenze.matches,
      documenti_mancanti: corrispondenze.missing,
      raccomandazioni: corrispondenze.raccomandazioni
    });

  } catch (error) {
    console.error('Errore ricerca corrispondenze:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/confronta/analisi-globale - Analisi completa di tutti i documenti
router.get('/analisi-globale', async (req, res) => {
  try {
    const {
      periodo_inizio,
      periodo_fine,
      gruppo_per = 'mese' // mese, settimana, giorno
    } = req.query;

    const analisi = await documentCrossService.analisiGlobaleDocumenti({
      periodo_inizio,
      periodo_fine,
      gruppo_per
    });

    res.json({
      success: true,
      ...analisi
    });

  } catch (error) {
    console.error('Errore analisi globale:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/confronta/verifica-ciclo - Verifica ciclo completo (fattura->ricevuta->bonifico)
router.post('/verifica-ciclo', async (req, res) => {
  try {
    const {
      fattura_id,
      tolleranza_importo = 0.01,
      tolleranza_giorni = 60
    } = req.body;

    if (!fattura_id) {
      return res.status(400).json({
        error: 'Specificare fattura_id'
      });
    }

    const ciclo = await documentCrossService.verificaCicloCompleto({
      fattura_id,
      tolleranza_importo,
      tolleranza_giorni
    });

    res.json({
      success: true,
      ciclo_completo: ciclo.completo,
      fattura: ciclo.fattura,
      ricevuta: ciclo.ricevuta,
      bonifico: ciclo.bonifico,
      anomalie: ciclo.anomalie,
      raccomandazioni: ciclo.raccomandazioni,
      stato_ciclo: ciclo.stato
    });

  } catch (error) {
    console.error('Errore verifica ciclo:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/confronta/documenti-orfani - Trova documenti senza corrispondenze
router.get('/documenti-orfani', async (req, res) => {
  try {
    const {
      tipo_documento,
      periodo_giorni = 30,
      soglia_importo = 100 // Importo minimo per considerare il documento
    } = req.query;

    const orfani = await documentCrossService.trovaDocumentiOrfani({
      tipo_documento,
      periodo_giorni: parseInt(periodo_giorni),
      soglia_importo: parseFloat(soglia_importo)
    });

    res.json({
      success: true,
      documenti_orfani: orfani.documenti,
      statistiche: orfani.statistiche,
      suggerimenti: orfani.suggerimenti
    });

  } catch (error) {
    console.error('Errore ricerca documenti orfani:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/confronta/statistiche - Statistiche incroci
router.get('/statistiche', async (req, res) => {
  try {
    const statistiche = await documentCrossService.getStatisticheIncroci();

    res.json({
      success: true,
      ...statistiche
    });

  } catch (error) {
    console.error('Errore statistiche incroci:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;