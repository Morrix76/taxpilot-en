import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL not set");
  process.exit(1);
}

export const db = createClient({
  url: url,
  authToken: authToken
});

export async function initializeDatabase() {
  console.log('Inizializzazione database...');
  
  try {
    // Verifica connessione
    await db.execute({ sql: 'SELECT 1', args: [] });
    console.log('✅ Database inizializzato');
  } catch (error) {
    console.error('❌ Errore connessione database:', error);
    throw error;
  }
}

/**
 * Salva un nuovo documento nel database
 */
export async function saveDocument(documentData) {
  try {
    const result = await db.execute({
      sql: `INSERT INTO documents (
        user_id,
        original_filename,
        type,
        file_path,
        file_size,
        mime_type,
        ai_analysis,
        ai_status,
        ai_confidence,
        ai_issues,
        analysis_result,
        confidence,
        flag_manual_review,
        processing_version,
        client_id,
        document_category,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        documentData.user_id,
        documentData.original_filename || documentData.name,
        documentData.type,
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
        documentData.client_id,
        documentData.document_category
      ]
    });

    // Recupera il documento appena inserito
    const insertedDoc = await db.execute({
      sql: 'SELECT * FROM documents WHERE id = last_insert_rowid()',
      args: []
    });

    return insertedDoc.rows[0];
  } catch (error) {
    console.error('❌ Errore salvataggio documento:', error);
    throw error;
  }
}

/**
 * Recupera tutti i documenti di un utente
 */
export async function getAllDocuments(userId = null) {
  try {
    let query = 'SELECT * FROM documents';
    let args = [];
    
    if (userId) {
      query += ' WHERE user_id = ?';
      args.push(userId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await db.execute({ sql: query, args });
    return result.rows;
  } catch (error) {
    console.error('❌ Errore recupero documenti:', error);
    throw error;
  }
}

/**
 * Recupera un documento per ID
 */
export async function getDocumentById(id) {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM documents WHERE id = ?',
      args: [id]
    });
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Errore recupero documento:', error);
    throw error;
  }
}

/**
 * Aggiorna un documento
 */
export async function updateDocument(id, updateData) {
  try {
    // Costruisci la query dinamicamente in base ai campi forniti
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    
    if (fields.length === 0) {
      throw new Error('Nessun campo da aggiornare');
    }
    
    // Aggiungi updated_at
    fields.push('updated_at = datetime(\'now\')');
    values.push(id);
    
    const sql = `UPDATE documents SET ${fields.join(', ')} WHERE id = ?`;
    
    await db.execute({ sql, args: values });
    
    // Recupera il documento aggiornato
    return await getDocumentById(id);
  } catch (error) {
    console.error('❌ Errore aggiornamento documento:', error);
    throw error;
  }
}

/**
 * Elimina un documento
 */
export async function deleteDocument(id) {
  try {
    await db.execute({
      sql: 'DELETE FROM documents WHERE id = ?',
      args: [id]
    });
    
    return true;
  } catch (error) {
    console.error('❌ Errore eliminazione documento:', error);
    throw error;
  }
}

/**
 * Recupera statistiche di sistema
 */
export async function getSystemStats() {
  try {
    // Conta totale documenti
    const totalDocs = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM documents',
      args: []
    });
    
    // Conta documenti per status
    const byStatus = await db.execute({
      sql: `SELECT ai_status, COUNT(*) as count 
            FROM documents 
            GROUP BY ai_status`,
      args: []
    });
    
    // Conta documenti per tipo
    const byType = await db.execute({
      sql: `SELECT type, COUNT(*) as count 
            FROM documents 
            GROUP BY type`,
      args: []
    });
    
    // Documenti che richiedono revisione
    const needReview = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM documents WHERE flag_manual_review = 1',
      args: []
    });
    
    return {
      total_documents: totalDocs.rows[0].count,
      by_status: byStatus.rows.reduce((acc, row) => {
        acc[row.ai_status] = row.count;
        return acc;
      }, {}),
      by_type: byType.rows.reduce((acc, row) => {
        acc[row.type] = row.count;
        return acc;
      }, {}),
      need_review: needReview.rows[0].count
    };
  } catch (error) {
    console.error('❌ Errore recupero statistiche:', error);
    throw error;
  }
}