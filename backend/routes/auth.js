// File: backend/routes/auth.js
import express from "express";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db.js';
import { sendVerificationEmail } from '../services/emailService.js';
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
    
    // Genera token di verifica
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    // Inserisci utente con dati di verifica
    const insertResult = await db.execute({
      sql: 'INSERT INTO users (email, password, email_verified, verification_token, verification_token_expires) VALUES (?, ?, ?, ?, ?)',
      args: [email, hashedPassword, 0, token, expires]
    });
    
    const newUserId = Number(insertResult.lastInsertRowid);
    console.log(`✅ Utente ${newUserId} creato, token di verifica generato`);
    
    // Invia email di verifica
    try {
      const emailResult = await sendVerificationEmail(email, token);
      if (emailResult.success) {
        console.log(`✅ Email di verifica inviata a ${email}`);
      } else {
        console.warn(`⚠️ Errore invio email a ${email}:`, emailResult.error);
      }
    } catch (emailError) {
      console.error(`❌ Errore invio email di verifica:`, emailError);
      // Continua comunque - l'utente è stato creato
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Account creato. Controlla la tua email per verificare l\'account'
    });
  } catch (err) {
    console.error("Errore registrazione:", err);
    if (err.message && err.message.includes('UNIQUE')) {
       return res.status(409).json({ success: false, error: 'Email già in uso' });
    }
    res.status(500).json({ success: false, error: 'Errore server' });
  }
});

// ====== VERIFY EMAIL ======
router.get('/verify-email/:token', async (req, res) => {
  const { token } = req.params;
  
  try {
    // Cerca utente con il token di verifica
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE verification_token = ?',
      args: [token]
    });
    
    const user = userResult.rows[0];
    
    // Verifica se il token esiste
    if (!user) {
      console.warn(`⚠️ Token di verifica non valido: ${token}`);
      return res.redirect(`${process.env.FRONTEND_URL}/login?verified=false&error=invalid`);
    }
    
    // Verifica se il token è scaduto
    if (new Date(user.verification_token_expires) < new Date()) {
      console.warn(`⚠️ Token di verifica scaduto per utente ${user.email}`);
      return res.redirect(`${process.env.FRONTEND_URL}/login?verified=false&error=expired`);
    }
    
    // Token valido - aggiorna utente
    await db.execute({
      sql: 'UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?',
      args: [user.id]
    });
    
    console.log(`✅ Email verificata con successo per utente ${user.email}`);
    
    // Redirect al frontend con successo
    return res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
    
  } catch (err) {
    console.error("Errore verifica email:", err);
    return res.redirect(`${process.env.FRONTEND_URL}/login?verified=false&error=server`);
  }
});

// ====== RESEND VERIFICATION EMAIL ======
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email richiesta' });
  }
  
  try {
    // Cerca utente per email
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    
    const user = userResult.rows[0];
    
    // Verifica se l'utente esiste
    if (!user) {
      console.warn(`⚠️ Tentativo di reinvio verifica per email inesistente: ${email}`);
      return res.status(404).json({ success: false, error: 'Utente non trovato' });
    }
    
    // Verifica se l'email è già verificata
    if (user.email_verified === 1) {
      console.warn(`⚠️ Tentativo di reinvio verifica per email già verificata: ${email}`);
      return res.status(400).json({ success: false, error: 'Email già verificata' });
    }
    
    // Genera nuovo token e scadenza
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    // Aggiorna DB con nuovo token
    await db.execute({
      sql: 'UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?',
      args: [token, expires, user.id]
    });
    
    console.log(`✅ Nuovo token di verifica generato per ${email}`);
    
    // Invia email di verifica
    try {
      const emailResult = await sendVerificationEmail(email, token);
      if (emailResult.success) {
        console.log(`✅ Email di verifica reinviata a ${email}`);
      } else {
        console.warn(`⚠️ Errore invio email a ${email}:`, emailResult.error);
        return res.status(500).json({ success: false, error: 'Errore invio email' });
      }
    } catch (emailError) {
      console.error(`❌ Errore invio email di verifica:`, emailError);
      return res.status(500).json({ success: false, error: 'Errore invio email' });
    }
    
    res.json({ 
      success: true, 
      message: 'Email di verifica inviata'
    });
    
  } catch (err) {
    console.error("Errore reinvio verifica:", err);
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
