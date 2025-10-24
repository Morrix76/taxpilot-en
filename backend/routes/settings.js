// backend/routes/settings.js
import express from 'express';
import { db } from '../database/db.js';
import authMiddleware from '../middleware/authMiddleware.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// Middleware autenticazione
router.use(authMiddleware);

// Database setup per settings
function initSettingsTables() {
  // Aggiungi colonne settings alla tabella users se non esistono
  const addSettingsColumns = `
    ALTER TABLE users ADD COLUMN settings_preferences TEXT DEFAULT '{}';
    ALTER TABLE users ADD COLUMN settings_ai TEXT DEFAULT '{}';
    ALTER TABLE users ADD COLUMN settings_notifications TEXT DEFAULT '{}';
    ALTER TABLE users ADD COLUMN settings_security TEXT DEFAULT '{}';
    ALTER TABLE users ADD COLUMN nome_studio TEXT;
    ALTER TABLE users ADD COLUMN telefono TEXT;
    ALTER TABLE users ADD COLUMN partita_iva TEXT;
    ALTER TABLE users ADD COLUMN codice_fiscale TEXT;
    ALTER TABLE users ADD COLUMN indirizzo TEXT;
    ALTER TABLE users ADD COLUMN sito_web TEXT;
  `;

  try {
    // Controlla se le colonne esistono già
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const existingColumns = tableInfo.map(col => col.name);
    
    const newColumns = [
      { name: 'settings_preferences', type: 'TEXT DEFAULT "{}"' },
      { name: 'settings_ai', type: 'TEXT DEFAULT "{}"' },
      { name: 'settings_notifications', type: 'TEXT DEFAULT "{}"' },
      { name: 'settings_security', type: 'TEXT DEFAULT "{}"' },
      { name: 'nome_studio', type: 'TEXT' },
      { name: 'telefono', type: 'TEXT' },
      { name: 'partita_iva', type: 'TEXT' },
      { name: 'codice_fiscale', type: 'TEXT' },
      { name: 'indirizzo', type: 'TEXT' },
      { name: 'sito_web', type: 'TEXT' }
    ];
    
    for (const column of newColumns) {
      if (!existingColumns.includes(column.name)) {
        try {
          const alterSQL = `ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`;
          db.exec(alterSQL);
          console.log(`✅ Colonna settings aggiunta: ${column.name}`);
        } catch (error) {
          // Ignora errori se colonna esiste già
        }
      }
    }
    
  } catch (error) {
    console.error('Errore setup settings:', error);
  }
}

// Inizializza colonne
initSettingsTables();

// GET /api/settings/profile - Dati profilo utente
router.get('/profile', (req, res) => {
  try {
    const userId = req.user.id;
    
    const stmt = db.prepare(`
      SELECT 
        id, email, name,
        nome_studio, telefono, partita_iva, 
        codice_fiscale, indirizzo, sito_web,
        created_at
      FROM users 
      WHERE id = ?
    `);
    
    const user = stmt.get(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utente non trovato'
      });
    }

    const profileData = {
      id: user.id,
      email: user.email,
      name: user.name || '',
      nomeStudio: user.nome_studio || '',
      telefono: user.telefono || '',
      partitaIva: user.partita_iva || '',
      codiceFiscale: user.codice_fiscale || '',
      indirizzo: user.indirizzo || '',
      sitoWeb: user.sito_web || '',
      registrato: user.created_at
    };

    res.json({
      success: true,
      profile: profileData
    });

  } catch (error) {
    console.error('Errore recupero profilo:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero profilo'
    });
  }
});

// PUT /api/settings/profile - Aggiorna profilo
router.put('/profile', (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      nomeStudio,
      telefono,
      partitaIva,
      codiceFiscale,
      indirizzo,
      sitoWeb
    } = req.body;

    const stmt = db.prepare(`
      UPDATE users SET 
        name = ?,
        nome_studio = ?,
        telefono = ?,
        partita_iva = ?,
        codice_fiscale = ?,
        indirizzo = ?,
        sito_web = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      name || null,
      nomeStudio || null,
      telefono || null,
      partitaIva || null,
      codiceFiscale || null,
      indirizzo || null,
      sitoWeb || null,
      userId
    );

    res.json({
      success: true,
      message: 'Profilo aggiornato con successo'
    });

  } catch (error) {
    console.error('Errore aggiornamento profilo:', error);
    res.status(500).json({
      success: false,
      error: 'Errore aggiornamento profilo'
    });
  }
});

// GET /api/settings/preferences - Preferenze utente
router.get('/preferences', (req, res) => {
  try {
    const userId = req.user.id;
    
    const stmt = db.prepare(`
      SELECT settings_preferences FROM users WHERE id = ?
    `);
    
    const result = stmt.get(userId);
    
    let preferences = {
      lingua: 'IT Italiano',
      fusoOrario: 'Europe/Rome (GMT+1)',
      formatoData: 'DD/MM/YYYY',
      valuta: 'EUR Euro',
      tema: 'Chiaro'
    };

    if (result?.settings_preferences) {
      try {
        const saved = JSON.parse(result.settings_preferences);
        preferences = { ...preferences, ...saved };
      } catch (e) {
        console.error('Errore parsing preferences:', e);
      }
    }

    res.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Errore recupero preferenze:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero preferenze'
    });
  }
});

// PUT /api/settings/preferences - Aggiorna preferenze
router.put('/preferences', (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    const stmt = db.prepare(`
      UPDATE users SET 
        settings_preferences = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(JSON.stringify(preferences), userId);

    res.json({
      success: true,
      message: 'Preferenze aggiornate con successo'
    });

  } catch (error) {
    console.error('Errore aggiornamento preferenze:', error);
    res.status(500).json({
      success: false,
      error: 'Errore aggiornamento preferenze'
    });
  }
});

