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
    
    const newUserId = insertResult.lastInsertRowid;
    
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

export default router;
