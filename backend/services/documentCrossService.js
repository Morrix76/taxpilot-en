import { db } from '../database/db.js';

class DocumentCrossService {
  
  async confrontaDocumenti(options) {
    const { documenti_ids, tipo_incrocio, tolleranza_importo, tolleranza_giorni, includi_simili } = options;
    
    // Recupera documenti dal database
    const documenti = await this.getDocumentiByIds(documenti_ids);
    
    if (documenti.length < 2) {
      throw new Error('Documenti non trovati o insufficienti');
    }
    
    // Estrae dati rilevanti da ogni documento
    const documentiProcessati = documenti.map(doc => this.estraiDatiDocumento(doc));
    
    // Esegue confronto basato sul tipo
    let risultato;
    switch (tipo_incrocio) {
      case 'automatico':
        risultato = await this.confrontoAutomatico(documentiProcessati, tolleranza_importo, tolleranza_giorni);
        break;
      case 'per_importo':
        risultato = await this.confrontoPerImporto(documentiProcessati, tolleranza_importo);
        break;
      case 'manuale':
        risultato = await this.confrontoManuale(documentiProcessati);
        break;
      default:
        throw new Error('Tipo incrocio non supportato');
    }
    
    return {
      documenti_analizzati: documenti.length,
      corrispondenze: risultato.matches,
      anomalie: risultato.anomalie,
      documenti_mancanti: risultato.missing,
      raccomandazioni: risultato.raccomandazioni,
      score_similitudine: risultato.score,
      metodo_utilizzato: tipo_incrocio
    };
  }
  
  async getDocumentiByIds(ids) {
    const placeholders = ids.map(() => '?').join(',');
    const query = `
      SELECT id, name, type, original_filename, analysis_result, created_at, file_path
      FROM documents 
      WHERE id IN (${placeholders})
      ORDER BY created_at ASC
    `;
    
    return db.prepare(query).all(...ids);
  }
  
  estraiDatiDocumento(documento) {
    let datiEstratti = {
      id: documento.id,
      nome: documento.name,
      tipo: documento.type,
      data_creazione: documento.created_at,
      importo: 0,
      numero_documento: '',
      codice_fiscale: '',
      partita_iva: '',
      descrizione: '',
      data_documento: null,
      raw_data: {}
    };
    
    try {
      const analysisResult = JSON.parse(documento.analysis_result || '{}');
      datiEstratti.raw_data = analysisResult;
      
      // Estrazione dati specifici per tipo documento
      switch (documento.type.toLowerCase()) {
        case 'fattura':
        case 'busta_paga':
          datiEstratti = { ...datiEstratti, ...this.estraiDatiFattura(analysisResult) };
          break;
        case 'ricevuta':
          datiEstratti = { ...datiEstratti, ...this.estraiDatiRicevuta(analysisResult) };
          break;
        case 'bonifico':
          datiEstratti = { ...datiEstratti, ...this.estraiDatiBonifico(analysisResult) };
          break;
        default:
          datiEstratti = { ...datiEstratti, ...this.estraiDatiGenerici(analysisResult) };
      }
      
    } catch (error) {
      console.error(`Errore parsing documento ${documento.id}:`, error);
    }
    
    return datiEstratti;
  }
  
  estraiDatiFattura(data) {
    return {
      importo: this.estraiImporto(data, ['totale_documento', 'importo_totale', 'total', 'amount']),
      numero_documento: this.estraiCampo(data, ['numero_fattura', 'numero', 'number']),
      codice_fiscale: this.estraiCampo(data, ['codice_fiscale', 'cf']),
      partita_iva: this.estraiCampo(data, ['partita_iva', 'piva', 'vat']),
      data_documento: this.estraiData(data, ['data_fattura', 'data', 'date'])
    };
  }
  
  estraiDatiRicevuta(data) {
    return {
      importo: this.estraiImporto(data, ['importo', 'totale', 'amount', 'total']),
      numero_documento: this.estraiCampo(data, ['numero_ricevuta', 'numero', 'receipt_number']),
      data_documento: this.estraiData(data, ['data_ricevuta', 'data', 'date'])
    };
  }
  
