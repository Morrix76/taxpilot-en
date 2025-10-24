const fiscalValidator = require('./fiscalValidator');
const xmlParser = require('./xml-parser');
const pdfOcr = require('./pdf-ocr');
const TaxAIAnalyzer = require('./ai-analyzer-service');

const aiAnalyzer = new TaxAIAnalyzer(process.env.GROQ_API_KEY);

class DocumentProcessor {

  async processDocument(fileBuffer, documentType, filename) {
    console.log(`📄 Iniziando elaborazione: ${filename} (${documentType})`);

    try {
      let parsedData = {};

      if (documentType === 'fattura-elettronica') {
        parsedData = await xmlParser.parseInvoice(fileBuffer);
      } else if (documentType === 'busta-paga') {
        parsedData = await pdfOcr.extractPayslipData(fileBuffer);
      } else {
        throw new Error(`Tipo documento non supportato: ${documentType}`);
      }

      const validationResult = fiscalValidator.validateDocument(parsedData, documentType);
      console.log(`✅ Validazione completata: ${validationResult.validationStatus}`);

      let aiAnalysis = {};
      if (validationResult.validationStatus !== 'error') {
        console.log('3️⃣ Analisi AI...');

        const enrichedData = { ...parsedData, fiscalValidation: validationResult };

        if (documentType === 'fattura-elettronica') {
          aiAnalysis = await aiAnalyzer.analyzeFatturaElettronica(enrichedData, validationResult);
        } else if (documentType === 'busta-paga') {
          aiAnalysis = await aiAnalyzer.analyzeBustaPaga(enrichedData, validationResult);
        }
      } else {
        aiAnalysis = {
          summary: 'Documento non analizzato per errori fiscali',
          confidence: 0,
          recommendations: []
        };
      }

      return {
        success: true,
        filename,
        documentType,
        parsedData,
        fiscalValidation: validationResult,
        aiAnalysis,
        processingTimestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Errore durante elaborazione:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DocumentProcessor();
