/**
 * Client DB minimale per script standalone
 * Evita di inizializzare servizi non necessari (pipeline, AI, etc.)
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Carica variabili d'ambiente
dotenv.config();

// Verifica che le variabili necessarie siano presenti
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("❌ TURSO_DATABASE_URL not set");
  process.exit(1);
}

if (!authToken) {
  console.error("❌ TURSO_AUTH_TOKEN not set");
  process.exit(1);
}

// Crea il client Turso
const dbClient = createClient({
  url: url,
  authToken: authToken
});

/**
 * Esegue una query SQL
 * @param {string} sql - Query SQL da eseguire
 * @param {Array} args - Parametri della query (default: [])
 * @returns {Promise<Object>} Risultato della query con rows
 */
export async function query(sql, args = []) {
  try {
    const result = await dbClient.execute({
      sql: sql,
      args: args
    });
    return result;
  } catch (error) {
    console.error('❌ Errore esecuzione query:', error.message);
    throw error;
  }
}

/**
 * Chiude la connessione al database (opzionale)
 */
export async function close() {
  // Turso client non richiede chiusura esplicita
  // Ma possiamo aggiungere log per coerenza
  console.log('✅ Connessione DB chiusa');
}

export default { query, close };

