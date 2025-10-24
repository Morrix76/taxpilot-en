import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../database/db.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Genera token JWT
const generateJwt = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Nome, email e password sono obbligatori' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'La password deve essere di almeno 6 caratteri' 
      });
    }

    // Verifica se utente esiste già  
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        error: 'Un utente con questa email esiste già' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Assegna Piano 1 automaticamente con trial 15 giorni
    const insertStmt = db.prepare(`
      INSERT INTO users (
        name, email, password_hash, email_verified,
        piano_id, piano_data_inizio, piano_data_fine,
        documenti_utilizzati, storage_utilizzato
      ) VALUES (?, ?, ?, 0, 1, CURRENT_TIMESTAMP, datetime('now', '+15 days'), 0, 0)
    `);

    const result = insertStmt.run(name, email, passwordHash);

    const newUser = {
      id: result.lastInsertRowid,
      name,
      email
    };

    // Genera token
    const token = generateJwt({
      id: newUser.id,
      email: newUser.email
    });

    res.status(201).json({
      success: true,
      message: 'Utente registrato con successo - Piano Trial attivato',
      token,
      user: newUser
    });

  } catch (error) {
    console.error('Errore registrazione:', error);
    res.status(500).json({ 
      success: false,
      error: 'Errore interno del server' 
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email e password sono obbligatorie' 
      });
    }

    // Trova utente con info piano
    const user = db.prepare(`
      SELECT u.*, p.nome as piano_nome, p.documenti_mensili
      FROM users u
      LEFT JOIN piani p ON u.piano_id = p.id
      WHERE u.email = ?
    `).get(email);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenziali non valide' 
      });
    }

    // Verifica password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenziali non valide' 
      });
    }

    // Calcola status piano
    let pianoStatus = { active: true, days_remaining: null };
    if (user.piano_data_fine) {
      const dataFine = new Date(user.piano_data_fine);
      const now = new Date();
      const isPianoActive = now < dataFine;
      const daysRemaining = Math.ceil((dataFine - now) / (1000 * 60 * 60 * 24));
      
      pianoStatus = {
        active: isPianoActive,
        days_remaining: Math.max(0, daysRemaining),
        piano_nome: user.piano_nome || 'Trial',
        scaduto: !isPianoActive
      };
    }

    // Genera token
    const token = generateJwt({
      id: user.id,
      email: user.email,
      name: user.name
    });

    res.json({
      success: true,
      message: 'Login effettuato con successo',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      piano: pianoStatus
    });

  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({ 
      success: false,
      error: 'Errore interno del server' 
    });
  }
});

// GET /api/auth/profile
router.get('/profile', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = db.prepare(`
      SELECT 
        u.id, u.name, u.email, u.created_at,
        u.piano_id, u.piano_data_inizio, u.piano_data_fine,
        u.documenti_utilizzati, u.storage_utilizzato,
        u.nome_studio, u.telefono, u.partita_iva, u.codice_fiscale, u.indirizzo, u.sito_web,
        p.nome as piano_nome, p.documenti_mensili, p.storage_mb
      FROM users u
      LEFT JOIN piani p ON u.piano_id = p.id
      WHERE u.id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Utente non trovato' 
      });
    }

    // Calcola info piano
    let pianoInfo = null;
    if (user.piano_data_fine) {
      const dataFine = new Date(user.piano_data_fine);
      const now = new Date();
      const daysRemaining = Math.ceil((dataFine - now) / (1000 * 60 * 60 * 24));
      
      pianoInfo = {
        is_active: now < dataFine,
        active: now < dataFine,
        days_remaining: Math.max(0, daysRemaining),
        piano_nome: user.piano_nome || 'Trial',
        documenti_utilizzati: user.documenti_utilizzati || 0,
        documenti_limite: user.documenti_mensili || 0,
        storage_utilizzato: user.storage_utilizzato || 0,
        storage_limite: user.storage_mb || 0,
        scaduto: now >= dataFine,
        // Aggiunti campi per compatibilità con frontend
        trial_active: now < dataFine,
        daysLeft: Math.max(0, daysRemaining),
        documents_used: user.documenti_utilizzati || 0,
        documents_limit: user.documenti_mensili || 20
      };
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        nome_studio: user.nome_studio,
        telefono: user.telefono,
        partita_iva: user.partita_iva,
        codice_fiscale: user.codice_fiscale,
        indirizzo: user.indirizzo,
        sito_web: user.sito_web,
        // Campi trial per compatibilità
        trial_active: req.trialActive,
        daysLeft: req.daysLeft,
        documents_used: req.documentsUsed,
        documents_limit: req.documentsLimit
      },
      piano: pianoInfo
    });

  } catch (error) {
    console.error('Errore profilo:', error);
    res.status(500).json({ 
      success: false,
      error: 'Errore interno del server' 
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // Con JWT non serve invalidare lato server
  res.json({
    success: true,
    message: 'Logout effettuato con successo'
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false,
      error: 'Email è obbligatoria' 
    });
  }

  try {
    // Verifica se utente esiste
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    
    if (user) {
      // Genera token reset
      const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
      
      // Salva token reset
      const insertStmt = db.prepare(`
        INSERT INTO password_resets (email, token, expires_at)
        VALUES (?, ?, datetime('now', '+1 hour'))
      `);
      
      insertStmt.run(email, resetToken);
      
      console.log('🔑 Token reset password per', email, ':', resetToken);
    }
    
    // Sempre successo per sicurezza
    res.json({
      success: true,
      message: 'Se l\'utente esiste, abbiamo inviato le istruzioni per il reset'
    });

  } catch (error) {
    console.error('Errore forgot password:', error);
    res.status(500).json({ 
      success: false,
      error: 'Errore interno del server' 
    });
  }
});

export default router;