  estraiDatiBonifico(data) {
    return {
      importo: this.estraiImporto(data, ['importo', 'amount', 'totale']),
      numero_documento: this.estraiCampo(data, ['cro', 'trn', 'riferimento']),
      descrizione: this.estraiCampo(data, ['causale', 'descrizione', 'description']),
      data_documento: this.estraiData(data, ['data_bonifico', 'data_valuta', 'date'])
    };
  }
  
  estraiDatiGenerici(data) {
    // Estrazione generica da qualsiasi tipo di documento
    const testo = JSON.stringify(data).toLowerCase();
    
    return {
      importo: this.estraiImportoDaTesto(testo),
      descrizione: this.estraiCampo(data, ['descrizione', 'description', 'note', 'oggetto'])
    };
  }
  
  // Utility per estrazione dati
  estraiImporto(data, campi) {
    for (const campo of campi) {
      const valore = this.getNestedValue(data, campo);
      if (valore !== undefined && !isNaN(parseFloat(valore))) {
        return parseFloat(valore);
      }
    }
    return 0;
  }
  
  estraiCampo(data, campi) {
    for (const campo of campi) {
      const valore = this.getNestedValue(data, campo);
      if (valore && typeof valore === 'string') {
        return valore.trim();
      }
    }
    return '';
  }
  
