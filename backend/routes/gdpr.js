// backend/routes/gdpr.js
import express from 'express';
import { db } from '../database/db.js';
import authMiddleware from '../middleware/authMiddleware.js';
import crypto from 'crypto';

const router = express.Router();

// Middleware autenticazione per alcune route
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    // Applica auth se token presente
    authMiddleware(req, res, next);
  } else {
    next();
  }
};

// Database setup per GDPR
function initGDPRTables() {
  // Tabella consensi
  const createConsentsTable = `
    CREATE TABLE IF NOT EXISTS user_consents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      email TEXT,
      consent_type TEXT NOT NULL,
      consent_given BOOLEAN NOT NULL,
      consent_date DATETIME NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      version TEXT DEFAULT '1.0',
      withdrawn_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `;

  // Tabella richieste cancellazione
  const createDeletionRequestsTable = `
    CREATE TABLE IF NOT EXISTS deletion_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      email TEXT NOT NULL,
      request_type TEXT DEFAULT 'full_deletion',
      status TEXT DEFAULT 'pending',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      processed_by TEXT,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `;

  // Tabella log accessi per audit
  const createAuditLogTable = `
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      resource TEXT,
      ip_address TEXT,
      user_agent TEXT,
      success BOOLEAN DEFAULT 1,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `;

  try {
    db.exec(createConsentsTable);
    db.exec(createDeletionRequestsTable);
    db.exec(createAuditLogTable);
    console.log('✅ Tabelle GDPR inizializzate');
  } catch (error) {
    console.error('❌ Errore inizializzazione GDPR:', error);
  }
}

// Inizializza tabelle
initGDPRTables();

// GET /api/gdpr/privacy-policy - Informativa privacy
router.get('/privacy-policy', (req, res) => {
  const privacyPolicy = {
    version: '1.0',
    last_updated: '2025-09-09',
    language: 'it',
    policy: {
      titolare: {
        nome: 'Tax Assistant',
        indirizzo: 'Via Roma 123, 20100 Milano',
        email: 'privacy@taxassistant.com',
        telefono: '+39 02 1234567'
      },
      finalita_trattamento: [
        {
          finalita: 'Gestione documenti fiscali',
          base_giuridica: 'Consenso esplicito (Art. 6.1.a GDPR)',
          obbligatorio: true,
          descrizione: 'Elaborazione e analisi documenti contabili/fiscali'
        },
        {
          finalita: 'Miglioramento servizio',
          base_giuridica: 'Legittimo interesse (Art. 6.1.f GDPR)',
          obbligatorio: false,
          descrizione: 'Analytics anonimizzati per migliorare il servizio'
        },
        {
          finalita: 'Marketing',
          base_giuridica: 'Consenso esplicito (Art. 6.1.a GDPR)',
          obbligatorio: false,
          descrizione: 'Invio comunicazioni commerciali'
        }
      ],
      categorie_dati: [
        'Dati identificativi (nome, email)',
        'Documenti fiscali e contabili',
        'Dati di utilizzo del servizio',
        'Log di accesso e sicurezza'
      ],
      conservazione: {
        documenti_fiscali: '10 anni (obbligo normativo)',
        dati_utente: '5 anni dalla cancellazione account',
        log_accesso: '2 anni'
      },
      diritti_interessato: [
        'Accesso ai dati (Art. 15)',
        'Rettifica (Art. 16)',
        'Cancellazione (Art. 17)',
        'Limitazione trattamento (Art. 18)',
        'Portabilità dati (Art. 20)',
        'Opposizione (Art. 21)',
        'Revoca consenso'
      ],
      sicurezza: [
        'Crittografia dati sensibili',
        'Accesso autenticato',
        'Backup sicuri',
        'Audit log completi'
      ],
      cookie: {
        essenziali: ['Autenticazione', 'Sicurezza'],
        analytics: ['Google Analytics (anonimizzato)'],
        marketing: ['Nessuno']
      }
    }
  };

  res.json({
    success: true,
    privacy_policy: privacyPolicy
  });
});

// POST /api/gdpr/consent - Registra consenso
router.post('/consent', optionalAuth, (req, res) => {
  try {
    const { 
      consent_type, 
      consent_given, 
      email,
      user_id 
    } = req.body;

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!consent_type || consent_given === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Tipo consenso e valore richiesti'
      });
    }

    const stmt = db.prepare(`
      INSERT INTO user_consents (
        user_id, email, consent_type, consent_given, 
        consent_date, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, datetime('now'), ?, ?)
    `);

    stmt.run(
      user_id || null,
      email || null,
      consent_type,
      consent_given ? 1 : 0,
      ip,
      userAgent
    );

    // Log audit
    if (user_id) {
      logAuditAction(user_id, 'consent_update', consent_type, ip, userAgent, {
        consent_type,
        consent_given
      });
    }

    res.json({
      success: true,
      message: 'Consenso registrato',
      consent: {
        type: consent_type,
        given: consent_given,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Errore registrazione consenso:', error);
    res.status(500).json({
      success: false,
      error: 'Errore registrazione consenso'
    });
  }
});

