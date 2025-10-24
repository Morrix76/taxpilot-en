// ===== 1. AGGIUNTO: excelParserService.js =====
const XLSX = require('xlsx');
const fs = require('fs').promises;

class ExcelParserService {
  async parseExcel(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converti in JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Determina tipo documento
      const documentType = this.detectDocumentType(data);
      
      if (documentType === 'fattura') {
        return this.parseInvoiceExcel(data);
      } else if (documentType === 'busta_paga') {
        return this.parsePayslipExcel(data);
      }
      
      throw new Error('Tipo documento non riconosciuto');
    } catch (error) {
      throw new Error(`Errore parsing Excel: ${error.message}`);
    }
  }

  detectDocumentType(data) {
    const text = data.flat().join(' ').toLowerCase();
    
    if (text.includes('fattura') || text.includes('iva') || text.includes('cedente')) {
      return 'fattura';
    } else if (text.includes('stipendio') || text.includes('inps') || text.includes('irpef')) {
      return 'busta_paga';
    }
    
    return 'unknown';
  }

  parseInvoiceExcel(data) {
    // Logica parsing fattura da Excel
    const extracted = {
      numero: this.findValue(data, ['numero', 'n.', 'num']),
      data: this.findValue(data, ['data', 'date']),
      cedente: {
        denominazione: this.findValue(data, ['cedente', 'azienda', 'ditta']),
        partitaIva: this.findValue(data, ['p.iva', 'partita iva', 'piva'])
      },
      totale: this.findValue(data, ['totale', 'total', 'importo']),
      iva: this.findValue(data, ['iva', 'imposta'])
    };
    
    return {
      type: 'fattura',
      extractedData: extracted,
      rawData: data
    };
  }

  parsePayslipExcel(data) {
    // Logica parsing busta paga da Excel
    const extracted = {
      dipendente: this.findValue(data, ['nome', 'dipendente', 'lavoratore']),
      codiceFiscale: this.findValue(data, ['codice fiscale', 'cf']),
      stipendioLordo: this.findValue(data, ['lordo', 'stipendio']),
      inps: this.findValue(data, ['inps', 'contributi']),
      irpef: this.findValue(data, ['irpef', 'imposte']),
      netto: this.findValue(data, ['netto', 'take home'])
    };
    
    return {
      type: 'busta_paga',
      extractedData: extracted,
      rawData: data
    };
  }

  findValue(data, keywords) {
    for (let row of data) {
      for (let i = 0; i < row.length; i++) {
        const cell = String(row[i]).toLowerCase();
        for (let keyword of keywords) {
          if (cell.includes(keyword.toLowerCase())) {
            // Prende il valore della cella successiva
            return row[i + 1] || null;
          }
        }
      }
    }
    return null;
  }
}

module.exports = ExcelParserService;

// ===== 2. AGGIUNTO: xmlGeneratorService.js =====
const js2xmlparser = require('js2xmlparser');

class XMLGeneratorService {
  generateFatturaPA(data) {
    const fatturaObject = {
      '@': {
        'versione': 'FPR12',
        'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
        'xmlns:p': 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2'
      },
      'FatturaElettronicaHeader': this.buildHeader(data),
      'FatturaElettronicaBody': this.buildBody(data)
    };

    return js2xmlparser.parse('p:FatturaElettronica', fatturaObject, {
      declaration: { encoding: 'UTF-8' },
      format: { pretty: true }
    });
  }

  buildHeader(data) {
    return {
      'DatiTrasmissione': {
        'IdTrasmittente': {
          'IdPaese': 'IT',
          'IdCodice': data.cedente?.partitaIva || '00000000000'
        },
        'ProgressivoInvio': data.progressivo || '00001',
        'FormatoTrasmissione': 'FPR12',
        'CodiceDestinatario': data.cessionario?.codiceDestinatario || '0000000'
      },
      'CedentePrestatore': {
        'DatiAnagrafici': {
          'IdFiscaleIVA': {
            'IdPaese': 'IT',
            'IdCodice': data.cedente?.partitaIva
          },
          'Anagrafica': {
            'Denominazione': data.cedente?.denominazione
          }
        }
      },
      'CessionarioCommittente': {
        'DatiAnagrafici': {
          'CodiceFiscale': data.cessionario?.codiceFiscale,
          'Anagrafica': {
            'Nome': data.cessionario?.nome,
            'Cognome': data.cessionario?.cognome
          }
        }
      }
    };
  }

