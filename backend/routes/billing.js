// backend/routes/billing.js
import express from 'express';
import { db } from '../database/db.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware autenticazione
router.use(authMiddleware);

// Test e inizializzazione tabelle billing
function initBillingTables() {
  try {
    // Test se tabella fatture esiste
    const testStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='fatture'");
    const result = testStmt.get();
    console.log('Tabella fatture trovata:', result ? 'SI' : 'NO');
    
    if (!result) {
      // Crea tabella fatture se non esiste
      db.exec(`
        CREATE TABLE fatture (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          numero_fattura TEXT UNIQUE NOT NULL,
          piano_id INTEGER NOT NULL,
          periodo_da DATE NOT NULL,
          periodo_a DATE NOT NULL,
          importo DECIMAL(10,2) NOT NULL,
          status TEXT DEFAULT 'pending',
          data_pagamento DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Tabella fatture creata');
    }
    
    // Test query di base
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM fatture");
    const count = countStmt.get();
    console.log('Numero fatture nel database:', count.count);
    
  } catch (error) {
    console.error('❌ Errore test/creazione tabelle billing:', error);
  }
}

// Inizializza tabelle
initBillingTables();

// GET /api/billing/status - Status piano utente
router.get('/status', (req, res) => {
  try {
    const userId = req.user.id;
    
    // Query piano utente con dettagli
    const stmt = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.documenti_utilizzati,
        u.storage_utilizzato,
        u.piano_data_inizio,
        u.piano_data_fine,
        p.id as piano_id,
        p.nome as piano_nome,
        p.prezzo,
        p.documenti_mensili,
        p.storage_mb,
        p.features
      FROM users u
      JOIN piani p ON u.piano_id = p.id
      WHERE u.id = ?
    `);
    
    const userData = stmt.get(userId);
    
    if (!userData) {
      return res.status(404).json({
        success: false,
        error: 'Utente non trovato'
      });
    }

    // Calcola giorni rimasti
    const oggi = new Date();
    const dataFine = new Date(userData.piano_data_fine);
    const diffTime = dataFine - oggi;
    const giorniRimasti = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Parse features JSON
    let features = [];
    try {
      features = JSON.parse(userData.features || '[]');
    } catch (e) {
      features = [];
    }

    const billingStatus = {
      utente: {
        id: userData.id,
        nome: userData.name,
        email: userData.email
      },
      piano: {
        id: userData.piano_id,
        nome: userData.piano_nome,
        prezzo: userData.prezzo,
        documenti_mensili: userData.documenti_mensili,
        storage_mb: userData.storage_mb,
        features: features
      },
      utilizzo: {
        documenti_utilizzati: userData.documenti_utilizzati || 0,
        documenti_limite: userData.documenti_mensili,
        storage_utilizzato: userData.storage_utilizzato || 0,
        storage_limite: userData.storage_mb
      },
      periodo: {
        data_inizio: userData.piano_data_inizio,
        data_fine: userData.piano_data_fine,
        giorni_rimasti: giorniRimasti,
        scaduto: giorniRimasti <= 0
      }
    };

    res.json({
      success: true,
      billing: billingStatus
    });

  } catch (error) {
    console.error('Errore status billing:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero status billing',
      details: error.message
    });
  }
});

