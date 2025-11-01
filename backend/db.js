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
    await db.execute({ sql: 'SELECT 1', args: [] });
    console.log('✅ Database inizializzato');
  } catch (error) {
    console.error('❌ Errore connessione database:', error);
    throw error;
  }
}

/**
 * Salva un nuovo documento - ADATTATO ALLA STRUTTURA ESISTENTE
 */
export async function saveDocument(documentData) {
  try {
    const result = await db.execute({
      sql: `INSERT INTO documents (
        user_id,
        client_id,
        file_name,
        file_path,
        file_type,
        category,
        ocr_data,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        documentData.user_id,
        documentData.client_id || null,
        documentData.original_filename || documentData.name || 'unknown',
        documentData.file_path,
        documentData.type || documentData.mime_type || 'application/octet-stream',
        documentData.document_category || 'general',
        JSON.stringify({
          ai_analysis: documentData.ai_analysis,
          ai_status: documentData.ai_status,
          ai_confidence: documentData.ai_confidence,
          ai_issues: documentData.ai_issues,
          analysis_result: documentData.analysis_result,
          file_size: documentData.file_size,
          mime_type: documentData.mime_type,
          processing_version: documentData.processing_version
        }),
        documentData.ai_status || 'completed'
      ]
    });

    // Recupera documento inserito
    const insertedDoc = await db.execute({
      sql: 'SELECT * FROM documents WHERE id = last_insert_rowid()',
      args: []
    });

    // Mappa a formato atteso dal frontend
    const doc = insertedDoc.rows[0];
    return {
      id: doc.id,
      user_id: doc.user_id,
      client_id: doc.client_id,
      original_filename: doc.file_name,
      file_path: doc.file_path,
      type: doc.file_type,
      document_category: doc.category,
      created_at: doc.created_at,
      ai_status: JSON.parse(doc.ocr_data || '{}').ai_status || doc.status,
      ai_analysis: JSON.parse(doc.ocr_data || '{}').ai_analysis || '',
      ai_confidence: JSON.parse(doc.ocr_data || '{}').ai_confidence || 0,
      ai_issues: JSON.parse(doc.ocr_data || '{}').ai_issues || '[]',
      analysis_result: JSON.parse(doc.ocr_data || '{}').analysis_result || '{}',
      file_size: JSON.parse(doc.ocr_data || '{}').file_size || 0,
      flag_manual_review: false
    };
  } catch (error) {
    console.error('❌ Errore salvataggio documento:', error);
    throw error;
  }
}

/**
 * Recupera tutti i documenti
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
    
    // Mappa a formato atteso
    return result.rows.map(doc => ({
      id: doc.id,
      user_id: doc.user_id,
      client_id: doc.client_id,
      original_filename: doc.file_name,
      file_path: doc.file_path,
      type: doc.file_type,
      document_category: doc.category,
      created_at: doc.created_at,
      ai_status: JSON.parse(doc.ocr_data || '{}').ai_status || doc.status,
      ai_analysis: JSON.parse(doc.ocr_data || '{}').ai_analysis || '',
      ai_confidence: JSON.parse(doc.ocr_data || '{}').ai_confidence || 0,
      ai_issues: JSON.parse(doc.ocr_data || '{}').ai_issues || '[]',
      analysis_result: JSON.parse(doc.ocr_data || '{}').analysis_result || '{}',
      file_size: JSON.parse(doc.ocr_data || '{}').file_size || 0,
      flag_manual_review: false
    }));
  } catch (error) {
    console.error('❌ Errore recupero documenti:', error);
    throw error;
  }
}

/**
 * Recupera documento per ID
 */
export async function getDocumentById(id) {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM documents WHERE id = ?',
      args: [id]
    });
    
    if (!result.rows[0]) return null;
    
    const doc = result.rows[0];
    return {
      id: doc.id,
      user_id: doc.user_id,
      client_id: doc.client_id,
      original_filename: doc.file_name,
      file_path: doc.file_path,
      type: doc.file_type,
      document_category: doc.category,
      created_at: doc.created_at,
      ai_status: JSON.parse(doc.ocr_data || '{}').ai_status || doc.status,
      ai_analysis: JSON.parse(doc.ocr_data || '{}').ai_analysis || '',
      ai_confidence: JSON.parse(doc.ocr_data || '{}').ai_confidence || 0,
      ai_issues: JSON.parse(doc.ocr_data || '{}').ai_issues || '[]',
      analysis_result: JSON.parse(doc.ocr_data || '{}').analysis_result || '{}',
      file_size: JSON.parse(doc.ocr_data || '{}').file_size || 0,
      mime_type: JSON.parse(doc.ocr_data || '{}').mime_type || 'application/octet-stream',
      flag_manual_review: false
    };
  } catch (error) {
    console.error('❌ Errore recupero documento:', error);
    throw error;
  }
}

/**
 * Aggiorna documento
 */
export async function updateDocument(id, updateData) {
  try {
    // Recupera documento corrente per merge
    const current = await getDocumentById(id);
    if (!current) throw new Error('Documento non trovato');
    
    const currentOcrData = JSON.parse(current.ocr_data || '{}');
    
    // Mappa campi a struttura tabella
    const updates = {};
    
    if (updateData.client_id !== undefined) updates.client_id = updateData.client_id;
    if (updateData.document_category !== undefined) updates.category = updateData.document_category;
    if (updateData.file_path !== undefined) updates.file_path = updateData.file_path;
    if (updateData.ai_status !== undefined) updates.status = updateData.ai_status;
    
    // Aggiorna ocr_data con nuovi campi AI
    const newOcrData = {
      ...currentOcrData,
      ai_analysis: updateData.ai_analysis || currentOcrData.ai_analysis,
      ai_status: updateData.ai_status || currentOcrData.ai_status,
      ai_confidence: updateData.ai_confidence !== undefined ? updateData.ai_confidence : currentOcrData.ai_confidence,
      ai_issues: updateData.ai_issues || currentOcrData.ai_issues,
      analysis_result: updateData.analysis_result || currentOcrData.analysis_result
    };
    
    updates.ocr_data = JSON.stringify(newOcrData);
    updates.last_modified = new Date().toISOString();
    
    // Costruisci query
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    
    await db.execute({
      sql: `UPDATE documents SET ${fields} WHERE id = ?`,
      args: [...values, id]
    });
    
    return await getDocumentById(id);
  } catch (error) {
    console.error('❌ Errore aggiornamento documento:', error);
    throw error;
  }
}

/**
 * Elimina documento
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
 * Statistiche sistema
 */
export async function getSystemStats() {
  try {
    const totalDocs = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM documents',
      args: []
    });
    
    const byType = await db.execute({
      sql: 'SELECT file_type, COUNT(*) as count FROM documents GROUP BY file_type',
      args: []
    });
    
    const byCategory = await db.execute({
      sql: 'SELECT category, COUNT(*) as count FROM documents GROUP BY category',
      args: []
    });
    
    return {
      total_documents: totalDocs.rows[0].count,
      by_type: byType.rows.reduce((acc, row) => {
        acc[row.file_type] = row.count;
        return acc;
      }, {}),
      by_category: byCategory.rows.reduce((acc, row) => {
        acc[row.category || 'general'] = row.count;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('❌ Errore statistiche:', error);
    throw error;
  }
}