// backend/services/contabilityService.js
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ContabilityService {
  constructor() {
    this.dbPath = path.join(__dirname, '../database/taxpilot.db');
  }

  // Inizializza tabelle contabilità
  async initializeTables() {
    return new Promise((resolve, reject) => {
      const db = new (sqlite3.verbose().Database)(this.dbPath);
      
      db.serialize(() => {
        // Tabella piano dei conti
        db.run(`CREATE TABLE IF NOT EXISTS chart_of_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code VARCHAR(10) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL, -- attivo, passivo, costo, ricavo
          parent_id INTEGER,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id)
        )`);

        // Tabella prima nota
        db.run(`CREATE TABLE IF NOT EXISTS journal_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          reference VARCHAR(50),
          description TEXT NOT NULL,
          client_id INTEGER,
          document_id INTEGER,
          total_amount DECIMAL(10,2) NOT NULL,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id),
          FOREIGN KEY (document_id) REFERENCES documents(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`);

        // Tabella dettagli movimenti (dare/avere)
        db.run(`CREATE TABLE IF NOT EXISTS journal_entry_lines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          journal_entry_id INTEGER NOT NULL,
          account_id INTEGER NOT NULL,
          debit DECIMAL(10,2) DEFAULT 0,
          credit DECIMAL(10,2) DEFAULT 0,
          description TEXT,
          vat_code VARCHAR(10),
          vat_rate DECIMAL(5,2),
          vat_amount DECIMAL(10,2) DEFAULT 0,
          FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
        )`);

        // Tabella registri IVA
        db.run(`CREATE TABLE IF NOT EXISTS vat_registers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type VARCHAR(20) NOT NULL, -- acquisti, vendite
          date DATE NOT NULL,
          document_type VARCHAR(50) NOT NULL,
          document_number VARCHAR(50) NOT NULL,
          supplier_customer VARCHAR(255) NOT NULL,
          vat_number VARCHAR(20),
          taxable_amount DECIMAL(10,2) NOT NULL,
          vat_rate DECIMAL(5,2) NOT NULL,
          vat_amount DECIMAL(10,2) NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          document_id INTEGER,
          journal_entry_id INTEGER,
          client_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id),
          FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
          FOREIGN KEY (client_id) REFERENCES clients(id)
        )`);
      });

      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Crea piano dei conti base
  async createDefaultChartOfAccounts() {
    return new Promise((resolve, reject) => {
      const db = new (sqlite3.verbose().Database)(this.dbPath);
      
      const defaultAccounts = [
        { code: '1', name: 'ATTIVO', type: 'attivo', parent_id: null },
        { code: '11', name: 'Immobilizzazioni', type: 'attivo', parent_id: 1 },
        { code: '12', name: 'Attivo circolante', type: 'attivo', parent_id: 1 },
        { code: '121', name: 'Crediti v/clienti', type: 'attivo', parent_id: 3 },
        { code: '131', name: 'Banca c/c', type: 'attivo', parent_id: 3 },
        { code: '132', name: 'Cassa', type: 'attivo', parent_id: 3 },
        
        { code: '2', name: 'PASSIVO', type: 'passivo', parent_id: null },
        { code: '21', name: 'Patrimonio netto', type: 'passivo', parent_id: 7 },
        { code: '22', name: 'Debiti', type: 'passivo', parent_id: 7 },
        { code: '221', name: 'Debiti v/fornitori', type: 'passivo', parent_id: 9 },
        { code: '241', name: 'Erario c/IVA', type: 'passivo', parent_id: 9 },
        
        { code: '5', name: 'COSTI', type: 'costo', parent_id: null },
        { code: '51', name: 'Costi per servizi', type: 'costo', parent_id: 12 },
        { code: '52', name: 'Costi per godimento beni', type: 'costo', parent_id: 12 },
        
        { code: '6', name: 'RICAVI', type: 'ricavo', parent_id: null },
        { code: '61', name: 'Ricavi delle vendite', type: 'ricavo', parent_id: 15 }
      ];

      db.serialize(() => {
        const stmt = db.prepare(`INSERT OR IGNORE INTO chart_of_accounts (code, name, type, parent_id) VALUES (?, ?, ?, ?)`);
        
        defaultAccounts.forEach(account => {
          stmt.run(account.code, account.name, account.type, account.parent_id);
        });
        
        stmt.finalize();
      });

      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Aggiungi movimento in prima nota
  async addJournalEntry(entryData) {
    return new Promise((resolve, reject) => {
      const db = new (sqlite3.verbose().Database)(this.dbPath);
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Inserisci testata movimento
        const stmtEntry = db.prepare(`
          INSERT INTO journal_entries (date, reference, description, client_id, document_id, total_amount, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmtEntry.run(
          entryData.date,
          entryData.reference,
          entryData.description,
          entryData.clientId,
          entryData.documentId,
          entryData.totalAmount,
          entryData.createdBy,
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            const entryId = this.lastID;
            
            // Inserisci righe movimento
            const stmtLines = db.prepare(`
              INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, vat_code, vat_rate, vat_amount)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            let completed = 0;
            entryData.lines.forEach(line => {
              stmtLines.run(
                entryId,
                line.accountId,
                line.debit || 0,
                line.credit || 0,
                line.description,
                line.vatCode,
                line.vatRate,
                line.vatAmount || 0,
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                  }
                  
                  completed++;
                  if (completed === entryData.lines.length) {
                    db.run('COMMIT');
                    resolve(entryId);
                  }
                }
              );
            });
            
            stmtLines.finalize();
          }
        );
        
        stmtEntry.finalize();
      });
      
      db.close();
    });
  }

  // Ottieni movimenti prima nota
  async getJournalEntries(filters = {}) {
    return new Promise((resolve, reject) => {
      const db = new (sqlite3.verbose().Database)(this.dbPath);
      
      let query = `
        SELECT 
          je.id, je.date, je.reference, je.description, je.total_amount,
          c.name as client_name,
          COUNT(jel.id) as lines_count
        FROM journal_entries je
        LEFT JOIN clients c ON je.client_id = c.id
        LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
      `;
      
      const conditions = [];
      const params = [];
      
      if (filters.clientId) {
        conditions.push('je.client_id = ?');
        params.push(filters.clientId);
      }
      
      if (filters.dateFrom) {
        conditions.push('je.date >= ?');
        params.push(filters.dateFrom);
      }
      
      if (filters.dateTo) {
        conditions.push('je.date <= ?');
        params.push(filters.dateTo);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' GROUP BY je.id ORDER BY je.date DESC, je.id DESC';
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
      
      db.close();
    });
  }

  // Ottieni dettaglio movimento
  async getJournalEntryDetails(entryId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.verbose().Database(this.dbPath);
      
      const query = `
        SELECT 
          jel.id, jel.debit, jel.credit, jel.description, jel.vat_code, jel.vat_rate, jel.vat_amount,
          coa.code, coa.name as account_name
        FROM journal_entry_lines jel
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE jel.journal_entry_id = ?
        ORDER BY jel.id
      `;
      
      db.all(query, [entryId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
      
      db.close();
    });
  }

  // Aggiungi a registro IVA
  async addVatRegisterEntry(vatData) {
    return new Promise((resolve, reject) => {
      const db = new (sqlite3.verbose().Database)(this.dbPath);
      
      const stmt = db.prepare(`
        INSERT INTO vat_registers (
          type, date, document_type, document_number, supplier_customer, vat_number,
          taxable_amount, vat_rate, vat_amount, total_amount, document_id, journal_entry_id, client_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        vatData.type,
        vatData.date,
        vatData.documentType,
        vatData.documentNumber,
        vatData.supplierCustomer,
        vatData.vatNumber,
        vatData.taxableAmount,
        vatData.vatRate,
        vatData.vatAmount,
        vatData.totalAmount,
        vatData.documentId,
        vatData.journalEntryId,
        vatData.clientId,
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
      
      stmt.finalize();
      db.close();
    });
  }

  // Ottieni registri IVA
  async getVatRegister(type, filters = {}) {
    return new Promise((resolve, reject) => {
      const db = new (sqlite3.verbose().Database)(this.dbPath);
      
      let query = `
        SELECT 
          id, date, document_type, document_number, supplier_customer, vat_number,
          taxable_amount, vat_rate, vat_amount, total_amount
        FROM vat_registers
        WHERE type = ?
      `;
      
      const params = [type];
      
      if (filters.clientId) {
        query += ' AND client_id = ?';
        params.push(filters.clientId);
      }
      
      if (filters.dateFrom) {
        query += ' AND date >= ?';
        params.push(filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query += ' AND date <= ?';
        params.push(filters.dateTo);
      }
      
      query += ' ORDER BY date DESC, id DESC';
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
      
      db.close();
    });
  }

  // Ottieni piano dei conti
  async getChartOfAccounts() {
    return new Promise((resolve, reject) => {
      const db = new (sqlite3.verbose().Database)(this.dbPath);
      
      const query = `
        SELECT id, code, name, type, parent_id, is_active
        FROM chart_of_accounts
        WHERE is_active = 1
        ORDER BY code
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
      
      db.close();
    });
  }
}

export default new ContabilityService();