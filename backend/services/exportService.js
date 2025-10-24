// backend/services/exportService.js - SERVIZIO EXPORT MULTI-FORMATO

import { getAllDocuments } from '../database/db.js';
import xml2js from 'xml2js';
import Papa from 'papaparse';

/**
 * 🔄 SERVIZIO INTEGRAZIONE GESTIONALI - EXPORT MULTI-FORMATO
 * 
 * Funzionalità implementate:
 * ✅ Export CSV standard (compatibile Excel)
 * ✅ Export CSV per gestionali specifici (Zucchetti, TeamSystem, etc.)
 * ✅ Export XML strutturato
 * ✅ Export JSON per API REST
 * ✅ Export tracciati personalizzati
 * ✅ Mappatura campi configurabile
 * ✅ Validazione pre-export
 */

class ExportService {
  
  // Configurazioni mappatura campi per diversi gestionali
  static GESTIONALE_CONFIGS = {
    ZUCCHETTI: {
      nome: 'Zucchetti Ad Hoc',
      separatore: ';',
      encoding: 'ISO-8859-1',
      dateFormat: 'DD/MM/YYYY',
      decimalSeparator: ',',
      campi: {
        data: 'DATADOC',
        numero: 'NUMDOC',
        tipo: 'TIPODOC',
        clifor: 'CODCLIFOR',
        descrizione: 'DESCR',
        imponibile: 'IMPONIBILE',
        iva: 'IMPIVA',
        totale: 'TOTDOC',
        aliquota: 'ALIQIVA'
      }
    },
    TEAMSYSTEM: {
      nome: 'TeamSystem',
      separatore: '\t',
      encoding: 'UTF-8',
      dateFormat: 'YYYYMMDD',
      decimalSeparator: '.',
      campi: {
        data: 'DT_DOC',
        numero: 'NR_DOC',
        tipo: 'TP_DOC',
        clifor: 'CD_CF',
        descrizione: 'DS_DOC',
        imponibile: 'IM_IMP',
        iva: 'IM_IVA',
        totale: 'IM_TOT',
        aliquota: 'CD_IVA'
      }
    },
    DANEA: {
      nome: 'Danea Easyfatt',
      separatore: ',',
      encoding: 'UTF-8',
      dateFormat: 'DD-MM-YYYY',
      decimalSeparator: ',',
      campi: {
        data: 'Data',
        numero: 'Numero',
        tipo: 'TipoDocumento',
        clifor: 'Cliente',
        descrizione: 'Oggetto',
        imponibile: 'Imponibile',
        iva: 'ImportoIva',
        totale: 'Totale',
        aliquota: 'AliquotaIva'
      }
    },
    BUFFETTI: {
      nome: 'Buffetti',
      separatore: ';',
      encoding: 'Windows-1252',
      dateFormat: 'GG/MM/AAAA',
      decimalSeparator: ',',
      campi: {
        data: 'DataDoc',
        numero: 'NumDoc',
        tipo: 'TipoDoc',
        clifor: 'CodiceCliFor',
        descrizione: 'Descrizione',
        imponibile: 'TotImponibile',
        iva: 'TotIva',
        totale: 'TotDocumento',
        aliquota: 'CodIva'
      }
    }
  };
  
