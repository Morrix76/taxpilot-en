/**
 * Script di manutenzione per aggiornare i limiti del trial
 * Aggiorna tutti gli utenti con plan_type='trial' o trial_end_date valido
 * a documents_limit=15 (se attualmente diverso da 15)
 * 
 * Usa un client DB minimale per evitare di inizializzare servizi non necessari
 */
import { query } from './dbClient.js';

async function fixTrialLimits() {
  console.log('🔧 Avvio correzione limiti trial...\n');

  try {
    // Step 1: Verifica connessione al database
    console.log('📡 Connessione al database...');
    await query('SELECT 1');
    console.log('✅ Connessione stabilita\n');

    // Step 2: Trova tutti gli utenti trial con documents_limit != 15
    console.log('🔍 Ricerca utenti trial con limiti errati...');
    const searchResult = await query(`
      SELECT 
        id, 
        email, 
        documents_limit, 
        documents_used,
        plan_type,
        trial_end_date
      FROM users 
      WHERE (
        plan_type = 'trial' 
        OR trial_end_date IS NOT NULL
      )
      AND documents_limit != 15
    `);

    const usersToUpdate = searchResult.rows;
    
    if (usersToUpdate.length === 0) {
      console.log('✅ Nessun utente da aggiornare. Tutti i trial hanno già documents_limit=15.\n');
      return;
    }

    console.log(`📋 Trovati ${usersToUpdate.length} utenti da aggiornare:\n`);
    
    // Step 3: Mostra dettagli utenti da aggiornare
    usersToUpdate.forEach((user, index) => {
      console.log(`   ${index + 1}. Email: ${user.email}`);
      console.log(`      - ID: ${user.id}`);
      console.log(`      - Limite attuale: ${user.documents_limit} documenti`);
      console.log(`      - Documenti usati: ${user.documents_used}`);
      console.log(`      - Plan type: ${user.plan_type || 'N/A'}`);
      console.log(`      - Trial end: ${user.trial_end_date || 'N/A'}`);
      console.log('');
    });

    // Step 4: Aggiorna tutti gli utenti
    console.log('🔄 Aggiornamento in corso...\n');
    
    let updatedCount = 0;
    let errorCount = 0;

    for (const user of usersToUpdate) {
      try {
        // Aggiorna documents_limit a 15
        // Se documents_used > 15, lo limitiamo a 15 per evitare overflow
        const newDocumentsUsed = Math.min(user.documents_used || 0, 15);
        
        await query(
          `UPDATE users 
           SET documents_limit = 15, documents_used = ?
           WHERE id = ?`,
          [newDocumentsUsed, user.id]
        );

        updatedCount++;
        
        if (user.documents_used !== newDocumentsUsed) {
          console.log(`   ✅ Utente ${user.email}: limit 15, used ${user.documents_used}→${newDocumentsUsed}`);
        } else {
          console.log(`   ✅ Utente ${user.email}: limit aggiornato a 15`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Errore aggiornamento utente ${user.email}:`, error.message);
      }
    }

    // Step 5: Riepilogo finale
    console.log('\n' + '='.repeat(60));
    console.log('📊 RIEPILOGO OPERAZIONE');
    console.log('='.repeat(60));
    console.log(`✅ Utenti aggiornati con successo: ${updatedCount}`);
    if (errorCount > 0) {
      console.log(`❌ Errori durante aggiornamento: ${errorCount}`);
    }
    console.log(`📝 Nuovo limite documenti per trial: 15`);
    console.log('='.repeat(60) + '\n');

    // Step 6: Verifica finale
    console.log('🔍 Verifica finale...');
    const verifyResult = await query(`
      SELECT COUNT(*) as count
      FROM users 
      WHERE (
        plan_type = 'trial' 
        OR trial_end_date IS NOT NULL
      )
      AND documents_limit != 15
    `);

    const remainingIncorrect = verifyResult.rows[0].count;
    
    if (remainingIncorrect === 0) {
      console.log('✅ Verifica completata: tutti i trial hanno documents_limit=15\n');
    } else {
      console.warn(`⚠️ Attenzione: ${remainingIncorrect} utenti hanno ancora limiti errati\n`);
    }

  } catch (error) {
    console.error('\n❌ ERRORE DURANTE L\'ESECUZIONE:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Esegui lo script
fixTrialLimits()
  .then(() => {
    console.log('🎉 Script completato con successo!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script terminato con errori:', error);
    process.exit(1);
  });
