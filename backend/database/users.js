import bcrypt from 'bcrypt';
import crypto from 'crypto';
// CORREZIONE: Importa direttamente l'oggetto 'db' esportato, risolvendo l'errore di inizializzazione.
import { db } from './db.js';

const SALT_ROUNDS = 10;
const TRIAL_DURATION_DAYS = 15; // Cambiato da 12 a 15 giorni
const TRIAL_DOCUMENTS_LIMIT = 15; // Cambiato da 20 a 15 documenti

/**
 * Inizializza le tabelle 'users' e 'password_resets' se non esistono.
 */
export function initializeUsersDatabase() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      email_verified BOOLEAN DEFAULT 0,
      trial_start_date DATETIME,
      trial_end_date DATETIME,
      documents_used INTEGER DEFAULT 0,
      documents_limit INTEGER DEFAULT ${TRIAL_DOCUMENTS_LIMIT},
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createPasswordResetsTable = `
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    db.exec(createUsersTable);
    db.exec(createPasswordResetsTable);
    console.log('✅ Tabelle Utenti e PasswordReset inizializzate.');
  } catch (error) {
    console.error('❌ Errore inizializzazione tabelle utenti:', error);
  }
}

/**
 * Crea un nuovo utente con un periodo di prova.
 * @param {object} userData - Dati utente { name, email, password }.
 * @returns {object} L'utente creato.
 */
export async function createUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  const trialStartDate = new Date();
  const trialEndDate = new Date();
  trialEndDate.setDate(trialStartDate.getDate() + TRIAL_DURATION_DAYS);

  const stmt = db.prepare(`
    INSERT INTO users (name, email, password_hash, trial_start_date, trial_end_date, documents_limit)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *;
  `);

  try {
    const newUser = stmt.get(
      name,
      email.toLowerCase(),
      passwordHash,
      trialStartDate.toISOString(),
      trialEndDate.toISOString(),
      TRIAL_DOCUMENTS_LIMIT
    );
    return newUser;
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Un utente con questa email esiste già.');
    }
    throw error;
  }
}

/**
 * Trova un utente tramite email.
 * @param {string} email - L'email dell'utente.
 * @returns {object|null}
 */
export function getUserByEmail(email) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email.toLowerCase());
}

/**
 * Trova un utente tramite ID.
 * @param {number} id - L'ID dell'utente.
 * @returns {object|null}
 */
export function getUserById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id);
}

/**
 * Aggiorna i dati di un utente.
 * @param {number} id - L'ID dell'utente.
 * @param {object} updates - I campi da aggiornare.
 * @returns {object} L'utente aggiornato.
 */
export function updateUser(id, updates) {
  updates.updated_at = new Date().toISOString();
  const fields = Object.keys(updates).map(field => `${field} = ?`).join(', ');
  const values = Object.values(updates);

  const stmt = db.prepare(`UPDATE users SET ${fields} WHERE id = ? RETURNING *;`);
  return stmt.get(...values, id);
}

/**
 * Crea un token per il reset della password.
 * @param {string} email - L'email per cui creare il token.
 * @returns {string} Il token generato.
 */
export function createPasswordReset(email) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // Valido per 1 ora

  const stmt = db.prepare(`INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)`);
  stmt.run(email.toLowerCase(), token, expiresAt.toISOString());
  return token;
}

/**
 * Recupera una richiesta di reset password tramite token.
 * @param {string} token - Il token di reset.
 * @returns {object|null}
 */
export function getPasswordReset(token) {
  const stmt = db.prepare('SELECT * FROM password_resets WHERE token = ?');
  return stmt.get(token);
}

/**
 * Elimina un token di reset password.
 * @param {string} token - Il token da eliminare.
 */
export function deletePasswordReset(token) {
  const stmt = db.prepare('DELETE FROM password_resets WHERE token = ?');
  stmt.run(token);
}