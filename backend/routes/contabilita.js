import express from 'express';
import { db } from '../database/db.js';

const router = express.Router();

// GET /api/contabilita/status - Verifica se la contabilità è inizializzata
router.get('/status', (req, res) => {
  try {
    // Controlla se esistono le tabelle della contabilità
    const checkTables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('movimenti', 'registri_iva', 'piano_conti')
    `);
    
    const tables = checkTables.all();
    const initialized = tables.length >= 3;
    
    res.json({ 
      success: true, 
      initialized,
      tables: tables.map(t => t.name)
    });
  } catch (error) {
    console.error('Errore verifica status contabilità:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore verifica status contabilità' 
    });
  }
});

// POST /api/contabilita/initialize - Inizializza le tabelle della contabilità
router.post('/initialize', (req, res) => {
  try {
    // Tabella movimenti prima nota
    db.exec(`
      CREATE TABLE IF NOT EXISTS movimenti (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data DATE NOT NULL,
        numero VARCHAR(50) NOT NULL,
        descrizione TEXT NOT NULL,
        totale DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabella righe movimenti (partita doppia)
    db.exec(`
      CREATE TABLE IF NOT EXISTS righe_movimenti (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movimento_id INTEGER NOT NULL,
        conto_codice VARCHAR(10) NOT NULL,
        descrizione TEXT,
        dare DECIMAL(10,2) DEFAULT 0,
        avere DECIMAL(10,2) DEFAULT 0,
        FOREIGN KEY (movimento_id) REFERENCES movimenti(id) ON DELETE CASCADE
      )
    `);

    // Tabella registri IVA
    db.exec(`
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
    `);

    // Tabella piano dei conti
    db.exec(`
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
    `);

    // Inserisce piano conti base se non esiste
    const checkConti = db.prepare('SELECT COUNT(*) as count FROM piano_conti');
    const contiCount = checkConti.get();
    
    if (contiCount.count === 0) {
      const insertConto = db.prepare(`
        INSERT INTO piano_conti (codice, descrizione, tipo, categoria, mastro, saldo)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Piano conti base
      const contiBase = [
        ['110001', 'Cassa', 'attivo', 'Liquidità', '11 - Disponibilità liquide', 0],
        ['120001', 'Banca c/c', 'attivo', 'Liquidità', '12 - Depositi bancari', 0],
        ['140001', 'Crediti vs clienti', 'attivo', 'Crediti', '14 - Crediti commerciali', 0],
        ['210001', 'Debiti vs fornitori', 'passivo', 'Debiti', '21 - Debiti commerciali', 0],
        ['220001', 'Debiti tributari', 'passivo', 'Debiti', '22 - Debiti tributari', 0],
        ['300001', 'Capitale sociale', 'patrimonio', 'Capitale', '30 - Patrimonio netto', 0],
        ['410001', 'Ricavi vendite', 'ricavo', 'Ricavi', '41 - Ricavi caratteristici', 0],
        ['510001', 'Costi materie prime', 'costo', 'Costi', '51 - Costi caratteristici', 0],
        ['520001', 'Costi servizi', 'costo', 'Costi', '52 - Costi per servizi', 0]
      ];

      contiBase.forEach(conto => {
        insertConto.run(...conto);
      });
    }

    res.json({ 
      success: true, 
      message: 'Contabilità inizializzata con successo',
      tables_created: ['movimenti', 'righe_movimenti', 'registri_iva', 'piano_conti']
    });

  } catch (error) {
    console.error('Errore inizializzazione contabilità:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante l\'inizializzazione della contabilità',
      details: error.message
    });
  }
});

// GET /api/contabilita/stats/:clienteId - Statistiche contabilità per cliente
router.get('/stats/:clienteId', (req, res) => {
  try {
    const { clienteId } = req.params;
    
    // Conta movimenti del mese corrente
    const movimentiMese = db.prepare(`
      SELECT COUNT(*) as count 
      FROM movimenti 
      WHERE strftime('%Y-%m', data) = strftime('%Y-%m', 'now')
    `).get();

    // Statistiche IVA acquisti
    const ivaAcquisti = db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(iva), 0) as totale_iva
      FROM registri_iva 
      WHERE tipo = 'acquisti' AND cliente_id = ?
        AND strftime('%Y-%m', data) = strftime('%Y-%m', 'now')
    `).get(clienteId);

    // Statistiche IVA vendite
    const ivaVendite = db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(iva), 0) as totale_iva
      FROM registri_iva 
      WHERE tipo = 'vendite' AND cliente_id = ?
        AND strftime('%Y-%m', data) = strftime('%Y-%m', 'now')
    `).get(clienteId);

    // Saldo cassa
    const saldoCassa = db.prepare(`
      SELECT COALESCE(saldo, 0) as saldo 
      FROM piano_conti 
      WHERE codice = '110001'
    `).get();

    const stats = {
      movimentiMese: movimentiMese.count,
      fattureAcquisti: ivaAcquisti.count,
      fattureVendite: ivaVendite.count,
      ivaCredito: ivaAcquisti.totale_iva,
      ivaDebito: ivaVendite.totale_iva,
      saldoCassa: saldoCassa ? saldoCassa.saldo : 0
    };

    res.json({ success: true, stats });

  } catch (error) {
    console.error('Errore caricamento statistiche:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore caricamento statistiche' 
    });
  }
});

export default router;