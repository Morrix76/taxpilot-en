import { db } from '../database/db.js';

class CalendarService {
  
  constructor() {
    this.initDatabase();
  }
  
  initDatabase() {
    // Crea tabella scadenze se non esiste
    const createScadenzeTable = `
      CREATE TABLE IF NOT EXISTS scadenze (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        documento_id INTEGER,
        tipo VARCHAR(50) NOT NULL,
        descrizione TEXT NOT NULL,
        data_scadenza DATE NOT NULL,
        importo_stimato DECIMAL(10,2),
        stato VARCHAR(20) DEFAULT 'pending',
        note TEXT,
        origine_documento VARCHAR(255),
        ricorrente BOOLEAN DEFAULT 0,
        frequenza_mesi INTEGER DEFAULT 1,
        parent_scadenza_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (documento_id) REFERENCES documents(id)
      )
    `;
    
    db.prepare(createScadenzeTable).run();
    console.log('✅ Tabella scadenze inizializzata');
  }
  
  async rigeneraScadenzeFromDocumenti(userId, options = {}) {
    const { documento_id, periodo_anno, forza_ricalcolo } = options;
    
    // Query documenti da analizzare
    let whereClause = 'WHERE 1=1'; // Prende tutti i documenti
    let params = [];
    
    if (documento_id) {
  whereClause += ' AND id = ?';
  params.push(documento_id);
}
    
    const documenti = db.prepare(`
      SELECT id, type as document_type, analysis_result as parsed_data, created_at, original_filename as filename
      FROM documents 
      ${whereClause}
      ORDER BY created_at DESC
    `).all(...params);
    
    let scadenzeGenerate = 0;
    let scadenzeAggiornate = 0;
    
    for (const documento of documenti) {
      const scadenze = this.analizzaDocumentoPerScadenze(documento, periodo_anno);
      
      for (const scadenza of scadenze) {
        const esistente = this.trovaScadenzaEsistente(
          userId, 
          scadenza.tipo, 
          scadenza.data_scadenza
        );
        
        if (esistente && !forza_ricalcolo) {
          continue; // Skip se già esiste
        }
        
        if (esistente && forza_ricalcolo) {
          this.aggiornaScadenza(esistente.id, scadenza);
          scadenzeAggiornate++;
        } else {
          this.creaScadenza({
            ...scadenza,
            user_id: userId,
            documento_id: documento.id
          });
          scadenzeGenerate++;
        }
      }
    }
    
    return {
      generate: scadenzeGenerate,
      aggiornate: scadenzeAggiornate,
      documenti_analizzati: documenti.length
    };
  }
  
  analizzaDocumentoPerScadenze(documento, anno) {
    const scadenze = [];
    const dataDocumento = new Date(documento.created_at);
    const annoDocumento = dataDocumento.getFullYear();
    
    try {
      const parsedData = JSON.parse(documento.parsed_data || '{}');
      
      // Analisi basata sul tipo documento
      switch (documento.document_type) {
        case 'fattura':
          scadenze.push(...this.analizzaFatturaPerScadenze(parsedData, dataDocumento, anno));
          break;
          
        case 'busta_paga':
          scadenze.push(...this.analizzaBustaPagaPerScadenze(parsedData, dataDocumento, anno));
          break;
          
        case 'contratto':
          scadenze.push(...this.analizzaContrattoPerScadenze(parsedData, dataDocumento, anno));
          break;
          
        default:
          // Analisi generica per documenti non classificati
          scadenze.push(...this.analizzaDocumentoGenericoPerScadenze(parsedData, dataDocumento, anno));
      }
      
    } catch (error) {
      console.error(`Errore analisi documento ${documento.id}:`, error);
    }
    
    return scadenze;
  }
  
  analizzaFatturaPerScadenze(parsedData, dataDocumento, anno) {
    const scadenze = [];
    const mese = dataDocumento.getMonth() + 1;
    
    // IVA mensile/trimestrale - basata sulla data della fattura
    if (parsedData.totale_iva && parsedData.totale_iva > 0) {
      // IVA mensile - scadenza 16 del mese successivo
      const dataScadenzaIVA = new Date(anno, mese, 16);
      
      scadenze.push({
        tipo: 'IVA_MENSILE',
        descrizione: `Liquidazione IVA ${this.getNomeMese(mese)} ${anno}`,
        data_scadenza: dataScadenzaIVA.toISOString().split('T')[0],
        importo_stimato: parsedData.totale_iva,
        origine_documento: `Fattura ${parsedData.numero_fattura || 'N/A'}`
      });
    }
    
    // F24 per ritenute se presente
    if (parsedData.ritenute && parsedData.ritenute > 0) {
      const dataScadenzaF24 = new Date(anno, mese, 16);
      
      scadenze.push({
        tipo: 'F24',
        descrizione: `Versamento ritenute ${this.getNomeMese(mese)} ${anno}`,
        data_scadenza: dataScadenzaF24.toISOString().split('T')[0],
        importo_stimato: parsedData.ritenute,
        origine_documento: `Fattura ${parsedData.numero_fattura || 'N/A'}`
      });
    }
    
    return scadenze;
  }
  