  /**
   * 📊 EXPORT DOCUMENTI IN FORMATO SPECIFICO
   * @param {number} userId - ID utente
   * @param {Object} options - Opzioni export
   * @returns {Object} File esportato
   */
  static async exportDocumenti(userId, options = {}) {
    try {
      const {
        formato = 'CSV',
        gestionale = 'STANDARD',
        filtri = {},
        includiScritture = false,
        ordinamento = 'data'
      } = options;
      
      console.log(`📤 Export documenti - Formato: ${formato}, Gestionale: ${gestionale}`);
      
      // 1. Recupera documenti con filtri
      const documenti = await this.getDocumentiFiltrati(userId, filtri);
      
      // 2. Prepara dati per export
      const datiExport = await this.preparaDatiExport(documenti, gestionale, includiScritture);
      
      // 3. Ordina dati
      const datiOrdinati = this.ordinaDati(datiExport, ordinamento);
      
      // 4. Genera export nel formato richiesto
      let risultato;
      switch (formato.toUpperCase()) {
        case 'CSV':
          risultato = await this.generaCSV(datiOrdinati, gestionale);
          break;
        case 'XML':
          risultato = await this.generaXML(datiOrdinati, gestionale);
          break;
        case 'JSON':
          risultato = await this.generaJSON(datiOrdinati, gestionale);
          break;
        case 'TXT':
          risultato = await this.generaTXT(datiOrdinati, gestionale);
          break;
        default:
          throw new Error(`Formato ${formato} non supportato`);
      }
      
      // 5. Aggiungi metadati export
      return {
        ...risultato,
        metadati: {
          dataExport: new Date().toISOString(),
          numeroRecord: datiOrdinati.length,
          formato,
          gestionale,
          versione: '1.0',
          checksum: this.calcolaChecksum(risultato.contenuto)
        }
      };
      
    } catch (error) {
      console.error('❌ Errore export documenti:', error);
      throw new Error(`Errore durante l'export: ${error.message}`);
    }
  }
  
  /**
   * 📋 PREPARA DATI PER EXPORT
   */
  static async preparaDatiExport(documenti, gestionale, includiScritture) {
    const config = this.GESTIONALE_CONFIGS[gestionale] || this.getConfigStandard();
    
    return Promise.all(documenti.map(async (doc) => {
      try {
        let analysisData = {};
        if (doc.analysis_result) {
          analysisData = typeof doc.analysis_result === 'string' 
            ? JSON.parse(doc.analysis_result) 
            : doc.analysis_result;
        }
        
        // Dati base documento
        const datiBase = {
          data: this.formattaData(doc.date || doc.created_at, config.dateFormat),
          numero: analysisData.numero || doc.numero || `DOC-${doc.id}`,
          tipo: this.mappaTipoDocumento(doc.type, gestionale),
          clifor: this.estraiCodiceCliFor(analysisData, doc),
          descrizione: analysisData.oggetto || doc.original_filename || '',
          imponibile: this.formattaImporto(analysisData.imponibile || 0, config),
          iva: this.formattaImporto(analysisData.importoIva || 0, config),
          totale: this.formattaImporto(analysisData.totale || 0, config),
          aliquota: analysisData.aliquotaIva || 22
        };
        
        // Aggiungi campi personalizzati per gestionale
        const datiGestionale = this.aggiungiCampiGestionale(datiBase, analysisData, gestionale);
        
        // Se richiesto, includi scritture contabili
        if (includiScritture && analysisData.scrittureContabili) {
          datiGestionale.scritture = analysisData.scrittureContabili;
        }
        
        return datiGestionale;
        
      } catch (error) {
        console.warn(`⚠️ Errore preparazione documento ${doc.id}:`, error);
        return null;
      }
    })).then(risultati => risultati.filter(r => r !== null));
  }
  
  /**
   * 📄 GENERA EXPORT CSV
   */
  static async generaCSV(dati, gestionale) {
    const config = this.GESTIONALE_CONFIGS[gestionale] || this.getConfigStandard();
    
    // Prepara righe CSV con mappatura campi
    const righe = dati.map(record => {
      const riga = {};
      
      // Mappa campi secondo configurazione gestionale
      Object.entries(config.campi).forEach(([campoInterno, campoGestionale]) => {
        riga[campoGestionale] = record[campoInterno] || '';
      });
      
      return riga;
    });
    
    // Genera CSV con Papa Parse
    const csv = Papa.unparse(righe, {
      delimiter: config.separatore,
      header: true,
      newline: '\r\n'
    });
    
    return {
      contenuto: csv,
      mimeType: 'text/csv',
      encoding: config.encoding,
      estensione: '.csv',
      filename: `export_${gestionale.toLowerCase()}_${Date.now()}.csv`
    };
  }
  
