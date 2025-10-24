// /backend/services/pdf-ocr.js

const Tesseract = require('tesseract.js');
const pdf2pic = require('pdf2pic');
const fs = require('fs').promises;

class BustaPagaOCR {
  constructor() {
    this.tesseractOptions = {
      lang: 'ita',
      oem: 1,
      psm: 6
    };
  }

  async processPDF(pdfPath) {
    try {
      // Converti PDF in immagini
      const images = await this.convertPDFToImages(pdfPath);
      
      // OCR su ogni pagina
      const ocrResults = [];
      for (const imagePath of images) {
        const text = await this.performOCR(imagePath);
        ocrResults.push(text);
      }
      
      // Parse dei dati della busta paga
      const parsedData = this.parseBustaPagaText(ocrResults.join('\n'));
      
      // Validazione calcoli
      const validation = this.validateBustaPaga(parsedData);
      
      return {
        rawText: ocrResults.join('\n'),
        parsedData,
        validation
      };
    } catch (error) {
      throw new Error(`Errore OCR busta paga: ${error.message}`);
    }
  }

  async convertPDFToImages(pdfPath) {
    const convert = pdf2pic.fromPath(pdfPath, {
      density: 300,
      saveFilename: "page",
      savePath: "./temp/",
      format: "png",
      width: 2000,
      height: 2000
    });
    
    const results = await convert.bulk(-1);
    return results.map(result => result.path);
  }

  async performOCR(imagePath) {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'ita', this.tesseractOptions);
    return text;
  }

  parseBustaPagaText(text) {
    const data = {
      anagrafica: this.extractAnagrafica(text),
      retribuzione: this.extractRetribuzione(text),
      contributi: this.extractContributi(text),
      imposte: this.extractImposte(text),
      netto: this.extractNetto(text),
      periodo: this.extractPeriodo(text)
    };

    return data;
  }

  extractAnagrafica(text) {
    const patterns = {
      nome: /(?:Nome|Cognome)[\s:]+([A-Za-z\s]+)/i,
      codiceFiscale: /(?:C\.F\.|Codice Fiscale)[\s:]+([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i,
      matricola: /(?:Matricola|Matr\.)[\s:]+(\d+)/i
    };

    return {
      nome: this.extractPattern(text, patterns.nome),
      codiceFiscale: this.extractPattern(text, patterns.codiceFiscale),
      matricola: this.extractPattern(text, patterns.matricola)
    };
  }

  extractRetribuzione(text) {
    const patterns = {
      stipendioBase: /(?:Stipendio|Retribuzione)[\s\w]*[\s:]+€?\s*(\d+[.,]\d{2})/i,
      superMinimo: /Super[\s-]?minimo[\s:]+€?\s*(\d+[.,]\d{2})/i,
      straordinari: /Straordinari?[\s:]+€?\s*(\d+[.,]\d{2})/i
    };

    return {
      stipendioBase: this.parseAmount(this.extractPattern(text, patterns.stipendioBase)),
      superMinimo: this.parseAmount(this.extractPattern(text, patterns.superMinimo)),
      straordinari: this.parseAmount(this.extractPattern(text, patterns.straordinari))
    };
  }

  extractContributi(text) {
    const patterns = {
      inps: /INPS[\s:]+€?\s*(\d+[.,]\d{2})/i,
      inail: /INAIL[\s:]+€?\s*(\d+[.,]\d{2})/i
    };

    return {
      inps: this.parseAmount(this.extractPattern(text, patterns.inps)),
      inail: this.parseAmount(this.extractPattern(text, patterns.inail))
    };
  }

  extractImposte(text) {
    const patterns = {
      irpef: /IRPEF[\s:]+€?\s*(\d+[.,]\d{2})/i,
      addizionali: /(?:Add\.|Addizionale)[\s\w]*[\s:]+€?\s*(\d+[.,]\d{2})/i
    };

    return {
      irpef: this.parseAmount(this.extractPattern(text, patterns.irpef)),
      addizionali: this.parseAmount(this.extractPattern(text, patterns.addizionali))
    };
  }

  extractNetto(text) {
    const pattern = /(?:Netto|Totale Netto)[\s:]+€?\s*(\d+[.,]\d{2})/i;
    return this.parseAmount(this.extractPattern(text, pattern));
  }

  extractPeriodo(text) {
    const pattern = /(?:Periodo|Mese)[\s:]+(\d{1,2}[-\/]\d{4}|\w+\s+\d{4})/i;
    return this.extractPattern(text, pattern);
  }

  extractPattern(text, pattern) {
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }

  parseAmount(amountStr) {
    if (!amountStr) return 0;
    return parseFloat(amountStr.replace(',', '.').replace(/[^\d.]/g, ''));
  }

  validateBustaPaga(data) {
    const errors = [];
    const warnings = [];

    // Validazione INPS (9.19% per dipendenti)
    const stipendioLordo = data.retribuzione.stipendioBase + data.retribuzione.superMinimo + data.retribuzione.straordinari;
    const inpsCalcolato = stipendioLordo * 0.0919;
    
    if (Math.abs(inpsCalcolato - data.contributi.inps) > 5) {
      warnings.push({
        type: 'INPS_CALCULATION_WARNING',
        message: `INPS calcolato: €${inpsCalcolato.toFixed(2)}, dichiarato: €${data.contributi.inps.toFixed(2)}`,
        severity: 'medium'
      });
    }

    // Validazione IRPEF (calcolo semplificato)
    const irpefStimato = this.calculateIRPEF(stipendioLordo * 12) / 12;
    
    if (Math.abs(irpefStimato - data.imposte.irpef) > 20) {
      warnings.push({
        type: 'IRPEF_CALCULATION_WARNING',
        message: `IRPEF stimato: €${irpefStimato.toFixed(2)}, dichiarato: €${data.imposte.irpef.toFixed(2)}`,
        severity: 'medium'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totali: {
        lordo: stipendioLordo,
        contributi: data.contributi.inps + data.contributi.inail,
        imposte: data.imposte.irpef + data.imposte.addizionali,
        netto: data.netto
      }
    };
  }

  calculateIRPEF(redditoAnnuo) {
    // Scaglioni IRPEF 2024
    const scaglioni = [
      { min: 0, max: 28000, aliquota: 0.23 },
      { min: 28000, max: 50000, aliquota: 0.35 },
      { min: 50000, max: Infinity, aliquota: 0.43 }
    ];

    let irpef = 0;
    let rimanente = redditoAnnuo;

    for (const scaglione of scaglioni) {
      if (rimanente <= 0) break;
      
      const imponibile = Math.min(rimanente, scaglione.max - scaglione.min);
      irpef += imponibile * scaglione.aliquota;
      rimanente -= imponibile;
    }

    return irpef;
  }
}

module.exports = BustaPagaOCR;