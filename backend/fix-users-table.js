import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function fixDatabase() {
  try {
    console.log('🔧 Fix database...\n');

    // Users
    const usersColumns = {
      'trial_end_date': 'TEXT',
      'piano_id': 'INTEGER',
      'documents_used': 'INTEGER DEFAULT 0',
      'documents_limit': 'INTEGER DEFAULT 10',
      'piano_data_fine': 'TEXT',
      'name': 'TEXT'
    };

    for (const [col, type] of Object.entries(usersColumns)) {
      try {
        await db.execute(`ALTER TABLE users ADD COLUMN ${col} ${type}`);
        console.log(`✅ users.${col} aggiunta`);
      } catch (e) {
        if (e.message.includes('duplicate')) {
          console.log(`⚠️  users.${col} già presente`);
        } else throw e;
      }
    }

    // Documents
    try {
      await db.execute(`ALTER TABLE documents ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))`);
      console.log(`✅ documents.created_at aggiunta`);
    } catch (e) {
      if (e.message.includes('duplicate')) {
        console.log(`⚠️  documents.created_at già presente`);
      } else throw e;
    }

    console.log('\n✅ Fix completato');
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

fixDatabase();