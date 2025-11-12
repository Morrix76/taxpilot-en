/**
 * Script di inizializzazione Database Contabilità
 * 
 * Uso:
 *   node init-contabilita.js
 * 
 * Oppure tramite API:
 *   POST http://your-backend/api/contabilita/initialize
 */

import { db } from './db.js';

const TABLES = {
  movimenti: `
    CREATE TABLE IF NOT EXISTS movimenti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data DATE NOT NULL,
      numero VARCHAR(50) NOT NULL,
      descrizione TEXT NOT NULL,
      totale DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  righe_movimenti: `
    CREATE TABLE IF NOT EXISTS righe_movimenti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movimento_id INTEGER NOT NULL,
      conto_codice VARCHAR(10) NOT NULL,
      descrizione TEXT,
      dare DECIMAL(10,2) DEFAULT 0,
      avere DECIMAL(10,2) DEFAULT 0,
      FOREIGN KEY (movimento_id) REFERENCES movimenti(id) ON DELETE CASCADE
    )
  `,
  registri_iva: `
    CREATE TABLE IF NOT EXISTS registri_iva (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data DATE NOT NULL,
      numero VARCHAR(50) NOT NULL,
      descrizione TEXT NOT NULL,
      cliente_id INTEGER NOT NULL,
      cliente_nome VARCHAR(255) NOT NULL,
      partita_iva VARCHAR(11) NOT NULL,
      imponibile DECIMAL(10,2) NOT NULL,
      iva DECIMAL(10,2) NOT NULL,
      totale DECIMAL(10,2) NOT NULL,
      aliquota VARCHAR(10) NOT NULL,
      tipo TEXT CHECK(tipo IN ('acquisti', 'vendite')) NOT NULL,
      detraibile BOOLEAN DEFAULT 1,
      documento_path TEXT,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  piano_conti: `
    CREATE TABLE IF NOT EXISTS piano_conti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codice VARCHAR(10) UNIQUE NOT NULL,
      descrizione VARCHAR(255) NOT NULL,
      tipo TEXT CHECK(tipo IN ('attivo', 'passivo', 'costo', 'ricavo', 'patrimonio')) NOT NULL,
      categoria VARCHAR(100) NOT NULL,
      sottocategoria VARCHAR(100),
      mastro VARCHAR(100) NOT NULL,
      attivo BOOLEAN DEFAULT 1,
      saldo DECIMAL(10,2) DEFAULT 0,
      movimento BOOLEAN DEFAULT 1,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
};

const SEED_PIANO_CONTI = [
  ['110001', 'Cassa', 'attivo', 'Liquidità', 'Disponibilità liquide', '11 - Disponibilità liquide', 0],
  ['120001', 'Banca c/c', 'attivo', 'Liquidità', 'Depositi bancari', '12 - Depositi bancari', 0],
  ['140001', 'Crediti vs clienti', 'attivo', 'Crediti', 'Crediti commerciali', '14 - Crediti commerciali', 0],
  ['210001', 'Debiti vs fornitori', 'passivo', 'Debiti', 'Debiti commerciali', '21 - Debiti commerciali', 0],
  ['220001', 'Debiti tributari', 'passivo', 'Debiti', 'Debiti tributari', '22 - Debiti tributari', 0],
  ['300001', 'Capitale sociale', 'patrimonio', 'Capitale', 'Patrimonio netto', '30 - Patrimonio netto', 0],
  ['410001', 'Ricavi vendite', 'ricavo', 'Ricavi', 'Ricavi caratteristici', '41 - Ricavi caratteristici', 0],
  ['510001', 'Costi materie prime', 'costo', 'Costi', 'Costi caratteristici', '51 - Costi caratteristici', 0],
  ['520001', 'Costi servizi', 'costo', 'Costi', 'Costi per servizi', '52 - Costi per servizi', 0]
];

async function initializeContabilita() {
  console.log('🔧 Inizializzazione Database Contabilità...\n');

  try {
    // 1. Crea le tabelle
    console.log('📊 Creazione tabelle...');
    for (const [tableName, ddl] of Object.entries(TABLES)) {
      await db.execute({ sql: ddl, args: [] });
      console.log(`  ✅ ${tableName}`);
    }

    // 2. Verifica tabelle create
    console.log('\n🔍 Verifica tabelle...');
    const { rows } = await db.execute({
      sql: `SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('movimenti', 'registri_iva', 'piano_conti', 'righe_movimenti')`,
      args: []
    });
    
    const createdTables = rows.map(r => r.name);
    console.log(`  ✅ Tabelle create: ${createdTables.join(', ')}`);

    // 3. Seed Piano dei Conti
    console.log('\n💰 Popolamento Piano dei Conti...');
    const countResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM piano_conti',
      args: []
    });
    
    const count = countResult.rows[0].count;
    if (count === 0) {
      for (const conto of SEED_PIANO_CONTI) {
        await db.execute({
          sql: `INSERT INTO piano_conti (codice, descrizione, tipo, categoria, sottocategoria, mastro, saldo)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: conto
        });
        console.log(`  ✅ ${conto[0]} - ${conto[1]}`);
      }
    } else {
      console.log(`  ℹ️  Piano dei conti già popolato (${count} conti presenti)`);
    }

    console.log('\n✅ ✅ ✅ INIZIALIZZAZIONE COMPLETATA CON SUCCESSO! ✅ ✅ ✅\n');
    console.log('📋 Tabelle create:');
    console.log('   - movimenti');
    console.log('   - righe_movimenti');
    console.log('   - registri_iva');
    console.log('   - piano_conti\n');
    console.log('💡 Il modulo contabilità è ora pronto per l\'uso!\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERRORE durante inizializzazione:', error.message);
    console.error('\n🔍 Dettagli:', error);
    process.exit(1);
  }
}

// Esegui inizializzazione
initializeContabilita();

