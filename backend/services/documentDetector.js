import pdf from 'pdf-parse';
import { parseStringPromise } from 'xml2js';

class DocumentDetector {
  
  async detectDocumentType(fileBuffer, filename = '') {
    try {
      const ext = this.getFileExtension(filename);
      
      if (ext === '.xml') {
        return await this.detectXMLType(fileBuffer);
      }
      
      if (ext === '.pdf') {
        return await this.detectPDFType(fileBuffer);
      }
      
      if (ext === '.json') {
        return await this.detectJSONType(fileBuffer);
      }
      
      // Fallback: prova a rilevare dal contenuto raw
      return await this.detectFromContent(fileBuffer);
      
    } catch (error) {
      console.error('Errore rilevamento tipo:', error);
      return 'unknown';
    }
  }
  
  getFileExtension(filename) {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  }
  
  async detectXMLType(fileBuffer) {
    const content = fileBuffer.toString('utf8');
    
    // Fattura elettronica PA
    if (content.includes('FatturaElettronica') || 
        content.includes('p:FatturaElettronica') ||
        content.includes('ns2:FatturaElettronica')) {
      return 'fattura';
    }
    
    // Altri tipi XML
    if (content.includes('Contratto') || content.includes('contratto')) {
      return 'contratto';
    }
    
    return 'xml_generico';
  }
  
  async detectPDFType(fileBuffer) {
    const data = await pdf(fileBuffer);
    const text = data.text.toLowerCase();
    
    // Pattern per busta paga
    const bustaPagaPatterns = [
      /cedolino.?paga/,
      /busta.?paga/,
      /retribuzione/,
      /netto.?in.?busta/,
      /totale.?netto/,
      /contributi.?previdenziali/,
      /ritenute.?fiscali/,
      /tfr/
    ];
    
    // Pattern per contratto
    const contrattoPatterns = [
      /contratto.?di.?lavoro/,
      /rapporto.?di.?lavoro/,
      /inquadramento/,
      /ccnl/,
      /livello.?retributivo/,
      /orario.?di.?lavoro/,
      /periodo.?di.?prova/
    ];
    
    // Pattern per fattura
    const fatturaPatterns = [
      /fattura.?n/,
      /invoice/,
      /documento.?fiscale/,
      /partita.?iva/,
      /codice.?fiscale/,
      /importo.?totale/,
      /iva.?(?:\d+%|assente)/
    ];
    
    // Pattern per ricevuta
    const ricevutaPatterns = [
      /ricevuta.?fiscale/,
      /scontrino/,
      /ricevuta.?di.?pagamento/,
      /bonifico/,
      /pagamento.?effettuato/
    ];
    
    // Conta i match per ogni tipo
    const scores = {
      busta_paga: this.countMatches(text, bustaPagaPatterns),
      contratto: this.countMatches(text, contrattoPatterns),
      fattura: this.countMatches(text, fatturaPatterns),
      ricevuta: this.countMatches(text, ricevutaPatterns)
    };
    
    // Restituisce il tipo con più match
    const bestMatch = Object.entries(scores).reduce((a, b) => 
      scores[a[0]] > scores[b[0]] ? a : b
    );
    
    return bestMatch[1] > 0 ? bestMatch[0] : 'pdf_generico';
  }
  
  async detectJSONType(fileBuffer) {
    try {
      const content = JSON.parse(fileBuffer.toString('utf8'));
      
      // Contratto JSON
      if (content.nome && content.livello && content.ore_settimanali) {
        return 'contratto';
      }
      
      // Busta paga JSON
      if (content.netto_mensile && content.contributi) {
        return 'busta_paga';
      }
      
      // Fattura JSON
      if (content.numero_fattura || content.importo_totale) {
        return 'fattura';
      }
      
      return 'json_generico';
      
    } catch (error) {
      return 'json_invalido';
    }
  }
  
  async detectFromContent(fileBuffer) {
    // Prova come testo plain
    const content = fileBuffer.toString('utf8').toLowerCase();
    
    if (content.includes('fattura') || content.includes('invoice')) {
      return 'fattura';
    }
    
    if (content.includes('busta paga') || content.includes('cedolino')) {
      return 'busta_paga';
    }
    
    if (content.includes('contratto') || content.includes('ccnl')) {
      return 'contratto';
    }
    
    return 'unknown';
  }
  
  countMatches(text, patterns) {
    return patterns.reduce((count, pattern) => {
      return count + (pattern.test(text) ? 1 : 0);
    }, 0);
  }
  
  // Restituisce info dettagliate sul documento
  async analyzeDocument(fileBuffer, filename = '') {
    const type = await this.detectDocumentType(fileBuffer, filename);
    
    return {
      type,
      confidence: this.getConfidenceLevel(type),
      suggested_parser: this.getSuggestedParser(type),
      file_extension: this.getFileExtension(filename)
    };
  }
  
  getConfidenceLevel(type) {
    const confidence = {
      'fattura': 'high',
      'busta_paga': 'high', 
      'contratto': 'medium',
      'ricevuta': 'medium',
      'pdf_generico': 'low',
      'xml_generico': 'low',
      'json_generico': 'low',
      'unknown': 'very_low'
    };
    
    return confidence[type] || 'very_low';
  }
  
  getSuggestedParser(type) {
    const parsers = {
      'fattura': 'xmlParserService',
      'busta_paga': 'contractComparer',
      'contratto': 'contractComparer',
      'ricevuta': 'pdfOcrService',
      'pdf_generico': 'pdfOcrService',
      'xml_generico': 'xmlParserService',
      'json_generico': 'jsonParser'
    };
    
    return parsers[type] || 'autoDetect';
  }
}

export default new DocumentDetector();