// GET /api/billing/piani - Tutti i piani disponibili
router.get('/piani', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT id, nome, prezzo, documenti_mensili, storage_mb, features
      FROM piani 
      WHERE attivo = 1
      ORDER BY prezzo ASC
    `);
    
    const piani = stmt.all();
    
    const pianiFormatted = piani.map(piano => ({
      id: piano.id,
      nome: piano.nome,
      prezzo: piano.prezzo,
      documenti_mensili: piano.documenti_mensili,
      storage_mb: piano.storage_mb,
      features: JSON.parse(piano.features || '[]')
    }));

    res.json({
      success: true,
      piani: pianiFormatted
    });

  } catch (error) {
    console.error('Errore recupero piani:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero piani',
      details: error.message
    });
  }
});

// GET /api/billing/fatture - Storico fatture utente
router.get('/fatture', (req, res) => {
  try {
    const userId = req.user.id;
    
    // Test semplificato senza JOIN
    console.log('Testing fatture query per user:', userId);
    
    const stmt = db.prepare(`SELECT * FROM fatture WHERE user_id = ? LIMIT 10`);
    const fatture = stmt.all(userId);
    
    console.log('Fatture trovate:', fatture.length);

    const fattureFormatted = fatture.map(fattura => ({
      id: fattura.id,
      numero: fattura.numero_fattura,
      data: fattura.created_at,
      piano: 'N/A', // Temporaneamente senza JOIN
      periodo_da: fattura.periodo_da,
      periodo_a: fattura.periodo_a,
      importo: fattura.importo,
      status: fattura.status,
      data_pagamento: fattura.data_pagamento
    }));

    res.json({
      success: true,
      fatture: fattureFormatted,
      count: fattureFormatted.length
    });

  } catch (error) {
    console.error('Errore recupero fatture:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero fatture',
      details: error.message
    });
  }
});

// POST /api/billing/upgrade - Upgrade piano
router.post('/upgrade', (req, res) => {
  try {
    const userId = req.user.id;
    const { piano_id } = req.body;

    if (!piano_id) {
      return res.status(400).json({
        success: false,
        error: 'Piano ID richiesto'
      });
    }

    // Verifica piano esistente
    const pianoStmt = db.prepare(`
      SELECT id, nome, prezzo, documenti_mensili, storage_mb
      FROM piani 
      WHERE id = ? AND attivo = 1
    `);
    
    const piano = pianoStmt.get(piano_id);
    if (!piano) {
      return res.status(404).json({
        success: false,
        error: 'Piano non trovato'
      });
    }

    // Aggiorna utente
    const updateStmt = db.prepare(`
      UPDATE users 
      SET piano_id = ?, 
          piano_data_inizio = CURRENT_TIMESTAMP,
          piano_data_fine = datetime(CURRENT_TIMESTAMP, '+30 days'),
          documenti_utilizzati = 0
      WHERE id = ?
    `);
    
    updateStmt.run(piano_id, userId);

    // Crea fattura (se non è trial)
    if (piano.prezzo > 0) {
      const numeroFattura = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const fatturaStmt = db.prepare(`
        INSERT INTO fatture (user_id, numero_fattura, piano_id, periodo_da, periodo_a, importo, status)
        VALUES (?, ?, ?, date('now'), date('now', '+30 days'), ?, 'pending')
      `);
      
      fatturaStmt.run(userId, numeroFattura, piano_id, piano.prezzo);
    }

    res.json({
      success: true,
      message: `Upgrade a ${piano.nome} completato`,
      piano: {
        id: piano.id,
        nome: piano.nome,
        prezzo: piano.prezzo
      }
    });

  } catch (error) {
    console.error('Errore upgrade piano:', error);
    res.status(500).json({
      success: false,
      error: 'Errore upgrade piano',
      details: error.message
    });
  }
});

// POST /api/billing/usage/documento - Incrementa utilizzo documenti
router.post('/usage/documento', (req, res) => {
  try {
    const userId = req.user.id;
    
    // Incrementa contatore documenti
    const stmt = db.prepare(`
      UPDATE users 
      SET documenti_utilizzati = documenti_utilizzati + 1 
      WHERE id = ?
    `);
    
    stmt.run(userId);

    // Verifica limiti
    const checkStmt = db.prepare(`
      SELECT 
        u.documenti_utilizzati,
        p.documenti_mensili
      FROM users u
      JOIN piani p ON u.piano_id = p.id
      WHERE u.id = ?
    `);
    
    const usage = checkStmt.get(userId);
    
    res.json({
      success: true,
      utilizzo: {
        documenti_utilizzati: usage.documenti_utilizzati,
        documenti_limite: usage.documenti_mensili,
        limite_raggiunto: usage.documenti_mensili ? usage.documenti_utilizzati >= usage.documenti_mensili : false
      }
    });

  } catch (error) {
    console.error('Errore update usage:', error);
    res.status(500).json({
      success: false,
      error: 'Errore aggiornamento utilizzo',
      details: error.message
    });
  }
});

// GET /api/billing/check-limits - Verifica limiti utente
router.get('/check-limits', (req, res) => {
  try {
    const userId = req.user.id;
    
    const stmt = db.prepare(`
      SELECT 
        u.documenti_utilizzati,
        u.storage_utilizzato,
        u.piano_data_fine,
        p.documenti_mensili,
        p.storage_mb,
        p.nome as piano_nome
      FROM users u
      JOIN piani p ON u.piano_id = p.id
      WHERE u.id = ?
    `);
    
    const limits = stmt.get(userId);
    
    const oggi = new Date();
    const dataFine = new Date(limits.piano_data_fine);
    const scaduto = oggi > dataFine;
    
    const documentiBloccato = limits.documenti_mensili ? 
      limits.documenti_utilizzati >= limits.documenti_mensili : false;
    
    const storageBloccato = limits.storage_mb ? 
      limits.storage_utilizzato >= limits.storage_mb : false;

    res.json({
      success: true,
      limiti: {
        piano_scaduto: scaduto,
        documenti_bloccato: documentiBloccato,
        storage_bloccato: storageBloccato,
        piano: limits.piano_nome,
        utilizzo: {
          documenti: `${limits.documenti_utilizzati}/${limits.documenti_mensili || '∞'}`,
          storage: `${Math.round(limits.storage_utilizzato/1024)}MB/${Math.round(limits.storage_mb/1024)}MB`
        }
      }
    });

  } catch (error) {
    console.error('Errore check limits:', error);
    res.status(500).json({
      success: false,
      error: 'Errore verifica limiti',
      details: error.message
    });
  }
});

export default router;