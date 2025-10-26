import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("❌ Errore: TURSO_DATABASE_URL non impostato");
  process.exit(1);
}

if (!authToken) {
  console.warn("⚠️ TURSO_AUTH_TOKEN non impostato");
}

export const db = createClient({
  url: url,
  authToken: authToken
});

console.log('✅ Client Turso configurato');

export async function initializeDatabase() {
  try {
    console.log('Inizializzazione database...');
    
    await db.batch([
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nome TEXT,
        cognome TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        nome_azienda TEXT NOT NULL,
        partita_iva TEXT,
        codice_fiscale TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,
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
      )`
    ], 'write');
    
    console.log('✅ Database inizializzato');
  } catch (e) {
    console.error('❌ Errore database:', e);
  }
}