// GET /api/settings/ai - Impostazioni AI
router.get('/ai', (req, res) => {
  try {
    const userId = req.user.id;
    
    const stmt = db.prepare(`
      SELECT settings_ai FROM users WHERE id = ?
    `);
    
    const result = stmt.get(userId);
    
    let aiSettings = {
      autoElaborazione: true,
      sogliaConfidenza: 85,
      notificaErrori: true,
      analisiAvanzata: false
    };

    if (result?.settings_ai) {
      try {
        const saved = JSON.parse(result.settings_ai);
        aiSettings = { ...aiSettings, ...saved };
      } catch (e) {
        console.error('Errore parsing AI settings:', e);
      }
    }

    res.json({
      success: true,
      aiSettings
    });

  } catch (error) {
    console.error('Errore recupero impostazioni AI:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero impostazioni AI'
    });
  }
});

// PUT /api/settings/ai - Aggiorna impostazioni AI
router.put('/ai', (req, res) => {
  try {
    const userId = req.user.id;
    const aiSettings = req.body;

    const stmt = db.prepare(`
      UPDATE users SET 
        settings_ai = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(JSON.stringify(aiSettings), userId);

    res.json({
      success: true,
      message: 'Impostazioni AI aggiornate con successo'
    });

  } catch (error) {
    console.error('Errore aggiornamento impostazioni AI:', error);
    res.status(500).json({
      success: false,
      error: 'Errore aggiornamento impostazioni AI'
    });
  }
});

// GET /api/settings/notifications - Impostazioni notifiche
router.get('/notifications', (req, res) => {
  try {
    const userId = req.user.id;
    
    const stmt = db.prepare(`
      SELECT settings_notifications FROM users WHERE id = ?
    `);
    
    const result = stmt.get(userId);
    
    let notifications = {
      documentiElaborati: true,
      erroriRilevati: true,
      reportPeriodici: false,
      digestSettimanale: true,
      email: true,
      push: false
    };

    if (result?.settings_notifications) {
      try {
        const saved = JSON.parse(result.settings_notifications);
        notifications = { ...notifications, ...saved };
      } catch (e) {
        console.error('Errore parsing notifications:', e);
      }
    }

    res.json({
      success: true,
      notifications
    });

  } catch (error) {
    console.error('Errore recupero notifiche:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero notifiche'
    });
  }
});

// PUT /api/settings/notifications - Aggiorna notifiche
router.put('/notifications', (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = req.body;

    const stmt = db.prepare(`
      UPDATE users SET 
        settings_notifications = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(JSON.stringify(notifications), userId);

    res.json({
      success: true,
      message: 'Impostazioni notifiche aggiornate con successo'
    });

  } catch (error) {
    console.error('Errore aggiornamento notifiche:', error);
    res.status(500).json({
      success: false,
      error: 'Errore aggiornamento notifiche'
    });
  }
});

// POST /api/settings/change-password - Cambia password
router.post('/change-password', async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Password attuale e nuova password richieste'
      });
    }

    // Verifica password attuale
    const userStmt = db.prepare('SELECT password_hash FROM users WHERE id = ?');
    const user = userStmt.get(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utente non trovato'
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Password attuale non corretta'
      });
    }

    // Hash nuova password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Aggiorna password
    const updateStmt = db.prepare(`
      UPDATE users SET 
        password_hash = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(newPasswordHash, userId);

    res.json({
      success: true,
      message: 'Password cambiata con successo'
    });

  } catch (error) {
    console.error('Errore cambio password:', error);
    res.status(500).json({
      success: false,
      error: 'Errore cambio password'
    });
  }
});

export default router;