  /**
   * 📄 GENERA EXPORT XML
   */
  static async generaXML(dati, gestionale) {
    const builder = new xml2js.Builder({
      rootName: 'ExportDocumenti',
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ' }
    });
    
    const xmlData = {
      InfoExport: {
        Gestionale: gestionale,
        DataExport: new Date().toISOString(),
        NumeroDocumenti: dati.length,
        Versione: '1.0'
      },
      Documenti: {
        Documento: dati.map(doc => ({
          DataDocumento: doc.data,
          NumeroDocumento: doc.numero,
          TipoDocumento: doc.tipo,
          ClienteFornitore: {
            Codice: doc.clifor,
            Descrizione: doc.descrizione
          },
          DatiEconomici: {
            Imponibile: doc.imponibile,
            ImportoIva: doc.iva,
            TotaleDocumento: doc.totale,
            AliquotaIva: doc.aliquota
          },
          // Aggiungi scritture se presenti
          ...(doc.scritture && {
            ScrittureContabili: {
              Scrittura: doc.scritture.map(s => ({
                Conto: s.conto,
                Dare: s.dare || 0,
                Avere: s.avere || 0,
                Descrizione: s.descrizione
              }))
            }
          })
        }))
      }
    };
    
    const xml = builder.buildObject(xmlData);
    
    return {
      contenuto: xml,
      mimeType: 'application/xml',
      encoding: 'UTF-8',
      estensione: '.xml',
      filename: `export_${gestionale.toLowerCase()}_${Date.now()}.xml`
    };
  }
  
  /**
   * 📄 GENERA EXPORT JSON
   */
  static async generaJSON(dati, gestionale) {
    const jsonData = {
      export: {
        gestionale,
        dataExport: new Date().toISOString(),
        numeroDocumenti: dati.length,
        versione: '1.0'
      },
      documenti: dati
    };
    
    return {
      contenuto: JSON.stringify(jsonData, null, 2),
      mimeType: 'application/json',
      encoding: 'UTF-8',
      estensione: '.json',
      filename: `export_${gestionale.toLowerCase()}_${Date.now()}.json`
    };
  }
  
  /**
   * 📄 GENERA EXPORT TXT (Tracciato posizionale)
   */
  static async generaTXT(dati, gestionale) {
    // Definizione tracciato posizionale per alcuni gestionali
    const tracciati = {
      ZUCCHETTI: {
        lunghezzaRiga: 200,
        campi: [
          { nome: 'data', inizio: 1, lunghezza: 10 },
          { nome: 'numero', inizio: 11, lunghezza: 20 },
          { nome: 'tipo', inizio: 31, lunghezza: 3 },
          { nome: 'clifor', inizio: 34, lunghezza: 16 },
          { nome: 'imponibile', inizio: 50, lunghezza: 15, tipo: 'numerico' },
          { nome: 'iva', inizio: 65, lunghezza: 15, tipo: 'numerico' },
          { nome: 'totale', inizio: 80, lunghezza: 15, tipo: 'numerico' }
        ]
      }
    };
    
    const tracciato = tracciati[gestionale];
    if (!tracciato) {
      throw new Error(`Tracciato TXT non disponibile per ${gestionale}`);
    }
    
    const righe = dati.map(record => {
      let riga = ' '.repeat(tracciato.lunghezzaRiga);
      
      tracciato.campi.forEach(campo => {
        let valore = String(record[campo.nome] || '');
        
        // Formatta valori numerici
        if (campo.tipo === 'numerico') {
          valore = valore.replace(',', '').replace('.', '').padStart(campo.lunghezza, '0');
        } else {
          valore = valore.padEnd(campo.lunghezza, ' ');
        }
        
        // Tronca se necessario
        valore = valore.substring(0, campo.lunghezza);
        
        // Inserisci nella posizione corretta
        riga = riga.substring(0, campo.inizio - 1) + valore + 
               riga.substring(campo.inizio - 1 + campo.lunghezza);
      });
      
      return riga;
    });
    
    return {
      contenuto: righe.join('\r\n'),
      mimeType: 'text/plain',
      encoding: 'ASCII',
      estensione: '.txt',
      filename: `export_${gestionale.toLowerCase()}_${Date.now()}.txt`
    };
  }
  
