import express from 'express';
import { db } from '../db.js';
import authMiddleware from '../middleware/authMiddleware.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.use(authMiddleware);

// GET /api/settings/profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.execute({
      sql: `SELECT 
              id, email, name,
              nome_studio, telefono, partita_iva, 
              codice_fiscale, indirizzo, sito_web,
              created_at
            FROM users 
            WHERE id = ?`,
      args: [userId]
    });
    
    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
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
    console.error('Error retrieving profile:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving profile'
    });
  }
});

// PUT /api/settings/profile
router.put('/profile', async (req, res) => {
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

    await db.execute({
      sql: `UPDATE users SET 
              name = ?,
              nome_studio = ?,
              telefono = ?,
              partita_iva = ?,
              codice_fiscale = ?,
              indirizzo = ?,
              sito_web = ?
            WHERE id = ?`,
      args: [
        name || null,
        nomeStudio || null,
        telefono || null,
        partitaIva || null,
        codiceFiscale || null,
        indirizzo || null,
        sitoWeb || null,
        userId
      ]
    });

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating profile'
    });
  }
});

// GET /api/settings/preferences
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.execute({
      sql: `SELECT settings_preferences FROM users WHERE id = ?`,
      args: [userId]
    });
    
    let preferences = {
      lingua: 'IT Italiano',
      fusoOrario: 'Europe/Rome (GMT+1)',
      formatoData: 'DD/MM/YYYY',
      valuta: 'EUR Euro',
      tema: 'Chiaro'
    };

    if (result.rows[0]?.settings_preferences) {
      try {
        const saved = JSON.parse(result.rows[0].settings_preferences);
        preferences = { ...preferences, ...saved };
      } catch (e) {
        console.error('Error parsing preferences:', e);
      }
    }

    res.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Error retrieving preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving preferences'
    });
  }
});

// PUT /api/settings/preferences
router.put('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    await db.execute({
      sql: `UPDATE users SET settings_preferences = ? WHERE id = ?`,
      args: [JSON.stringify(preferences), userId]
    });

    res.json({
      success: true,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating preferences'
    });
  }
});

// GET /api/settings/ai
router.get('/ai', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.execute({
      sql: `SELECT settings_ai FROM users WHERE id = ?`,
      args: [userId]
    });
    
    let aiSettings = {
      autoElaborazione: true,
      sogliaConfidenza: 85,
      notificaErrori: true,
      analisiAvanzata: false
    };

    if (result.rows[0]?.settings_ai) {
      try {
        const saved = JSON.parse(result.rows[0].settings_ai);
        aiSettings = { ...aiSettings, ...saved };
      } catch (e) {
        console.error('Error parsing AI settings:', e);
      }
    }

    res.json({
      success: true,
      aiSettings
    });

  } catch (error) {
    console.error('Error retrieving AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving AI settings'
    });
  }
});

// PUT /api/settings/ai
router.put('/ai', async (req, res) => {
  try {
    const userId = req.user.id;
    const aiSettings = req.body;

    await db.execute({
      sql: `UPDATE users SET settings_ai = ? WHERE id = ?`,
      args: [JSON.stringify(aiSettings), userId]
    });

    res.json({
      success: true,
      message: 'AI settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating AI settings'
    });
  }
});

// GET /api/settings/notifications
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.execute({
      sql: `SELECT settings_notifications FROM users WHERE id = ?`,
      args: [userId]
    });
    
    let notifications = {
      documentiElaborati: true,
      erroriRilevati: true,
      reportPeriodici: false,
      digestSettimanale: true,
      email: true,
      push: false
    };

    if (result.rows[0]?.settings_notifications) {
      try {
        const saved = JSON.parse(result.rows[0].settings_notifications);
        notifications = { ...notifications, ...saved };
      } catch (e) {
        console.error('Error parsing notifications:', e);
      }
    }

    res.json({
      success: true,
      notifications
    });

  } catch (error) {
    console.error('Error retrieving notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving notifications'
    });
  }
});

// PUT /api/settings/notifications
router.put('/notifications', async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = req.body;

    await db.execute({
      sql: `UPDATE users SET settings_notifications = ? WHERE id = ?`,
      args: [JSON.stringify(notifications), userId]
    });

    res.json({
      success: true,
      message: 'Notifications updated successfully'
    });

  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating notifications'
    });
  }
});

// POST /api/settings/change-password
router.post('/change-password', async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current and new password required'
      });
    }

    const result = await db.execute({
      sql: 'SELECT password FROM users WHERE id = ?',
      args: [userId]
    });

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password incorrect'
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await db.execute({
      sql: `UPDATE users SET password = ? WHERE id = ?`,
      args: [newPasswordHash, userId]
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      error: 'Error changing password'
    });
  }
});

export default router;