// GET /api/gdpr/my-data - Esporta dati utente (Art. 15 GDPR)
router.get('/my-data', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;

    // Dati utente
    const userStmt = db.prepare(`
      SELECT id, email, name, created_at, updated_at,
             piano_id, documenti_utilizzati, storage_utilizzato
      FROM users WHERE id = ?
    `);
    const userData = userStmt.get(userId);

    // Documenti
    const docsStmt = db.prepare(`
      SELECT id, name, type, upload_date, file_size, status
      FROM documents WHERE client_id = ?
    `);
    const documents = docsStmt.all(userId);

    // Consensi
    const consentsStmt = db.prepare(`
      SELECT consent_type, consent_given, consent_date, withdrawn_date
      FROM user_consents WHERE user_id = ?
      ORDER BY consent_date DESC
    `);
    const consents = consentsStmt.all(userId);

    // Log accessi (ultimi 100)
    const auditStmt = db.prepare(`
      SELECT action, resource, timestamp, ip_address
      FROM audit_log WHERE user_id = ?
      ORDER BY timestamp DESC LIMIT 100
    `);
    const auditLog = auditStmt.all(userId);

    const exportData = {
      export_date: new Date().toISOString(),
      user_data: userData,
      documents_count: documents.length,
      documents: documents,
      consents: consents,
      recent_activity: auditLog,
      gdpr_rights: [
        'Hai diritto di richiedere la rettifica di questi dati',
        'Hai diritto di richiedere la cancellazione',
        'Hai diritto di revocare i consensi',
        'Hai diritto alla portabilità dei dati'
      ]
    };

    // Log export
    logAuditAction(userId, 'data_export', 'full_export', req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      data: exportData
    });

  } catch (error) {
    console.error('Errore export dati:', error);
    res.status(500).json({
      success: false,
      error: 'Errore export dati'
    });
  }
});

// POST /api/gdpr/delete-request - Richiesta cancellazione (Art. 17 GDPR)
router.post('/delete-request', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { request_type = 'full_deletion', reason } = req.body;

    // Verifica richiesta esistente
    const existingStmt = db.prepare(`
      SELECT id FROM deletion_requests 
      WHERE user_id = ? AND status = 'pending'
    `);
    const existing = existingStmt.get(userId);

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Richiesta cancellazione già in corso'
      });
    }

    // Crea richiesta
    const insertStmt = db.prepare(`
      INSERT INTO deletion_requests (user_id, email, request_type, notes)
      VALUES (?, ?, ?, ?)
    `);

    const userEmail = db.prepare('SELECT email FROM users WHERE id = ?').get(userId)?.email;
    
    insertStmt.run(userId, userEmail, request_type, reason || '');

    // Log richiesta
    logAuditAction(userId, 'deletion_request', request_type, req.ip, req.get('User-Agent'), {
      request_type,
      reason
    });

    res.json({
      success: true,
      message: 'Richiesta cancellazione inviata',
      info: {
        processing_time: '15 giorni massimo',
        contact: 'privacy@taxassistant.com',
        request_type
      }
    });

  } catch (error) {
    console.error('Errore richiesta cancellazione:', error);
    res.status(500).json({
      success: false,
      error: 'Errore richiesta cancellazione'
    });
  }
});

// GET /api/gdpr/consents - Stato consensi utente
router.get('/consents', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;

    const stmt = db.prepare(`
      SELECT DISTINCT 
        consent_type,
        consent_given,
        consent_date,
        withdrawn_date
      FROM user_consents 
      WHERE user_id = ?
      ORDER BY consent_date DESC
    `);

    const consents = stmt.all(userId);

    // Raggruppa per tipo (ultimo consenso)
    const currentConsents = {};
    consents.forEach(consent => {
      if (!currentConsents[consent.consent_type]) {
        currentConsents[consent.consent_type] = {
          given: consent.consent_given === 1,
          date: consent.consent_date,
          withdrawn_date: consent.withdrawn_date
        };
      }
    });

    res.json({
      success: true,
      consents: currentConsents,
      all_history: consents
    });

  } catch (error) {
    console.error('Errore recupero consensi:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero consensi'
    });
  }
});

// Funzione helper per audit log
function logAuditAction(userId, action, resource, ip, userAgent, details = null) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_log (user_id, action, resource, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      userId,
      action,
      resource,
      ip,
      userAgent,
      details ? JSON.stringify(details) : null
    );
  } catch (error) {
    console.error('Errore log audit:', error);
  }
}

// Export audit function
export { logAuditAction };

export default router;