// File: backend/services/xml-parser.js
// Parser per fatture elettroniche italiane (Standard SDI)

const xml2js = require('xml2js');

class XmlParser {
  
  /**
   * Parsing principale fattura elettronica
   * @param {Buffer} buffer - Buffer del file XML
   * @returns {Object} Dati parseati compatibili con fiscalValidator
   */
  async parseInvoice(buffer) {
    try {
      console.log('📄 Iniziando parsing fattura elettronica XML...');
      
      // Converti buffer in stringa
      const xmlString = buffer.toString('utf8');
      
      // Parse XML in modo sicuro
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
        trim: true,
        normalize: true,
        normalizeTags: true,
        explicitRoot: false
      });
      
      const xmlData = await parser.parseStringPromise(xmlString);
      
      // Estrai dati seguendo lo standard SDI
      const parsedData = this.extractStandardFields(xmlData);
      
      console.log('✅ Parsing XML completato:', Object.keys(parsedData));
      return parsedData;
      
    } catch (error) {
      console.error('❌ XML parsing error:', error.message); // <-- TRADOTTO
      return this.createFallbackData(error);
    }
  }
  
  /**
   * Estrazione campi standard da fattura elettronica SDI
   * @param {Object} xmlData - Dati XML parseati
   * @returns {Object} Dati estratti
   */
  extractStandardFields(xmlData) {
    const result = {
      // Campi obbligatori per validazione fiscale
      imponibile: 0,
      aliquotaIva: 22, // Default IVA ordinaria
      importoIva: 0,
      totale: 0,
      
      // Campi aggiuntivi
      dataEmissione: null,
      dataScadenza: null,
      numeroFattura: null,
      fornitore: null,
      cliente: null,
      
      // Metadati parsing
      parseSuccess: true,
      warnings: []
    };
    
    try {
      // Trova la root della fattura (standard SDI)
      const fattura = this.findFatturaRoot(xmlData);
      
      if (!fattura) {
        result.warnings.push('Struttura XML non standard - usando fallback');
        return this.extractWithFallback(xmlData, result);
      }
      
      // Estrai header fattura
      this.extractHeaderData(fattura, result);
      
      // Estrai dati fiscali dalle righe
      this.extractFiscalData(fattura, result);
      
      // Estrai riepiloghi IVA
      this.extractIvaSummary(fattura, result);
      
      // Validation e normalizzazione
      this.normalizeData(result);
      
      console.log(`💰 Dati estratti: Imponibile=${result.imponibile}€, IVA=${result.aliquotaIva}%, Totale=${result.totale}€`);
      
    } catch (error) {
      console.error('⚠️ Errore estrazione campi:', error.message);
      result.warnings.push(`Errore estrazione: ${error.message}`);
      return this.extractWithFallback(xmlData, result);
    }
    
    return result;
  }
  
  /**
   * Trova la root della fattura nel XML
   * @param {Object} xmlData - Dati XML
   * @returns {Object|null} Oggetto fattura
   */
  findFatturaRoot(xmlData) {
    // Possibili percorsi standard SDI
    const possiblePaths = [
      xmlData.fatturaelettronica,
      xmlData.FatturaElettronica,
      xmlData['p:FatturaElettronica'],
      xmlData.Invoice,
      xmlData.invoice,
      xmlData
    ];
    
    for (const path of possiblePaths) {
      if (path && typeof path === 'object') {
        // Controlla se ha struttura compatibile SDI
        if (this.isValidSdiStructure(path)) {
          return path;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Verifica se la struttura è compatibile SDI
   * @param {Object} obj - Oggetto da verificare
   * @returns {boolean} True se compatibile
   */
  isValidSdiStructure(obj) {
    const indicators = [
      'FatturaElettronicaHeader',
      'fatturaelettronicaheader',
      'DatiFattura',
      'datifattura',
      'DatiGenerali',
      'datigenerali',
      'FatturaElettronicaBody',
      'fatturaelettronicabody'
    ];
    
    const objKeys = Object.keys(obj).map(k => k.toLowerCase());
    return indicators.some(indicator => 
      objKeys.some(key => key.includes(indicator.toLowerCase()))
    );
  }
  
  /**
   * Estrae dati header (date, numeri, anagrafica)
   * @param {Object} fattura - Oggetto fattura
   * @param {Object} result - Oggetto risultato da popolare
   */
  extractHeaderData(fattura, result) {
    // Cerca header in possibili percorsi
    const headers = [
      fattura.FatturaElettronicaHeader,
      fattura.fatturaelettronicaheader,
      fattura.Header,
      fattura.header
    ];
    
    for (const header of headers) {
      if (!header) continue;
      
      // Dati generali
      const datiGenerali = header.DatiGenerali || header.datigenerali || header.GeneralData;
      if (datiGenerali) {
        const datiDoc = datiGenerali.DatiGeneraliDocumento || datiGenerali.datigeneralidocumento;
        if (datiDoc) {
          result.numeroFattura = this.safeExtract(datiDoc, ['Numero', 'numero', 'Number']);
          result.dataEmissione = this.safeExtract(datiDoc, ['Data', 'data', 'Date']);
        }
      }
      
      // Dati trasmissione (se presente)
      const datiTrasmissione = header.DatiTrasmissione || header.datitrasmissione;
      if (datiTrasmissione) {
        // Estrai eventuali dati aggiuntivi se necessario
      }
      
      break; // Esci al primo header valido trovato
    }
  }
  
  /**
   * Estrae dati fiscali dal body della fattura
   * @param {Object} fattura - Oggetto fattura
   * @param {Object} result - Oggetto risultato da popolare
   */
  extractFiscalData(fattura, result) {
    // Cerca body in possibili percorsi
    const bodies = [
      fattura.FatturaElettronicaBody,
      fattura.fatturaelettronicabody,
      fattura.Body,
      fattura.body,
      fattura
    ];
    
    let totalImponibile = 0;
    let totalIva = 0;
    let totalGeneral = 0;
    
    for (const body of bodies) {
      if (!body) continue;
      
      // Cerca dati beni/servizi (righe fattura)
      const datiBeni = body.DatiBeniServizi || body.databeniservizi || body.LineItems;
      if (datiBeni) {
        
        // Estrai da dettaglio righe
        const dettaglioLinee = this.ensureArray(
          datiBeni.DettaglioLinee || 
          datiBeni.dettagliolinee || 
          datiBeni.LineItem || 
          datiBeni.lineitem ||
          datiBeni
        );
        
        for (const linea of dettaglioLinee) {
          if (!linea) continue;
          
          const prezzoTotale = this.parseAmount(
            linea.PrezzoTotale || 
            linea.prezzototale || 
            linea.TotalPrice ||
            linea.ImportoTotale ||
            linea.importototale
          );
          
          const aliquotaLinea = this.parseAmount(
            linea.AliquotaIVA || 
            linea.aliquotaiva || 
            linea.VatRate
          );
          
          if (prezzoTotale > 0) {
            totalImponibile += prezzoTotale;
            if (aliquotaLinea > 0 && result.aliquotaIva === 22) {
              result.aliquotaIva = aliquotaLinea; // Usa la prima aliquota trovata
            }
          }
        }
        
        // Estrai da riepiloghi IVA se disponibile
        const datiRiepilogo = this.ensureArray(
          datiBeni.DatiRiepilogo || 
          datiBeni.datiriepilogo || 
          datiBeni.VatSummary
        );
        
        for (const riepilogo of datiRiepilogo) {
          if (!riepilogo) continue;
          
          const imponibileRiepilogo = this.parseAmount(
            riepilogo.ImponibileImporto || 
            riepilogo.imponibileimporto ||
            riepilogo.TaxableAmount
          );
          
          const ivaRiepilogo = this.parseAmount(
            riepilogo.Imposta || 
            riepilogo.imposta ||
            riepilogo.TaxAmount
          );
          
          const aliquotaRiepilogo = this.parseAmount(
            riepilogo.AliquotaIVA || 
            riepilogo.aliquotaiva ||
            riepilogo.VatRate
          );
          
          if (imponibileRiepilogo > 0) totalImponibile = Math.max(totalImponibile, imponibileRiepilogo);
          if (ivaRiepilogo > 0) totalIva += ivaRiepilogo;
          if (aliquotaRiepilogo > 0) result.aliquotaIva = aliquotaRiepilogo;
        }
      }
      
      // Cerca dati pagamento per totale
      const datiPagamento = body.DatiPagamento || body.datipagamento || body.PaymentData;
      if (datiPagamento) {
        const dettaglioPagamento = this.ensureArray(
          datiPagamento.DettaglioPagamento || 
          datiPagamento.dettagliopagamento ||
          datiPagamento.PaymentDetails
        );
        
        for (const dettaglio of dettaglioPagamento) {
          const importoPagamento = this.parseAmount(
            dettaglio.ImportoPagamento || 
            dettaglio.importopagamento ||
            dettaglio.PaymentAmount
          );
          
          if (importoPagamento > 0) {
            totalGeneral = Math.max(totalGeneral, importoPagamento);
          }
        }
      }
      
      break; // Esci al primo body valido
    }
    
    // Assegna i valori estratti
    if (totalImponibile > 0) result.imponibile = totalImponibile;
    if (totalIva > 0) result.importoIva = totalIva;
    if (totalGeneral > 0) result.totale = totalGeneral;
  }
  
  /**
   * Estrae riepiloghi IVA
   * @param {Object} fattura - Oggetto fattura
   * @param {Object} result - Oggetto risultato
   */
  extractIvaSummary(fattura, result) {
    // Se non abbiamo ancora trovato l'IVA, calcoliamola
    if (result.importoIva === 0 && result.imponibile > 0 && result.aliquotaIva > 0) {
      result.importoIva = Math.round((result.imponibile * result.aliquotaIva / 100) * 100) / 100;
    }
    
    // Se non abbiamo il totale, calcoliamolo
    if (result.totale === 0 && result.imponibile > 0) {
      result.totale = result.imponibile + result.importoIva;
    }
  }
  
  /**
   * Parsing con fallback per XML non standard
   * @param {Object} xmlData - Dati XML
   * @param {Object} result - Oggetto risultato
   * @returns {Object} Dati estratti con fallback
   */
  extractWithFallback(xmlData, result) {
    console.log('🔍 Usando metodo fallback per XML non standard...');
    
    // Cerca tutti i possibili campi numerici nel XML
    const allValues = this.extractAllNumericValues(xmlData);
    
    // Cerca pattern comuni nei nomi dei campi
    const patterns = {
      imponibile: ['imponibile', 'subtotal', 'netamount', 'baseamount', 'taxable'],
      iva: ['iva', 'imposta', 'tax', 'vat'],
      totale: ['totale', 'total', 'amount', 'importo'],
      aliquota: ['aliquota', 'rate', 'percent', '%']
    };
    
    // Applica pattern matching
    for (const [key, value] of Object.entries(allValues)) {
      const keyLower = key.toLowerCase();
      
      if (patterns.imponibile.some(p => keyLower.includes(p)) && value > result.imponibile) {
        result.imponibile = value;
      }
      
      if (patterns.iva.some(p => keyLower.includes(p)) && value > result.importoIva && value < 1000) {
        result.importoIva = value;
      }
      
      if (patterns.totale.some(p => keyLower.includes(p)) && value > result.totale) {
        result.totale = value;
      }
      
      if (patterns.aliquota.some(p => keyLower.includes(p)) && value > 0 && value <= 30) {
        result.aliquotaIva = value;
      }
    }
    
    result.warnings.push('Utilizzato parsing fallback - verificare dati estratti');
    return result;
  }
  
  /**
   * Estrae tutti i valori numerici dall'XML per fallback
   * @param {Object} obj - Oggetto da analizzare
   * @param {string} prefix - Prefisso per il percorso
   * @returns {Object} Mappa chiave-valore di tutti i numeri
   */
  extractAllNumericValues(obj, prefix = '') {
    const values = {};
    
    if (!obj || typeof obj !== 'object') return values;
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        Object.assign(values, this.extractAllNumericValues(value, fullKey));
      } else {
        const numValue = this.parseAmount(value);
        if (numValue > 0) {
          values[fullKey] = numValue;
        }
      }
    }
    
    return values;
  }
  
  /**
   * Normalizza e valida i dati estratti
   * @param {Object} result - Oggetto risultato da normalizzare
   */
  normalizeData(result) {
    // Assicura che i valori siano numeri validi
    result.imponibile = this.parseAmount(result.imponibile);
    result.aliquotaIva = this.parseAmount(result.aliquotaIva);
    result.importoIva = this.parseAmount(result.importoIva);
    result.totale = this.parseAmount(result.totale);
    
    // Validazioni di coerenza
    if (result.imponibile > 0 && result.importoIva === 0 && result.aliquotaIva > 0) {
      result.importoIva = Math.round((result.imponibile * result.aliquotaIva / 100) * 100) / 100;
      result.warnings.push('IVA calcolata automaticamente');
    }
    
    if (result.imponibile > 0 && result.totale === 0) {
      result.totale = result.imponibile + result.importoIva;
      result.warnings.push('Totale calcolato automaticamente');
    }
    
    // Normalizza date
    if (result.dataEmissione) {
      result.dataEmissione = this.normalizeDate(result.dataEmissione);
    }
    
    if (result.dataScadenza) {
      result.dataScadenza = this.normalizeDate(result.dataScadenza);
    }
  }
  
  /**
   * Estrazione sicura di valori da oggetto
   * @param {Object} obj - Oggetto sorgente
   * @param {Array} keys - Possibili chiavi
   * @returns {any} Valore trovato o null
   */
  safeExtract(obj, keys) {
    if (!obj) return null;
    
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        return obj[key];
      }
    }
    
    return null;
  }
  
  /**
   * Assicura che il valore sia un array
   * @param {any} value - Valore da convertire
   * @returns {Array} Array sicuro
   */
  ensureArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }
  
  /**
   * Parsing sicuro di importi
   * @param {any} value - Valore da convertire
   * @returns {number} Numero parseato
   */
  parseAmount(value) {
    if (typeof value === 'number') return Math.round(value * 100) / 100;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.,\-]/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
    }
    return 0;
  }
  
  /**
   * Normalizza date in formato ISO
   * @param {string} dateStr - Stringa data
   * @returns {string|null} Data normalizzata
   */
  normalizeDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // Gestisce formati comuni italiani: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
      let cleanDate = dateStr.toString().trim();
      
      // Formato italiano DD/MM/YYYY o DD-MM-YYYY
      if (cleanDate.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/)) {
        const parts = cleanDate.split(/[\/\-]/);
        cleanDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      
      const date = new Date(cleanDate);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    } catch (error) {
      console.warn('⚠️ Errore normalizzazione data:', dateStr);
      return null;
    }
  }
  
  /**
   * Crea dati di fallback in caso di errore
   * @param {Error} error - Errore originale
   * @returns {Object} Dati di fallback
   */
  createFallbackData(error) {
    return {
      imponibile: 0,
      aliquotaIva: 22,
      importoIva: 0,
      totale: 0,
      dataEmissione: null,
      dataScadenza: null,
      numeroFattura: null,
      fornitore: null,
      cliente: null,
      parseSuccess: false,
      warnings: [`XML parsing error: ${error.message}`], // <-- TRADOTTO
      error: error.message
    };
  }
  
  /**
   * Test del parser con XML di esempio
   * @returns {Object} Risultati test
   */
  async testParser() {
    console.log('🧪 Test XML Parser...');
    
    // XML di test semplificato
    const testXml = `<?xml version="1.0" encoding="UTF-8"?>
    <FatturaElettronica>
      <FatturaElettronicaHeader>
        <DatiGenerali>
          <DatiGeneraliDocumento>
            <Numero>001</Numero>
            <Data>2025-06-04</Data>
          </DatiGeneraliDocumento>
        </DatiGenerali>
      </FatturaElettronicaHeader>
      <FatturaElettronicaBody>
        <DatiBeniServizi>
          <DettaglioLinee>
            <PrezzoTotale>1000.00</PrezzoTotale>
            <AliquotaIVA>22.00</AliquotaIVA>
          </DettaglioLinee>
          <DatiRiepilogo>
            <ImponibileImporto>1000.00</ImponibileImporto>
            <Imposta>220.00</Imposta>
            <AliquotaIVA>22.00</AliquotaIVA>
          </DatiRiepilogo>
        </DatiBeniServizi>
        <DatiPagamento>
          <DettaglioPagamento>
            <ImportoPagamento>1220.00</ImportoPagamento>
          </DettaglioPagamento>
        </DatiPagamento>
      </FatturaElettronicaBody>
    </FatturaElettronica>`;
    
    try {
      const buffer = Buffer.from(testXml, 'utf8');
      const result = await this.parseInvoice(buffer);
      
      const tests = [
        { name: 'Imponibile estratto', passed: result.imponibile === 1000 },
        { name: 'Aliquota IVA estratta', passed: result.aliquotaIva === 22 },
        { name: 'Importo IVA estratto', passed: result.importoIva === 220 },
        { name: 'Totale estratto', passed: result.totale === 1220 },
        { name: 'Data emissione estratta', passed: result.dataEmissione === '2025-06-04' },
        { name: 'Parsing success', passed: result.parseSuccess === true }
      ];
      
      const passedTests = tests.filter(t => t.passed).length;
      
      return {
        success: passedTests === tests.length,
        passedTests,
        totalTests: tests.length,
        details: tests,
        parsedData: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Esporta istanza singleton
const xmlParser = new XmlParser();

module.exports = xmlParser;

// Test standalone se chiamato direttamente
if (require.main === module) {
  xmlParser.testParser().then(result => {
    console.log('📊 Test Results:', result);
  });
}