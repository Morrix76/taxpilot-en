import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 1. IMPORTA il client Turso dal NUOVO file db.js
import { db } from '../database/db.js';

const router = express.Router();

/** 
 * =================================================================
 * ESEMPIO DI REFACTORING OBBLIGATORIO per le tue rotte
 * =================================================================
 *
 * Devi rendere ASINCRONE tutte le funzioni delle rotte che
 * interagiscono con il database.
 */


// ESEMPIO DI REFACTORING: Rotta di Login (per db.prepare().get())
//
// 2. La funzione della rotta DEVE diventare 'async'
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email e password sono richiesti' });
  }

  try {
    // 3. REFACTORING da db.prepare().get()
    //
    // === VECCHIO CODICE (Sincrono con better-sqlite3) ===
    // const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    // const user = stmt.get(email);
    //
    // === NUOVO CODICE (Asincrono con @libsql/client) ===
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email] // Usa 'args' per i parametri
    });

    // 4. 'get()' ora equivale a prendere il primo elemento (rows[0])
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, error: 'Credenziali non valide' });
    }

    // Confronto password (bcrypt è già asincrono, 'await' è corretto)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Credenziali non valide' });
    }

    // Creazione token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET, // Assicurati sia settato!
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token: token,
      user: { id: user.id, email: user.email, nome: user.nome }
    });

  } catch (err) {
    console.error("Errore durante il login:", err);
    // Passa l'errore al middleware di gestione errori
    next(err); 
  }
});


// ESEMPIO DI REFACTORING: Rotta di Registrazione (per db.prepare().run())
//
// 2. La rotta DEVE diventare 'async'
router.post('/register', async (req, res, next) => {
  const { email, password, nome, cognome } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // 3. REFACTORING da db.prepare().run()
    //
    // === VECCHIO CODICE (Sincrono con better-sqlite3) ===
    // const stmt = db.prepare('INSERT INTO users (email, password, nome, cognome) VALUES (?, ?, ?, ?)');
    // const info = stmt.run(email, hashedPassword, nome, cognome);
    // const newUserId = info.lastInsertRowid;
    //
    // === NUOVO CODICE (Asincrono con @libsql/client) ===
    const insertResult = await db.execute({
      sql: 'INSERT INTO users (email, password, nome, cognome) VALUES (?, ?, ?, ?)',
      args: [email, hashedPassword, nome, cognome]
    });
    
    // 4. 'run()' ora restituisce 'lastInsertRowid' direttamente nel risultato
    const newUserId = insertResult.lastInsertRowid;
    
    res.status(201).json({ 
      success: true, 
      message: 'Utente registrato', 
      userId: newUserId 
    });

  } catch (err) {
    console.error("Errore durante la registrazione:", err);
    // Gestione degli errori (es. email duplicata)
    if (err.message && err.message.includes('UNIQUE constraint failed')) { // Il messaggio di errore può variare
       return res.status(409).json({ success: false, error: 'Email già in uso' });
    }
    next(err);
  }
});


// ESEMPIO DI REFACTORING: Rotta 'all()' (per db.prepare().all())
//
// 2. La rotta DEVE diventare 'async'
router.get('/clients/:userId', async (req, res, next) => {
  const { userId } = req.params;

  try {
    // 3. REFACTORING da db.prepare().all()
    //
    // === VECCHIO CODICE (Sincrono con better-sqlite3) ===
    // const stmt = db.prepare('SELECT * FROM clients WHERE user_id = ?');
    // const clients = stmt.all(userId);
    //
    // === NUOVO CODICE (Asincrono con @libsql/client) ===
    const clientsResult = await db.execute({
      sql: 'SELECT * FROM clients WHERE user_id = ?',
      args: [userId]
    });

    // 4. 'all()' ora equivale a prendere 'rows'
    const clients = clientsResult.rows;

    res.json({
      success: true,
      clients: clients
    });

  } catch (err) {
    console.error("Errore nel recupero clienti:", err);
    next(err);
  }
});


export default router;
