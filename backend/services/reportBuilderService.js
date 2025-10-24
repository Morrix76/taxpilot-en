import { db } from '../database/db.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

class ReportBuilderService {
  
  async generaReportMensile(options) {
    const { mese, user_id, formato, includi_dettagli, includi_grafici, template } = options;
    
    // Estrae anno e mese
    const [anno, meseNum] = mese.split('-');
    const dataInizio = `${anno}-${meseNum}-01`;
    const dataFine = new Date(anno, parseInt(meseNum), 0).toISOString().split('T')[0]; // Ultimo giorno del mese
    
    // Raccoglie dati per il report
    const dati = await this.raccogliDatiPeriodo({
      data_inizio: dataInizio,
      data_fine: dataFine,
      user_id
    });
    
    // Calcola statistiche
    const statistiche = this.calcolaStatistichePeriodo(dati);
    
    // Genera report in base al formato
    switch (formato) {
      case 'pdf':
        return await this.generaPDF({
          ...dati,
          statistiche,
          periodo: mese,
          template,
          includi_dettagli,
          includi_grafici
        });
      case 'html':
        return this.generaHTML({ ...dati, statistiche, periodo: mese });
      case 'json':
        return { dati, statistiche, periodo: mese };
      default:
        throw new Error('Formato non supportato');
    }
  }
  
  async raccogliDatiPeriodo(options) {
    const { data_inizio, data_fine, user_id } = options;
    
    // Documenti del periodo
    const documenti = db.prepare(`
      SELECT id, name, type, created_at, analysis_result, accounting_status
      FROM documents 
      WHERE DATE(created_at) BETWEEN ? AND ?
      ORDER BY created_at ASC
    `).all(data_inizio, data_fine);
    
    // Processa documenti per estrarre dati fiscali
    const documentiProcessati = documenti.map(doc => {
      let importo = 0;
      let iva = 0;
      let natura_operazione = 'Altro';
      
      try {
        const analysis = JSON.parse(doc.analysis_result || '{}');
        importo = this.estraiImporto(analysis);
        iva = this.estraiIVA(analysis);
        natura_operazione = this.determinaNaturaOperazione(doc.type);
      } catch (error) {
        console.error(`Errore parsing documento ${doc.id}:`, error);
      }
      
      return {
        ...doc,
        importo,
        iva,
        natura_operazione,
        data_documento: doc.created_at.split('T')[0]
      };
    });
    
    // Scadenze del periodo (se disponibili)
    let scadenze = [];
    try {
      scadenze = db.prepare(`
        SELECT tipo, descrizione, data_scadenza, importo_stimato, stato
        FROM scadenze 
        WHERE DATE(data_scadenza) BETWEEN ? AND ?
        ORDER BY data_scadenza ASC
      `).all(data_inizio, data_fine);
    } catch (error) {
      // Tabella scadenze potrebbe non esistere
      console.log('Tabella scadenze non disponibile');
    }
    
    return {
      documenti: documentiProcessati,
      scadenze,
      periodo: { inizio: data_inizio, fine: data_fine }
    };
  }
  
  calcolaStatistichePeriodo(dati) {
    const { documenti, scadenze } = dati;
    
    // Statistiche documenti
    const totaleDocumenti = documenti.length;
    const documentiPerTipo = {};
    let totaleImporti = 0;
    let totaleIVA = 0;
    let erroriAI = 0;
    
    documenti.forEach(doc => {
      documentiPerTipo[doc.type] = (documentiPerTipo[doc.type] || 0) + 1;
      totaleImporti += doc.importo;
      totaleIVA += doc.iva;
      
      if (doc.accounting_status === 'ERROR' || doc.flag_manual_review) {
        erroriAI++;
      }
    });
    
    // Statistiche scadenze
    const scadenzeScadute = scadenze.filter(s => 
      new Date(s.data_scadenza) < new Date() && s.stato === 'pending'
    ).length;
    
    const scadenzeProssime = scadenze.filter(s => {
      const dataScadenza = new Date(s.data_scadenza);
      const oggi = new Date();
      const giorni30 = new Date(oggi.getTime() + 30 * 24 * 60 * 60 * 1000);
      return dataScadenza >= oggi && dataScadenza <= giorni30;
    }).length;
    
    return {
      documenti: {
        totale: totaleDocumenti,
        per_tipo: documentiPerTipo,
        totale_importi: Math.round(totaleImporti * 100) / 100,
        totale_iva: Math.round(totaleIVA * 100) / 100,
        errori_ai: erroriAI,
        percentuale_successo: totaleDocumenti > 0 ? 
          Math.round(((totaleDocumenti - erroriAI) / totaleDocumenti) * 100) : 100
      },
      scadenze: {
        totale: scadenze.length,
        scadute: scadenzeScadute,
        prossime: scadenzeProssime,
        importo_stimato: scadenze.reduce((sum, s) => sum + (s.importo_stimato || 0), 0)
      }
    };
  }
  
