// routes/settings.js
import express from 'express';

const router = express.Router();

/**
 * @route   GET /api/settings/profile
 * @desc    Ottieni profilo utente
 */
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Dati mock profilo
    const profile = {
      id: userId,
      nome: 'Mario',
      cognome: 'Rossi',
      email: 'mario.rossi@example.com',
      telefono: '+39 333 1234567',
      azienda: 'Studio Commercialista Rossi',
      partita_iva: 'IT12345678901',
      indirizzo: 'Via Roma 123, 00100 Roma',
      avatar_url: null,
      ruolo: 'admin',
      created_at: '2024-01-15T10:30:00Z',
      last_login: new Date().toISOString()
    };
    
    res.json(profile);
  } catch (error) {
    console.error('Errore recupero profilo:', error);
    res.status(500).json({ error: 'Errore recupero profilo utente' });
  }
});

/**
 * @route   PUT /api/settings/profile
 * @desc    Aggiorna profilo utente
 */
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user?.id;
    const updates = req.body;
    
    console.log(`Aggiornamento profilo utente ${userId}:`, updates);
    
    // Mock: restituisci i dati aggiornati
    const updatedProfile = {
      id: userId,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    res.json({ 
      success: true, 
      message: 'Profilo aggiornato con successo',
      profile: updatedProfile 
    });
  } catch (error) {
    console.error('Errore aggiornamento profilo:', error);
    res.status(500).json({ error: 'Errore aggiornamento profilo' });
  }
});

/**
 * @route   GET /api/settings/preferences
 * @desc    Ottieni preferenze utente
 */
router.get('/preferences', async (req, res) => {
  try {
    // Preferenze mock
    const preferences = {
      lingua: 'it',
      tema: 'light',
      notifiche_email: true,
      notifiche_desktop: false,
      formato_data: 'DD/MM/YYYY',
      formato_valuta: 'EUR',
      timezone: 'Europe/Rome',
      documenti_per_pagina: 10,
      vista_default: 'grid',
      auto_salvataggio: true
    };
    
    res.json(preferences);
  } catch (error) {
    console.error('Errore recupero preferenze:', error);
    res.status(500).json({ error: 'Errore recupero preferenze' });
  }
});

/**
 * @route   PUT /api/settings/preferences
 * @desc    Aggiorna preferenze utente
 */
router.put('/preferences', async (req, res) => {
  try {
    const updates = req.body;
    
    console.log('Aggiornamento preferenze:', updates);
    
    // Mock: restituisci le preferenze aggiornate
    res.json({ 
      success: true, 
      message: 'Preferenze aggiornate con successo',
      preferences: updates 
    });
  } catch (error) {
    console.error('Errore aggiornamento preferenze:', error);
    res.status(500).json({ error: 'Errore aggiornamento preferenze' });
  }
});

/**
 * @route   GET /api/settings/ai
 * @desc    Ottieni impostazioni AI
 */
router.get('/ai', async (req, res) => {
  try {
    // Impostazioni AI mock
    const aiSettings = {
      modello_default: 'groq-llama-3.1-8b',
      temperatura: 0.7,
      max_tokens: 2000,
      analisi_automatica: true,
      correzione_automatica: false,
      confidence_threshold: 0.8,
      retry_on_error: true,
      max_retries: 3,
      timeout: 30,
      log_analisi: true,
      cache_risultati: true,
      provider: 'groq',
      api_key_configurata: true
    };
    
    res.json(aiSettings);
  } catch (error) {
    console.error('Errore recupero impostazioni AI:', error);
    res.status(500).json({ error: 'Errore recupero impostazioni AI' });
  }
});

/**
 * @route   PUT /api/settings/ai
 * @desc    Aggiorna impostazioni AI
 */
router.put('/ai', async (req, res) => {
  try {
    const updates = req.body;
    
    console.log('Aggiornamento impostazioni AI:', updates);
    
    // Validazione base
    if (updates.temperatura !== undefined && (updates.temperatura < 0 || updates.temperatura > 1)) {
      return res.status(400).json({ error: 'Temperatura deve essere tra 0 e 1' });
    }
    
    if (updates.confidence_threshold !== undefined && (updates.confidence_threshold < 0 || updates.confidence_threshold > 1)) {
      return res.status(400).json({ error: 'Confidence threshold deve essere tra 0 e 1' });
    }
    
    // Mock: restituisci le impostazioni aggiornate
    res.json({ 
      success: true, 
      message: 'Impostazioni AI aggiornate con successo',
      settings: updates 
    });
  } catch (error) {
    console.error('Errore aggiornamento impostazioni AI:', error);
    res.status(500).json({ error: 'Errore aggiornamento impostazioni AI' });
  }
});

/**
 * @route   GET /api/settings/notifications
 * @desc    Ottieni impostazioni notifiche
 */
router.get('/notifications', async (req, res) => {
  try {
    // Impostazioni notifiche mock
    const notificationSettings = {
      email: {
        enabled: true,
        frequenza: 'daily',
        tipi: {
          documenti_completati: true,
          errori_rilevati: true,
          report_settimanali: true,
          aggiornamenti_sistema: false
        }
      },
      push: {
        enabled: false,
        browser: false,
        mobile: false
      },
      in_app: {
        enabled: true,
        sound: true,
        badge: true
      },
      digest: {
        enabled: true,
        orario: '09:00',
        giorni: ['lunedi', 'mercoledi', 'venerdi']
      }
    };
    
    res.json(notificationSettings);
  } catch (error) {
    console.error('Errore recupero impostazioni notifiche:', error);
    res.status(500).json({ error: 'Errore recupero impostazioni notifiche' });
  }
});

/**
 * @route   PUT /api/settings/notifications
 * @desc    Aggiorna impostazioni notifiche
 */
router.put('/notifications', async (req, res) => {
  try {
    const updates = req.body;
    
    console.log('Aggiornamento impostazioni notifiche:', updates);
    
    // Mock: restituisci le impostazioni aggiornate
    res.json({ 
      success: true, 
      message: 'Impostazioni notifiche aggiornate con successo',
      settings: updates 
    });
  } catch (error) {
    console.error('Errore aggiornamento impostazioni notifiche:', error);
    res.status(500).json({ error: 'Errore aggiornamento impostazioni notifiche' });
  }
});

export default router;
