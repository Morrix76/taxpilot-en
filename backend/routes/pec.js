import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import pecReaderService from '../services/pecReaderService.js';

const router = express.Router();

// POST /api/pec/configura - Configura connessione PEC
router.post('/configura', async (req, res) => {
  try {
    const {
      email_pec,
      password,
      server_imap = 'imaps://imap.pec.it:993',
      auto_download = true,
      cartelle_monitorate = ['INBOX'],
      filtri_allegati = ['.xml', '.pdf'],
      elimina_dopo_download = false
    } = req.body;

    if (!email_pec || !password) {
      return res.status(400).json({
        error: 'Email PEC e password sono obbligatori'
      });
    }

    // Test connessione
    const testConnessione = await pecReaderService.testConnessione({
      email_pec,
      password,
      server_imap
    });

    if (!testConnessione.successo) {
      return res.status(400).json({
        error: 'Connessione PEC fallita',
        dettagli: testConnessione.errore
      });
    }

    // Salva configurazione
    const config = await pecReaderService.salvaConfigurazione({
      user_id: 1, // userId fittizio per test
      email_pec,
      password, // In produzione: criptare!
      server_imap,
      auto_download,
      cartelle_monitorate,
      filtri_allegati,
      elimina_dopo_download
    });

    res.json({
      success: true,
      configurazione_salvata: true,
      test_connessione: testConnessione,
      config_id: config.id,
      message: 'PEC configurata correttamente'
    });

  } catch (error) {
    console.error('Errore configurazione PEC:', error);
    res.status(500).json({ 
      error: error.message,
      configurazione_salvata: false 
    });
  }
});

// POST /api/pec/estrai-documenti - Estrazione manuale
router.post('/estrai-documenti', async (req, res) => {
  try {
    const {
      config_id,
      limite_email = 50,
      giorni_indietro = 30,
      solo_non_letti = true,
      cartella = 'INBOX'
    } = req.body;

    const risultato = await pecReaderService.estraiDocumentiPEC({
      config_id: config_id || 1, // Default per test
      limite_email,
      giorni_indietro,
      solo_non_letti,
      cartella
    });

    res.json({
      success: true,
      estrazione_completata: true,
      email_elaborate: risultato.email_elaborate,
      allegati_trovati: risultato.allegati_trovati,
      documenti_salvati: risultato.documenti_salvati,
      errori: risultato.errori,
      log_operazioni: risultato.log,
      tempo_elaborazione_ms: risultato.tempo_elaborazione
    });

  } catch (error) {
    console.error('Errore estrazione documenti PEC:', error);
    res.status(500).json({ 
      error: error.message,
      estrazione_completata: false 
    });
  }
});

// GET /api/pec/stato - Stato configurazioni PEC
router.get('/stato', async (req, res) => {
  try {
    const stato = await pecReaderService.getStatoConfigurazione(1); // userId fittizio

    res.json({
      success: true,
      ...stato
    });

  } catch (error) {
    console.error('Errore stato PEC:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pec/test-connessione - Test rapido connessione
router.post('/test-connessione', async (req, res) => {
  try {
    const { email_pec, password, server_imap } = req.body;

    const test = await pecReaderService.testConnessione({
      email_pec,
      password,
      server_imap
    });

    res.json({
      success: true,
      connessione_ok: test.successo,
      dettagli: test.dettagli,
      errore: test.errore || null,
      info_server: test.info_server
    });

  } catch (error) {
    console.error('Errore test connessione:', error);
    res.status(500).json({ 
      error: error.message,
      connessione_ok: false 
    });
  }
});

// POST /api/pec/avvia-monitoraggio - Avvia monitoraggio automatico
router.post('/avvia-monitoraggio', async (req, res) => {
  try {
    const {
      config_id,
      intervallo_minuti = 15,
      attivo = true
    } = req.body;

    const monitoraggio = await pecReaderService.avviaMonitoraggio({
      config_id: config_id || 1,
      intervallo_minuti,
      attivo
    });

    res.json({
      success: true,
      monitoraggio_attivo: monitoraggio.attivo,
      prossimo_controllo: monitoraggio.prossimo_controllo,
      intervallo_minuti: monitoraggio.intervallo,
      message: 'Monitoraggio automatico PEC avviato'
    });

  } catch (error) {
    console.error('Errore avvio monitoraggio:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pec/ferma-monitoraggio - Ferma monitoraggio automatico
router.post('/ferma-monitoraggio', async (req, res) => {
  try {
    const { config_id } = req.body;

    await pecReaderService.fermaMonitoraggio(config_id || 1);

    res.json({
      success: true,
      monitoraggio_attivo: false,
      message: 'Monitoraggio automatico PEC fermato'
    });

  } catch (error) {
    console.error('Errore stop monitoraggio:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pec/log/:config_id - Log operazioni PEC
router.get('/log/:config_id?', async (req, res) => {
  try {
    const { config_id = 1 } = req.params;
    const { limite = 100 } = req.query;

    const log = await pecReaderService.getLogOperazioni(config_id, limite);

    res.json({
      success: true,
      log_operazioni: log,
      totale_record: log.length
    });

  } catch (error) {
    console.error('Errore recupero log:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/pec/configurazione/:config_id - Elimina configurazione
router.delete('/configurazione/:config_id?', async (req, res) => {
  try {
    const { config_id = 1 } = req.params;

    await pecReaderService.eliminaConfigurazione(config_id);

    res.json({
      success: true,
      configurazione_eliminata: true,
      message: 'Configurazione PEC eliminata'
    });

  } catch (error) {
    console.error('Errore eliminazione configurazione:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;