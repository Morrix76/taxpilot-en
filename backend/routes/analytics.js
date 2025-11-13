// routes/analytics.js
import express from 'express';

const router = express.Router();

/**
 * @route   GET /api/analytics/overview
 * @desc    Ottieni panoramica analytics
 * @query   periodo (mese, trimestre, anno)
 */
router.get('/overview', async (req, res) => {
  try {
    const { periodo = 'mese' } = req.query;
    
    // Dati mock per ora
    const overview = {
      periodo,
      documenti_totali: 156,
      documenti_mese: 45,
      documenti_settimana: 12,
      crescita_percentuale: 23.5,
      clienti_attivi: 28,
      clienti_nuovi: 5,
      accuratezza_media: 94.7,
      tempo_medio_elaborazione: 2.3,
      statistiche_status: {
        completati: 142,
        errori: 8,
        in_elaborazione: 6
      },
      distribuzione_tipologie: {
        fatture: 98,
        buste_paga: 42,
        altri: 16
      }
    };
    
    res.json(overview);
  } catch (error) {
    console.error('Errore analytics overview:', error);
    res.status(500).json({ error: 'Errore recupero analytics overview' });
  }
});

/**
 * @route   GET /api/analytics/clienti-top
 * @desc    Ottieni top clienti per documenti
 * @query   limite (default: 5)
 */
router.get('/clienti-top', async (req, res) => {
  try {
    const { limite = 5 } = req.query;
    
    // Dati mock
    const clientiTop = [
      { id: 1, nome: 'Acme Corporation', documenti: 45, fatturato: 125000 },
      { id: 2, nome: 'Tech Solutions SRL', documenti: 38, fatturato: 98000 },
      { id: 3, nome: 'Consulting Group', documenti: 32, fatturato: 87500 },
      { id: 4, nome: 'Digital Services', documenti: 28, fatturato: 72000 },
      { id: 5, nome: 'Innovation Ltd', documenti: 24, fatturato: 65000 }
    ];
    
    res.json(clientiTop.slice(0, parseInt(limite)));
  } catch (error) {
    console.error('Errore clienti top:', error);
    res.status(500).json({ error: 'Errore recupero clienti top' });
  }
});

/**
 * @route   GET /api/analytics/attivita
 * @desc    Ottieni log attività recenti
 * @query   limite (default: 10)
 */
router.get('/attivita', async (req, res) => {
  try {
    const { limite = 10 } = req.query;
    
    // Dati mock
    const attivita = [
      { id: 1, tipo: 'upload', descrizione: 'Fattura_2024_001.xml caricata', timestamp: new Date(Date.now() - 3600000).toISOString(), utente: 'Admin' },
      { id: 2, tipo: 'analisi', descrizione: 'Documento analizzato con successo', timestamp: new Date(Date.now() - 7200000).toISOString(), utente: 'System' },
      { id: 3, tipo: 'export', descrizione: 'Report mensile esportato', timestamp: new Date(Date.now() - 10800000).toISOString(), utente: 'Admin' },
      { id: 4, tipo: 'upload', descrizione: 'BustaPaga_Gen_2024.pdf caricata', timestamp: new Date(Date.now() - 14400000).toISOString(), utente: 'Admin' },
      { id: 5, tipo: 'correzione', descrizione: 'Errori fiscali corretti automaticamente', timestamp: new Date(Date.now() - 18000000).toISOString(), utente: 'AI' },
      { id: 6, tipo: 'analisi', descrizione: 'Validazione IVA completata', timestamp: new Date(Date.now() - 21600000).toISOString(), utente: 'System' },
      { id: 7, tipo: 'upload', descrizione: 'Fattura_2024_002.xml caricata', timestamp: new Date(Date.now() - 25200000).toISOString(), utente: 'Admin' },
      { id: 8, tipo: 'export', descrizione: 'Dati contabili esportati', timestamp: new Date(Date.now() - 28800000).toISOString(), utente: 'Admin' },
      { id: 9, tipo: 'analisi', descrizione: 'Controllo IRPEF completato', timestamp: new Date(Date.now() - 32400000).toISOString(), utente: 'System' },
      { id: 10, tipo: 'upload', descrizione: 'Ricevuta_Pagamento.pdf caricata', timestamp: new Date(Date.now() - 36000000).toISOString(), utente: 'Admin' }
    ];
    
    res.json(attivita.slice(0, parseInt(limite)));
  } catch (error) {
    console.error('Errore attività:', error);
    res.status(500).json({ error: 'Errore recupero attività' });
  }
});

/**
 * @route   GET /api/analytics/trend
 * @desc    Ottieni dati trend temporale
 * @query   periodo (mese, trimestre, anno), tipo (documenti, errori, clienti)
 */
router.get('/trend', async (req, res) => {
  try {
    const { periodo = 'mese', tipo = 'documenti' } = req.query;
    
    // Dati mock per grafico trend
    const trend = {
      periodo,
      tipo,
      labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
      datasets: [
        {
          label: 'Documenti elaborati',
          data: [12, 19, 15, 25, 22, 30, 28, 35, 32, 40, 38, 45],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)'
        },
        {
          label: 'Con errori',
          data: [2, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8],
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)'
        }
      ]
    };
    
    res.json(trend);
  } catch (error) {
    console.error('Errore trend:', error);
    res.status(500).json({ error: 'Errore recupero trend' });
  }
});

/**
 * @route   GET /api/analytics/report
 * @desc    Genera report analytics completo
 * @query   periodo (mese, trimestre, anno)
 */
router.get('/report', async (req, res) => {
  try {
    const { periodo = 'mese' } = req.query;
    
    // Report completo mock
    const report = {
      periodo,
      generato_il: new Date().toISOString(),
      riepilogo: {
        documenti_totali: 156,
        accuratezza_media: 94.7,
        tempo_medio: 2.3,
        errori_totali: 8
      },
      per_tipologia: {
        fatture: { totale: 98, conformi: 92, errori: 6 },
        buste_paga: { totale: 42, conformi: 40, errori: 2 },
        altri: { totale: 16, conformi: 16, errori: 0 }
      },
      per_cliente: [
        { nome: 'Acme Corporation', documenti: 45, conformita: 95.6 },
        { nome: 'Tech Solutions SRL', documenti: 38, conformita: 94.7 },
        { nome: 'Consulting Group', documenti: 32, conformita: 96.9 }
      ],
      trend_mensile: {
        crescita: 23.5,
        media_giornaliera: 1.5,
        picco_giorno: 'Lunedì'
      }
    };
    
    res.json(report);
  } catch (error) {
    console.error('Errore report:', error);
    res.status(500).json({ error: 'Errore generazione report' });
  }
});

export default router;
