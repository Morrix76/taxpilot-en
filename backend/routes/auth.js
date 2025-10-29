// File: backend/routes/auth.js
import express from "express";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const router = express.Router();
console.log("📦 routes/auth.js caricato correttamente");

// ====== LOGIN ======
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email e password richiesti' });
  }

  try {
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });

    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, error: 'Credenziali non valide' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Credenziali non valide' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token: token,
      user: { id: user.id, email: user.email }
    });

  } catch (err) {
    console.error("Errore login:", err);
    res.status(500).json({ success: false, error: 'Errore server' });
  }
});

// ====== REGISTER ======
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email e password richiesti' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const insertResult = await db.execute({
      sql: 'INSERT INTO users (email, password) VALUES (?, ?)',
      args: [email, hashedPassword]
    });
    
    const newUserId = Number(insertResult.lastInsertRowid);
    
    res.status(201).json({ 
      success: true, 
      message: 'Utente registrato con successo', 
      userId: newUserId 
    });

  } catch (err) {
    console.error("Errore registrazione:", err);
    if (err.message && err.message.includes('UNIQUE')) {
       return res.status(409).json({ success: false, error: 'Email già in uso' });
    }
    res.status(500).json({ success: false, error: 'Errore server' });
  }
});

// ====== PROFILE (verifica token e ritorna info utente + piano) ======
router.get('/profile', async (req, res) => {
  try {
    // Estrai token dall'header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token mancante' });
    }

    const token = authHeader.split(' ')[1];

    // Verifica token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Token non valido' });
    }

    // Recupera utente dal database
    const userResult = await db.execute({
      sql: 'SELECT id, email FROM users WHERE id = ?',
      args: [decoded.userId]
    });

    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utente non trovato' });
    }

    // Per ora ritorniamo piano fittizio (puoi implementare la logica vera dopo)
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      piano: {
        active: true,
        scaduto: false,
        piano_nome: 'Free Trial',
        days_remaining: 30,
        documenti_utilizzati: 0,
        documenti_limite: 100
      }
    });

  } catch (err) {
    console.error("Errore profile:", err);
    res.status(500).json({ success: false, error: 'Errore server' });
  }
});

export default router;
