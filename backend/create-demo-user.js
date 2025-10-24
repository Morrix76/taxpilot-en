// create-demo-user.js
// Script per creare utente demo con credenziali fisse

import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'taxpilot.db');

async function createDemoUser() {
  console.log('🚀 Creating demo user...');
  
  const db = new Database(DB_PATH);
  
  try {
    // Credenziali demo
    const DEMO_EMAIL = 'demo@taxpilot.com';
    const DEMO_PASSWORD = 'demo123';
    const DEMO_NAME = 'Demo User';
    const DEMO_COMPANY = 'TaxPilot Demo';
    
    // Verifica se utente demo esiste già
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(DEMO_EMAIL);
    
    if (existingUser) {
      console.log('⚠️  Demo user already exists. Updating...');
      
      // Aggiorna password
      const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
      db.prepare('UPDATE users SET password_hash = ?, name = ?, company = ? WHERE email = ?')
        .run(hash, DEMO_NAME, DEMO_COMPANY, DEMO_EMAIL);
      
      console.log('✅ Demo user updated successfully!');
      console.log(`📧 Email: ${DEMO_EMAIL}`);
      console.log(`🔑 Password: ${DEMO_PASSWORD}`);
      
      db.close();
      return;
    }
    
    // Crea nuovo utente demo
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, company, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(DEMO_EMAIL, hash, DEMO_NAME, DEMO_COMPANY);
    
    const userId = result.lastInsertRowid;
    
    // Assegna piano trial che non scade mai con limiti bassi
    const trialPlan = db.prepare('SELECT id FROM piani WHERE nome = ?').get('trial');
    
    if (trialPlan) {
      db.prepare(`
        INSERT INTO user_subscriptions 
        (user_id, plan_id, start_date, end_date, documenti_utilizzati, documenti_limite, active)
        VALUES (?, ?, datetime('now'), datetime('now', '+10 years'), 0, 10, 1)
      `).run(userId, trialPlan.id);
      
      console.log('✅ Demo user created successfully with trial plan!');
    } else {
      console.log('✅ Demo user created (no subscription - might need manual setup)');
    }
    
    console.log('\n📋 Demo Credentials:');
    console.log(`📧 Email: ${DEMO_EMAIL}`);
    console.log(`🔑 Password: ${DEMO_PASSWORD}`);
    console.log(`👤 Name: ${DEMO_NAME}`);
    console.log(`🏢 Company: ${DEMO_COMPANY}`);
    console.log(`📊 Limit: 10 documents`);
    console.log(`⏰ Expiry: 10 years (never expires)`);
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error creating demo user:', error);
    db.close();
    process.exit(1);
  }
}

// Esegui
createDemoUser()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });