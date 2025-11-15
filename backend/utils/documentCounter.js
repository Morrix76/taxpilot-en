// File: backend/utils/documentCounter.js
// Utility per sincronizzare il contatore documenti con il database

import { db } from '../db.js';

/**
 * Sincronizza il campo documents_used con il COUNT reale dalla tabella documents
 * @param {number} userId - ID dell'utente
 * @returns {Promise<number>} - Il nuovo conteggio documenti
 */
export async function syncDocumentCount(userId) {
  try {
    // 1. Conta i documenti reali nella tabella documents
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM documents WHERE user_id = ?`,
      args: [userId]
    });
    
    const realCount = countResult.rows[0]?.total || 0;
    
    // 2. Aggiorna users.documents_used con il conteggio reale
    await db.execute({
      sql: `UPDATE users SET documents_used = ? WHERE id = ?`,
      args: [realCount, userId]
    });
    
    console.log(`✅ Sincronizzato documents_used per user ${userId}: ${realCount} documenti`);
    return realCount;
    
  } catch (error) {
    console.error(`❌ Errore sincronizzazione documents_used per user ${userId}:`, error);
    throw error;
  }
}

/**
 * Ottiene il conteggio reale dei documenti di un utente
 * @param {number} userId - ID dell'utente
 * @returns {Promise<number>} - Il conteggio documenti
 */
export async function getDocumentCount(userId) {
  try {
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM documents WHERE user_id = ?`,
      args: [userId]
    });
    
    return countResult.rows[0]?.total || 0;
  } catch (error) {
    console.error(`❌ Errore recupero conteggio documenti per user ${userId}:`, error);
    return 0;
  }
}

/**
 * Verifica e corregge eventuali discrepanze nel contatore
 * @param {number} userId - ID dell'utente
 * @returns {Promise<{synced: boolean, realCount: number, previousCount: number}>}
 */
export async function verifyAndSyncDocumentCount(userId) {
  try {
    // Ottieni il valore corrente in users.documents_used
    const userResult = await db.execute({
      sql: `SELECT documents_used FROM users WHERE id = ?`,
      args: [userId]
    });
    
    const previousCount = userResult.rows[0]?.documents_used || 0;
    
    // Ottieni il conteggio reale
    const realCount = await getDocumentCount(userId);
    
    // Se c'è discrepanza, sincronizza
    if (previousCount !== realCount) {
      console.warn(`⚠️  Discrepanza rilevata per user ${userId}: DB=${previousCount}, Reale=${realCount}`);
      await syncDocumentCount(userId);
      return {
        synced: true,
        realCount,
        previousCount,
        difference: realCount - previousCount
      };
    }
    
    console.log(`✅ Contatore già sincronizzato per user ${userId}: ${realCount} documenti`);
    return {
      synced: false,
      realCount,
      previousCount
    };
    
  } catch (error) {
    console.error(`❌ Errore verifica/sincronizzazione per user ${userId}:`, error);
    throw error;
  }
}

