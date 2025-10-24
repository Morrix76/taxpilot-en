import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import calendarService from '../services/calendarService.js';

const router = express.Router();

// GET /api/scadenze - Lista tutte le scadenze
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      from_date,
      to_date,
      tipo,
      stato = 'tutte' // tutte, scadute, prossime, completate
    } = req.query;

    const scadenze = await calendarService.getScadenzeUtente(req.user.id, {
      from_date,
      to_date,
      tipo,
      stato
    });

    const statistiche = await calendarService.getStatisticheScadenze(req.user.id);

    res.json({
      success: true,
      scadenze,
      statistiche,
      filtri_applicati: { from_date, to_date, tipo, stato }
    });

  } catch (error) {
    console.error('Errore recupero scadenze:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/scadenze/rigenera - Rigenera scadenze da documenti
router.post('/rigenera', authMiddleware, async (req, res) => {
  try {
    const { 
      documento_id, // Se specificato, rigenera solo per questo documento
      periodo_anno, // Anno di riferimento (default: corrente)
      forza_ricalcolo = false // Sovrascrive scadenze esistenti
    } = req.body;

    const risultato = await calendarService.rigeneraScadenzeFromDocumenti(
  1, // userId fittizio
  
    
      {
        documento_id,
        periodo_anno: periodo_anno || new Date().getFullYear(),
        forza_ricalcolo
      }
    );

    res.json({
      success: true,
      scadenze_generate: risultato.generate,
      scadenze_aggiornate: risultato.aggiornate,
      documenti_analizzati: risultato.documenti_analizzati,
      message: `Elaborate ${risultato.generate} nuove scadenze`
    });

  } catch (error) {
    console.error('Errore rigenerazione scadenze:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/scadenze/:id/stato - Aggiorna stato scadenza
router.put('/:id/stato', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { stato, note } = req.body; // completata, posticipata, ignorata

    const scadenza = await calendarService.aggiornaStatoScadenza(
      id,
      req.user.id,
      stato,
      note
    );

    res.json({
      success: true,
      scadenza,
      message: `Scadenza ${stato}`
    });

  } catch (error) {
    console.error('Errore aggiornamento scadenza:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/scadenze/dashboard - Dashboard con alert e riepiloghi
router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await calendarService.getDashboardScadenze(1); // userId fittizio

    res.json({
      success: true,
      ...dashboard
    });

  } catch (error) {
    console.error('Errore dashboard scadenze:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/scadenze/tipi - Lista tipi scadenze supportate
    router.get('/tipi', (req, res) => {
  res.json({
    tipi_scadenze: [
      { codice: 'F24', descrizione: 'Versamento F24', frequenza: 'mensile' },
      { codice: 'IVA_MENSILE', descrizione: 'Liquidazione IVA mensile', frequenza: 'mensile' },
      { codice: 'IVA_TRIMESTRALE', descrizione: 'Liquidazione IVA trimestrale', frequenza: 'trimestrale' },
      { codice: 'IRPEF', descrizione: 'Versamento IRPEF', frequenza: 'mensile' },
      { codice: 'INPS', descrizione: 'Contributi INPS', frequenza: 'mensile' },
      { codice: 'INAIL', descrizione: 'Contributi INAIL', frequenza: 'mensile' },
      { codice: 'CU', descrizione: 'Certificazione Unica', frequenza: 'annuale' },
      { codice: '730', descrizione: 'Dichiarazione 730', frequenza: 'annuale' },
      { codice: 'UNICO', descrizione: 'Dichiarazione Unico', frequenza: 'annuale' },
      { codice: 'IRAP', descrizione: 'Imposta IRAP', frequenza: 'trimestrale' },
      { codice: 'ESTEROMETRO', descrizione: 'Esterometro', frequenza: 'mensile' },
      { codice: 'SPESOMETRO', descrizione: 'Spesometro', frequenza: 'semestrale' }
    ]
  });
});

// POST /api/scadenze/manuale - Crea scadenza manuale
router.post('/manuale', authMiddleware, async (req, res) => {
  try {
    const {
      descrizione,
      data_scadenza,
      tipo,
      importo_stimato,
      note,
      ricorrente = false,
      frequenza_mesi = 1
    } = req.body;

    const scadenza = await calendarService.creaScadenzaManuale({
      user_id: req.user.id,
      descrizione,
      data_scadenza,
      tipo,
      importo_stimato,
      note,
      ricorrente,
      frequenza_mesi
    });

    res.json({
      success: true,
      scadenza,
      message: 'Scadenza manuale creata'
    });

  } catch (error) {
    console.error('Errore creazione scadenza manuale:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;