  buildBody(data) {
    return {
      'DatiGenerali': {
        'DatiGeneraliDocumento': {
          'TipoDocumento': 'TD01',
          'Divisa': 'EUR',
          'Data': data.data || new Date().toISOString().split('T')[0],
          'Numero': data.numero || '1'
        }
      },
      'DatiBeniServizi': {
        'DettaglioLinee': {
          'NumeroLinea': '1',
          'Descrizione': data.descrizione || 'Prestazione professionale',
          'Quantita': '1.00',
          'PrezzoUnitario': data.imponibile || '0.00',
          'PrezzoTotale': data.imponibile || '0.00',
          'AliquotaIVA': data.aliquotaIva || '22.00'
        },
        'DatiRiepilogo': {
          'AliquotaIVA': data.aliquotaIva || '22.00',
          'ImponibileImporto': data.imponibile || '0.00',
          'Imposta': data.importoIva || '0.00'
        }
      }
    };
  }

  validateXML(xmlString) {
    // Validazione base XML FatturaPA
    const errors = [];
    
    if (!xmlString.includes('FatturaElettronicaHeader')) {
      errors.push('Header mancante');
    }
    
    if (!xmlString.includes('FatturaElettronicaBody')) {
      errors.push('Body mancante');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = XMLGeneratorService;

// ===== 3. CORREZIONE: pdfOcrService.js - Aggiunto formato standard =====
// AGGIUNGERE AL FILE ESISTENTE questo metodo:

formatToStandardData(parsedData) {
  return {
    type: 'busta_paga',
    extractedData: {
      // Anagrafica
      nome: parsedData.anagrafica?.nome,
      cognome: null, // Separare da nome se necessario
      codiceFiscale: parsedData.anagrafica?.codiceFiscale,
      matricola: parsedData.anagrafica?.matricola,
      
      // Retribuzione
      stipendioBase: parsedData.retribuzione?.stipendioBase || 0,
      superMinimo: parsedData.retribuzione?.superMinimo || 0,
      straordinari: parsedData.retribuzione?.straordinari || 0,
      stipendioLordo: (parsedData.retribuzione?.stipendioBase || 0) + 
                     (parsedData.retribuzione?.superMinimo || 0) + 
                     (parsedData.retribuzione?.straordinari || 0),
      
      // Contributi
      inps: parsedData.contributi?.inps || 0,
      inail: parsedData.contributi?.inail || 0,
      
      // Imposte
      irpef: parsedData.imposte?.irpef || 0,
      addizionali: parsedData.imposte?.addizionali || 0,
      
      // Netto
      netto: parsedData.netto || 0,
      
      // Periodo
      periodo: parsedData.periodo,
      
      // Metadati
      confidence: 0.8,
      needsReview: parsedData.validation?.warnings?.length > 0 || !parsedData.validation?.isValid
    },
    validation: parsedData.validation,
    rawText: parsedData.rawText
  };
}

// ===== 4. CORREZIONE: xmlParserService.js - Aggiunto formato standard =====
// AGGIUNGERE AL FILE ESISTENTE questo metodo:

formatToStandardData(parsedData) {
  return {
    type: 'fattura',
    extractedData: {
      // Documento
      numero: parsedData.body?.documento?.numero,
      data: parsedData.body?.documento?.data,
      tipoDocumento: parsedData.body?.documento?.tipoDocumento || 'TD01',
      divisa: parsedData.body?.documento?.divisa || 'EUR',
      
      // Cedente
      cedenteDenominazione: parsedData.header?.cedente?.denominazione,
      cedentePartitaIva: parsedData.header?.cedente?.partitaIva,
      cedenteCodiceFiscale: parsedData.header?.cedente?.codiceFiscale,
      
      // Cessionario
      cessionarioNome: parsedData.header?.cessionario?.nome,
      cessionarioCognome: parsedData.header?.cessionario?.cognome,
      cessionarioDenominazione: parsedData.header?.cessionario?.denominazione,
      cessionarioCodiceFiscale: parsedData.header?.cessionario?.codiceFiscale,
      
      // Importi
      imponibile: parsedData.validation?.totali?.imponibile || 0,
      importoIva: parsedData.validation?.totali?.iva || 0,
      totale: parsedData.validation?.totali?.totale || 0,
      aliquotaIva: parsedData.body?.riepilogoIva?.[0]?.aliquotaIva || 22,
      
      // Metadati
      confidence: parsedData.validation?.isValid ? 0.9 : 0.6,
      needsReview: !parsedData.validation?.isValid || parsedData.validation?.errors?.length > 0
    },
    validation: parsedData.validation,
    lineeDettaglio: parsedData.body?.linee || []
  };
}