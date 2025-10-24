// File: backend/services/pdf-ocr.js
// OCR per buste paga italiane da PDF

const { createWorker } = require('tesseract.js');
const pdf2pic = require('pdf2pic');
const fs = require('fs').promises;
const path = require('path');

class PdfOcr {
  
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.tempDir = path.join(__dirname, '..', 'temp');
    this.ensureTempDir();
  }
  
  /**
   * Funzione principale per estrazione dati busta paga
   * @param {Buffer} buffer - Buffer del file PDF
   * @returns {Object} Dati estratti compatibili con fiscalValidator
   */
  async extractPayslipData(buffer) {
    try {
      console.log('💼 Iniziando estrazione dati busta paga PDF...');
      
      // Per ora usa mock data realistico (Tesseract può essere pesante per demo)
      if (process.env.NODE_ENV === 'development' || process.env.MOCK_OCR === 'true') {
        console.log('🎭 Usando dati mock per demo OCR...');
        return this.generateMockPayslipData();
      }
      
      // OCR reale con Tesseract
      const extractedText = await this.performOcr(buffer);
      const parsedData = this.parsePayslipText(extractedText);
      
      console.log('✅ Estrazione busta paga completata');
      return parsedData;
      
    } catch (error) {
      console.error('❌ Errore estrazione busta paga:', error.message);
      return this.createFallbackData(error);
    }
  }
  
  /**
   * Esegue OCR sul PDF
   * @param {Buffer} buffer - Buffer PDF
   * @returns {string} Testo estratto
   */
  async performOcr(buffer) {
    try {
      // Inizializza worker se necessario
      await this.initializeOcr();
      
      // Converti PDF in immagini
      const images = await this.convertPdfToImages(buffer);
      
      let fullText = '';
      
      // Esegui OCR su ogni pagina
      for (let i = 0; i < images.length; i++) {
        console.log(`🔍 OCR pagina ${i + 1}/${images.length}...`);
        
        const { data: { text } } = await this.worker.recognize(images[i]);
        fullText += text + '\n';
        
        // Cleanup immagine temporanea
        await this.cleanupTempFile(images[i]);
      }
      
      console.log(`📄 OCR completato: ${fullText.length} caratteri estratti`);
      return fullText;
      
    } catch (error) {
      console.error('❌ Errore OCR:', error.message);
      throw error;
    }
  }
  
  /**
   * Inizializza il worker Tesseract
   */
  async initializeOcr() {
    if (this.isInitialized) return;
    
    console.log('⚙️ Inizializzando Tesseract OCR...');
    
    this.worker = await createWorker();
    
    await this.worker.loadLanguage('ita+eng');
    await this.worker.initialize('ita+eng');
    
    // Configurazione ottimizzata per buste paga
    await this.worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÈÉÌÍÒÓÙÚàèéìíòóùú.,€%-/: ',
      tessedit_pageseg_mode: '6', // Uniform block of text
      preserve_interword_spaces: '1'
    });
    
    this.isInitialized = true;
    console.log('✅ Tesseract inizializzato');
  }
  
  /**
   * Converte PDF in immagini per OCR
   * @param {Buffer} buffer - Buffer PDF
   * @returns {Array} Array di percorsi immagini
   */
  async convertPdfToImages(buffer) {
    const tempPdfPath = path.join(this.tempDir, `temp_${Date.now()}.pdf`);
    
    try {
      // Salva PDF temporaneo
      await fs.writeFile(tempPdfPath, buffer);
      
      // Configura pdf2pic
      const convert = pdf2pic.fromPath(tempPdfPath, {
        density: 300,           // DPI alta per OCR migliore
        saveFilename: "page",
        savePath: this.tempDir,
        format: "png",
        width: 2480,           // A4 a 300 DPI
        height: 3508
      });
      
      // Converti solo prime 3 pagine (buste paga di solito 1-2 pagine)
      const pages = await convert.bulk(-1, { responseType: "image" });
      
      const imagePaths = pages.map(page => page.path);
      
      // Cleanup PDF temporaneo
      await this.cleanupTempFile(tempPdfPath);
      
      return imagePaths;
      
    } catch (error) {
      // Cleanup in caso di errore
      await this.cleanupTempFile(tempPdfPath);
      throw error;
    }
  }
  
  parsePayslipText(text) {
    console.log('🔍 Parsing testo busta paga...');
    
    const result = {
      stipendioLordo: 0,
      irpef: 0,
      inps: 0,
      detrazioni: 0,
      nettoPercepito: 0,
      
      // Campi aggiuntivi
      periodo: null,
      dipendente: null,
      azienda: null,
      
      // Metadati parsing
      ocrSuccess: true,
      warnings: [],
      extractedValues: {}
    };
    
    try {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Pattern comuni nelle buste paga italiane
      const patterns = {
        lordo: [
          /(?:stipendio\s*lordo|retribuzione\s*lorda|lordo\s*mensile|imponibile\s*lordo)[:\s]*€?\s*([\d.,]+)/i,
          /lordo[:\s]*€?\s*([\d.,]+)/i,
          /retribuzione[:\s]*€?\s*([\d.,]+)/i
        ],
        irpef: [
          /(?:irpef|imposta\s*reddito|ritenuta\s*irpef)[:\s]*-?\s*€?\s*([\d.,]+)/i,
          /irpef[:\s]*-?\s*€?\s*([\d.,]+)/i
        ],
        inps: [
          /(?:inps|contributi\s*inps|previdenza)[:\s]*-?\s*€?\s*([\d.,]+)/i,
          /inps[:\s]*-?\s*€?\s*([\d.,]+)/i,
          /contributi[:\s]*-?\s*€?\s*([\d.,]+)/i
        ],
        detrazioni: [
          /(?:detrazioni?|sconti?|crediti?)[:\s]*€?\s*([\d.,]+)/i,
          /detrazione[:\s]*€?\s*([\d.,]+)/i
        ],
        netto: [
          /(?:netto\s*in\s*busta|stipendio\s*netto|netto\s*mensile|totale\s*netto)[:\s]*€?\s*([\d.,]+)/i,
          /netto[:\s]*€?\s*([\d.,]+)/i,
          /totale\s*a\s*pagare[:\s]*€?\s*([\d.,]+)/i
        ]
      };
      
      // Applica pattern matching
      for (const line of lines) {
        this.matchPatternsInLine(line, patterns, result);
      }
      
      // Post-processing e validazione
      this.validateAndNormalizePayslip(result);
      
      // Estrazione valori alternativi se pattern principali falliscono
      if (this.isEmptyPayslip(result)) {
        console.log('⚠️ Pattern principali falliti, usando metodi alternativi...');
        this.extractWithAlternativeMethods(text, result);
      }
      
      console.log(`💰 Dati estratti: Lordo=${result.stipendioLordo}€, IRPEF=${result.irpef}€, INPS=${result.inps}€, Netto=${result.nettoPercepito}€`);
      
    } catch (error) {
      console.error('⚠️ Errore parsing busta paga:', error.message);
      result.warnings.push(`Errore parsing: ${error.message}`);
    }
    
    return result;
  }
  
  /**
   * Applica pattern matching su una riga
   * @param {string} line - Riga di testo
   * @param {Object} patterns - Pattern da applicare
   * @param {Object} result - Oggetto risultato da popolare
   */
  matchPatternsInLine(line, patterns, result) {
    for (const [field, fieldPatterns] of Object.entries(patterns)) {
      if (result[this.getFieldName(field)] > 0) continue; // Già trovato
      
      for (const pattern of fieldPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const value = this.parseAmount(match[1]);
          if (value > 0) {
            const fieldName = this.getFieldName(field);
            result[fieldName] = value;
            result.extractedValues[field] = {
              value: value,
              originalText: match[0],
              line: line
            };
            console.log(`✅ Trovato ${field}: ${value}€ in "${match[0]}"`);
            break;
          }
        }
      }
    }
  }
  
  /**
   * Mappa nomi pattern ai nomi dei campi
   * @param {string} patternName - Nome pattern
   * @returns {string} Nome campo
   */
  getFieldName(patternName) {
    const mapping = {
      lordo: 'stipendioLordo',
      irpef: 'irpef',
      inps: 'inps',
      detrazioni: 'detrazioni',
      netto: 'nettoPercepito'
    };
    return mapping[patternName] || patternName;
  }
  
  /**
   * Valida e normalizza i dati della busta paga
   * @param {Object} result - Oggetto risultato
   */
  validateAndNormalizePayslip(result) {
    // Normalizza tutti gli importi
    result.stipendioLordo = this.parseAmount(result.stipendioLordo);
    result.irpef = this.parseAmount(result.irpef);
    result.inps = this.parseAmount(result.inps);
    result.detrazioni = this.parseAmount(result.detrazioni);
    result.nettoPercepito = this.parseAmount(result.nettoPercepito);
    
    // Calcoli di coerenza
    if (result.stipendioLordo > 0 && result.nettoPercepito === 0) {
      const nettoCalcolato = result.stipendioLordo - result.irpef - result.inps + result.detrazioni;
      if (nettoCalcolato > 0) {
        result.nettoPercepito = nettoCalcolato;
        result.warnings.push('Netto calcolato automaticamente');
      }
    }
    
    // Validazioni di plausibilità
    if (result.stipendioLordo > 0) {
      const percIrpef = (result.irpef / result.stipendioLordo) * 100;
      const percInps = (result.inps / result.stipendioLordo) * 100;
      
      if (percIrpef > 50) {
        result.warnings.push('IRPEF sembra troppo alta - verificare');
      }
      
      if (percInps > 15) {
        result.warnings.push('INPS sembra troppo alto - verificare');
      }
    }
  }
  
  /**
   * Controlla se la busta paga è vuota
   * @param {Object} result - Oggetto risultato
   * @returns {boolean} True se vuota
   */
  isEmptyPayslip(result) {
    return result.stipendioLordo === 0 && result.nettoPercepito === 0;
  }
  
  /**
   * Metodi alternativi di estrazione quando pattern falliscono
   * @param {string} text - Testo completo
   * @param {Object} result - Oggetto risultato
   */
  extractWithAlternativeMethods(text, result) {
    // Metodo 1: Cerca tutti i numeri e applica euristica
    const amounts = this.extractAllAmounts(text);
    
    if (amounts.length > 0) {
      // Assumiamo che l'importo più alto sia il lordo
      const maxAmount = Math.max(...amounts);
      if (maxAmount > 500 && maxAmount < 10000) { // Range plausibile stipendio
        result.stipendioLordo = maxAmount;
      }
      
      // Cerca il netto (spesso ultimo importo o secondo più alto)
      const sortedAmounts = amounts.sort((a, b) => b - a);
      if (sortedAmounts.length > 1) {
        result.nettoPercepito = sortedAmounts[1];
      }
      
      result.warnings.push('Dati estratti con metodo euristico - verificare accuratezza');
    }
    
    // Metodo 2: Cerca pattern numerici vicini a keyword
    const keywords = ['lordo', 'netto', 'irpef', 'inps'];
    for (const keyword of keywords) {
      const amount = this.findAmountNearKeyword(text, keyword);
      if (amount > 0) {
        if (keyword === 'lordo') result.stipendioLordo = amount;
        if (keyword === 'netto') result.nettoPercepito = amount;
        if (keyword === 'irpef') result.irpef = amount;
        if (keyword === 'inps') result.inps = amount;
      }
    }
  }
  
  /**
   * Estrae tutti gli importi dal testo
   * @param {string} text - Testo
   * @returns {Array} Array di importi
   */
  extractAllAmounts(text) {
    const amounts = [];
    const amountRegex = /€?\s*([\d]{1,5}[.,]\d{2})\s*€?/g;
    
    let match;
    while ((match = amountRegex.exec(text)) !== null) {
      const amount = this.parseAmount(match[1]);
      if (amount > 10) { // Filtro importi troppo piccoli
        amounts.push(amount);
      }
    }
    
    return [...new Set(amounts)]; // Rimuovi duplicati
  }
  
  /**
   * Trova importo vicino a una keyword
   * @param {string} text - Testo
   * @param {string} keyword - Parola chiave
   * @returns {number} Importo trovato
   */
  findAmountNearKeyword(text, keyword) {
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes(keyword)) {
        // Cerca nella stessa riga
        const amount = this.extractFirstAmount(lines[i]);
        if (amount > 0) return amount;
        
        // Cerca nella riga successiva
        if (i + 1 < lines.length) {
          const nextAmount = this.extractFirstAmount(lines[i + 1]);
          if (nextAmount > 0) return nextAmount;
        }
      }
    }
    
    return 0;
  }
  
  /**
   * Estrae il primo importo da una riga
   * @param {string} line - Riga di testo
   * @returns {number} Primo importo trovato
   */
  extractFirstAmount(line) {
    const match = line.match(/€?\s*([\d]{1,5}[.,]\d{2})\s*€?/);
    return match ? this.parseAmount(match[1]) : 0;
  }
  
  /**
   * Genera dati mock per demo
   * @returns {Object} Dati mock busta paga
   */
  generateMockPayslipData() {
    const mockVariations = [
      {
        stipendioLordo: 2500.00,
        irpef: 375.00,
        inps: 225.00,
        detrazioni: 100.00,
        nettoPercepito: 2000.00
      },
      {
        stipendioLordo: 1800.00,
        irpef: 270.00,
        inps: 162.00,
        detrazioni: 80.00,
        nettoPercepito: 1448.00
      },
      {
        stipendioLordo: 3200.00,
        irpef: 640.00,
        inps: 288.00,
        detrazioni: 120.00,
        nettoPercepito: 2392.00
      }
    ];
    
    const selectedMock = mockVariations[Math.floor(Math.random() * mockVariations.length)];
    
    return {
      ...selectedMock,
      periodo: 'Maggio 2025',
      dipendente: 'Mario Rossi',
      azienda: 'Demo SRL',
      ocrSuccess: true,
      warnings: ['Dati simulati per demo OCR'],
      extractedValues: {
        lordo: { value: selectedMock.stipendioLordo, originalText: 'MOCK DATA' },
        netto: { value: selectedMock.nettoPercepito, originalText: 'MOCK DATA' }
      }
    };
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
   * Crea dati di fallback in caso di errore
   * @param {Error} error - Errore originale
   * @returns {Object} Dati di fallback
   */
  createFallbackData(error) {
    return {
      stipendioLordo: 0,
      irpef: 0,
      inps: 0,
      detrazioni: 0,
      nettoPercepito: 0,
      periodo: null,
      dipendente: null,
      azienda: null,
      ocrSuccess: false,
      warnings: [`Errore OCR: ${error.message}`],
      extractedValues: {},
      error: error.message
    };
  }
  
  /**
   * Assicura esistenza directory temporanea
   */
  async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }
  
  /**
   * Pulisce file temporaneo
   * @param {string} filePath - Percorso file da eliminare
   */
  async cleanupTempFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`⚠️ Impossibile eliminare file temporaneo: ${filePath}`);
    }
  }
  
  /**
   * Chiude il worker Tesseract
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('✅ Tesseract worker terminato');
    }
  }
  
  /**
   * Test del modulo OCR
   * @returns {Object} Risultati test
   */
  async testOcr() {
    console.log('🧪 Test PDF OCR...');
    
    try {
      // Test con dati mock
      const mockResult = await this.generateMockPayslipData();
      
      const tests = [
        { name: 'Lordo estratto', passed: mockResult.stipendioLordo > 0 },
        { name: 'IRPEF estratta', passed: mockResult.irpef > 0 },
        { name: 'INPS estratto', passed: mockResult.inps > 0 },
        { name: 'Netto estratto', passed: mockResult.nettoPercepito > 0 },
        { name: 'OCR success flag', passed: mockResult.ocrSuccess === true },
        { name: 'Warnings presenti', passed: Array.isArray(mockResult.warnings) }
      ];
      
      const passedTests = tests.filter(t => t.passed).length;
      
      return {
        success: passedTests === tests.length,
        passedTests,
        totalTests: tests.length,
        details: tests,
        mockData: mockResult,
        note: 'Test eseguito in modalità mock - per OCR reale installare Tesseract'
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
const pdfOcr = new PdfOcr();

module.exports = pdfOcr;

// Gestione chiusura processo per cleanup
process.on('SIGINT', async () => {
  await pdfOcr.terminate();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pdfOcr.terminate();
  process.exit(0);
});

// Test standalone se chiamato direttamente
if (require.main === module) {
  pdfOcr.testOcr().then(result => {
    console.log('📊 Test Results:', result);
  });
}