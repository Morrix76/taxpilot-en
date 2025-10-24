import { db } from '../database/db.js';
import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import documentDetector from './documentDetector.js';

class PecReaderService {
  
  constructor() {
    this.initDatabase();
    this.monitoraggi_attivi = new Map();
  }
  
  initDatabase() {
    // Tabella configurazioni PEC
    const createPecConfigTable = `
      CREATE TABLE IF NOT EXISTS pec_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        email_pec TEXT NOT NULL,
        password TEXT NOT NULL,
        server_imap TEXT NOT NULL,
        auto_download BOOLEAN DEFAULT 1,
        cartelle_monitorate TEXT DEFAULT '["INBOX"]',
        filtri_allegati TEXT DEFAULT '[".xml", ".pdf"]',
        elimina_dopo_download BOOLEAN DEFAULT 0,
        attivo BOOLEAN DEFAULT 1,
        ultima_lettura DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Tabella log operazioni PEC
    const createPecLogTable = `
      CREATE TABLE IF NOT EXISTS pec_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_id INTEGER NOT NULL,
        tipo_operazione TEXT NOT NULL,
        email_subject TEXT,
        email_from TEXT,
        allegati_trovati INTEGER DEFAULT 0,
        documenti_salvati INTEGER DEFAULT 0,
        errore TEXT,
        dettagli TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (config_id) REFERENCES pec_config(id)
      )
    `;
    
    try {
      db.prepare(createPecConfigTable).run();
      db.prepare(createPecLogTable).run();
      console.log('✅ Tabelle PEC inizializzate');
    } catch (error) {
      console.error('❌ Errore inizializzazione tabelle PEC:', error);
    }
  }
  
  async testConnessione(dati) {
    const { email_pec, password, server_imap } = dati;
    
    return new Promise((resolve) => {
      try {
        // Parsing URL IMAP
        const urlParts = new URL(server_imap);
        const config = {
          user: email_pec,
          password: password,
          host: urlParts.hostname,
          port: parseInt(urlParts.port) || 993,
          tls: true,
          tlsOptions: { rejectUnauthorized: false }
        };
        
        const imap = new Imap(config);
        
        imap.once('ready', () => {
          imap.getBoxes((err, boxes) => {
            if (err) {
              resolve({
                successo: false,
                errore: 'Errore lettura cartelle: ' + err.message
              });
            } else {
              resolve({
                successo: true,
                dettagli: 'Connessione PEC riuscita',
                info_server: {
                  cartelle_disponibili: Object.keys(boxes),
                  server: urlParts.hostname,
                  porta: config.port
                }
              });
            }
            imap.end();
          });
        });
        
        imap.once('error', (err) => {
          resolve({
            successo: false,
            errore: err.message
          });
        });
        
        imap.connect();
        
      } catch (error) {
        resolve({
          successo: false,
          errore: error.message
        });
      }
    });
  }
  
  async salvaConfigurazione(dati) {
    const {
      user_id,
      email_pec,
      password,
      server_imap,
      auto_download,
      cartelle_monitorate,
      filtri_allegati,
      elimina_dopo_download
    } = dati;
    
    // Cripta password (semplice per demo - in produzione usare crypto più robusto)
    const passwordCrypt = this.criptaPassword(password);
    
    const stmt = db.prepare(`
      INSERT INTO pec_config (
        user_id, email_pec, password, server_imap, auto_download,
        cartelle_monitorate, filtri_allegati, elimina_dopo_download
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      user_id,
      email_pec,
      passwordCrypt,
      server_imap,
      auto_download ? 1 : 0,
      JSON.stringify(cartelle_monitorate),
      JSON.stringify(filtri_allegati),
      elimina_dopo_download ? 1 : 0
    );
    
    this.logOperazione(result.lastInsertRowid, 'configurazione_creata', {
      email: email_pec,
      server: server_imap
    });
    