  async generaPDF(dati) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve({ buffer: pdfBuffer, tipo: 'pdf' });
        });
        
        // Header del report
        this.aggiungiHeader(doc, dati);
        
        // Riepilogo statistiche
        this.aggiungiRiepilogo(doc, dati.statistiche);
        
        // Sezione documenti
        if (dati.includi_dettagli) {
          this.aggiungiSezioneDocumenti(doc, dati.documenti);
        }
        
        // Sezione IVA
        this.aggiungiSezioneIVA(doc, dati);
        
        // Sezione scadenze
        if (dati.scadenze.length > 0) {
          this.aggiungiSezioneScadenze(doc, dati.scadenze);
        }
        
        // Sezione anomalie
        this.aggiungiSezioneAnomalie(doc, dati);
        
        // Footer
        this.aggiungiFooter(doc);
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  aggiungiHeader(doc, dati) {
    // Titolo principale
    doc.fontSize(20)
       .fillColor('#2563eb')
       .text('REPORT FISCALE MENSILE', 50, 50);
    
    // Sottotitolo
    doc.fontSize(14)
       .fillColor('#64748b')
       .text(`Periodo: ${dati.periodo}`, 50, 80);
    
    // Data generazione
    doc.fontSize(10)
       .fillColor('#94a3b8')
       .text(`Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}`, 50, 100);
    
    // Linea separatrice
    doc.strokeColor('#e2e8f0')
       .lineWidth(1)
       .moveTo(50, 120)
       .lineTo(550, 120)
       .stroke();
    
    // Spazio dopo header
    doc.y = 140;
  }
  
  aggiungiRiepilogo(doc, statistiche) {
    const startY = doc.y;
    
    // Titolo sezione
    doc.fontSize(16)
       .fillColor('#1e293b')
       .text('📊 RIEPILOGO GENERALE', 50, startY);
    
    doc.y += 20;
    
    // Box riepilogo documenti
    const boxY = doc.y;
    doc.rect(50, boxY, 240, 120)
       .strokeColor('#e2e8f0')
       .stroke();
    
    doc.fontSize(12)
       .fillColor('#475569')
       .text('DOCUMENTI ELABORATI', 60, boxY + 10);
    
    doc.fontSize(24)
       .fillColor('#2563eb')
       .text(statistiche.documenti.totale.toString(), 60, boxY + 30);
    
    doc.fontSize(10)
       .fillColor('#64748b')
       .text(`Successo: ${statistiche.documenti.percentuale_successo}%`, 60, boxY + 60)
       .text(`Errori AI: ${statistiche.documenti.errori_ai}`, 60, boxY + 75)
       .text(`Importo totale: €${statistiche.documenti.totale_importi}`, 60, boxY + 90)
       .text(`IVA totale: €${statistiche.documenti.totale_iva}`, 60, boxY + 105);
    
    // Box riepilogo scadenze
    doc.rect(310, boxY, 240, 120)
       .strokeColor('#e2e8f0')
       .stroke();
    
    doc.fontSize(12)
       .fillColor('#475569')
       .text('SCADENZE FISCALI', 320, boxY + 10);
    
    doc.fontSize(24)
       .fillColor('#dc2626')
       .text(statistiche.scadenze.scadute.toString(), 320, boxY + 30);
    
    doc.fontSize(10)
       .fillColor('#64748b')
       .text('Scadute', 320, boxY + 60)
       .text(`Prossime (30gg): ${statistiche.scadenze.prossime}`, 320, boxY + 75)
       .text(`Totale scadenze: ${statistiche.scadenze.totale}`, 320, boxY + 90)
       .text(`Importo stimato: €${Math.round(statistiche.scadenze.importo_stimato * 100) / 100}`, 320, boxY + 105);
    
    doc.y = boxY + 140;
  }
  
  aggiungiSezioneDocumenti(doc, documenti) {
    const startY = doc.y;
    
    // Titolo sezione
    doc.fontSize(16)
       .fillColor('#1e293b')
       .text('📄 DETTAGLIO DOCUMENTI', 50, startY);
    
    doc.y += 20;
    
    // Header tabella
    const headerY = doc.y;
    doc.fontSize(10)
       .fillColor('#374151')
       .text('DATA', 50, headerY)
       .text('TIPO', 120, headerY)
       .text('NOME DOCUMENTO', 200, headerY)
       .text('IMPORTO', 400, headerY)
       .text('IVA', 480, headerY)
       .text('STATO', 520, headerY);
    
    // Linea header
    doc.strokeColor('#d1d5db')
       .lineWidth(0.5)
       .moveTo(50, headerY + 15)
       .lineTo(550, headerY + 15)
       .stroke();
    
    doc.y = headerY + 25;
    
    // Righe documenti (limitato per spazio)
    const documentiMostrati = documenti.slice(0, 20);
    
    documentiMostrati.forEach((documento, index) => {
      const rowY = doc.y;
      
      // Colore alternato per le righe
      if (index % 2 === 0) {
        doc.rect(45, rowY - 2, 510, 12)
           .fillColor('#f8fafc')
           .fill();
      }
      
      // Determina colore stato
      let statoColor = '#10b981'; // Verde per OK
      let statoText = 'OK';
      
      if (documento.accounting_status === 'ERROR') {
        statoColor = '#ef4444';
        statoText = 'ERR';
      } else if (documento.flag_manual_review) {
        statoColor = '#f59e0b';
        statoText = 'REV';
      }
      
      doc.fontSize(9)
         .fillColor('#374151')
         .text(documento.data_documento, 50, rowY)
         .text(documento.type.toUpperCase(), 120, rowY)
         .text(documento.name.substring(0, 25) + (documento.name.length > 25 ? '...' : ''), 200, rowY)
         .text(`€${documento.importo.toFixed(2)}`, 400, rowY)
         .text(`€${documento.iva.toFixed(2)}`, 480, rowY);
      
      doc.fillColor(statoColor)
         .text(statoText, 520, rowY);
      
      doc.y += 12;
      
      // Nuova pagina se necessario
      if (doc.y > 750) {
        doc.addPage();
        doc.y = 50;
      }
    });
    
    if (documenti.length > 20) {
      doc.fontSize(10)
         .fillColor('#64748b')
         .text(`... e altri ${documenti.length - 20} documenti`, 50, doc.y + 10);
    }
    
    doc.y += 30;
  }
  
  aggiungiSezioneIVA(doc, dati) {
    const startY = doc.y;
    
    // Titolo sezione
    doc.fontSize(16)
       .fillColor('#1e293b')
       .text('💰 RIEPILOGO IVA', 50, startY);
    
    doc.y += 20;
    
    // Calcola riepiloghi IVA
    const riepiegoIVA = this.calcolaRiepilogoIVA(dati.documenti);
    
    // Header tabella IVA
    const headerY = doc.y;
    doc.fontSize(10)
       .fillColor('#374151')
       .text('ALIQUOTA IVA', 50, headerY)
       .text('IMPONIBILE', 150, headerY)
       .text('IMPOSTA', 250, headerY)
       .text('OPERAZIONI', 350, headerY)
       .text('TOTALE', 450, headerY);
    
    // Linea header
    doc.strokeColor('#d1d5db')
       .lineWidth(0.5)
       .moveTo(50, headerY + 15)
       .lineTo(550, headerY + 15)
       .stroke();
    
    doc.y = headerY + 25;
    
    // Righe IVA
    Object.entries(riepiegoIVA).forEach(([aliquota, dati]) => {
      const rowY = doc.y;
      
      doc.fontSize(9)
         .fillColor('#374151')
         .text(`${aliquota}%`, 50, rowY)
         .text(`€${dati.imponibile.toFixed(2)}`, 150, rowY)
         .text(`€${dati.imposta.toFixed(2)}`, 250, rowY)
         .text(dati.operazioni.toString(), 350, rowY)
         .text(`€${(dati.imponibile + dati.imposta).toFixed(2)}`, 450, rowY);
      
      doc.y += 12;
    });
    
    doc.y += 20;
  }
  
  aggiungiSezioneScadenze(doc, scadenze) {
    const startY = doc.y;
    
    // Titolo sezione
    doc.fontSize(16)
       .fillColor('#1e293b')
       .text('⏰ SCADENZE FISCALI', 50, startY);
    
    doc.y += 20;
    
    // Scadenze urgenti
    const scadenzeUrgenti = scadenze.filter(s => {
      const dataScadenza = new Date(s.data_scadenza);
      const oggi = new Date();
      return dataScadenza <= oggi || (dataScadenza - oggi) <= 7 * 24 * 60 * 60 * 1000;
    });
    
    if (scadenzeUrgenti.length > 0) {
      doc.fontSize(12)
         .fillColor('#dc2626')
         .text('⚠️ SCADENZE URGENTI:', 50, doc.y);
      
      doc.y += 15;
      
      scadenzeUrgenti.forEach(scadenza => {
        const rowY = doc.y;
        const isScaduta = new Date(scadenza.data_scadenza) < new Date();
        
        doc.fontSize(9)
           .fillColor(isScaduta ? '#dc2626' : '#f59e0b')
           .text(`${scadenza.data_scadenza} - ${scadenza.descrizione}`, 60, rowY);
        
        if (scadenza.importo_stimato > 0) {
          doc.text(`(€${scadenza.importo_stimato})`, 400, rowY);
        }
        
        doc.y += 12;
      });
    }
    
    doc.y += 20;
  }
  
  aggiungiSezioneAnomalie(doc, dati) {
    const anomalie = dati.documenti.filter(d => 
      d.accounting_status === 'ERROR' || d.flag_manual_review
    );
    
    if (anomalie.length > 0) {
      const startY = doc.y;
      
      // Titolo sezione
      doc.fontSize(16)
         .fillColor('#dc2626')
         .text('⚠️ ANOMALIE E SEGNALAZIONI', 50, startY);
      
      doc.y += 20;
      
      anomalie.forEach(anomalia => {
        const rowY = doc.y;
        
        doc.fontSize(10)
           .fillColor('#dc2626')
           .text('•', 50, rowY)
           .fillColor('#374151')
           .text(`${anomalia.name} - ${anomalia.type}`, 60, rowY);
        
        if (anomalia.accounting_status === 'ERROR') {
          doc.fillColor('#dc2626')
             .text('(Errore contabilità)', 300, rowY);
        }
        
        if (anomalia.flag_manual_review) {
          doc.fillColor('#f59e0b')
             .text('(Richiede revisione)', 420, rowY);
        }
        
        doc.y += 12;
      });
    }
    
    doc.y += 30;
  }
  
  aggiungiFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Linea footer
      doc.strokeColor('#e2e8f0')
         .lineWidth(0.5)
         .moveTo(50, 770)
         .lineTo(550, 770)
         .stroke();
      
      // Testo footer
      doc.fontSize(8)
         .fillColor('#94a3b8')
         .text(`TaxPilot Assistant Pro - Report generato automaticamente`, 50, 780)
         .text(`Pagina ${i + 1} di ${pageCount}`, 450, 780);
    }
  }
  
  // Utility functions
  estraiImporto(analysisData) {
    // Cerca importo nei dati di analisi
    const possibiliCampi = [
      'totale_documento', 'importo_totale', 'total', 'amount',
      'netto_mensile', 'importo', 'totale'
    ];
    
    for (const campo of possibiliCampi) {
      const valore = this.getNestedValue(analysisData, campo);
      if (valore && !isNaN(parseFloat(valore))) {
        return parseFloat(valore);
      }
    }
    
    return 0;
  }
  
  estraiIVA(analysisData) {
    const possibiliCampi = [
      'totale_iva', 'iva', 'vat', 'imposta'
    ];
    
    for (const campo of possibiliCampi) {
      const valore = this.getNestedValue(analysisData, campo);
      if (valore && !isNaN(parseFloat(valore))) {
        return parseFloat(valore);
      }
    }
    
    return 0;
  }
  
  determinaNaturaOperazione(tipoDocumento) {
    const mapping = {
      'fattura': 'Vendita/Emissione',
      'ricevuta': 'Acquisto/Ricezione',
      'busta_paga': 'Costo del lavoro',
      'bonifico': 'Pagamento',
      'contratto': 'Contratto'
    };
    
    return mapping[tipoDocumento.toLowerCase()] || 'Altro';
  }
  
  calcolaRiepilogoIVA(documenti) {
    const riepilogo = {};
    
    documenti.forEach(doc => {
      if (doc.iva > 0 && doc.importo > 0) {
        // Calcola aliquota IVA approssimativa
        const aliquotaCalcolata = Math.round((doc.iva / (doc.importo - doc.iva)) * 100);
        const aliquota = this.normalizzaAliquotaIVA(aliquotaCalcolata);
        
        if (!riepilogo[aliquota]) {
          riepilogo[aliquota] = {
            imponibile: 0,
            imposta: 0,
            operazioni: 0
          };
        }
        
        riepilogo[aliquota].imponibile += (doc.importo - doc.iva);
        riepilogo[aliquota].imposta += doc.iva;
        riepilogo[aliquota].operazioni += 1;
      }
    });
    
    return riepilogo;
  }
  
  normalizzaAliquotaIVA(aliquotaCalcolata) {
    // Normalizza alle aliquote IVA italiane standard
    if (aliquotaCalcolata <= 2) return 0;
    if (aliquotaCalcolata >= 3 && aliquotaCalcolata <= 6) return 4;
    if (aliquotaCalcolata >= 7 && aliquotaCalcolata <= 12) return 10;
    if (aliquotaCalcolata >= 18 && aliquotaCalcolata <= 25) return 22;
    
    return aliquotaCalcolata;
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined ? current[key] : undefined, obj
    );
  }
  
  generaHTML(dati) {
    // Generazione HTML semplice per anteprima
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report Fiscale - ${dati.periodo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; }
          .section { margin: 20px 0; padding: 15px; border: 1px solid #e2e8f0; }
          .stats { display: flex; gap: 20px; }
          .stat-box { flex: 1; text-align: center; background: #f8fafc; padding: 15px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Report Fiscale Mensile</h1>
          <h3>Periodo: ${dati.periodo}</h3>
        </div>
        
        <div class="section">
          <h2>Riepilogo</h2>
          <div class="stats">
            <div class="stat-box">
              <h3>${dati.statistiche.documenti.totale}</h3>
              <p>Documenti</p>
            </div>
            <div class="stat-box">
              <h3>€${dati.statistiche.documenti.totale_importi}</h3>
              <p>Importo Totale</p>
            </div>
            <div class="stat-box">
              <h3>€${dati.statistiche.documenti.totale_iva}</h3>
              <p>IVA Totale</p>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>Documenti</h2>
          <table>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Nome</th>
              <th>Importo</th>
              <th>IVA</th>
            </tr>
            ${dati.documenti.map(doc => `
              <tr>
                <td>${doc.data_documento}</td>
                <td>${doc.type}</td>
                <td>${doc.name}</td>
                <td>€${doc.importo.toFixed(2)}</td>
                <td>€${doc.iva.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </body>
      </html>
    `;
    
    return { html, tipo: 'html' };
  }
  
  async generaReportTrimestrale(options) {
    const { trimestre, user_id, formato } = options;
    
    // Parse trimestre (es: 2025-Q1)
    const [anno, qString] = trimestre.split('-Q');
    const q = parseInt(qString);
    
    const meseInizio = (q - 1) * 3 + 1;
    const meseFine = q * 3;
    
    const dataInizio = `${anno}-${String(meseInizio).padStart(2, '0')}-01`;
    const dataFine = new Date(anno, meseFine, 0).toISOString().split('T')[0];
    
    // Utilizza la stessa logica del report mensile ma per 3 mesi
    const dati = await this.raccogliDatiPeriodo({
      data_inizio: dataInizio,
      data_fine: dataFine,
      user_id
    });
    
    const statistiche = this.calcolaStatistichePeriodo(dati);
    
    // Focus su IVA per report trimestrale
    const riepiegoIVATrimestrale = this.calcolaLiquidazioneIVATrimestrale(dati.documenti);
    
    if (formato === 'pdf') {
      return await this.generaPDFTrimestrale({
        ...dati,
        statistiche,
        riepilogo_iva: riepiegoIVATrimestrale,
        periodo: trimestre
      });
    }
    
    return { dati, statistiche, riepilogo_iva: riepiegoIVATrimestrale, periodo: trimestre };
  }
  
  async generaPDFTrimestrale(dati) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve({ buffer: pdfBuffer, tipo: 'pdf' });
        });
        
        // Header specifico per report trimestrale
        doc.fontSize(20)
           .fillColor('#2563eb')
           .text('LIQUIDAZIONE IVA TRIMESTRALE', 50, 50);
        
        doc.fontSize(14)
           .fillColor('#64748b')
           .text(`Periodo: ${dati.periodo}`, 50, 80);
        
        doc.y = 120;
        
        // Sezione liquidazione IVA
        this.aggiungiLiquidazioneIVA(doc, dati.riepilogo_iva);
        
        // Riepilogo operazioni
        this.aggiungiRiepilogoOperazioni(doc, dati.statistiche);
        
        this.aggiungiFooter(doc);
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  calcolaLiquidazioneIVATrimestrale(documenti) {
    let ivaACredito = 0;
    let ivaADebito = 0;
    const dettagli = [];
    
    documenti.forEach(doc => {
      if (doc.iva > 0) {
        if (doc.natura_operazione === 'Vendita/Emissione') {
          ivaADebito += doc.iva;
          dettagli.push({
            tipo: 'Debito',
            documento: doc.name,
            data: doc.data_documento,
            importo: doc.iva
          });
        } else if (doc.natura_operazione === 'Acquisto/Ricezione') {
          ivaACredito += doc.iva;
          dettagli.push({
            tipo: 'Credito',
            documento: doc.name,
            data: doc.data_documento,
            importo: doc.iva
          });
        }
      }
    });
    
    const saldo = ivaADebito - ivaACredito;
    
    return {
      iva_a_debito: Math.round(ivaADebito * 100) / 100,
      iva_a_credito: Math.round(ivaACredito * 100) / 100,
      saldo: Math.round(saldo * 100) / 100,
      da_versare: saldo > 0 ? Math.round(saldo * 100) / 100 : 0,
      credito_riportare: saldo < 0 ? Math.round(Math.abs(saldo) * 100) / 100 : 0,
      dettagli
    };
  }
  
  aggiungiLiquidazioneIVA(doc, liquidazione) {
    const startY = doc.y;
    
    // Titolo sezione
    doc.fontSize(16)
       .fillColor('#1e293b')
       .text('💰 LIQUIDAZIONE IVA', 50, startY);
    
    doc.y += 30;
    
    // Box liquidazione
    const boxY = doc.y;
    doc.rect(50, boxY, 500, 120)
       .strokeColor('#e2e8f0')
       .stroke();
    
    // IVA a debito
    doc.fontSize(12)
       .fillColor('#dc2626')
       .text('IVA A DEBITO (vendite):', 70, boxY + 20);
    
    doc.fontSize(16)
       .text(`€${liquidazione.iva_a_debito}`, 250, boxY + 20);
    
    // IVA a credito
    doc.fontSize(12)
       .fillColor('#059669')
       .text('IVA A CREDITO (acquisti):', 70, boxY + 45);
    
    doc.fontSize(16)
       .text(`€${liquidazione.iva_a_credito}`, 250, boxY + 45);
    
    // Linea separatrice
    doc.strokeColor('#d1d5db')
       .lineWidth(1)
       .moveTo(70, boxY + 70)
       .lineTo(530, boxY + 70)
       .stroke();
    
    // Saldo
    const saldoColor = liquidazione.saldo >= 0 ? '#dc2626' : '#059669';
    doc.fontSize(14)
       .fillColor('#1e293b')
       .text('SALDO:', 70, boxY + 80);
    
    doc.fontSize(18)
       .fillColor(saldoColor)
       .text(`€${Math.abs(liquidazione.saldo)}`, 250, boxY + 80);
    
    if (liquidazione.da_versare > 0) {
      doc.fontSize(10)
         .fillColor('#dc2626')
         .text('DA VERSARE', 400, boxY + 85);
    } else if (liquidazione.credito_riportare > 0) {
      doc.fontSize(10)
         .fillColor('#059669')
         .text('CREDITO DA RIPORTARE', 400, boxY + 85);
    }
    
    doc.y = boxY + 140;
  }
  
  aggiungiRiepilogoOperazioni(doc, statistiche) {
    const startY = doc.y;
    
    // Titolo sezione
    doc.fontSize(16)
       .fillColor('#1e293b')
       .text('📊 RIEPILOGO OPERAZIONI', 50, startY);
    
    doc.y += 20;
    
    // Statistiche per tipo documento
    Object.entries(statistiche.documenti.per_tipo).forEach(([tipo, count]) => {
      doc.fontSize(10)
         .fillColor('#374151')
         .text(`${tipo.toUpperCase()}: ${count} documenti`, 70, doc.y);
      
      doc.y += 15;
    });
    
    doc.y += 10;
    
    doc.fontSize(12)
       .fillColor('#2563eb')
       .text(`TOTALE IMPORTI: €${statistiche.documenti.totale_importi}`, 70, doc.y);
  }
  
  async generaReportAnnuale(options) {
    const { anno, user_id, formato, includi_appendici } = options;
    
    const dataInizio = `${anno}-01-01`;
    const dataFine = `${anno}-12-31`;
    
    const dati = await this.raccogliDatiPeriodo({
      data_inizio: dataInizio,
      data_fine: dataFine,
      user_id
    });
    
    const statistiche = this.calcolaStatistichePeriodo(dati);
    
    // Analisi per mese
    const analisiMensile = await this.calcolaAnalisiMensile(anno, user_id);
    
    if (formato === 'pdf') {
      return await this.generaPDFAnnuale({
        ...dati,
        statistiche,
        analisi_mensile: analisiMensile,
        anno,
        includi_appendici
      });
    }
    
    return { dati, statistiche, analisi_mensile: analisiMensile, anno };
  }
  
  async calcolaAnalisiMensile(anno, user_id) {
    const analisi = [];
    
    for (let mese = 1; mese <= 12; mese++) {
      const meseString = String(mese).padStart(2, '0');
      const dataInizio = `${anno}-${meseString}-01`;
      const dataFine = new Date(anno, mese, 0).toISOString().split('T')[0];
      
      const datiMese = await this.raccogliDatiPeriodo({
        data_inizio: dataInizio,
        data_fine: dataFine,
        user_id
      });
      
      const statsMese = this.calcolaStatistichePeriodo(datiMese);
      
      analisi.push({
        mese: meseString,
        nome_mese: this.getNomeMese(mese),
        documenti: statsMese.documenti.totale,
        importo: statsMese.documenti.totale_importi,
        iva: statsMese.documenti.totale_iva
      });
    }
    
    return analisi;
  }
  
  getNomeMese(numeroMese) {
    const mesi = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return mesi[numeroMese - 1];
  }
  
  async generaPDFAnnuale(dati) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve({ buffer: pdfBuffer, tipo: 'pdf' });
        });
        
        // Header report annuale
        doc.fontSize(22)
           .fillColor('#2563eb')
           .text(`REPORT FISCALE ANNUALE ${dati.anno}`, 50, 50);
        
        doc.y = 100;
        
        // Riepilogo annuale
        this.aggiungiRiepilogoAnnuale(doc, dati.statistiche);
        
        // Analisi mensile
        this.aggiungiAnalisiMensile(doc, dati.analisi_mensile);
        
        // Sezione IVA annuale
        this.aggiungiIVAAnnuale(doc, dati);
        
        if (dati.includi_appendici) {
          doc.addPage();
          this.aggiungiAppendiciarreport(doc, dati);
        }
        
        this.aggiungiFooter(doc);
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  aggiungiAnalisiMensile(doc, analisiMensile) {
    const startY = doc.y;
    
    doc.fontSize(16)
       .fillColor('#1e293b')
       .text('📈 ANDAMENTO MENSILE', 50, startY);
    
    doc.y += 20;
    
    // Header tabella
    const headerY = doc.y;
    doc.fontSize(10)
       .fillColor('#374151')
       .text('MESE', 50, headerY)
       .text('DOCUMENTI', 150, headerY)
       .text('IMPORTO TOTALE', 250, headerY)
       .text('IVA TOTALE', 380, headerY)
       .text('MEDIA DOC', 480, headerY);
    
    doc.strokeColor('#d1d5db')
       .lineWidth(0.5)
       .moveTo(50, headerY + 15)
       .lineTo(550, headerY + 15)
       .stroke();
    
    doc.y = headerY + 25;
    
    analisiMensile.forEach((mese, index) => {
      const rowY = doc.y;
      
      if (index % 2 === 0) {
        doc.rect(45, rowY - 2, 510, 12)
           .fillColor('#f8fafc')
           .fill();
      }
      
      const mediaDocs = mese.documenti > 0 ? (mese.importo / mese.documenti) : 0;
      
      doc.fontSize(9)
         .fillColor('#374151')
         .text(mese.nome_mese, 50, rowY)
         .text(mese.documenti.toString(), 150, rowY)
         .text(`€${mese.importo.toFixed(2)}`, 250, rowY)
         .text(`€${mese.iva.toFixed(2)}`, 380, rowY)
         .text(`€${mediaDocs.toFixed(2)}`, 480, rowY);
      
      doc.y += 12;
    });
    
    doc.y += 20;
  }
  
  async generaReportPersonalizzato(options) {
    const { data_inizio, data_fine, tipi_documento, sezioni, formato, titolo, user_id } = options;
    
    const dati = await this.raccogliDatiPeriodo({
      data_inizio,
      data_fine,
      user_id
    });
    
    // Filtra documenti per tipo se specificato
    if (tipi_documento && tipi_documento.length > 0) {
      dati.documenti = dati.documenti.filter(doc => 
        tipi_documento.includes(doc.type.toLowerCase())
      );
    }
    
    const statistiche = this.calcolaStatistichePeriodo(dati);
    
    if (formato === 'pdf') {
      return await this.generaPDFPersonalizzato({
        ...dati,
        statistiche,
        sezioni,
        titolo,
        periodo_custom: { inizio: data_inizio, fine: data_fine }
      });
    }
    
    return { dati, statistiche, sezioni, periodo_custom: { inizio: data_inizio, fine: data_fine } };
  }
  
  async getReportDisponibili(user_id) {
    // Trova i periodi per cui ci sono documenti
    const periodi = db.prepare(`
      SELECT DISTINCT strftime('%Y-%m', created_at) as periodo
      FROM documents
      ORDER BY periodo DESC
    `).all();
    
    const anni = db.prepare(`
      SELECT DISTINCT strftime('%Y', created_at) as anno
      FROM documents
      ORDER BY anno DESC
    `).all();
    
    return {
      periodi: periodi.map(p => p.periodo),
      anni: anni.map(a => a.anno),
      tipi: ['mensile', 'trimestrale', 'annuale', 'personalizzato'],
      templates: ['standard', 'compatto', 'esteso', 'commercialista']
    };
  }
  
  async generaAnteprimaReport(options) {
    const { tipo, periodo, user_id } = options;
    
    let dati;
    
    switch (tipo) {
      case 'mensile':
        dati = await this.generaReportMensile({
          mese: periodo,
          user_id,
          formato: 'json',
          includi_dettagli: false
        });
        break;
      case 'trimestrale':
        dati = await this.generaReportTrimestrale({
          trimestre: periodo,
          user_id,
          formato: 'json'
        });
        break;
      case 'annuale':
        dati = await this.generaReportAnnuale({
          anno: parseInt(periodo),
          user_id,
          formato: 'json',
          includi_appendici: false
        });
        break;
      default:
        throw new Error('Tipo report non supportato per anteprima');
    }
    
    // Restituisce solo un riassunto per l'anteprima
    return {
      tipo,
      periodo,
      riepilogo: {
        documenti_totali: dati.statistiche?.documenti?.totale || 0,
        importo_totale: dati.statistiche?.documenti?.totale_importi || 0,
        iva_totale: dati.statistiche?.documenti?.totale_iva || 0,
        errori: dati.statistiche?.documenti?.errori_ai || 0
      },
      sezioni_disponibili: ['riepilogo', 'documenti', 'iva', 'scadenze', 'anomalie']
    };
  }
}

export default new ReportBuilderService();