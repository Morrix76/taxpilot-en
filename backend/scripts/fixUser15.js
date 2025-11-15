// Script per correggere IMMEDIATAMENTE l'utente 15
// Run: node backend/scripts/fixUser15.js

import { db } from '../db.js';

async function fixUser15() {
  const userId = 15;
  
  console.log('\n🚨 FIX URGENTE per User 15');
  console.log('═'.repeat(50));

  try {
    // 1. Stato attuale
    const userResult = await db.execute({
      sql: `SELECT id, email, documents_used, documents_limit FROM users WHERE id = ?`,
      args: [userId]
    });

    const user = userResult.rows[0];
    if (!user) {
      console.log(`❌ User ${userId} non trovato!`);
      process.exit(1);
    }

    console.log(`\n📧 User: ${user.email}`);
    console.log(`📊 Stato PRIMA della correzione:`);
    console.log(`   - documents_used (DB): ${user.documents_used}`);
    console.log(`   - documents_limit: ${user.documents_limit}`);

    // 2. Conta documenti reali
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM documents WHERE user_id = ?`,
      args: [userId]
    });

    const realCount = countResult.rows[0]?.total || 0;
    console.log(`   - Documenti REALI: ${realCount}`);
    console.log(`   - Discrepanza: ${user.documents_used - realCount}\n`);

    if (user.documents_used === realCount) {
      console.log('✅ Il contatore è già corretto! Niente da fare.\n');
      process.exit(0);
    }

    // 3. Correggi
    console.log('🔧 Correzione in corso...');
    await db.execute({
      sql: `UPDATE users SET documents_used = ? WHERE id = ?`,
      args: [realCount, userId]
    });

    // 4. Verifica
    const verifyResult = await db.execute({
      sql: `SELECT documents_used FROM users WHERE id = ?`,
      args: [userId]
    });

    const newValue = verifyResult.rows[0]?.documents_used;
    console.log(`\n📊 Stato DOPO la correzione:`);
    console.log(`   - documents_used (DB): ${newValue}`);
    console.log(`   - Documenti REALI: ${realCount}`);
    
    if (newValue === realCount) {
      console.log(`\n✅ SUCCESSO! Contatore corretto da ${user.documents_used} a ${newValue}`);
      console.log(`✅ L'utente può ora caricare ${user.documents_limit - newValue} documenti rimanenti\n`);
    } else {
      console.log(`\n❌ ERRORE: Il contatore è ancora sbagliato!\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERRORE:', error);
    process.exit(1);
  }
}

// Esegui
fixUser15()
  .then(() => {
    console.log('🎉 Fix completato!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix fallito:', error);
    process.exit(1);
  });

