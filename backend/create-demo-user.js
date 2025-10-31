import { createClient } from '@libsql/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function createDemoUser() {
  try {
    console.log('🔍 Verifica esistenza utente demo...\n');

    // Verifica se esiste già
    const check = await db.execute({
      sql: 'SELECT id, email FROM users WHERE email = ?',
      args: ['demo@taxpilot.com']
    });

    if (check.rows.length > 0) {
      console.log('⚠️  Utente demo già esistente:');
      console.log(`   Email: ${check.rows[0].email}`);
      console.log(`   ID: ${check.rows[0].id}`);
      return;
    }

    console.log('✅ Utente demo non trovato, creazione in corso...\n');

    // Hash password
    const password = 'Demo123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Data di scadenza trial (30 giorni da oggi)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);
    const trialEndISO = trialEndDate.toISOString();

    // Crea utente
    await db.execute({
      sql: `INSERT INTO users (
        email, 
        password, 
        nome, 
        cognome, 
        documents_used, 
        documents_limit, 
        trial_end_date,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        'demo@taxpilot.com',
        hashedPassword,
        'Demo',
        'User',
        0,
        10,
        trialEndISO
      ]
    });

    console.log('✅ Utente demo creato con successo!\n');
    console.log('📋 Credenziali:');
    console.log('   Email: demo@taxpilot.com');
    console.log('   Password: Demo123!');
    console.log(`   Trial scade: ${trialEndDate.toLocaleDateString('it-IT')}`);
    console.log('   Documenti limite: 10\n');

  } catch (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  }
}

createDemoUser();