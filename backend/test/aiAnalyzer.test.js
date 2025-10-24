// ============================================
// CONFIGURATION & TEST FILES - V2
// Allineato con aiAnalyzerV2.js e helpers.js
// ============================================


// File: config/aiAnalyzer.config.v2.js
// ============================================
const AI_ANALYZER_CONFIG = {
    // Provider settings
    providers: {
        primary: process.env.AI_PROVIDER_PRIMARY || 'groq',
        fallback: process.env.AI_PROVIDER_FALLBACK || 'huggingface',
        
        groq: {
            apiKey: process.env.GROQ_API_KEY,
            endpoint: 'https://api.groq.com/openai/v1/chat/completions',
            // MODIFICA: Modello aggiornato a quello definito in aiAnalyzerV2.js
            model: 'llama3-70b-8192',
            maxTokens: 2048,
            temperature: 0.1
        },
        
        huggingface: {
            apiKey: process.env.HUGGINGFACE_API_KEY,
            // MODIFICA: Modello aggiornato a uno di tipo instruction-tuned, più adatto al compito.
            endpoint: 'https://api-inference.huggingface.co/models/NousResearch/Hermes-2-Pro-Llama-3-8B',
            maxLength: 2048,
            temperature: 0.1
        }
    },
    
    // Performance settings
    performance: {
        timeout: parseInt(process.env.AI_TIMEOUT, 10) || 30000,
        maxRetries: parseInt(process.env.AI_MAX_RETRIES, 10) || 3,
        retryDelay: parseInt(process.env.AI_RETRY_DELAY, 10) || 1000,
        
        cacheEnabled: process.env.CACHE_AI_RESPONSES !== 'false',
        cacheExpiry: (parseInt(process.env.CACHE_EXPIRY_HOURS, 10) || 24) * 3600 * 1000,
        maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE, 10) || 1000
    },
    
    // Validation settings (usato dagli helper)
    validation: {
        requiredFields: {
            invoice: ['imponibile', 'aliquotaIva'],
            payslip: ['stipendioLordo', 'stipendioNetto']
        }
    },
    
    // MODIFICA: Questa struttura è perfetta per diventare la fonte del "knowledgeBase"
    // in una futura versione, sostituendo l'oggetto hardcoded.
    fiscalKnowledgeBase: {
        common: `Regole Generali 2025: L'analisi deve essere logico-fiscale, non matematica. L'obiettivo è identificare rischi e incongruenze. Anno di riferimento fiscale: 2025.`,
        iva: `IVA: Aliquota ordinaria 22%. Ridotte 10%, 5%, 4%. Esenzioni per specifici servizi (es. sanitari).`,
        regimeForfettario: `Regime Forfettario: Limite ricavi 85.000€. No IVA in fattura. Imposta sostitutiva 15% (5% per startup).`,
        splitPayment: `Split Payment: Obbligatorio per fatture verso la PA. Il cliente versa l'IVA direttamente allo Stato.`,
        irpef: `IRPEF: 3 scaglioni: 23% fino a 28k€, 35% fino a 50k€, 43% oltre 50k€. Detrazione lavoro dipendente fino a 1.955€.`,
        inps: `INPS Dipendenti: Aliquota a carico del dipendente circa 9.19%.`,
        fringeBenefits: `Fringe Benefits: Soglia di esenzione 1.000€, 2.000€ per dipendenti con figli a carico.`
    },
    
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        secureMode: process.env.SECURE_LOGGING !== 'false',
        sensitiveFields: ['partitaIva', 'codiceFiscale', 'email', 'telefono', 'indirizzo', 'cliente', 'stipendioLordo', 'stipendioNetto']
    }
};


// File: test/aiAnalyzer.test.v2.js
// ============================================

// MODIFICA: Importazioni aggiornate per puntare ai file V2
const AIAnalyzerV2 = require('../aiAnalyzerV2.js');
const { formatJsonForAi, validateFiscalData } = require('../helpers.js');

class AIAnalyzerTestSuite {
    
    constructor() {
        // MODIFICA: Istanzia la classe V2 con la configurazione
        this.analyzer = new AIAnalyzerV2(AI_ANALYZER_CONFIG);
        this.testResults = [];
    }
    
