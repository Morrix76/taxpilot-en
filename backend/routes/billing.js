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
              u.documents_used,
              u.piano_data_fine,
              u.piano_id,
              u.documents_limit,
              u.trial_end_date
            FROM users u
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
    const dataFine = userData.piano_data_fine ? new Date(userData.piano_data_fine) : new Date(userData.trial_end_date);
    const diffTime = dataFine - oggi;
    const giorniRimasti = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const billingStatus = {
      utente: {
        id: userData.id,
        nome: userData.name || 'User',
        email: userData.email
      },
      piano: {
        id: userData.piano_id || 0,
        nome: 'Free Trial',
        prezzo: 0,
        documenti_mensili: userData.documents_limit || 10,
        storage_mb: 1000,
        features: []
      },
      utilizzo: {
        documenti_utilizzati: userData.documents_used || 0,
        documenti_limite: userData.documents_limit || 10,
        storage_utilizzato: 0,
        storage_limite: 1000
      },
      periodo: {
        data_inizio: userData.trial_end_date,
        data_fine: userData.piano_data_fine || userData.trial_end_date,
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
    // Ritorna piani hardcoded per ora
    const piani = [
      {
        id: 1,
        nome: 'Free Trial',
        prezzo: 0,
        documenti_mensili: 10,
        storage_mb: 1000,
        features: ['10 documenti al mese', '1GB storage']
      },
      {
        id: 2,
        nome: 'Professional',
        prezzo: 29,
        documenti_mensili: 100,
        storage_mb: 10000,
        features: ['100 documenti al mese', '10GB storage', 'Supporto prioritario']
      }
    ];

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
    // Ritorna array vuoto per ora
    res.json({
      success: true,
      fatture: [],
      count: 0
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
    res.status(501).json({
      success: false,
      error: 'Upgrade not implemented yet'
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
            SET documents_used = documents_used + 1 
            WHERE id = ?`,
      args: [userId]
    });

    const result = await db.execute({
      sql: `SELECT documents_used, documents_limit
            FROM users
            WHERE id = ?`,
      args: [userId]
    });
    
    const usage = result.rows[0];
    
    res.json({
      success: true,
      utilizzo: {
        documenti_utilizzati: usage.documents_used,
        documenti_limite: usage.documents_limit,
        limite_raggiunto: usage.documents_limit ? usage.documents_used >= usage.documents_limit : false
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
              u.documents_used,
              u.piano_data_fine,
              u.trial_end_date,
              u.documents_limit
            FROM users u
            WHERE u.id = ?`,
      args: [userId]
    });
    
    const limits = result.rows[0];
    
    const oggi = new Date();
    const dataFine = limits.piano_data_fine ? new Date(limits.piano_data_fine) : new Date(limits.trial_end_date);
    const scaduto = oggi > dataFine;
    
    const documentiBloccato = limits.documents_limit ? 
      limits.documents_used >= limits.documents_limit : false;

    res.json({
      success: true,
      limiti: {
        piano_scaduto: scaduto,
        documenti_bloccato: documentiBloccato,
        storage_bloccato: false,
        piano: 'Free Trial',
        utilizzo: {
          documenti: `${limits.documents_used}/${limits.documents_limit || '∞'}`,
          storage: `0MB/1000MB`
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