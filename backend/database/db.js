import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crea cartella database se non esiste
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

// Inizializza database
const dbPath = path.join(dbDir, 'tax_assistant.db');
export const db = new Database(dbPath);

// Crea tabelle se non esistono
function initializeDatabase() {
  console.log('📄 Inizializzando database...');

  // Tabella documenti AGGIORNATA con campi contabili E classifier
  const createDocumentsTable = `
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_path TEXT,
      file_size INTEGER,
      mime_type TEXT,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'Elaborato',
      ai_analysis TEXT,
      ai_status TEXT,
      ai_confidence REAL,
      ai_issues TEXT,
      analysis_result TEXT,
      confidence REAL,
      flag_manual_review INTEGER DEFAULT 0,
      processing_version TEXT DEFAULT '1.0.0',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      -- NUOVI CAMPI CONTABILI
      accounting_entries TEXT,
      accounting_csv TEXT,
      accounting_status TEXT DEFAULT 'NOT_AVAILABLE',
      accounting_messages TEXT,
      -- CAMPI CLASSIFIER
      client_id INTEGER,
      document_category TEXT DEFAULT 'altri'
    )
  `;

  // CORREZIONE: Aggiornata la tabella users con tutte le colonne per il trial
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
      documents_limit INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // AGGIUNTA: Tabella per il reset della password
  const createPasswordResetsTable = `
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // NUOVO: Tabella piani billing
  const createPianiTable = `
    CREATE TABLE IF NOT EXISTS piani (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      prezzo DECIMAL(10,2) NOT NULL,
      documenti_mensili INTEGER,
      storage_mb INTEGER,
      features TEXT,
      attivo BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // NUOVO: Tabella fatture
  const createFattureTable = `
    CREATE TABLE IF NOT EXISTS fatture (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      numero_fattura TEXT UNIQUE NOT NULL,
      piano_id INTEGER NOT NULL,
      periodo_da DATE NOT NULL,
      periodo_a DATE NOT NULL,
      importo DECIMAL(10,2) NOT NULL,
      status TEXT DEFAULT 'pending',
      data_pagamento DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (piano_id) REFERENCES piani(id)
    )
  `;

  try {
    db.exec(createDocumentsTable);
    console.log('✅ Tabella documents pronta con campi contabili e classifier.');
    
    // Aggiungi campi contabili e classifier se la tabella esiste già 
    addNewFieldsIfNeeded();
    
    db.exec(createUsersTable);
    console.log('✅ Tabella users aggiornata con campi trial.');

    // Aggiungi campi billing alla tabella users
    addBillingFieldsIfNeeded();

    db.exec(createPasswordResetsTable);
    console.log('✅ Tabella password_resets creata.');

    // NUOVO: Crea tabelle billing
    db.exec(createPianiTable);
    console.log('✅ Tabella piani creata.');

    // Inserisci piani di default se non esistono
    insertDefaultPiani();

    db.exec(createFattureTable);
    console.log('✅ Tabella fatture creata.');
    
    console.log('✅ Database inizializzato con successo');
  } catch (error) {
    console.error('❌ Errore inizializzazione database:', error);
  }
}

/**
 * AGGIORNATA: Aggiunge campi contabili E classifier a tabella esistente
 */
function addNewFieldsIfNeeded() {
  try {
    console.log('🔧 Verifica campi aggiuntivi...');
    
    // Controlla se i campi esistono già 
    const tableInfo = db.prepare("PRAGMA table_info(documents)").all();
    const existingColumns = tableInfo.map(col => col.name);
    
    const newFields = [
      { name: 'accounting_entries', type: 'TEXT' },
      { name: 'accounting_csv', type: 'TEXT' },
      { name: 'accounting_status', type: 'TEXT DEFAULT \'NOT_AVAILABLE\'' },
      { name: 'accounting_messages', type: 'TEXT' },
      { name: 'client_id', type: 'INTEGER' },
      { name: 'document_category', type: 'TEXT DEFAULT \'altri\'' }
    ];
    
    let fieldsAdded = 0;
    
    for (const field of newFields) {
      if (!existingColumns.includes(field.name)) {
        try {
          const alterSQL = `ALTER TABLE documents ADD COLUMN ${field.name} ${field.type}`;
          db.exec(alterSQL);
          console.log(`✅ Campo aggiunto: ${field.name}`);
          fieldsAdded++;
        } catch (error) {
          console.warn(`⚠️ Errore aggiunta campo ${field.name}:`, error.message);
        }
      }
    }
    
    if (fieldsAdded > 0) {
      console.log(`✅ Aggiunti ${fieldsAdded} nuovi campi alla tabella documents.`);
    } else {
      console.log('✅ Tutti i campi sono già presenti.');
    }
    
  } catch (error) {
    console.error('❌ Errore durante verifica/aggiunta campi:', error);
  }
}

/**
 * NUOVO: Aggiunge campi billing alla tabella users
 */
function addBillingFieldsIfNeeded() {
  try {
    console.log('💰 Verifica campi billing users...');
    
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const existingColumns = tableInfo.map(col => col.name);
    
    const billingFields = [
      { name: 'piano_id', type: 'INTEGER DEFAULT 1' },
      { name: 'piano_data_inizio', type: 'DATETIME' },
      { name: 'piano_data_fine', type: 'DATETIME' },
      { name: 'documenti_utilizzati', type: 'INTEGER DEFAULT 0' },
      { name: 'storage_utilizzato', type: 'INTEGER DEFAULT 0' },
      { name: 'settings_preferences', type: 'TEXT DEFAULT "{}"' },
      { name: 'settings_ai', type: 'TEXT DEFAULT "{}"' },
      { name: 'settings_notifications', type: 'TEXT DEFAULT "{}"' },
      { name: 'settings_security', type: 'TEXT DEFAULT "{}"' },
      { name: 'nome_studio', type: 'TEXT' },
      { name: 'telefono', type: 'TEXT' },
      { name: 'partita_iva', type: 'TEXT' },
      { name: 'codice_fiscale', type: 'TEXT' },
      { name: 'indirizzo', type: 'TEXT' },
      { name: 'sito_web', type: 'TEXT' }
    ];
    
    let fieldsAdded = 0;
    
    for (const field of billingFields) {
      if (!existingColumns.includes(field.name)) {
        try {
          const alterSQL = `ALTER TABLE users ADD COLUMN ${field.name} ${field.type}`;
          db.exec(alterSQL);
          console.log(`✅ Campo billing aggiunto: ${field.name}`);
          fieldsAdded++;
        } catch (error) {
          console.warn(`⚠️ Errore aggiunta campo billing ${field.name}:`, error.message);
        }
      }
    }
    
    if (fieldsAdded > 0) {
      console.log(`✅ Aggiunti ${fieldsAdded} campi billing alla tabella users.`);
      
      // Aggiorna utenti esistenti con piano trial
      try {
        const updateStmt = db.prepare(`
          UPDATE users SET 
            piano_id = 1,
            piano_data_inizio = CURRENT_TIMESTAMP,
            piano_data_fine = datetime(CURRENT_TIMESTAMP, '+30 days')
          WHERE piano_id IS NULL OR piano_id = 0
        `);
        const result = updateStmt.run();
        if (result.changes > 0) {
          console.log(`✅ ${result.changes} utenti aggiornati con piano trial`);
        }
      } catch (error) {
        console.warn('⚠️ Errore aggiornamento utenti trial:', error.message);
      }
    } else {
      console.log('✅ Tutti i campi billing sono già presenti.');
    }
    
  } catch (error) {
    console.error('❌ Errore durante verifica/aggiunta campi billing:', error);
  }
}

/**
 * NUOVO: Inserisce piani di default se non esistono
 */
function insertDefaultPiani() {
  try {
    // Controlla se esistono già piani
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM piani");
    const count = countStmt.get().count;
    
    if (count === 0) {
      console.log('💰 Inserimento piani di default...');
      
      const insertStmt = db.prepare(`
        INSERT INTO piani (nome, prezzo, documenti_mensili, storage_mb, features) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const defaultPiani = [
        ['trial', 0.00, 20, 500, '["Analisi AI base", "Supporto community"]'],
        ['standard', 29.00, 100, 5120, '["Analisi AI avanzata", "Dashboard completa", "Supporto email"]'],
        ['premium', 49.00, null, 51200, '["Documenti illimitati", "AI + Correzione automatica", "API access", "Supporto prioritario"]'],
        ['enterprise', 99.00, null, null, '["Volume illimitato", "Multi-utente", "Storage illimitato", "Account manager"]']
      ];
      
      for (const piano of defaultPiani) {
        insertStmt.run(...piano);
      }
      
      console.log('✅ 4 piani di default inseriti');
    } else {
      console.log(`✅ Piani già presenti: ${count}`);
    }
    
  } catch (error) {
    console.error('❌ Errore inserimento piani default:', error);
  }
}

// --- Logica per i Documenti (AGGIORNATA) ---

const DocumentsDB = {
  getAll() {
    // AGGIORNATA: Aggiunti client_id e document_category nella SELECT
    const stmt = db.prepare(`
      SELECT id, name, type, original_filename, file_path, upload_date as date, 
             status, ai_status, confidence, flag_manual_review,
             accounting_entries, accounting_csv, accounting_status, accounting_messages,
             client_id, document_category
      FROM documents 
      ORDER BY created_at DESC
    `);
    return stmt.all();
  },
  
  getById(id) {
    const stmt = db.prepare(`SELECT * FROM documents WHERE id = ?`);
    return stmt.get(id);
  },
  
  create(documentData) {
    const safeValue = (value, defaultValue = null) => (value === undefined || value === null) ? defaultValue : (typeof value === 'object' ? JSON.stringify(value) : value);
    
    const values = {
      name: safeValue(documentData.name, 'Documento'),
      type: safeValue(documentData.type, 'Documento Fiscale'),
      original_filename: safeValue(documentData.original_filename || documentData.name, 'file'),
      file_path: safeValue(documentData.file_path),
      file_size: safeValue(documentData.file_size, 0),
      mime_type: safeValue(documentData.mime_type, 'application/octet-stream'),
      ai_analysis: safeValue(documentData.ai_analysis),
      ai_status: safeValue(documentData.ai_status, 'unknown'),
      ai_confidence: safeValue(documentData.ai_confidence, 0.5),
      ai_issues: safeValue(documentData.ai_issues, '[]'),
      analysis_result: safeValue(documentData.analysis_result, '{}'),
      confidence: safeValue(documentData.confidence, 0.5),
      flag_manual_review: safeValue(documentData.flag_manual_review, false) ? 1 : 0,
      processing_version: safeValue(documentData.processing_version, '3.3.0'),
      // CAMPI CONTABILI
      accounting_entries: safeValue(documentData.accounting_entries, '[]'),
      accounting_csv: safeValue(documentData.accounting_csv, ''),
      accounting_status: safeValue(documentData.accounting_status, 'NOT_AVAILABLE'),
      accounting_messages: safeValue(documentData.accounting_messages, '[]'),
      // CAMPI CLASSIFIER
      client_id: safeValue(documentData.client_id),
      document_category: safeValue(documentData.document_category, 'altri')
    };
    
    const stmt = db.prepare(`
      INSERT INTO documents (
        name, type, original_filename, file_path, file_size, mime_type, 
        ai_analysis, ai_status, ai_confidence, ai_issues, analysis_result, 
        confidence, flag_manual_review, processing_version,
        accounting_entries, accounting_csv, accounting_status, accounting_messages,
        client_id, document_category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(Object.values(values));
    return this.getById(result.lastInsertRowid);
  },
  
  update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const stmt = db.prepare(`UPDATE documents SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values, id);
    return this.getById(id);
  },
  
  delete(id) {
    const stmt = db.prepare('DELETE FROM documents WHERE id = ?');
    return stmt.run(id).changes > 0;
  },
  
  getStats() {
    const totalStmt = db.prepare('SELECT COUNT(*) as total FROM documents');
    const todayStmt = db.prepare(`SELECT COUNT(*) as today FROM documents WHERE DATE(created_at) = DATE('now')`);
    const errorStmt = db.prepare(`SELECT COUNT(*) as errors FROM documents WHERE ai_status = 'error' OR flag_manual_review = 1`);
    
    // NUOVE STATISTICHE CONTABILI
    const accountingStmt = db.prepare(`SELECT COUNT(*) as with_accounting FROM documents WHERE accounting_status = 'OK'`);
    const accountingErrorStmt = db.prepare(`SELECT COUNT(*) as accounting_errors FROM documents WHERE accounting_status = 'ERROR'`);
    
    const baseStats = { 
      total: totalStmt.get().total, 
      today: todayStmt.get().today, 
      errors: errorStmt.get().errors 
    };
    
    const accountingStats = {
      with_accounting: accountingStmt.get().with_accounting,
      accounting_errors: accountingErrorStmt.get().accounting_errors
    };
    
    return { ...baseStats, ...accountingStats };
  },

  // NUOVA FUNZIONE: Statistiche specifiche contabili
  getAccountingStats() {
    try {
      const statsQuery = db.prepare(`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(CASE WHEN accounting_status = 'OK' THEN 1 END) as documents_with_accounting,
          COUNT(CASE WHEN accounting_status = 'ERROR' THEN 1 END) as accounting_errors,
          COUNT(CASE WHEN accounting_status = 'SKIPPED' THEN 1 END) as accounting_skipped,
          COUNT(CASE WHEN accounting_entries IS NOT NULL AND accounting_entries != '[]' THEN 1 END) as with_entries
        FROM documents
      `);
      
      const stats = statsQuery.get();
      
      return {
        total_documents: stats.total_documents,
        documents_with_accounting: stats.documents_with_accounting,
        accounting_errors: stats.accounting_errors,
        accounting_skipped: stats.accounting_skipped,
        with_entries: stats.with_entries,
        success_rate: stats.total_documents > 0 ? 
          Math.round((stats.documents_with_accounting / stats.total_documents) * 100) : 0
      };
      
    } catch (error) {
      console.error('❌ Errore calcolo statistiche contabili:', error);
      return {
        total_documents: 0,
        documents_with_accounting: 0,
        accounting_errors: 0,
        accounting_skipped: 0,
        with_entries: 0,
        success_rate: 0
      };
    }
  },

  // NUOVA: Documenti per cliente
  getByClientId(clientId) {
    const stmt = db.prepare(`
      SELECT * FROM documents 
      WHERE client_id = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(clientId);
  }
};

// API Functions per compatibilità 
export const saveDocument = (data) => DocumentsDB.create(data);
export const getAllDocuments = () => DocumentsDB.getAll();
export const getDocumentById = (id) => DocumentsDB.getById(id);
export const deleteDocument = (id) => DocumentsDB.delete(id);
export const updateDocument = (id, updates) => DocumentsDB.update(id, updates);
export const getSystemStats = () => DocumentsDB.getStats();

// NUOVA EXPORT: Statistiche contabili
export const getAccountingStats = () => DocumentsDB.getAccountingStats();

// NUOVA EXPORT: Documenti per cliente
export const getDocumentsByClientId = (clientId) => DocumentsDB.getByClientId(clientId);

// Inizializza database all'avvio
initializeDatabase();

// Chiudi database correttamente
process.on('exit', () => db.close());
process.on('SIGINT', () => { db.close(); process.exit(0); });

// Export default
export default { db, DocumentsDB };