  analizzaBustaPagaPerScadenze(parsedData, dataDocumento, anno) {
    const scadenze = [];
    const mese = dataDocumento.getMonth() + 1;
    
    // IRPEF - scadenza 16 del mese successivo
    if (parsedData.irpef || parsedData.ritenute_fiscali) {
      const importo = parsedData.irpef || parsedData.ritenute_fiscali || 0;
      
      scadenze.push({
        tipo: 'IRPEF',
        descrizione: `Versamento IRPEF ${this.getNomeMese(mese)} ${anno}`,
        data_scadenza: new Date(anno, mese, 16).toISOString().split('T')[0],
        importo_stimato: importo,
        origine_documento: `Busta paga ${this.getNomeMese(mese)}`
      });
    }
    
    // INPS - contributi previdenziali
    if (parsedData.inps || parsedData.contributi_previdenziali) {
      const importo = parsedData.inps || parsedData.contributi_previdenziali || 0;
      
      scadenze.push({
        tipo: 'INPS',
        descrizione: `Contributi INPS ${this.getNomeMese(mese)} ${anno}`,
        data_scadenza: new Date(anno, mese, 16).toISOString().split('T')[0],
        importo_stimato: importo,
        origine_documento: `Busta paga ${this.getNomeMese(mese)}`
      });
    }
    
    return scadenze;
  }
  
  analizzaContrattoPerScadenze(parsedData, dataDocumento, anno) {
    const scadenze = [];
    
    // Scadenze ricorrenti basate sul contratto
    if (parsedData.tipo_contratto === 'determinato' && parsedData.data_scadenza) {
      scadenze.push({
        tipo: 'CONTRATTO',
        descrizione: `Scadenza contratto ${parsedData.nome || 'Dipendente'}`,
        data_scadenza: parsedData.data_scadenza,
        importo_stimato: 0,
        origine_documento: 'Contratto di lavoro'
      });
    }
    
    return scadenze;
  }
  
  analizzaDocumentoGenericoPerScadenze(parsedData, dataDocumento, anno) {
    const scadenze = [];
    
    // Analisi generica basata su pattern nel testo
    const testo = JSON.stringify(parsedData).toLowerCase();
    
    if (testo.includes('f24') || testo.includes('versamento')) {
      scadenze.push({
        tipo: 'F24',
        descrizione: `Versamento identificato da documento del ${dataDocumento.toLocaleDateString()}`,
        data_scadenza: new Date(anno, dataDocumento.getMonth() + 1, 16).toISOString().split('T')[0],
        importo_stimato: this.estraiImportoDaTesto(testo),
        origine_documento: `Documento generico`
      });
    }
    
    return scadenze;
  }
  
  // Scadenze fisse annuali
  generaScadenzeFisseAnnuali(userId, anno) {
    const scadenzeFisse = [
      {
        tipo: 'CU',
        descrizione: `Certificazione Unica ${anno}`,
        data_scadenza: `${anno + 1}-03-31`,
        importo_stimato: 0
      },
      {
        tipo: '730',
        descrizione: `Dichiarazione 730 anno ${anno}`,
        data_scadenza: `${anno + 1}-07-23`,
        importo_stimato: 0
      },
      {
        tipo: 'UNICO',
        descrizione: `Dichiarazione Unico ${anno}`,
        data_scadenza: `${anno + 1}-11-30`,
        importo_stimato: 0
      }
    ];
    
    scadenzeFisse.forEach(scadenza => {
      const esistente = this.trovaScadenzaEsistente(userId, scadenza.tipo, scadenza.data_scadenza);
      if (!esistente) {
        this.creaScadenza({
          ...scadenza,
          user_id: userId,
          origine_documento: 'Scadenza fiscale fissa'
        });
      }
    });
  }
  
  getScadenzeUtente(userId, filtri = {}) {
    let sql = `
      SELECT s.*, d.filename as documento_filename
      FROM scadenze s
      LEFT JOIN documents d ON s.documento_id = d.id
      WHERE s.user_id = ?
    `;
    
    const params = [userId];
    
    if (filtri.from_date) {
      sql += ' AND s.data_scadenza >= ?';
      params.push(filtri.from_date);
    }
    
    if (filtri.to_date) {
      sql += ' AND s.data_scadenza <= ?';
      params.push(filtri.to_date);
    }
    
    if (filtri.tipo) {
      sql += ' AND s.tipo = ?';
      params.push(filtri.tipo);
    }
    
    if (filtri.stato !== 'tutte') {
      switch (filtri.stato) {
        case 'scadute':
          sql += ' AND s.data_scadenza < DATE("now") AND s.stato = "pending"';
          break;
        case 'prossime':
          sql += ' AND s.data_scadenza >= DATE("now") AND s.stato = "pending"';
          break;
        case 'completate':
          sql += ' AND s.stato = "completata"';
          break;
      }
    }
    
    sql += ' ORDER BY s.data_scadenza ASC';
    
    return db.prepare(sql).all(...params);
  }
  
