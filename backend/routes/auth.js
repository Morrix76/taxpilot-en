import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 1. IMPORTA il client Turso dal NUOVO file db.js
import { db } from '../db.js';

const router = express.Router();

/**
 * =================================================================
 * Rotta di Login (asincrona con @libsql/client)
 * =================================================================
 */
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email e password sono richiesti' });
  }

  try {
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email],
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
      process.env.JWT_SECRET, // Assicurati che sia settata
      { expiresIn: '1h' }
    );

    // Nota: la colonna "name" non esiste: evito di includerla nella risposta
    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error('Errore durante il login:', err);
    next(err);
  }
});

/**
 * =================================================================
 * Rotta di Registrazione (asincrona con @libsql/client)
 * - RIMOSSA la colonna "name" perché NON esiste in DB
 * =================================================================
 */
router.post('/register', async (req, res, next) => {
  const { email, password } = req.body; // <-- tolto "name"

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email e password sono richiesti' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    const insertResult = await db.execute({
      sql: 'INSERT INTO users (email, password) VALUES (?, ?)', // <-- tolto "name"
      args: [email, hashedPassword],                            // <-- 2 argomenti
    });

    const newUserId = insertResult.lastInsertRowid;

    res.status(201).json({
      success: true,
      message: 'Utente registrato',
      userId: newUserId,
    });
  } catch (err) {
    console.error('Errore durante la registrazione:', err);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ success: false, error: 'Email già in uso' });
    }
    next(err);
  }
});

/**
 * =================================================================
 * Esempio: Rotta lista clienti (asincrona con @libsql/client)
 * =================================================================
 */
router.get('/clients/:userId', async (req, res, next) => {
  const { userId } = req.params;

  try {
    const clientsResult = await db.execute({
      sql: 'SELECT * FROM clients WHERE user_id = ?',
      args: [userId],
    });

    res.json({
      success: true,
      clients: clientsResult.rows,
    });
  } catch (err) {
    console.error('Errore nel recupero clienti:', err);
    next(err);
  }
});

export default router;
