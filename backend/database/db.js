import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Assicura che le variabili d'ambiente siano caricate
dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// Validazione delle variabili d'ambiente
if (!url) {
  console.error("❌ Errore Critico: TURSO_DATABASE_URL non è impostato nelle variabili d'ambiente.");
  console.log("ℹ️ Aggiungilo al tuo file .env o nelle 'Environment Variables' di Vercel.");
  process.exit(1); // Esce dall'applicazione se la configurazione DB non è presente
}

if (!authToken) {
  console.warn("⚠️ Attenzione: TURSO_AUTH_TOKEN non è impostato.");
  console.log("ℹ️ Questo è necessario per connettersi a un database Turso remoto (incluso Vercel).");
}

// Creazione del client Turso
export const db = createClient({
  url: url,
  authToken: authToken
});

console.log('✅ Client Turso (libSQL) configurato e pronto.');

/**
 * Inizializza il database creando le tabelle se non esistono.
 * Questo è un buon posto per definire lo schema.
 */
export async function initializeDatabase() {
  try {
    console.log('Inizializzazione database (creazione tabelle se non esistono)...');
    
    // Esegui tutte le query di creazione in un batch
    await db.batch([
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nome TEXT,
        cognome TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        nome_azienda TEXT NOT NULL,
        partita_iva TEXT,
        codice_fiscale TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT,
        category TEXT,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
        ocr_data TEXT,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );`,
      // ...Aggiungi qui le altre CREATE TABLE per (piano-conti, settings, billing, ecc.)...
    ], 'write'); // Esegui in modalità scrittura
    
    console.log('✅ Database inizializzato con successo.');
  } catch (e) {
    console.error('❌ Errore durante l'inizializzazione del database:', e);
    // In un ambiente di produzione, potresti voler gestire questo errore in modo più robusto
  }
}