    async runAllTests() {
        console.log('🧪 Starting AI Analyzer Test Suite (V2)...\n');
        try {
            this.testBasicFunctionality();
            await this.testDocumentAnalysis();
            this.testErrorHandling();
            this.testHelperFunctions();
            this.printResults();
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
    }
    
    testBasicFunctionality() {
        console.log('📋 Testing basic functionality...');
        this.assert(this.analyzer instanceof AIAnalyzerV2, 'AIAnalyzerV2 instance creation');
        console.log('✅ Basic functionality tests passed\n');
    }

    async testDocumentAnalysis() {
        console.log('📄 Testing document analysis (invoice & payslip)...');
        
        // --- Test Fattura ---
        const testInvoice = { imponibile: 1000, aliquotaIva: 22, importoIva: 220, totale: 1220 };
        try {
            // MODIFICA: Chiamata al metodo unificato
            const result = await this.analyzer.analyzeDocument(testInvoice, 'invoice');
            this.assert(result && typeof result === 'object', 'Invoice analysis returns object');
            this.assert(typeof result.summary === 'string', 'Analysis has summary');
            this.assert(typeof result.confidence === 'number' && result.confidence >= 0, 'Confidence is valid number');
            // MODIFICA: Controllo su 'anomalies' invece di 'recommendations'
            this.assert(Array.isArray(result.anomalies), 'Anomalies key exists and is an array');
        } catch (error) {
            this.assert(false, `Invoice analysis failed: ${error.message}`);
        }

        // --- Test Busta Paga ---
        const testPayslip = { stipendioLordo: 2500, stipendioNetto: 1850, irpef: 420, inps: 229.75 };
        try {
            // MODIFICA: Chiamata al metodo unificato
            const result = await this.analyzer.analyzeDocument(testPayslip, 'payslip');
            this.assert(result && typeof result === 'object', 'Payslip analysis returns object');
            this.assert(result.documentType === 'payslip', 'Document type correctly identified');
        } catch (error) {
            this.assert(false, `Payslip analysis failed: ${error.message}`);
        }
        
        console.log('✅ Document analysis tests passed\n');
    }

    testErrorHandling() {
        console.log('⚠️ Testing error handling...');
        try {
            // MODIFICA: Il metodo interno `validateInput` viene chiamato da `analyzeDocument`
            this.analyzer.validateInput(null, 'invoice');
            this.assert(false, 'Should throw error for null input');
        } catch (error) {
            this.assert(error.message.includes('Invalid invoice data'), 'Throws correct error for null input');
        }
        
        try {
            this.analyzer.validateInput({}, 'invoice');
            this.assert(false, 'Should throw error for empty object');
        } catch (error) {
            this.assert(error.message.includes('Missing required fields'), 'Throws correct error for missing fields');
        }
        console.log('✅ Error handling tests passed\n');
    }

    testHelperFunctions() {
        console.log('🔧 Testing helper functions...');
        const testInvoice = { imponibile: '1.000,50' };
        const formatted = formatJsonForAi(testInvoice, 'invoice');
        this.assert(formatted.imponibile === 1000.50, 'formatJsonForAi handles Italian number format');
        
        const validation = validateFiscalData({ imponibile: 1000, aliquotaIva: 22, importoIva: 220, totale: 1220 }, 'invoice');
        this.assert(validation.isValid === true, 'validateFiscalData correctly validates good data');
        
        const badValidation = validateFiscalData({ imponibile: -100 }, 'invoice');
        this.assert(badValidation.isValid === false, 'validateFiscalData correctly rejects bad data');
        console.log('✅ Helper functions tests passed\n');
    }
    
    assert(condition, message) {
        const result = { message, passed: !!condition };
        this.testResults.push(result);
        console.log(`${result.passed ? '✅ PASS' : '❌ FAIL'}: ${message}`);
    }
    
    printResults() {
        const total = this.testResults.length;
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = total - passed;
        console.log('\n' + '='.repeat(50) + '\n🧪 TEST RESULTS SUMMARY\n' + '='.repeat(50));
        console.log(`Total Tests: ${total} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
        console.log(`Success Rate: ${total > 0 ? Math.round((passed / total) * 100) : 100}%`);
        console.log('='.repeat(50));
        if (failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults.filter(r => !r.passed).forEach(r => console.log(`  - ${r.message}`));
        }
        console.log(`\n🎯 AI Analyzer ${failed === 0 ? 'READY FOR PRODUCTION' : 'NEEDS FIXES'}`);
    }
}


// File: examples/usage.v2.js
// ============================================

class UsageExamples {
    constructor() {
        this.analyzer = new AIAnalyzerV2();
    }

    async basicInvoiceAnalysis() {
        const invoiceData = { imponibile: 1000, aliquotaIva: 22, importoIva: 220, totale: 1220, cliente: 'Test Srl' };
        try {
            // MODIFICA: Chiamata al metodo unificato
            const result = await this.analyzer.analyzeDocument(invoiceData, 'invoice');
            console.log('📋 Invoice Analysis Result:', JSON.stringify(result, null, 2));
            return result;
        } catch (error) {
            console.error('❌ Invoice analysis failed:', error);
        }
    }

    async basicPayslipAnalysis() {
        const payslipData = { stipendioLordo: 2500, stipendioNetto: 1850, irpef: 420, inps: 229.75 };
        try {
            // MODIFICA: Chiamata al metodo unificato
            const result = await this.analyzer.analyzeDocument(payslipData, 'payslip');
            console.log('💼 Payslip Analysis Result:', JSON.stringify(result, null, 2));
            return result;
        } catch (error) {
            console.error('❌ Payslip analysis failed:', error);
        }
    }

    async batchAnalysis(documents) {
        const results = [];
        for (const doc of documents) {
            try {
                // MODIFICA: Chiamata al metodo unificato
                const result = await this.analyzer.analyzeDocument(doc.data, doc.type);
                results.push({ type: doc.type, success: true, result });
            } catch (error) {
                results.push({ type: doc.type, success: false, error: error.message });
            }
        }
        console.log('📦 Batch Analysis Results:', results);
        return results;
    }
}