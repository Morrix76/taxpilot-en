import express from 'express';
import { db } from '../db.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// GET /api/billing/status
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.execute({
      sql: `SELECT 
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
            WHERE u.id = ?`,
      args: [userId]
    });
    
    const userData = result.rows[0];
    
    if (!userData) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const oggi = new Date();
    const dataFine = new Date(userData.piano_data_fine);
    const diffTime = dataFine - oggi;
    const giorniRimasti = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

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
    console.error('Error billing status:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving billing status',
      details: error.message
    });
  }
});

// GET /api/billing/piani
router.get('/piani', async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT id, nome, prezzo, documenti_mensili, storage_mb, features
            FROM piani 
            WHERE attivo = 1
            ORDER BY prezzo ASC`,
      args: []
    });
    
    const piani = result.rows.map(piano => ({
      id: piano.id,
      nome: piano.nome,
      prezzo: piano.prezzo,
      documenti_mensili: piano.documenti_mensili,
      storage_mb: piano.storage_mb,
      features: JSON.parse(piano.features || '[]')
    }));

    res.json({
      success: true,
      piani
    });

  } catch (error) {
    console.error('Error retrieving plans:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving plans',
      details: error.message
    });
  }
});

// GET /api/billing/fatture
router.get('/fatture', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.execute({
      sql: `SELECT * FROM fatture WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      args: [userId]
    });

    const fatture = result.rows.map(fattura => ({
      id: fattura.id,
      numero: fattura.numero_fattura,
      data: fattura.created_at,
      periodo_da: fattura.periodo_da,
      periodo_a: fattura.periodo_a,
      importo: fattura.importo,
      status: fattura.status,
      data_pagamento: fattura.data_pagamento
    }));

    res.json({
      success: true,
      fatture,
      count: fatture.length
    });

  } catch (error) {
    console.error('Error retrieving invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving invoices',
      details: error.message
    });
  }
});

// POST /api/billing/upgrade
router.post('/upgrade', async (req, res) => {
  try {
    const userId = req.user.id;
    const { piano_id } = req.body;

    if (!piano_id) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID required'
      });
    }

    const pianoResult = await db.execute({
      sql: `SELECT id, nome, prezzo, documenti_mensili, storage_mb
            FROM piani 
            WHERE id = ? AND attivo = 1`,
      args: [piano_id]
    });
    
    const piano = pianoResult.rows[0];
    if (!piano) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    await db.execute({
      sql: `UPDATE users 
            SET piano_id = ?, 
                piano_data_inizio = CURRENT_TIMESTAMP,
                piano_data_fine = datetime(CURRENT_TIMESTAMP, '+30 days'),
                documenti_utilizzati = 0
            WHERE id = ?`,
      args: [piano_id, userId]
    });

    if (piano.prezzo > 0) {
      const numeroFattura = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      await db.execute({
        sql: `INSERT INTO fatture (user_id, numero_fattura, piano_id, periodo_da, periodo_a, importo, status)
              VALUES (?, ?, ?, date('now'), date('now', '+30 days'), ?, 'pending')`,
        args: [userId, numeroFattura, piano_id, piano.prezzo]
      });
    }

    res.json({
      success: true,
      message: `Upgrade to ${piano.nome} completed`,
      piano: {
        id: piano.id,
        nome: piano.nome,
        prezzo: piano.prezzo
      }
    });

  } catch (error) {
    console.error('Error upgrade:', error);
    res.status(500).json({
      success: false,
      error: 'Error upgrading plan',
      details: error.message
    });
  }
});

// POST /api/billing/usage/documento
router.post('/usage/documento', async (req, res) => {
  try {
    const userId = req.user.id;
    
    await db.execute({
      sql: `UPDATE users 
            SET documenti_utilizzati = documenti_utilizzati + 1 
            WHERE id = ?`,
      args: [userId]
    });

    const result = await db.execute({
      sql: `SELECT 
              u.documenti_utilizzati,
              p.documenti_mensili
            FROM users u
            JOIN piani p ON u.piano_id = p.id
            WHERE u.id = ?`,
      args: [userId]
    });
    
    const usage = result.rows[0];
    
    res.json({
      success: true,
      utilizzo: {
        documenti_utilizzati: usage.documenti_utilizzati,
        documenti_limite: usage.documenti_mensili,
        limite_raggiunto: usage.documenti_mensili ? usage.documenti_utilizzati >= usage.documenti_mensili : false
      }
    });

  } catch (error) {
    console.error('Error update usage:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating usage',
      details: error.message
    });
  }
});

// GET /api/billing/check-limits
router.get('/check-limits', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.execute({
      sql: `SELECT 
              u.documenti_utilizzati,
              u.storage_utilizzato,
              u.piano_data_fine,
              p.documenti_mensili,
              p.storage_mb,
              p.nome as piano_nome
            FROM users u
            JOIN piani p ON u.piano_id = p.id
            WHERE u.id = ?`,
      args: [userId]
    });
    
    const limits = result.rows[0];
    
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
    console.error('Error check limits:', error);
    res.status(500).json({
      success: false,
      error: 'Error checking limits',
      details: error.message
    });
  }
});

export default router;