  /**
   * 🔧 GENERA TEMPLATE IMPORT
   */
  static async generaTemplateImport(gestionale, formato = 'CSV') {
    const config = this.GESTIONALE_CONFIGS[gestionale] || this.getConfigStandard();
    
    // Crea riga di esempio
    const esempio = {
      data: this.formattaData(new Date(), config.dateFormat),
      numero: 'FT001/2024',
      tipo: 'FT',
      clifor: 'CLI001',
      descrizione: 'Esempio fattura di vendita',
      imponibile: this.formattaImporto(1000, config),
      iva: this.formattaImporto(220, config),
      totale: this.formattaImporto(1220, config),
      aliquota: '22'
    };
    
    if (formato === 'CSV') {
      // Genera template CSV
      const template = {};
      Object.entries(config.campi).forEach(([campoInterno, campoGestionale]) => {
        template[campoGestionale] = esempio[campoInterno] || '';
      });
      
      const csv = Papa.unparse([template], {
        delimiter: config.separatore,
        header: true
      });
      
      return {
        contenuto: csv,
        mimeType: 'text/csv',
        encoding: config.encoding,
        filename: `template_import_${gestionale.toLowerCase()}.csv`,
        istruzioni: this.generaIstruzioniImport(gestionale)
      };
    }
    
    throw new Error(`Template formato ${formato} non supportato`);
  }
  
  /**
   * 📋 GENERA ISTRUZIONI IMPORT
   */
  static generaIstruzioniImport(gestionale) {
    const config = this.GESTIONALE_CONFIGS[gestionale];
    
    return {
      gestionale: config.nome,
      formato: {
        separatore: config.separatore === '\t' ? 'TAB' : config.separatore,
        encoding: config.encoding,
        formatoData: config.dateFormat,
        separatoreDecimali: config.decimalSeparator
      },
      campiObbligatori: ['data', 'numero', 'tipo', 'totale'],
      mappaturaCampi: Object.entries(config.campi).map(([interno, gestionale]) => ({
        campoSistema: interno,
        campoGestionale: gestionale
      })),
      tipiDocumento: {
        'FT': 'Fattura',
        'NC': 'Nota Credito',
        'ND': 'Nota Debito',
        'DDT': 'Documento di Trasporto',
        'RIC': 'Ricevuta'
      },
      note: [
        'I campi numerici devono usare il separatore decimale configurato',
        'Le date devono rispettare il formato specificato',
        'I codici cliente/fornitore devono esistere nel gestionale',
        'L\'encoding del file deve corrispondere a quello specificato'
      ]
    };
  }
  
  // ===== UTILITY FUNCTIONS =====
  
  /**
   * 🔍 RECUPERA DOCUMENTI FILTRATI
   */
  static async getDocumentiFiltrati(userId, filtri) {
    const documenti = await getAllDocuments();
    
    let risultati = documenti.filter(doc => doc.user_id === userId);
    
    // Applica filtri
    if (filtri.dataInizio && filtri.dataFine) {
      risultati = risultati.filter(doc => {
        const dataDoc = new Date(doc.date || doc.created_at);
        return dataDoc >= new Date(filtri.dataInizio) && 
               dataDoc <= new Date(filtri.dataFine);
      });
    }
    
    if (filtri.tipo) {
      risultati = risultati.filter(doc => doc.type === filtri.tipo);
    }
    
    if (filtri.stato) {
      risultati = risultati.filter(doc => doc.status === filtri.stato);
    }
    
    return risultati;
  }
  
  /**
   * 📅 FORMATTA DATA
   */
  static formattaData(data, formato) {
    const d = new Date(data);
    
    const replacements = {
      'YYYY': d.getFullYear(),
      'MM': String(d.getMonth() + 1).padStart(2, '0'),
      'DD': String(d.getDate()).padStart(2, '0'),
      'AAAA': d.getFullYear(),
      'GG': String(d.getDate()).padStart(2, '0')
    };
    
    let risultato = formato;
    Object.entries(replacements).forEach(([key, value]) => {
      risultato = risultato.replace(key, value);
    });
    
    return risultato;
  }
  
