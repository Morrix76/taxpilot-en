import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkAndFixUsersTable() {
  try {
    console.log('🔍 Controllo struttura tabella users...\n');

    // Mostra struttura attuale
    const tableInfo = await db.execute(`PRAGMA table_info(users)`);
    
    console.log('📋 Colonne attuali nella tabella users:');
    const existingColumns = [];
    for (const row of tableInfo.rows) {
      console.log(`  - ${row.name} (${row.type})`);
      existingColumns.push(row.name);
    }
    console.log('');

    // Colonne richieste
    const requiredColumns = {
      'trial_end_date': 'TEXT',
      'piano_id': 'INTEGER',
      'documents_used': 'INTEGER DEFAULT 0',
      'documents_limit': 'INTEGER DEFAULT 10',
      'piano_data_fine': 'TEXT'
    };

    const columnsToAdd = [];
    
    for (const [columnName, columnType] of Object.entries(requiredColumns)) {
      if (!existingColumns.includes(columnName)) {
        columnsToAdd.push({ name: columnName, type: columnType });
      }
    }

    if (columnsToAdd.length === 0) {
      console.log('✅ Tutte le colonne necessarie sono già presenti!');
      return;
    }

    console.log('⚠️  Colonne mancanti:', columnsToAdd.map(c => c.name).join(', '));
    console.log('\n🔧 Aggiungo colonne mancanti...\n');

    for (const column of columnsToAdd) {
      console.log(`  Aggiungendo ${column.name} (${column.type})...`);
      await db.execute(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
      console.log(`  ✅ ${column.name} aggiunta`);
    }

    console.log('\n✅ Tabella users aggiornata con successo!');
    
    // Verifica finale
    console.log('\n📋 Struttura finale della tabella users:');
    const finalInfo = await db.execute(`PRAGMA table_info(users)`);
    for (const row of finalInfo.rows) {
      console.log(`  - ${row.name} (${row.type})`);
    }

  } catch (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  }
}

checkAndFixUsersTable();