  getStatisticheScadenze(userId) {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totale,
        COUNT(CASE WHEN data_scadenza < DATE('now') AND stato = 'pending' THEN 1 END) as scadute,
        COUNT(CASE WHEN data_scadenza >= DATE('now') AND data_scadenza <= DATE('now', '+30 days') AND stato = 'pending' THEN 1 END) as prossime_30_giorni,
        COUNT(CASE WHEN stato = 'completata' THEN 1 END) as completate,
        SUM(CASE WHEN stato = 'pending' THEN importo_stimato ELSE 0 END) as importo_pending
      FROM scadenze 
      WHERE user_id = ?
    `).get(userId);
    
    return stats;
  }
  
  getDashboardScadenze(userId) {
    const oggi = new Date().toISOString().split('T')[0];
    
    // Scadenze urgenti (scadute + prossimi 7 giorni)
    const urgenti = db.prepare(`
      SELECT * FROM scadenze 
      WHERE user_id = ? 
      AND stato = 'pending'
      AND data_scadenza <= DATE('now', '+7 days')
      ORDER BY data_scadenza ASC
      LIMIT 5
    `).all(userId);
    
    // Prossime scadenze (prossimi 15 giorni)
    const prossime = db.prepare(`
      SELECT * FROM scadenze 
      WHERE user_id = ? 
      AND stato = 'pending'
      AND data_scadenza > DATE('now', '+7 days')
      AND data_scadenza <= DATE('now', '+30 days')
      ORDER BY data_scadenza ASC
      LIMIT 10
    `).all(userId);
    
    const statistiche = this.getStatisticheScadenze(userId);
    
    return {
      alert_urgenti: urgenti,
      prossime_scadenze: prossime,
      statistiche,
      data_aggiornamento: oggi
    };
  }
  
  // Utility methods
  creaScadenza(dati) {
    const stmt = db.prepare(`
      INSERT INTO scadenze (
        user_id, documento_id, tipo, descrizione, data_scadenza,
        importo_stimato, origine_documento, ricorrente, frequenza_mesi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      dati.user_id,
      dati.documento_id || null,
      dati.tipo,
      dati.descrizione,
      dati.data_scadenza,
      dati.importo_stimato || 0,
      dati.origine_documento || '',
      dati.ricorrente || 0,
      dati.frequenza_mesi || 1
    );
  }
  
  creaScadenzaManuale(dati) {
    const risultato = this.creaScadenza(dati);
    
    // Se ricorrente, crea le occorrenze future
    if (dati.ricorrente) {
      this.creaOccorrenzeRicorrenti(risultato.lastInsertRowid, dati);
    }
    
    return this.getScadenzaById(risultato.lastInsertRowid);
  }
  
  trovaScadenzaEsistente(userId, tipo, dataScadenza) {
    return db.prepare(`
      SELECT * FROM scadenze 
      WHERE user_id = ? AND tipo = ? AND data_scadenza = ?
    `).get(userId, tipo, dataScadenza);
  }
  
  aggiornaScadenza(id, dati) {
    const stmt = db.prepare(`
      UPDATE scadenze 
      SET descrizione = ?, importo_stimato = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(dati.descrizione, dati.importo_stimato, id);
  }
  
  aggiornaStatoScadenza(id, userId, stato, note) {
    const stmt = db.prepare(`
      UPDATE scadenze 
      SET stato = ?, note = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    
    stmt.run(stato, note || '', id, userId);
    return this.getScadenzaById(id);
  }
  
  getScadenzaById(id) {
    return db.prepare('SELECT * FROM scadenze WHERE id = ?').get(id);
  }
  
  getNomeMese(numeroMese) {
    const mesi = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return mesi[numeroMese - 1];
  }
  
  estraiImportoDaTesto(testo) {
    const match = testo.match(/(\d+[.,]\d{2})/);
    return match ? parseFloat(match[1].replace(',', '.')) : 0;
  }
  
  creaOccorrenzeRicorrenti(parentId, dati) {
    const dataInizio = new Date(dati.data_scadenza);
    
    // Crea 12 occorrenze future
    for (let i = 1; i <= 12; i++) {
      const nuovaData = new Date(dataInizio);
      nuovaData.setMonth(nuovaData.getMonth() + (i * dati.frequenza_mesi));
      
      this.creaScadenza({
        ...dati,
        data_scadenza: nuovaData.toISOString().split('T')[0],
        parent_scadenza_id: parentId,
        descrizione: `${dati.descrizione} (ricorrente)`
      });
    }
  }
}

export default new CalendarService();