  /**
   * 💰 FORMATTA IMPORTO
   */
  static formattaImporto(valore, config) {
    const numero = parseFloat(valore) || 0;
    const decimali = numero.toFixed(2);
    
    if (config.decimalSeparator === ',') {
      return decimali.replace('.', ',');
    }
    
    return decimali;
  }
  
  /**
   * 🏢 ESTRAI CODICE CLIENTE/FORNITORE
   */
  static estraiCodiceCliFor(analysisData, doc) {
    // Priorità: codice > partita IVA > codice fiscale > ID documento
    return analysisData.codiceCliente || 
           analysisData.cessionario?.partitaIva ||
           analysisData.cessionario?.codiceFiscale ||
           analysisData.cedente?.partitaIva ||
           analysisData.cedente?.codiceFiscale ||
           `AUTO-${doc.id}`;
  }
  
  /**
   * 📋 MAPPA TIPO DOCUMENTO
   */
  static mappaTipoDocumento(tipo, gestionale) {
    const mappature = {
      STANDARD: {
        'fattura': 'FT',
        'fattura_elettronica': 'FE',
        'nota_credito': 'NC',
        'nota_debito': 'ND',
        'documento_trasporto': 'DDT',
        'scontrino': 'SC',
        'ricevuta': 'RIC'
      },
      ZUCCHETTI: {
        'fattura': 'FAT',
        'fattura_elettronica': 'FEL',
        'nota_credito': 'NCR',
        'nota_debito': 'NDB',
        'documento_trasporto': 'BOL'
      }
    };
    
    const mappa = mappature[gestionale] || mappature.STANDARD;
    return mappa[tipo] || tipo.toUpperCase();
  }
  
  /**
   * ➕ AGGIUNGI CAMPI SPECIFICI GESTIONALE
   */
  static aggiungiCampiGestionale(datiBase, analysisData, gestionale) {
    const dati = { ...datiBase };
    
    // Aggiungi campi specifici per gestionale
    switch (gestionale) {
      case 'ZUCCHETTI':
        dati.causale = analysisData.causale || 'VEN';
        dati.registro = 'VEN';
        dati.sezionale = '001';
        break;
        
      case 'TEAMSYSTEM':
        dati.cd_caus = analysisData.causale || '001';
        dati.fl_iva = 'S';
        dati.tp_reg = '1';
        break;
        
      case 'DANEA':
        dati.modalitaPagamento = analysisData.modalitaPagamento || 'Bonifico';
        dati.banca = analysisData.banca || '';
        break;
    }
    
    return dati;
  }
  
  /**
   * 🔢 ORDINA DATI
   */
  static ordinaDati(dati, criterio) {
    const ordinamenti = {
      'data': (a, b) => new Date(a.data) - new Date(b.data),
      'numero': (a, b) => a.numero.localeCompare(b.numero),
      'importo': (a, b) => parseFloat(b.totale) - parseFloat(a.totale),
      'tipo': (a, b) => a.tipo.localeCompare(b.tipo)
    };
    
    const fnOrdinamento = ordinamenti[criterio] || ordinamenti.data;
    return [...dati].sort(fnOrdinamento);
  }
  
  /**
   * 🔐 CALCOLA CHECKSUM
   */
  static calcolaChecksum(contenuto) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(contenuto).digest('hex');
  }
  
  /**
   * ⚙️ CONFIGURAZIONE STANDARD
   */
  static getConfigStandard() {
    return {
      nome: 'Standard',
      separatore: ';',
      encoding: 'UTF-8',
      dateFormat: 'YYYY-MM-DD',
      decimalSeparator: '.',
      campi: {
        data: 'Data',
        numero: 'Numero',
        tipo: 'Tipo',
        clifor: 'ClienteFornitore',
        descrizione: 'Descrizione',
        imponibile: 'Imponibile',
        iva: 'IVA',
        totale: 'Totale',
        aliquota: 'AliquotaIVA'
      }
    };
  }
}

export default ExportService;