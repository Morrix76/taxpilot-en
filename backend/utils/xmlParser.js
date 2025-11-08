// File: backend/services/xml-parser.js
// Parser for Italian electronic invoices (SDI Standard)

import * as xml2js from 'xml2js';

class FatturaElettronicaValidator {
  
  /**
   * Main electronic invoice parsing
   * @param {Buffer} buffer - Buffer of the XML file
   * @returns {Object} Parsed data compatible with fiscalValidator
   */
  async parseInvoice(buffer) {
    try {
      console.log('📄 Starting XML electronic invoice parsing...');
      
      // Convert buffer to string
      const xmlString = buffer.toString('utf8');
      
      // Parse XML safely
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
      
      // Extract data following the SDI standard
      const parsedData = this.extractStandardFields(xmlData);
      
      console.log('✅ XML parsing completed:', Object.keys(parsedData));
      return parsedData;
      
    } catch (error) {
      console.error('❌ XML parsing error:', error.message);
      return this.createFallbackData(error);
    }
  }
  
  /**
   * Extraction of standard fields from SDI electronic invoice
   * @param {Object} xmlData - Parsed XML data
   * @returns {Object} Extracted data
   */
  extractStandardFields(xmlData) {
    const result = {
      // Mandatory fields for fiscal validation
      taxableAmount: 0,
      vatRate: 22, // Default standard VAT
      vatAmount: 0,
      total: 0,
      
      // Additional fields
      issueDate: null,
      dueDate: null,
      invoiceNumber: null,
      supplier: null,
      customer: null,
      
      // Parsing metadata
      parseSuccess: true,
      warnings: [],
      validationErrors: [],
      technicalIssues: 0
    };
    
    try {
      // Find the invoice root (SDI standard)
      const invoiceRoot = this.findInvoiceRoot(xmlData);
      
      if (!invoiceRoot) {
        result.warnings.push('Non-standard XML structure - using fallback');
        return this.extractWithFallback(xmlData, result);
      }
      
      // Extract invoice header
      this.extractHeaderData(invoiceRoot, result);
      
      // Extract fiscal data from lines
      this.extractFiscalData(invoiceRoot, result);
      
      // Extract VAT summaries
      this.extractIvaSummary(invoiceRoot, result);
      
      // Validation and normalization
      this.normalizeData(result);
      
      // Run validations
      if (invoiceRoot) {
        result.validationErrors = this.validateInvoiceData(result, invoiceRoot);
        result.technicalIssues = result.validationErrors.length;
      }
      
      console.log(`💰 Data extracted: Taxable=${result.taxableAmount}€, VAT=${result.vatRate}%, Total=${result.total}€`);
      
    } catch (error) {
      console.error('⚠️ Error extracting fields:', error.message);
      result.warnings.push(`Extraction error: ${error.message}`);
      return this.extractWithFallback(xmlData, result);
    }
    
    return result;
  }
  
