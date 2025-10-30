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
        piano_id INTEGER DEFAULT 1,
        documenti_utilizzati INTEGER DEFAULT 0,
        storage_utilizzato INTEGER DEFAULT 0,
        piano_data_inizio DATETIME DEFAULT CURRENT_TIMESTAMP,
        piano_data_fine DATETIME DEFAULT (datetime('now', '+30 days')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS piani (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        prezzo REAL DEFAULT 0,
        documenti_mensili INTEGER DEFAULT 20,
        storage_mb INTEGER DEFAULT 100,
        features TEXT DEFAULT '[]',
        attivo INTEGER DEFAULT 1,
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
        name TEXT NOT NULL,
        type TEXT,
        original_filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        ai_analysis TEXT,
        ai_status TEXT DEFAULT 'pending',
        ai_confidence REAL DEFAULT 0,
        ai_issues TEXT DEFAULT '[]',
        analysis_result TEXT,
        confidence REAL DEFAULT 0,
        flag_manual_review INTEGER DEFAULT 0,
        processing_version TEXT,
        document_category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS fatture (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        numero_fattura TEXT NOT NULL,
        piano_id INTEGER,
        periodo_da DATE,
        periodo_a DATE,
        importo REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        data_pagamento DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (piano_id) REFERENCES piani (id)
      )`
    ], 'write');
    
    // Inserisci piano free di default se non esiste
    const pianiCheck = await db.execute('SELECT COUNT(*) as count FROM piani');
    if (pianiCheck.rows[0].count === 0) {
      await db.execute({
        sql: `INSERT INTO piani (nome, prezzo, documenti_mensili, storage_mb, features) 
              VALUES ('Free Trial', 0, 20, 100, '["Analisi AI", "Export CSV"]')`,
        args: []
      });
      console.log('✅ Piano Free Trial creato');
    }
    
    console.log('✅ Database inizializzato');
  } catch (e) {
    console.error('❌ Errore database:', e);
  }
}

// ========== FUNZIONI DOCUMENTS ==========

export async function getAllDocuments() {
  const result = await db.execute('SELECT * FROM documents ORDER BY created_at DESC');
  return result.rows;
}

export async function getDocumentById(id) {
  const result = await db.execute({
    sql: 'SELECT * FROM documents WHERE id = ?',
    args: [id]
  });
  return result.rows[0];
}

export async function saveDocument(documentData) {
  const result = await db.execute({
    sql: `INSERT INTO documents (
      user_id, client_id, name, type, original_filename, file_path, 
      file_size, mime_type, ai_analysis, ai_status, ai_confidence, 
      ai_issues, analysis_result, confidence, flag_manual_review, 
      processing_version, document_category
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      documentData.user_id,
      documentData.client_id,
      documentData.name,
      documentData.type,
      documentData.original_filename,
      documentData.file_path,
      documentData.file_size,
      documentData.mime_type,
      documentData.ai_analysis,
      documentData.ai_status,
      documentData.ai_confidence,
      documentData.ai_issues,
      documentData.analysis_result,
      documentData.confidence,
      documentData.flag_manual_review ? 1 : 0,
      documentData.processing_version,
      documentData.document_category
    ]
  });
  
  return await getDocumentById(result.lastInsertRowid);
}

export async function updateDocument(id, updateData) {
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(updateData)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  
  values.push(id);
  
  await db.execute({
    sql: `UPDATE documents SET ${fields.join(', ')} WHERE id = ?`,
    args: values
  });
  
  return await getDocumentById(id);
}

export async function deleteDocument(id) {
  await db.execute({
    sql: 'DELETE FROM documents WHERE id = ?',
    args: [id]
  });
}

export async function getSystemStats() {
  const docsResult = await db.execute('SELECT COUNT(*) as count FROM documents');
  const usersResult = await db.execute('SELECT COUNT(*) as count FROM users');
  const clientsResult = await db.execute('SELECT COUNT(*) as count FROM clients');
  
  return {
    total_documents: docsResult.rows[0].count,
    total_users: usersResult.rows[0].count,
    total_clients: clientsResult.rows[0].count
  };
}