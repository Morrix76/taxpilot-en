// Script per correggere documents_used per TUTTI gli utenti
// Run: node backend/scripts/fixAllDocumentCounters.js

import { db } from '../db.js';

async function fixAllDocumentCounters() {
  console.log('\n🔧 Avvio correzione contatori documenti per TUTTI gli utenti...\n');
  console.log('═'.repeat(60));

  try {
    // 1. Ottieni tutti gli utenti
    const usersResult = await db.execute({
      sql: `SELECT id, email, documents_used FROM users ORDER BY id`,
      args: []
    });

    const users = usersResult.rows;
    console.log(`\n📊 Trovati ${users.length} utenti da verificare\n`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errors = [];

    // 2. Per ogni utente, verifica e correggi il contatore
    for (const user of users) {
      try {
        // Conta i documenti reali
        const countResult = await db.execute({
          sql: `SELECT COUNT(*) as total FROM documents WHERE user_id = ?`,
          args: [user.id]
        });

        const realCount = countResult.rows[0]?.total || 0;
        const currentCount = user.documents_used || 0;

        if (realCount !== currentCount) {
          // Discrepanza trovata - correggi
          console.log(`⚠️  User ${user.id} (${user.email})`);
          console.log(`   DB: ${currentCount} → Reale: ${realCount} (diff: ${realCount - currentCount})`);

          await db.execute({
            sql: `UPDATE users SET documents_used = ? WHERE id = ?`,
            args: [realCount, user.id]
          });

          console.log(`   ✅ CORRETTO\n`);
          fixedCount++;
        } else {
          // Già corretto
          console.log(`✅ User ${user.id} (${user.email}): ${realCount} documenti - OK`);
          alreadyCorrectCount++;
        }
      } catch (error) {
        console.error(`❌ Errore per user ${user.id}:`, error.message);
        errors.push({ userId: user.id, error: error.message });
      }
    }

    // 3. Riepilogo finale
    console.log('\n' + '═'.repeat(60));
    console.log('\n📋 RIEPILOGO CORREZIONE:');
    console.log(`   ✅ Già corretti: ${alreadyCorrectCount}`);
    console.log(`   🔧 Corretti ora: ${fixedCount}`);
    console.log(`   ❌ Errori: ${errors.length}`);
    console.log(`   📊 Totale utenti: ${users.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  ERRORI RISCONTRATI:');
      errors.forEach(err => {
        console.log(`   - User ${err.userId}: ${err.error}`);
      });
    }

    console.log('\n✅ Correzione completata!\n');

    // 4. Verifica finale
    console.log('🔍 Verifica finale...\n');
    const verification = await db.execute({
      sql: `
        SELECT 
          u.id,
          u.email,
          u.documents_used,
          (SELECT COUNT(*) FROM documents WHERE user_id = u.id) as real_count
        FROM users u
        WHERE u.documents_used != (SELECT COUNT(*) FROM documents WHERE user_id = u.id)
      `,
      args: []
    });

    if (verification.rows.length === 0) {
      console.log('✅ Tutti i contatori sono corretti!\n');
    } else {
      console.log(`⚠️  Ancora ${verification.rows.length} discrepanze:`, verification.rows);
    }

  } catch (error) {
    console.error('\n❌ ERRORE FATALE:', error);
    process.exit(1);
  }
}

// Esegui lo script
fixAllDocumentCounters()
  .then(() => {
    console.log('🎉 Script completato con successo!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script fallito:', error);
    process.exit(1);
  });