  estraiData(data, campi) {
    for (const campo of campi) {
      const valore = this.getNestedValue(data, campo);
      if (valore) {
        const data_parsed = new Date(valore);
        if (!isNaN(data_parsed.getTime())) {
          return data_parsed.toISOString().split('T')[0];
        }
      }
    }
    return null;
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined ? current[key] : undefined, obj
    );
  }
  
  estraiImportoDaTesto(testo) {
    // Cerca pattern di importi nel testo
    const patterns = [
      /€\s*(\d+[.,]\d{2})/,
      /(\d+[.,]\d{2})\s*€/,
      /totale[:\s]+(\d+[.,]\d{2})/i,
      /importo[:\s]+(\d+[.,]\d{2})/i
    ];
    
    for (const pattern of patterns) {
      const match = testo.match(pattern);
      if (match) {
        return parseFloat(match[1].replace(',', '.'));
      }
    }
    
    return 0;
  }
  
  // Algoritmi di confronto
  async confrontoAutomatico(documenti, tolleranza_importo, tolleranza_giorni) {
    const matches = [];
    const anomalie = [];
    const missing = [];
    const raccomandazioni = [];
    
    // Raggruppa documenti per importo simile
    const gruppiImporto = this.raggruppaPerImporto(documenti, tolleranza_importo);
    
    for (const gruppo of gruppiImporto) {
      if (gruppo.documenti.length > 1) {
        // Analizza il gruppo per trovare corrispondenze
        const analisiGruppo = this.analizzaGruppoDocumenti(gruppo, tolleranza_giorni);
        
        matches.push(...analisiGruppo.matches);
        anomalie.push(...analisiGruppo.anomalie);
        raccomandazioni.push(...analisiGruppo.raccomandazioni);
      } else {
        // Documento senza corrispondenze per importo
        missing.push({
          documento: gruppo.documenti[0],
          motivo: 'Nessun documento con importo simile',
          tipo_mancante: this.suggerisciTipoMancante(gruppo.documenti[0])
        });
      }
    }
    
    const score = this.calcolaScoreSimilitudine(matches, documenti.length);
    
    return { matches, anomalie, missing, raccomandazioni, score };
  }
  
  raggruppaPerImporto(documenti, tolleranza) {
    const gruppi = [];
    const documentiProcessati = new Set();
    
    for (const doc1 of documenti) {
      if (documentiProcessati.has(doc1.id)) continue;
      
      const gruppo = {
        importo_riferimento: doc1.importo,
        documenti: [doc1]
      };
      
      documentiProcessati.add(doc1.id);
      
      for (const doc2 of documenti) {
        if (documentiProcessati.has(doc2.id)) continue;
        
        const differenza = Math.abs(doc1.importo - doc2.importo);
        if (differenza <= tolleranza) {
          gruppo.documenti.push(doc2);
          documentiProcessati.add(doc2.id);
        }
      }
      
      gruppi.push(gruppo);
    }
    
    return gruppi;
  }
  
  analizzaGruppoDocumenti(gruppo, tolleranza_giorni) {
    const matches = [];
    const anomalie = [];
    const raccomandazioni = [];
    
    const { documenti } = gruppo;
    
    // Verifica corrispondenze date
    for (let i = 0; i < documenti.length; i++) {
      for (let j = i + 1; j < documenti.length; j++) {
        const doc1 = documenti[i];
        const doc2 = documenti[j];
        
        const corrispondenza = this.verificaCorrispondenza(doc1, doc2, tolleranza_giorni);
        
        if (corrispondenza.match) {
          matches.push(corrispondenza);
        } else if (corrispondenza.possibile) {
          raccomandazioni.push({
            tipo: 'verifica_manuale',
            documenti: [doc1.id, doc2.id],
            motivo: corrispondenza.motivo,
            score: corrispondenza.score
          });
        } else {
          anomalie.push({
            tipo: 'mismatch',
            documenti: [doc1.id, doc2.id],
            motivo: corrispondenza.motivo,
            dettagli: corrispondenza.dettagli
          });
        }
      }
    }
    
    return { matches, anomalie, raccomandazioni };
  }
  
  verificaCorrispondenza(doc1, doc2, tolleranza_giorni) {
    let score = 0;
    let match = true;
    let possibile = true;
    let motivo = '';
    let dettagli = {};
    
    // Verifica importi (già fatto nel raggruppamento)
    score += 30;
    
    // Verifica date
    if (doc1.data_documento && doc2.data_documento) {
      const data1 = new Date(doc1.data_documento);
      const data2 = new Date(doc2.data_documento);
      const differenzaGiorni = Math.abs((data1 - data2) / (1000 * 60 * 60 * 24));
      
      if (differenzaGiorni <= tolleranza_giorni) {
        score += 40;
      } else {
        match = false;
        if (differenzaGiorni <= tolleranza_giorni * 2) {
          possibile = true;
          motivo = `Date distanti ${Math.floor(differenzaGiorni)} giorni`;
        } else {
          possibile = false;
          motivo = `Date troppo distanti (${Math.floor(differenzaGiorni)} giorni)`;
        }
      }
      
      dettagli.differenza_giorni = Math.floor(differenzaGiorni);
    } else {
      score += 10; // Penalità per date mancanti
      motivo = 'Date mancanti in uno o entrambi i documenti';
    }
    
    // Verifica codici fiscali/partite IVA
    if (doc1.codice_fiscale && doc2.codice_fiscale) {
      if (doc1.codice_fiscale === doc2.codice_fiscale) {
        score += 20;
      }
    }
    
    if (doc1.partita_iva && doc2.partita_iva) {
      if (doc1.partita_iva === doc2.partita_iva) {
        score += 20;
      }
    }
    
    // Verifica tipi complementari
    const tipiComplementari = this.verificaTipiComplementari(doc1.tipo, doc2.tipo);
    if (tipiComplementari) {
      score += 15;
    } else {
      match = false;
      motivo = `Tipi documento non complementari: ${doc1.tipo} + ${doc2.tipo}`;
    }
    
    return {
      match: match && score >= 70,
      possibile: possibile && score >= 40,
      score,
      motivo,
      dettagli,
      documenti: [doc1, doc2],
      tipo_corrispondenza: this.getTipoCorrispondenza(doc1.tipo, doc2.tipo)
    };
  }
  
  verificaTipiComplementari(tipo1, tipo2) {
    const complementari = [
      ['fattura', 'ricevuta'],
      ['fattura', 'bonifico'], 
      ['ricevuta', 'bonifico'],
      ['busta_paga', 'bonifico']
    ];
    
    return complementari.some(coppia => 
      (coppia.includes(tipo1.toLowerCase()) && coppia.includes(tipo2.toLowerCase()))
    );
  }
  
  getTipoCorrispondenza(tipo1, tipo2) {
    const tipi = [tipo1.toLowerCase(), tipo2.toLowerCase()].sort();
    
    if (tipi.includes('fattura') && tipi.includes('ricevuta')) {
      return 'fattura_ricevuta';
    }
    if (tipi.includes('fattura') && tipi.includes('bonifico')) {
      return 'fattura_pagamento';
    }
    if (tipi.includes('ricevuta') && tipi.includes('bonifico')) {
      return 'ricevuta_pagamento';
    }
    
    return 'altro';
  }
  
  async confrontoPerImporto(documenti, tolleranza) {
    const matches = [];
    
    for (let i = 0; i < documenti.length; i++) {
      for (let j = i + 1; j < documenti.length; j++) {
        const doc1 = documenti[i];
        const doc2 = documenti[j];
        
        const differenza = Math.abs(doc1.importo - doc2.importo);
        if (differenza <= tolleranza) {
          matches.push({
            match: true,
            score: 100 - (differenza / tolleranza * 100),
            documenti: [doc1, doc2],
            tipo_corrispondenza: 'importo_identico',
            dettagli: { differenza_importo: differenza }
          });
        }
      }
    }
    
    return { matches, anomalie: [], missing: [], raccomandazioni: [] };
  }
  
  async confrontoManuale(documenti) {
    // Restituisce tutti i possibili accoppiamenti per revisione manuale
    const possibili = [];
    
    for (let i = 0; i < documenti.length; i++) {
      for (let j = i + 1; j < documenti.length; j++) {
        possibili.push({
          match: false,
          score: 0,
          documenti: [documenti[i], documenti[j]],
          tipo_corrispondenza: 'revisione_manuale',
          motivo: 'Richiede verifica manuale'
        });
      }
    }
    
    return { matches: [], anomalie: [], missing: [], raccomandazioni: possibili };
  }
  
  // Utility functions
  calcolaScoreSimilitudine(matches, totaleDocumenti) {
    if (totaleDocumenti === 0) return 0;
    
    const documentiAbbinati = new Set();
    matches.forEach(match => {
      match.documenti.forEach(doc => documentiAbbinati.add(doc.id));
    });
    
    return (documentiAbbinati.size / totaleDocumenti) * 100;
  }
  
  suggerisciTipoMancante(documento) {
    switch (documento.tipo.toLowerCase()) {
      case 'fattura':
        return ['ricevuta', 'bonifico'];
      case 'ricevuta':
        return ['fattura', 'bonifico'];
      case 'bonifico':
        return ['fattura', 'ricevuta'];
      default:
        return ['documento_correlato'];
    }
  }
  
  // Funzioni per endpoint specifici
  async trovaCorrispondenzeAutomatiche(options) {
    const { documento_principale_id, cerca_tipi, periodo_giorni, soglia_similitudine } = options;
    
    // Recupera documento principale
    const documentoPrincipale = await this.getDocumentiByIds([documento_principale_id]);
    if (documentoPrincipale.length === 0) {
      throw new Error('Documento principale non trovato');
    }
    
    const docPrincipale = this.estraiDatiDocumento(documentoPrincipale[0]);
    
    // Cerca documenti candidati nel periodo
    const candidati = await this.getDocumentiNelPeriodo(
      docPrincipale.data_documento || docPrincipale.data_creazione,
      periodo_giorni,
      cerca_tipi
    );
    
    const candidatiProcessati = candidati.map(doc => this.estraiDatiDocumento(doc));
    
    // Trova corrispondenze
    const matches = [];
    for (const candidato of candidatiProcessati) {
      const corrispondenza = this.verificaCorrispondenza(
        docPrincipale, 
        candidato, 
        periodo_giorni
      );
      
      if (corrispondenza.score >= soglia_similitudine * 100) {
        matches.push(corrispondenza);
      }
    }
    
    // Ordina per score
    matches.sort((a, b) => b.score - a.score);
    
    const tipiTrovati = matches.map(m => m.documenti[1].tipo);
    const missing = cerca_tipi.filter(tipo => !tipiTrovati.includes(tipo));
    
    return {
      documento_principale: docPrincipale,
      matches,
      missing: missing.map(tipo => ({ tipo, motivo: 'Non trovato nel periodo' })),
      raccomandazioni: this.generaRaccomandazioni(docPrincipale, matches, missing)
    };
  }
  
  async getDocumentiNelPeriodo(dataRiferimento, giorni, tipi = []) {
    const dataInizio = new Date(dataRiferimento);
    dataInizio.setDate(dataInizio.getDate() - giorni);
    
    const dataFine = new Date(dataRiferimento);
    dataFine.setDate(dataFine.getDate() + giorni);
    
    let tipoFilter = '';
    let params = [dataInizio.toISOString(), dataFine.toISOString()];
    
    if (tipi.length > 0) {
      tipoFilter = ` AND type IN (${tipi.map(() => '?').join(',')})`;
      params.push(...tipi);
    }
    
    const query = `
      SELECT id, name, type, original_filename, analysis_result, created_at, file_path
      FROM documents 
      WHERE created_at BETWEEN ? AND ?
      ${tipoFilter}
      ORDER BY created_at ASC
    `;
    
    return db.prepare(query).all(...params);
  }
  
  async verificaCicloCompleto(options) {
    const { fattura_id, tolleranza_importo, tolleranza_giorni } = options;
    
    // Recupera fattura
    const fattura = await this.getDocumentiByIds([fattura_id]);
    if (fattura.length === 0) {
      throw new Error('Fattura non trovata');
    }
    
    const fatturaData = this.estraiDatiDocumento(fattura[0]);
    
    // Cerca ricevuta e bonifico
    const corrispondenze = await this.trovaCorrispondenzeAutomatiche({
      documento_principale_id: fattura_id,
      cerca_tipi: ['ricevuta', 'bonifico'],
      periodo_giorni: tolleranza_giorni,
      soglia_similitudine: 0.5
    });
    
    const ricevuta = corrispondenze.matches.find(m => 
      m.documenti[1].tipo.toLowerCase() === 'ricevuta'
    );
    
    const bonifico = corrispondenze.matches.find(m => 
      m.documenti[1].tipo.toLowerCase() === 'bonifico'
    );
    
    const completo = ricevuta && bonifico;
    const anomalie = [];
    const raccomandazioni = [];
    
    // Verifica coerenza del ciclo
    if (ricevuta && bonifico) {
      const corrispondenzaRicevutaBonifico = this.verificaCorrispondenza(
        ricevuta.documenti[1],
        bonifico.documenti[1],
        tolleranza_giorni
      );
      
      if (!corrispondenzaRicevutaBonifico.match) {
        anomalie.push({
          tipo: 'incoerenza_ricevuta_bonifico',
          motivo: 'Ricevuta e bonifico non corrispondono tra loro',
          dettagli: corrispondenzaRicevutaBonifico.dettagli
        });
      }
    }
    
    if (!ricevuta) {
      raccomandazioni.push({
        tipo: 'ricevuta_mancante',
        descrizione: 'Cercare ricevuta di pagamento per questa fattura',
        priorita: 'alta'
      });
    }
    
    if (!bonifico) {
      raccomandazioni.push({
        tipo: 'bonifico_mancante',
        descrizione: 'Cercare bonifico di pagamento per questa fattura',
        priorita: 'alta'
      });
    }
    
    let stato = 'incompleto';
    if (completo) {
      stato = anomalie.length > 0 ? 'completo_con_anomalie' : 'completo';
    } else if (ricevuta || bonifico) {
      stato = 'parzialmente_completo';
    }
    
    return {
      completo,
      fattura: fatturaData,
      ricevuta: ricevuta ? ricevuta.documenti[1] : null,
      bonifico: bonifico ? bonifico.documenti[1] : null,
      anomalie,
      raccomandazioni,
      stato
    };
  }
  
  async trovaDocumentiOrfani(options) {
    const { tipo_documento, periodo_giorni, soglia_importo } = options;
    
    let query = `
      SELECT id, name, type, original_filename, analysis_result, created_at
      FROM documents 
      WHERE created_at >= DATE('now', '-${periodo_giorni} days')
    `;
    
    const params = [];
    
    if (tipo_documento) {
      query += ' AND type = ?';
      params.push(tipo_documento);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const documenti = db.prepare(query).all(...params);
    const documentiProcessati = documenti.map(doc => this.estraiDatiDocumento(doc));
    
    const orfani = [];
    const suggerimenti = [];
    
    for (const doc of documentiProcessati) {
      if (doc.importo < soglia_importo) continue;
      
      // Cerca possibili corrispondenze per questo documento
      const altriDocumenti = documentiProcessati.filter(d => d.id !== doc.id);
      let haCorrispondenze = false;
      
      for (const altro of altriDocumenti) {
        const corrispondenza = this.verificaCorrispondenza(doc, altro, periodo_giorni);
        if (corrispondenza.match) {
          haCorrispondenze = true;
          break;
        }
      }
      
      if (!haCorrispondenze) {
        orfani.push({
          ...doc,
          motivo_orfano: 'Nessuna corrispondenza trovata',
          tipo_mancante: this.suggerisciTipoMancante(doc)
        });
        
        suggerimenti.push({
          documento_id: doc.id,
          azione: 'cercare_corrispondenze',
          descrizione: `Cercare ${this.suggerisciTipoMancante(doc).join(' o ')} per questo ${doc.tipo}`,
          priorita: doc.importo > soglia_importo * 5 ? 'alta' : 'media'
        });
      }
    }
    
    const statistiche = {
      totale_documenti: documentiProcessati.length,
      documenti_orfani: orfani.length,
      percentuale_orfani: documentiProcessati.length > 0 ? 
        Math.round((orfani.length / documentiProcessati.length) * 100) : 0,
      importo_totale_orfani: orfani.reduce((sum, doc) => sum + doc.importo, 0)
    };
    
    return { documenti: orfani, statistiche, suggerimenti };
  }
  
  async analisiGlobaleDocumenti(options) {
    const { periodo_inizio, periodo_fine, gruppo_per } = options;
    
    let whereClause = '';
    const params = [];
    
    if (periodo_inizio && periodo_fine) {
      whereClause = 'WHERE created_at BETWEEN ? AND ?';
      params.push(periodo_inizio, periodo_fine);
    }
    
    const query = `
      SELECT id, name, type, analysis_result, created_at
      FROM documents 
      ${whereClause}
      ORDER BY created_at ASC
    `;
    
    const documenti = db.prepare(query).all(...params);
    const documentiProcessati = documenti.map(doc => this.estraiDatiDocumento(doc));
    
    // Raggruppa per periodo
    const gruppi = this.raggruppaDocumentiPerPeriodo(documentiProcessati, gruppo_per);
    
    // Analizza ogni gruppo
    const analisiGruppi = [];
    for (const gruppo of gruppi) {
      const analisiGruppo = await this.analizzaGruppoPerPeriodo(gruppo);
      analisiGruppi.push(analisiGruppo);
    }
    
    // Statistiche globali
    const statisticheGlobali = this.calcolaStatisticheGlobali(documentiProcessati);
    
    return {
      periodo_analizzato: { inizio: periodo_inizio, fine: periodo_fine },
      gruppi: analisiGruppi,
      statistiche_globali: statisticheGlobali,
      raccomandazioni_globali: this.generaRaccomandazioniGlobali(analisiGruppi)
    };
  }
  
  raggruppaDocumentiPerPeriodo(documenti, gruppo_per) {
    const gruppi = new Map();
    
    for (const doc of documenti) {
      const data = new Date(doc.data_creazione);
      let chiave;
      
      switch (gruppo_per) {
        case 'giorno':
          chiave = data.toISOString().split('T')[0];
          break;
        case 'settimana':
          const lunedi = new Date(data);
          lunedi.setDate(data.getDate() - data.getDay() + 1);
          chiave = lunedi.toISOString().split('T')[0];
          break;
        case 'mese':
        default:
          chiave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
          break;
      }
      
      if (!gruppi.has(chiave)) {
        gruppi.set(chiave, { periodo: chiave, documenti: [] });
      }
      
      gruppi.get(chiave).documenti.push(doc);
    }
    
    return Array.from(gruppi.values());
  }
  
  async analizzaGruppoPerPeriodo(gruppo) {
    const { periodo, documenti } = gruppo;
    
    // Esegue incrocio automatico sui documenti del periodo
    const risultatoIncrocio = await this.confrontoAutomatico(documenti, 0.01, 30);
    
    const tipiDocumenti = {};
    let importoTotale = 0;
    
    for (const doc of documenti) {
      tipiDocumenti[doc.tipo] = (tipiDocumenti[doc.tipo] || 0) + 1;
      importoTotale += doc.importo;
    }
    
    return {
      periodo,
      totale_documenti: documenti.length,
      tipi_documenti: tipiDocumenti,
      importo_totale: importoTotale,
      corrispondenze_trovate: risultatoIncrocio.matches.length,
      documenti_orfani: risultatoIncrocio.missing.length,
      score_incrocio: risultatoIncrocio.score,
      anomalie: risultatoIncrocio.anomalie.length
    };
  }
  
  calcolaStatisticheGlobali(documenti) {
    const tipiDocumenti = {};
    let importoTotale = 0;
    let documentiConImporto = 0;
    
    for (const doc of documenti) {
      tipiDocumenti[doc.tipo] = (tipiDocumenti[doc.tipo] || 0) + 1;
      importoTotale += doc.importo;
      if (doc.importo > 0) documentiConImporto++;
    }
    
    return {
      totale_documenti: documenti.length,
      tipi_documenti: tipiDocumenti,
      importo_totale: Math.round(importoTotale * 100) / 100,
      documenti_con_importo: documentiConImporto,
      importo_medio: documentiConImporto > 0 ? 
        Math.round((importoTotale / documentiConImporto) * 100) / 100 : 0
    };
  }
  
  generaRaccomandazioni(documentoPrincipale, matches, missing) {
    const raccomandazioni = [];
    
    if (missing.length > 0) {
      raccomandazioni.push({
        tipo: 'documenti_mancanti',
        descrizione: `Cercare ${missing.join(', ')} correlati`,
        priorita: 'alta',
        documento_riferimento: documentoPrincipale.id
      });
    }
    
    if (matches.length === 0) {
      raccomandazioni.push({
        tipo: 'nessuna_corrispondenza',
        descrizione: 'Verificare se esistono documenti correlati in altri periodi',
        priorita: 'media'
      });
    }
    
    return raccomandazioni;
  }
  
  generaRaccomandazioniGlobali(analisiGruppi) {
    const raccomandazioni = [];
    
    const gruppiConAnomalieElevate = analisiGruppi.filter(g => g.anomalie > 2);
    if (gruppiConAnomalieElevate.length > 0) {
      raccomandazioni.push({
        tipo: 'anomalie_ricorrenti',
        descrizione: 'Alcuni periodi presentano molte anomalie negli incroci',
        priorita: 'alta',
        periodi_interessati: gruppiConAnomalieElevate.map(g => g.periodo)
      });
    }
    
    const gruppiConOrfaniElevati = analisiGruppi.filter(g => 
      g.documenti_orfani > g.totale_documenti * 0.5
    );
    if (gruppiConOrfaniElevati.length > 0) {
      raccomandazioni.push({
        tipo: 'documenti_orfani_elevati',
        descrizione: 'Alcuni periodi hanno molti documenti senza corrispondenze',
        priorita: 'media',
        periodi_interessati: gruppiConOrfaniElevati.map(g => g.periodo)
      });
    }
    
    return raccomandazioni;
  }
  
  async getStatisticheIncroci() {
    // Query per statistiche generali
    const totaleDocumenti = db.prepare('SELECT COUNT(*) as count FROM documents').get().count;
    
    const documentiPerTipo = db.prepare(`
      SELECT type, COUNT(*) as count 
      FROM documents 
      GROUP BY type
    `).all();
    
    return {
      totale_documenti: totaleDocumenti,
      documenti_per_tipo: documentiPerTipo,
      ultima_analisi: new Date().toISOString(),
      funzionalita_disponibili: [
        'confronto_automatico',
        'ricerca_corrispondenze',
        'verifica_ciclo_completo',
        'analisi_documenti_orfani',
        'analisi_globale'
      ]
    };
  }
}

export default new DocumentCrossService();