    return { id: result.lastInsertRowid };
  }
  
  async estraiDocumentiPEC(options) {
    const { config_id, limite_email, giorni_indietro, solo_non_letti, cartella } = options;
    
    const startTime = Date.now();
    const risultato = {
      email_elaborate: 0,
      allegati_trovati: 0,
      documenti_salvati: 0,
      errori: [],
      log: [],
      tempo_elaborazione: 0
    };
    
    try {
      // Recupera configurazione
      const config = await this.getConfigurazione(config_id);
      if (!config) {
        throw new Error('Configurazione PEC non trovata');
      }
      
      // Connetti a PEC
      const imap = await this.connettaPEC(config);
      
      // Apri cartella
      await this.apriCartella(imap, cartella);
      
      // Cerca email
      const emails = await this.cercaEmail(imap, {
        giorni_indietro,
        solo_non_letti,
        limite: limite_email
      });
      
      risultato.log.push(`Trovate ${emails.length} email da processare`);
      
      // Processa ogni email
      for (const emailId of emails) {
        try {
          const emailData = await this.leggiEmail(imap, emailId);
          risultato.email_elaborate++;
          
          const allegati = await this.estraiAllegati(emailData, config);
          risultato.allegati_trovati += allegati.length;
          
          for (const allegato of allegati) {
            const documento = await this.processaAllegato(allegato, config_id);
            if (documento) {
              risultato.documenti_salvati++;
            }
          }
          
          // Marca come letto se richiesto
          if (config.elimina_dopo_download) {
            await this.marcaComeLetto(imap, emailId);
          }
          
        } catch (emailError) {
          risultato.errori.push({
            email_id: emailId,
            errore: emailError.message
          });
          risultato.log.push(`Errore email ${emailId}: ${emailError.message}`);
        }
      }
      
      imap.end();
      
      // Aggiorna ultima lettura
      this.aggiornaUltimaLettura(config_id);
      
      risultato.tempo_elaborazione = Date.now() - startTime;
      
      this.logOperazione(config_id, 'estrazione_documenti', {
        email_elaborate: risultato.email_elaborate,
        documenti_salvati: risultato.documenti_salvati,
        errori: risultato.errori.length
      });
      
    } catch (error) {
      risultato.errori.push({ errore_generale: error.message });
      risultato.tempo_elaborazione = Date.now() - startTime;
      
      this.logOperazione(config_id, 'estrazione_fallita', {
        errore: error.message
      });
    }
    
    return risultato;
  }
  
  async connettaPEC(config) {
    return new Promise((resolve, reject) => {
      const urlParts = new URL(config.server_imap);
      const imapConfig = {
        user: config.email_pec,
        password: this.decriptaPassword(config.password),
        host: urlParts.hostname,
        port: parseInt(urlParts.port) || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      };
      
      const imap = new Imap(imapConfig);
      
      imap.once('ready', () => resolve(imap));
      imap.once('error', reject);
      
      imap.connect();
    });
  }
  
  async apriCartella(imap, cartella) {
    return new Promise((resolve, reject) => {
      imap.openBox(cartella, false, (err, box) => {
        if (err) reject(err);
        else resolve(box);
      });
    });
  }
  
  async cercaEmail(imap, filtri) {
    return new Promise((resolve, reject) => {
      const { giorni_indietro, solo_non_letti, limite } = filtri;
      
      const criteri = [];
      
      if (giorni_indietro) {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - giorni_indietro);
        criteri.push(['SINCE', dataLimite]);
      }
      
      if (solo_non_letti) {
        criteri.push('UNSEEN');
      }
      
      // Cerca email con allegati
      criteri.push(['HEADER', 'Content-Type', 'multipart']);
      
      imap.search(criteri.length > 0 ? criteri : ['ALL'], (err, results) => {
        if (err) {
          reject(err);
        } else {
          // Limita risultati
          const emailIds = results.slice(0, limite);
          resolve(emailIds);
        }
      });
    });
  }
  
  async leggiEmail(imap, emailId) {
    return new Promise((resolve, reject) => {
      const fetch = imap.fetch(emailId, { 
        bodies: '',
        struct: true,
        envelope: true
      });
      
      fetch.on('message', (msg) => {
        let emailData = {};
        
        msg.on('body', (stream) => {
          let buffer = '';
          stream.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
          });
          stream.once('end', () => {
            simpleParser(buffer, (err, parsed) => {
              if (err) reject(err);
              else {
                emailData = parsed;
                resolve(emailData);
              }
            });
          });
        });
        
        msg.once('attributes', (attrs) => {
          emailData.attributes = attrs;
        });
      });
      
      fetch.once('error', reject);
      fetch.once('end', () => {
        if (!emailData.subject) {
          resolve(emailData);
        }
      });
    });
  }
  
  async estraiAllegati(emailData, config) {
    const allegati = [];
    const filtriAllegati = JSON.parse(config.filtri_allegati);
    
    if (emailData.attachments) {
      for (const attachment of emailData.attachments) {
        const ext = path.extname(attachment.filename || '').toLowerCase();
        
        if (filtriAllegati.includes(ext)) {
          // Salva allegato temporaneamente
          const tempFilename = `pec_${Date.now()}_${attachment.filename}`;
          const tempPath = path.join('./uploads', tempFilename);
          
          fs.writeFileSync(tempPath, attachment.content);
          
          allegati.push({
            filename: attachment.filename,
            temp_path: tempPath,
            content_type: attachment.contentType,
            size: attachment.size,
            email_subject: emailData.subject,
            email_from: emailData.from?.text || 'Unknown'
          });
        }
      }
    }
    
    return allegati;
  }
  
  async processaAllegato(allegato, config_id) {
    try {
      // Rilevamento automatico tipo documento
      const fileBuffer = fs.readFileSync(allegato.temp_path);
      const analisi = await documentDetector.analyzeDocument(fileBuffer, allegato.filename);
      
      // Simula salvataggio documento nel sistema
      const documento = {
        name: allegato.filename,
        type: analisi.type,
        original_filename: allegato.filename,
        file_path: allegato.temp_path,
        file_size: allegato.size,
        mime_type: allegato.content_type,
        ai_analysis: `Documento da PEC: ${allegato.email_subject}`,
        ai_status: 'ok',
        ai_confidence: analisi.confidence === 'high' ? 0.9 : 0.7,
        analysis_result: JSON.stringify({
          provenienza: 'PEC',
          email_subject: allegato.email_subject,
          email_from: allegato.email_from,
          auto_detection: analisi,
          processed_at: new Date().toISOString()
        }),
        confidence: analisi.confidence === 'high' ? 0.9 : 0.7,
        processing_version: '4.1.0-pec'
      };
      
      // Salva usando la funzione esistente del database
      const { saveDocument } = await import('../database/db.js');
      const savedDoc = saveDocument(documento);
      
      // Log successo
      console.log(`📧 Documento PEC salvato: ${allegato.filename} (ID: ${savedDoc.id})`);
      
      return savedDoc;
      
    } catch (error) {
      console.error(`❌ Errore processing allegato ${allegato.filename}:`, error);
      
      // Cleanup file temporaneo in caso di errore
      try {
        fs.unlinkSync(allegato.temp_path);
      } catch (cleanupError) {
        console.error('Errore cleanup file:', cleanupError);
      }
      
      return null;
    }
  }
  
  async getConfigurazione(config_id) {
    const stmt = db.prepare('SELECT * FROM pec_config WHERE id = ? AND attivo = 1');
    return stmt.get(config_id);
  }
  
  async getStatoConfigurazione(user_id) {
    const config = db.prepare(`
      SELECT id, email_pec, server_imap, auto_download, attivo, ultima_lettura
      FROM pec_config 
      WHERE user_id = ? AND attivo = 1
    `).get(user_id);
    
    if (!config) {
      return {
        configurata: false,
        message: 'Nessuna configurazione PEC trovata'
      };
    }
    
    const ultimoLog = db.prepare(`
      SELECT tipo_operazione, timestamp, errore
      FROM pec_log 
      WHERE config_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).get(config.id);
    
    return {
      configurata: true,
      config,
      ultimo_accesso: ultimoLog,
      monitoraggio_attivo: this.monitoraggi_attivi.has(config.id)
    };
  }
  
  async avviaMonitoraggio(options) {
    const { config_id, intervallo_minuti, attivo } = options;
    
    if (this.monitoraggi_attivi.has(config_id)) {
      clearInterval(this.monitoraggi_attivi.get(config_id).interval);
    }
    
    if (attivo) {
      const intervalId = setInterval(async () => {
        try {
          console.log(`🔄 Controllo automatico PEC config ${config_id}`);
          await this.estraiDocumentiPEC({
            config_id,
            limite_email: 10,
            giorni_indietro: 1,
            solo_non_letti: true,
            cartella: 'INBOX'
          });
        } catch (error) {
          console.error(`❌ Errore monitoraggio automatico PEC ${config_id}:`, error);
        }
      }, intervallo_minuti * 60 * 1000);
      
      const prossimo = new Date(Date.now() + intervallo_minuti * 60 * 1000);
      
      this.monitoraggi_attivi.set(config_id, {
        interval: intervalId,
        intervallo: intervallo_minuti,
        prossimo_controllo: prossimo.toISOString()
      });
      
      this.logOperazione(config_id, 'monitoraggio_avviato', {
        intervallo_minuti
      });
      
      return {
        attivo: true,
        intervallo: intervallo_minuti,
        prossimo_controllo: prossimo.toISOString()
      };
    }
    
    return { attivo: false };
  }
  
  async fermaMonitoraggio(config_id) {
    if (this.monitoraggi_attivi.has(config_id)) {
      clearInterval(this.monitoraggi_attivi.get(config_id).interval);
      this.monitoraggi_attivi.delete(config_id);
      
      this.logOperazione(config_id, 'monitoraggio_fermato', {});
    }
  }
  
  // Utility functions
  criptaPassword(password) {
    // Semplice encryption per demo - in produzione usare algoritmi più sicuri
    const cipher = crypto.createCipher('aes192', 'chiave-segreta-pec');
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  
  decriptaPassword(passwordCript) {
    const decipher = crypto.createDecipher('aes192', 'chiave-segreta-pec');
    let decrypted = decipher.update(passwordCript, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  
  logOperazione(config_id, tipo, dettagli = {}) {
    try {
      const stmt = db.prepare(`
        INSERT INTO pec_log (config_id, tipo_operazione, dettagli)
        VALUES (?, ?, ?)
      `);
      
      stmt.run(config_id, tipo, JSON.stringify(dettagli));
    } catch (error) {
      console.error('Errore log PEC:', error);
    }
  }
  
  async getLogOperazioni(config_id, limite = 100) {
    const stmt = db.prepare(`
      SELECT tipo_operazione, dettagli, timestamp, errore
      FROM pec_log 
      WHERE config_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    
    return stmt.all(config_id, limite);
  }
  
  async eliminaConfigurazione(config_id) {
    // Ferma monitoraggio se attivo
    await this.fermaMonitoraggio(config_id);
    
    // Disattiva configurazione (soft delete)
    const stmt = db.prepare('UPDATE pec_config SET attivo = 0 WHERE id = ?');
    stmt.run(config_id);
    
    this.logOperazione(config_id, 'configurazione_eliminata', {});
  }
  
  aggiornaUltimaLettura(config_id) {
    const stmt = db.prepare('UPDATE pec_config SET ultima_lettura = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(config_id);
  }
  
  async marcaComeLetto(imap, emailId) {
    return new Promise((resolve, reject) => {
      imap.addFlags(emailId, ['\\Seen'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export default new PecReaderService();