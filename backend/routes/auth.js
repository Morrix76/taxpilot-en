import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const router = express.Router();

/* ============================================================
   LOGIN
   ============================================================ */
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, error: 'Email e password sono richiesti' });
  }

  try {
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email],
    });

    const user = userResult.rows[0];
    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: 'Credenziali non valide' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, error: 'Credenziali non valide' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

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

/* ============================================================
   REGISTRAZIONE
   ============================================================ */
router.post('/register', async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, error: 'Email e password sono richiesti' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    const insertResult = await db.execute({
      sql: 'INSERT INTO users (email, password) VALUES (?, ?)',
      args: [email, hashedPassword],
    });

    // 🔧 fix BigInt → converto in numero
    const newUserId = Number(insertResult.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'Utente registrato',
      userId: newUserId,
    });
  } catch (err) {
    console.error('Errore durante la registrazione:', err);

    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res
        .status(409)
        .json({ success: false, error: 'Email già in uso' });
    }

    next(err);
  }
});

/* ============================================================
   PROFILO UTENTE (dal token)
   ============================================================ */
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, error: 'Token mancante' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userResult = await db.execute({
      sql: 'SELECT id, email FROM users WHERE id = ?',
      args: [decoded.userId],
    });

    const user = userResult.rows[0];
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: 'Utente non trovato' });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('Errore profilo:', err);
    res.status(401).json({ success: false, error: 'Token non valido' });
  }
});

/* ============================================================
   LISTA CLIENTI
   ============================================================ */
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