  /**
   * Find the invoice root in the XML
   * @param {Object} xmlData - XML data
   * @returns {Object|null} Invoice object
   */
  findInvoiceRoot(xmlData) {
    // Possible standard SDI paths
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
        // Check if it has an SDI-compatible structure
        if (this.isValidSdiStructure(path)) {
          return path;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Check if the structure is SDI-compatible
   * @param {Object} obj - Object to check
   * @returns {boolean} True if compatible
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
   * Extract header data (dates, numbers, demographics)
   * @param {Object} invoiceRoot - Invoice object
   * @param {Object} result - Result object to populate
   */
  extractHeaderData(invoiceRoot, result) {
    // Search for header in possible paths
    const headers = [
      invoiceRoot.FatturaElettronicaHeader,
      invoiceRoot.fatturaelettronicaheader,
      invoiceRoot.Header,
      invoiceRoot.header
    ];
    
    for (const header of headers) {
      if (!header) continue;
      
      // General data
      const generalData = header.DatiGenerali || header.datigenerali || header.GeneralData;
      if (generalData) {
        const docData = generalData.DatiGeneraliDocumento || generalData.datigeneralidocumento;
        if (docData) {
          result.invoiceNumber = this.safeExtract(docData, ['Numero', 'numero', 'Number']);
          result.issueDate = this.safeExtract(docData, ['Data', 'data', 'Date']);
        }
      }
      
      // Transmission data (if present)
      const transmissionData = header.DatiTrasmissione || header.datitrasmissione;
      if (transmissionData) {
        // Extract additional data if needed
      }
      
      break; // Exit on the first valid header found
    }
  }
  
  /**
   * Extract fiscal data from the invoice body
   * @param {Object} invoiceRoot - Invoice object
   * @param {Object} result - Result object to populate
   */
  extractFiscalData(invoiceRoot, result) {
    // Search for body in possible paths
    const bodies = [
      invoiceRoot.FatturaElettronicaBody,
      invoiceRoot.fatturaelettronicabody,
      invoiceRoot.Body,
      invoiceRoot.body,
      invoiceRoot
    ];
    
    let totalTaxable = 0;
    let totalVat = 0;
    let totalOverall = 0;
    
    for (const body of bodies) {
      if (!body) continue;
      
      // Search for goods/services data (invoice lines)
      const goodsServicesData = body.DatiBeniServizi || body.databeniservizi || body.LineItems;
      if (goodsServicesData) {
        
        // Extract from line details
        const lineDetails = this.ensureArray(
          goodsServicesData.DettaglioLinee || 
          goodsServicesData.dettagliolinee || 
          goodsServicesData.LineItem || 
          goodsServicesData.lineitem ||
          goodsServicesData
        );
        
        for (const line of lineDetails) {
          if (!line) continue;
          
          const lineTotalPrice = this.parseAmount(
            line.PrezzoTotale || 
            line.prezzototale || 
            line.TotalPrice ||
            line.ImportoTotale ||
            line.importototale
          );
          
          const lineVatRate = this.parseAmount(
            line.AliquotaIVA || 
            line.aliquotaiva || 
            line.VatRate
          );
          
          if (lineTotalPrice > 0) {
            totalTaxable += lineTotalPrice;
            if (lineVatRate > 0 && result.vatRate === 22) {
              result.vatRate = lineVatRate; // Use the first rate found
            }
          }
        }
        
        // Extract from VAT summaries if available
        const summaryData = this.ensureArray(
          goodsServicesData.DatiRiepilogo || 
          goodsServicesData.datiriepilogo || 
          goodsServicesData.VatSummary
        );
        
        for (const summary of summaryData) {
          if (!summary) continue;
          
          const summaryTaxable = this.parseAmount(
            summary.ImponibileImporto || 
            summary.imponibileimporto ||
            summary.TaxableAmount
          );
          
          const summaryVat = this.parseAmount(
            summary.Imposta || 
            summary.imposta ||
            summary.TaxAmount
          );
          
          const summaryVatRate = this.parseAmount(
            summary.AliquotaIVA || 
            summary.aliquotaiva ||
            summary.VatRate
          );
          
          if (summaryTaxable > 0) totalTaxable = Math.max(totalTaxable, summaryTaxable);
          if (summaryVat > 0) totalVat += summaryVat;
          if (summaryVatRate > 0) result.vatRate = summaryVatRate;
        }
      }
      
      // Search payment data for total
      const paymentData = body.DatiPagamento || body.datipagamento || body.PaymentData;
      if (paymentData) {
        const paymentDetails = this.ensureArray(
          paymentData.DettaglioPagamento || 
          paymentData.dettagliopagamento ||
          paymentData.PaymentDetails
        );
        
        for (const detail of paymentDetails) {
          const paymentAmount = this.parseAmount(
            detail.ImportoPagamento || 
            detail.importopagamento ||
            detail.PaymentAmount
          );
          
          if (paymentAmount > 0) {
            totalOverall = Math.max(totalOverall, paymentAmount);
          }
        }
      }
      
      break; // Exit on the first valid body
    }
    
    // Assign extracted values
    if (totalTaxable > 0) result.taxableAmount = totalTaxable;
    if (totalVat > 0) result.vatAmount = totalVat;
    if (totalOverall > 0) result.total = totalOverall;
  }
  
  /**
   * Extract VAT summaries
   * @param {Object} invoiceRoot - Invoice object
   * @param {Object} result - Result object
   */
  extractIvaSummary(invoiceRoot, result) {
    // If we haven't found the VAT yet, calculate it
    if (result.vatAmount === 0 && result.taxableAmount > 0 && result.vatRate > 0) {
      result.vatAmount = Math.round((result.taxableAmount * result.vatRate / 100) * 100) / 100;
    }
    
    // If we don't have the total, calculate it
    if (result.total === 0 && result.taxableAmount > 0) {
      result.total = result.taxableAmount + result.vatAmount;
    }
  }
  
  /**
   * Parsing with fallback for non-standard XML
   * @param {Object} xmlData - XML data
   * @param {Object} result - Result object
   * @returns {Object} Data extracted with fallback
   */
  extractWithFallback(xmlData, result) {
    console.log('🔍 Using fallback method for non-standard XML...');
    
    // Find all possible numeric fields in the XML
    const allValues = this.extractAllNumericValues(xmlData);
    
    // Search for common patterns in field names
    const patterns = {
      taxable: ['imponibile', 'subtotal', 'netamount', 'baseamount', 'taxable'],
      vat: ['iva', 'imposta', 'tax', 'vat'],
      total: ['totale', 'total', 'amount', 'importo'],
      rate: ['aliquota', 'rate', 'percent', '%']
    };
    
    // Apply pattern matching
    for (const [key, value] of Object.entries(allValues)) {
      const keyLower = key.toLowerCase();
      
      if (patterns.taxable.some(p => keyLower.includes(p)) && value > result.taxableAmount) {
        result.taxableAmount = value;
      }
      
      if (patterns.vat.some(p => keyLower.includes(p)) && value > result.vatAmount && value < 1000) {
        result.vatAmount = value;
      }
      
      if (patterns.total.some(p => keyLower.includes(p)) && value > result.total) {
        result.total = value;
      }
      
      if (patterns.rate.some(p => keyLower.includes(p)) && value > 0 && value <= 30) {
        result.vatRate = value;
      }
    }
    
    result.warnings.push('Used fallback parsing - verify extracted data');
    return result;
  }
  
  /**
   * Extract all numeric values from XML for fallback
   * @param {Object} obj - Object to analyze
   * @param {string} prefix - Prefix for the path
   * @returns {Object} Key-value map of all numbers
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
   * Normalize and validate extracted data
   * @param {Object} result - Result object to normalize
   */
  normalizeData(result) {
    // Ensure values are valid numbers
    result.taxableAmount = this.parseAmount(result.taxableAmount);
    result.vatRate = this.parseAmount(result.vatRate);
    result.vatAmount = this.parseAmount(result.vatAmount);
    result.total = this.parseAmount(result.total);
    
    // Consistency validations
    if (result.taxableAmount > 0 && result.vatAmount === 0 && result.vatRate > 0) {
      result.vatAmount = Math.round((result.taxableAmount * result.vatRate / 100) * 100) / 100;
      result.warnings.push('VAT calculated automatically');
    }
    
    if (result.taxableAmount > 0 && result.total === 0) {
      result.total = result.taxableAmount + result.vatAmount;
      result.warnings.push('Total calculated automatically');
    }
    
    // Normalize dates
    if (result.issueDate) {
      result.issueDate = this.normalizeDate(result.issueDate);
    }
    
    if (result.dueDate) {
      result.dueDate = this.normalizeDate(result.dueDate);
    }
  }
  
  /**
   * Safe extraction of values from an object
   * @param {Object} obj - Source object
   * @param {Array} keys - Possible keys
   * @returns {any} Found value or null
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
   * Ensure the value is an array
   * @param {any} value - Value to convert
   * @returns {Array} Safe array
   */
  ensureArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }
  
  /**
   * Safe parsing of amounts
   * @param {any} value - Value to convert
   * @returns {number} Parsed number
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
   * Normalize dates to ISO format
   * @param {string} dateStr - Date string
   * @returns {string|null} Normalized date
   */
  normalizeDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // Handles common Italian formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
      let cleanDate = dateStr.toString().trim();
      
      // Italian format DD/MM/YYYY or DD-MM-YYYY
      if (cleanDate.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/)) {
        const parts = cleanDate.split(/[\/\-]/);
        cleanDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      
      const date = new Date(cleanDate);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    } catch (error) {
      console.warn('⚠️ Error normalizing date:', dateStr);
      return null;
    }
  }
  
  /**
   * Validate all invoice data
   * @param {Object} parsedData - Parsed invoice data
   * @param {Object} invoiceRoot - Invoice root object
   * @returns {Array} List of validation errors
   */
  validateInvoiceData(parsedData, invoiceRoot) {
    const errors = [];
    
    const header = invoiceRoot.fatturaelettronicaheader || invoiceRoot.FatturaElettronicaHeader;
    if (!header) return errors;
    
    // Validate transmission data (codice destinatario)
    const trasmissione = header.datitrasmissione || header.DatiTrasmissione;
    if (trasmissione) {
      const codiceDestinatario = trasmissione.codicedestinatario || trasmissione.CodiceDestinatario;
      if (codiceDestinatario) {
        const cleaned = String(codiceDestinatario).trim();
        if (cleaned.length !== 7) {
          errors.push({
            field: 'CodiceDestinatario',
            message: `Invalid recipient code: "${cleaned}" (must be 7 characters)`,
            severity: 'critical'
          });
        }
      }
    }
    
    // Validate supplier (cedente prestatore)
    const cedente = header.cedenteprestatore || header.CedentePrestatore;
    if (cedente) {
      const datiAnagrafici = cedente.datianagrafici || cedente.DatiAnagrafici;
      if (datiAnagrafici) {
        const idFiscale = datiAnagrafici.idfiscaleiva || datiAnagrafici.IdFiscaleIVA;
        if (idFiscale) {
          const idCodice = idFiscale.idcodice || idFiscale.IdCodice;
          if (idCodice) {
            this.validatePartitaIVA(String(idCodice), 'supplier', errors);
          }
        }
        
        const codiceFiscale = datiAnagrafici.codicefiscale || datiAnagrafici.CodiceFiscale;
        if (codiceFiscale) {
          this.validateCodiceFiscale(String(codiceFiscale), 'supplier', errors);
        }
      }
    }
    
    // Validate customer (cessionario committente)
    const cessionario = header.cessionariocommittente || header.CessionarioCommittente;
    if (cessionario) {
      const datiAnagrafici = cessionario.datianagrafici || cessionario.DatiAnagrafici;
      if (datiAnagrafici) {
        const idFiscale = datiAnagrafici.idfiscaleiva || datiAnagrafici.IdFiscaleIVA;
        if (idFiscale) {
          const idCodice = idFiscale.idcodice || idFiscale.IdCodice;
          if (idCodice) {
            this.validatePartitaIVA(String(idCodice), 'customer', errors);
          }
        }
        
        const codiceFiscale = datiAnagrafici.codicefiscale || datiAnagrafici.CodiceFiscale;
        if (codiceFiscale) {
          this.validateCodiceFiscale(String(codiceFiscale), 'customer', errors);
        }
      }
    }
    
    // Validate dates
    if (parsedData.issueDate) {
      this.validateDate(parsedData.issueDate, 'issueDate', errors);
    }
    
    return errors;
  }
  
  /**
   * Validate Italian VAT number (P.IVA)
   * @param {string} piva - VAT number to validate
   * @param {string} entity - Entity name (supplier/customer)
   * @param {Array} errors - Error array to populate
   */
  validatePartitaIVA(piva, entity, errors) {
    const cleaned = piva.replace(/[^0-9]/g, '');
    
    if (cleaned.length !== 11) {
      errors.push({
        field: `${entity}.PartitaIVA`,
        message: `Invalid VAT number for ${entity}: "${piva}" (must be 11 digits)`,
        severity: 'critical'
      });
      return;
    }
    
    if (cleaned === '00000000000') {
      errors.push({
        field: `${entity}.PartitaIVA`,
        message: `Invalid VAT number for ${entity}: all zeros`,
        severity: 'critical'
      });
      return;
    }
  }
  
  /**
   * Validate Italian fiscal code (Codice Fiscale)
   * @param {string} cf - Fiscal code to validate
   * @param {string} entity - Entity name (supplier/customer)
   * @param {Array} errors - Error array to populate
   */
  validateCodiceFiscale(cf, entity, errors) {
    const cleaned = cf.toUpperCase().trim();
    
    if (cleaned.length !== 16 && cleaned.length !== 11) {
      errors.push({
        field: `${entity}.CodiceFiscale`,
        message: `Invalid fiscal code for ${entity}: "${cf}" (must be 16 or 11 characters)`,
        severity: 'critical'
      });
      return;
    }
    
    if (cleaned.length === 16) {
      const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
      if (!cfRegex.test(cleaned)) {
        errors.push({
          field: `${entity}.CodiceFiscale`,
          message: `Invalid fiscal code format for ${entity}: "${cf}"`,
          severity: 'error'
        });
      }
      
      if (/XXX/.test(cleaned) || cleaned.includes('INVALID')) {
        errors.push({
          field: `${entity}.CodiceFiscale`,
          message: `Invalid fiscal code for ${entity}: "${cf}" (contains invalid pattern)`,
          severity: 'critical'
        });
      }
    }
  }
  
  /**
   * Validate dates
   * @param {string} dateStr - Date string to validate
   * @param {string} field - Field name
   * @param {Array} errors - Error array to populate
   */
  validateDate(dateStr, field, errors) {
    if (!dateStr) return;
    
    try {
      const date = new Date(dateStr);
      const now = new Date();
      
      if (isNaN(date.getTime())) {
        errors.push({
          field: field,
          message: `Invalid date format: "${dateStr}"`,
          severity: 'error'
        });
        return;
      }
      
      if (field === 'issueDate' && date > now) {
        errors.push({
          field: field,
          message: `Future date not allowed: "${dateStr}"`,
          severity: 'critical'
        });
      }
    } catch (error) {
      errors.push({
        field: field,
        message: `Error validating date: "${dateStr}"`,
        severity: 'error'
      });
    }
  }
  
  /**
   * Create fallback data in case of error
   * @param {Error} error - Original error
   * @returns {Object} Fallback data
   */
  createFallbackData(error) {
    return {
      taxableAmount: 0,
      vatRate: 22,
      vatAmount: 0,
      total: 0,
      issueDate: null,
      dueDate: null,
      invoiceNumber: null,
      supplier: null,
      customer: null,
      parseSuccess: false,
      warnings: [`XML parsing error: ${error.message}`],
      validationErrors: [],
      technicalIssues: 0,
      error: error.message
    };
  }
  
  /**
   * Test the parser with sample XML
   * @returns {Object} Test results
   */
  async testParser() {
    console.log('🧪 Testing XML Parser...');
    
    // Simplified test XML
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
        { name: 'Taxable amount extracted', passed: result.taxableAmount === 1000 },
        { name: 'VAT rate extracted', passed: result.vatRate === 22 },
        { name: 'VAT amount extracted', passed: result.vatAmount === 220 },
        { name: 'Total extracted', passed: result.total === 1220 },
        { name: 'Issue date extracted', passed: result.issueDate === '2025-06-04' },
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

/**
 * Standalone validation function as requested.
 * Creates a new validator instance and parses the invoice.
 * @param {Buffer} buffer - Buffer of the XML file
 * @returns {Object} Parsed data
 */
async function validateFatturaElettronica(buffer) {
  console.log('🚀 Executing standalone validateFatturaElettronica function...');
  const validator = new FatturaElettronicaValidator();
  return await validator.parseInvoice(buffer);
}

// Export both the class and the function as requested by the user
export { FatturaElettronicaValidator, validateFatturaElettronica };
