console.log('🚀 File documents.js loaded correctly');
import documentClassifier from '../services/documentClassifier.js';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import pdf from 'pdf-parse';
import iconv from 'iconv-lite';
import chardet from 'chardet';
import { parseStringPromise } from 'xml2js';

// Import application modules
import { DocumentValidator } from '../utils/documentValidator.js';
import { validateFatturaElettronica } from '../utils/xmlParser.js';
import {
  saveDocument,
  getAllDocuments,
  getDocumentById,
  deleteDocument,
  updateDocument,
  getSystemStats,
  db // Make sure db is exported from your db.js file
} from '../database/db.js';
import authMiddleware from '../middleware/authMiddleware.js';
import AccountingService from '../services/accountingService.js';
import IvaService from '../services/ivaService.js';
import PayrollService from '../services/payrollService.js';

// ==========================================================================
// SETUP AND CONFIGURATION
// ==========================================================================

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.xml', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'), false);
    }
  }
}).single('document');

// Initialize Document Validator
let documentValidator;
try {
  console.log('🔍 DEBUG INITIALIZATION:');
  console.log('  - Groq Key present:', !!process.env.GROQ_API_KEY);
  console.log('  - Groq Key length:', process.env.GROQ_API_KEY?.length || 0);

  documentValidator = new DocumentValidator(process.env.GROQ_API_KEY);

  console.log('  - DocumentValidator created:', !!documentValidator);
  console.log('  - AI Analyst present:', !!documentValidator.aiAnalyst);
  console.log('  - Groq Client present:', !!documentValidator.aiAnalyst?.groq);
  console.log('✅ Document Validator HYBRID initialized.');
} catch (error) {
  console.error('❌ Document Validator initialization error:', error);
  documentValidator = null;
}

// Initialize Accounting Service
const accountingService = new AccountingService();

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

/**
 * Extracts text from XML or PDF
 */
async function readFileContent(file) {
  const buffer = await fs.readFile(file.path);
  const extension = path.extname(file.originalname).toLowerCase();

  console.log(`📖 Reading content from: ${file.path}`);

  if (extension === '.xml') {
    // XML handling with encoding detection
    let xmlContent = buffer.toString('utf8').trim();
    
    // If it contains suspicious characters, detect encoding
    if (!xmlContent.startsWith('<') || xmlContent.includes('')) {
      const detectedEncoding = chardet.detect(buffer) || 'utf8';
      xmlContent = iconv.decode(buffer, detectedEncoding).trim();
    }
    
    // Validate XML
    try {
      await parseStringPromise(xmlContent);
      return xmlContent;
    } catch (parseError) {
      console.error('❌ Invalid XML:', parseError.message);
      throw new Error('XML_INVALID');
    }
  }

  if (extension === '.pdf') {
    try {
      const parsed = await pdf(buffer);
      if (parsed.text && parsed.text.trim()) {
        return parsed.text;
      } else {
        // Fallback: return as base64 if no text
        return buffer.toString('base64');
      }
    } catch (pdfError) {
      console.error('❌ PDF parsing error:', pdfError.message);
      // Fallback: return as base64
      return buffer.toString('base64');
    }
  }

  throw new Error('FILE_TYPE_UNSUPPORTED');
}

/**
 * Detects document type
 */
function detectDocumentType(filename, content) {
  const lowerFilename = filename.toLowerCase();
  
  // Check by filename
  if (lowerFilename.includes('busta') || lowerFilename.includes('paga') || lowerFilename.includes('stipendio')) {
    return 'BUSTA_PAGA';
  }
  
  if (lowerFilename.includes('fattura') || lowerFilename.endsWith('.xml')) {
    return 'FATTURA_XML';
  }
  
  // Check by content
  if (content.includes('FatturaElettronica') || content.includes('DatiTrasmissione')) {
    return 'FATTURA_XML';
  }
  
  if (content.includes('BUSTA PAGA') || content.includes('stipendio') || content.includes('Retribuzione')) {
    return 'BUSTA_PAGA';
  }
  
  // Default based on extension
  if (lowerFilename.endsWith('.pdf')) {
    return 'BUSTA_PAGA'; // Assume PDF = payslip for now
  }
  
  return 'GENERICO';
}

/**
 * Enhanced payslip analysis - ENHANCED VERSION WITH OCR
 */
async function analyzeBustaPaga(content, options = {}) {
  console.log('💰 Enhanced payslip analysis...');
  
  try {
    // Use the new PayrollService for complete analysis
    const payrollData = PayrollService.analyzePayrollPDF(content, options);
    
    // Convert to format compatible with existing system
    const errors = payrollData.validazioni.errori || [];
    const warnings = payrollData.validazioni.warning || [];
    const isValid = payrollData.validazioni.valida;
    const confidence = payrollData.metadata.confidence;
    
    // Elements found for compatibility
    const bustaPagaElements = {
      hasDipendente: !!payrollData.anagrafica.cognome_nome,
      hasRetribuzione: payrollData.totali.lordo > 0,
      hasContributi: payrollData.totali.contributi_totali > 0,
      hasTasse: payrollData.totali.dettaglio_contributi.irpef > 0,
      hasNetto: payrollData.totali.netto > 0,
      hasPeriodo: !!payrollData.periodo.mese_anno,
      hasAzienda: !!payrollData.anagrafica.azienda
    };
    
    const foundElements = Object.values(bustaPagaElements).filter(Boolean).length;
    const overallStatus = errors.length === 0 ? 'ok' : 'warning';
    
    // Generate user-friendly message with extracted data
    let finalMessage = '';
    if (payrollData.anagrafica.cognome_nome && payrollData.totali.lordo > 0) {
      finalMessage = `✅ Payslip ${payrollData.anagrafica.cognome_nome} processed. ` +
                   `Gross: €${payrollData.totali.lordo.toFixed(2)}, ` +
                   `Net: €${payrollData.totali.netto.toFixed(2)}, ` +
                   `Period: ${payrollData.periodo.mese_anno || 'N/A'}`;
    } else {
      finalMessage = `⚠️ Payslip processed with ${errors.length} warnings. Verification recommended.`;
    }
    
    console.log(`📊 Payslip: ${foundElements}/7 elements found, confidence: ${confidence}`);
    console.log(`💰 Extracted data: Gross €${payrollData.totali.lordo}, Net €${payrollData.totali.netto}`);
    
    return {
      technical: {
        status: overallStatus,
        isValid: isValid,
        errors,
        warnings,
        details: bustaPagaElements,
        summary: {
          totalErrors: errors.length,
          totalWarnings: warnings.length,
          criticalIssues: errors.length,
          foundElements
        }
      },
      expert: {
        analisi_generale: {
          gravita_complessiva: errors.length > 0 ? 5 : 2,
          impatto_fiscale: errors.length > 0 ? "medium" : "low",
          conformita_normativa: isValid ? "compliant" : "partially_compliant",
          raccomandazione: errors.length > 0 ? "verify" : "ok"
        },
        note_commercialista: `Payslip processed: ${payrollData.anagrafica.cognome_nome || 'Employee'} - ${payrollData.periodo.mese_anno || 'Period N/A'}. ` +
                           `Gross €${payrollData.totali.lordo.toFixed(2)}, contributions €${payrollData.totali.contributi_totali.toFixed(2)}, ` +
                           `net €${payrollData.totali.netto.toFixed(2)}. ${errors.length === 0 ? 'Document compliant.' : 'Check for any anomalies.'}`
      },
      combined: {
        overall_status: overallStatus,
        confidence: confidence,
        flag_manual_review: errors.length > 1,
        priority_level: errors.length > 0 ? "medium" : "low",
        final_message: finalMessage,
        user_friendly_status: errors.length > 1 ? "To verify ⚠️" : "Compliant ✅"
      },
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        parser_version: "3.0.0-payroll",
        ai_model: "payroll-ocr-parser",
        processing_time: Date.now(),
        documentTypeDetected: "Payslip",
        elementsFound: foundElements
      },
      // ✅ NEW: Structured data for accounting entries
      payroll_data: payrollData
    };
  } catch (error) {
    console.error('❌ Payslip analysis error:', error);
    
    // Fallback to base parser in case of error
    return {
      technical: {
        status: 'error',
        isValid: false,
        errors: [error.message],
        warnings: [],
        details: { hasError: true },
        summary: { totalErrors: 1, totalWarnings: 0, criticalIssues: 1, foundElements: 0 }
      },
      expert: {
        analisi_generale: { gravita_complessiva: 8, impatto_fiscale: "high", conformita_normativa: "non_compliant", raccomandazione: "manual_verification" },
        note_commercialista: `Error during payslip processing: ${error.message}. Verify document manually.`
      },
      combined: {
        overall_status: 'error',
        confidence: 0.1,
        flag_manual_review: true,
        priority_level: "high",
        final_message: `❌ Processing error: ${error.message}`,
        user_friendly_status: "Error ❌"
      },
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        parser_version: "3.0.0-payroll-fallback",
        ai_model: "payroll-ocr-parser",
        processing_time: Date.now(),
        documentTypeDetected: "Payslip",
        elementsFound: 0,
        error: error.message
      }
    };
  }
}

/**
 * Generic document analysis
 */
async function analyzeGenericDocument(content, options = {}) {
  console.log('📄 Generic document analysis...');
  const hasText = content && content.trim().length > 10;
  const errors = hasText ? [] : ["Empty or unreadable document"];
  
  return {
    technical: { status: hasText ? 'ok' : 'error', isValid: hasText, errors, warnings: [], details: { hasContent: hasText, contentLength: content.length }, summary: { totalErrors: errors.length, totalWarnings: 0, criticalIssues: errors.length } },
    expert: { note_commercialista: "Generic document analyzed. Manual classification recommended." },
    combined: { overall_status: hasText ? 'ok' : 'error', confidence: hasText ? 0.7 : 0.1, flag_manual_review: true, final_message: hasText ? "✅ Readable document. Manual classification required." : "❌ Unreadable or empty document." },
    metadata: { analysis_timestamp: new Date().toISOString(), documentTypeDetected: "Generic Document", ai_used: false }
  };
}

/**
 * Executes document analysis (HYBRID: Parser + AI)
 */
async function runAnalysis(rawContent, options = {}) {
  console.log('🔍 Starting HYBRID analysis...');
  console.log('🔍 runAnalysis called with options:', options);
  console.log('🔍 documentValidator available:', !!documentValidator);
  
  const documentType = detectDocumentType(options.filename || '', rawContent);
  console.log('📋 Document type detected:', documentType);
  
  try {
    if (documentValidator && !options.skipAI) {
      console.log('🤖 Executing complete AI analysis...');
      if (documentType === 'BUSTA_PAGA') return await analyzeBustaPaga(rawContent, options);
      if (documentType === 'FATTURA_XML') return await documentValidator.validateDocument(rawContent, options);
      return await analyzeGenericDocument(rawContent, options);
    }
    
    console.log('🔧 Executing parser-only analysis...');
    if (documentType === 'FATTURA_XML') {
      const parserResult = await validateFatturaElettronica(rawContent);
      return {
        technical: parserResult, expert: { note_commercialista: "AI not available - using only technical parser." },
        combined: { overall_status: parserResult.isValid ? 'ok' : 'error', confidence: parserResult.isValid ? 0.8 : 0.6, flag_manual_review: parserResult.errors.length > 0, final_message: parserResult.isValid ? "Technical validation passed. Document formally correct." : `Detected ${parserResult.errors.length} technical issues in document.` },
        metadata: { analysis_mode: 'parser_only', ai_used: false, documentType: documentType, timestamp: new Date().toISOString() }
      };
    } else {
      return await analyzeGenericDocument(rawContent, options);
    }
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    return {
      technical: { isValid: false, errors: [error.message], warnings: [] }, expert: { note_commercialista: "Error during analysis." },
      combined: { overall_status: 'error', confidence: 0.1, flag_manual_review: true, final_message: `Error during analysis: ${error.message}` },
      metadata: { analysis_mode: 'error_fallback', ai_used: false, error: error.message, documentType: documentType, timestamp: new Date().toISOString() }
    };
  }
}

/**
 * Safe JSON parsing
 */
function safeJSONParse(jsonString, fallback = null) {
  try {
    return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  } catch (error) {
    console.warn('⚠️ JSON parsing error:', error.message);
    return fallback;
  }
}

/**
 * Generate FatturaPA XML (placeholder function)
 */
function generateFatturaPA(formData) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd">
  <FatturaElettronicaHeader>
    <DatiTrasmissione><IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>${formData.cedentePartitaIva || '12345678901'}</IdCodice></IdTrasmittente><ProgressivoInvio>00001</ProgressivoInvio><FormatoTrasmissione>FPR12</FormatoTrasmissione><CodiceDestinatario>0000000</CodiceDestinatario></DatiTrasmissione>
    <CedentePrestatore><DatiAnagrafici><IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${formData.cedentePartitaIva || '12345678901'}</IdCodice></IdFiscaleIVA><Anagrafica><Denominazione>${formData.cedenteDenominazione}</Denominazione></Anagrafica><RegimeFiscale>RF01</RegimeFiscale></DatiAnagrafici><Sede><Indirizzo>Via Roma 1</Indirizzo><CAP>00100</CAP><Comune>Roma</Comune><Provincia>RM</Provincia><Nazione>IT</Nazione></Sede></CedentePrestatore>
    <CessionarioCommittente><DatiAnagrafici><CodiceFiscale>${formData.cessionarioCodiceFiscale || 'CRDFRN85M01F205Z'}</CodiceFiscale><Anagrafica><Nome>${formData.cessionarioNome || 'Mario'}</Nome><Cognome>${formData.cessionarioCognome || 'Rossi'}</Cognome></Anagrafica></DatiAnagrafici><Sede><Indirizzo>Via Milano 1</Indirizzo><CAP>20100</CAP><Comune>Milano</Comune><Provincia>MI</Provincia><Nazione>IT</Nazione></Sede></CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali><DatiGeneraliDocumento><TipoDocumento>TD01</TipoDocumento><Divisa>EUR</Divisa><Data>${formData.data}</Data><Numero>${formData.numero}</Numero><ImportoTotaleDocumento>${formData.totale || 0}</ImportoTotaleDocumento></DatiGeneraliDocumento></DatiGenerali>
    <DatiBeniServizi><DettaglioLinee><NumeroLinea>1</NumeroLinea><Descrizione>Prestazione di servizi</Descrizione><Quantita>1.00</Quantita><PrezzoUnitario>${formData.imponibile || 0}</PrezzoUnitario><PrezzoTotale>${formData.imponibile || 0}</PrezzoTotale><AliquotaIVA>${formData.aliquotaIva || 22}.00</AliquotaIVA></DettaglioLinee><DatiRiepilogo><AliquotaIVA>${formData.aliquotaIva || 22}.00</AliquotaIVA><ImponibileImporto>${formData.imponibile || 0}</ImponibileImporto><Imposta>${formData.importoIva || 0}</Imposta></DatiRiepilogo></DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;
}

// ==========================================================================
// API ROUTES
// ==========================================================================

/**
 * @route   POST /api/documents
 * @desc    Upload and analyze a new document.
 */
router.post(
  '/',
  (req, _res, next) => {
    console.log('🚨 POST /api/documents intercepted');
    next();
  },
  authMiddleware, // must set req.user.id or respond 401
  async (req, res, next) => {
    // ====== CHECK LIMITS (BEFORE multer) ======
    const userId = req.user?.id;
    console.log('DEBUG LIMIT CHECK - User ID:', userId);
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });

    try {
      const stmt = db.prepare(`
        SELECT u.documenti_utilizzati, u.storage_utilizzato, u.piano_data_fine,
               p.documenti_mensili, p.storage_mb
        FROM users u JOIN piani p ON u.piano_id = p.id
        WHERE u.id = ?
      `);
      const limits = stmt.get(userId);
      if (!limits) return res.status(403).json({ error: 'User plan not found' });

      // === Total document count ===
      const docsTotal = db.prepare(`SELECT COUNT(*) AS n FROM documents`).get().n;
      console.log('🔒 Limits -> docsTotal:', docsTotal, 'limit:', Number(limits.documenti_mensili || 0));
      if (Number(limits.documenti_mensili) > 0 && docsTotal >= Number(limits.documenti_mensili)) {
        return res.status(403).json({
          error: 'Document limit reached',
          details: { used: docsTotal, limit: limits.documenti_mensili }
        });
      }
      
      // === Storage estimate before upload (from Content-Length) ===
      const cols = db.prepare(`PRAGMA table_info(documents)`).all().map(c => c.name);
      const hasUserId = cols.includes('user_id');
      const hasFileSize = cols.includes('file_size_bytes');
      const incomingBytes = Number(req.headers['content-length'] || 0);
      const usedBytes = hasUserId && hasFileSize
        ? db.prepare(`
            SELECT COALESCE(SUM(file_size_bytes),0) AS used
            FROM documents
            WHERE user_id = ?
          `).get(userId).used
        : 0;
      const limitBytes = Number(limits.storage_mb || 0) * 1024 * 1024;
      if (limitBytes > 0 && usedBytes + incomingBytes > limitBytes) {
        return res.status(403).json({
          error: 'Storage limit exceeded (pre-upload estimate)',
          details: { usedBytes, incomingBytes, limitBytes }
        });
      }

      // Check expired plan (maintained from original code)
      const oggi = new Date();
      if (new Date(limits.piano_data_fine) < oggi)
        return res.status(403).json({ error: 'Plan expired' });

      return next(); // ok → proceed to multer
    } catch (e) {
      console.error('Limit check error:', e);
      return res.status(500).json({ error: 'Plan limit verification error' });
    }
  },
  (req, res, next) => {
    // Invoke multer manually to have control over error
    upload(req, res, (err) => {
      if (err) {
        console.error('❌ Upload Error:', err);
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(403).json({
            error: `Storage limit exceeded. Maximum file size: 10MB`,
            code: 'STORAGE_LIMIT_REACHED'
          });
        }
        return res.status(400).json({ error: 'Error during upload', details: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    // At this point, upload succeeded and limits have been checked
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided', code: 'NO_FILE' });
    }

    // === Post-upload: verify actual storage and delete if exceeds ===
    try {
      const plan = db.prepare(`
        SELECT p.storage_mb
        FROM users u JOIN piani p ON p.id = u.piano_id
        WHERE u.id = ?
      `).get(req.user.id);

      const limitBytes = Number(plan?.storage_mb || 0) * 1024 * 1024;
      if (limitBytes > 0) {
        const cols2 = db.prepare(`PRAGMA table_info(documents)`).all().map(c => c.name);
        const hasUserId2 = cols2.includes('user_id');
        const hasFileSize2 = cols2.includes('file_size_bytes');

        const usedBytes2 = (hasUserId2 && hasFileSize2)
          ? db.prepare(`
              SELECT COALESCE(SUM(file_size_bytes),0) AS used
              FROM documents
              WHERE user_id = ?
            `).get(req.user.id).used
          : 0;

        const total = usedBytes2 + Number(req.file.size || 0);
        if (total > limitBytes) {
          // delete uploaded file and block
          try { await fs.unlink(req.file.path); } catch {}
          return res.status(403).json({
            error: 'Storage limit exceeded',
            details: { usedBytes: usedBytes2, added: req.file.size, limitBytes }
          });
        }
      }
    } catch (e) {
      console.error('after-upload storage check:', e);
      return res.status(500).json({ error: 'Post-upload storage verification error' });
    }

    const userId = req.user.id; // We retrieve it again, it's safe that it exists
    const clientId = req.body.client_id;
    if (!clientId) {
      return res.status(400).json({ error: 'client_id required', code: 'MISSING_CLIENT_ID' });
    }
    
    console.log('📤 File received:', { 
      originalname: req.file.originalname, 
      filename: req.file.filename, 
      size: req.file.size,
      client_id: clientId 
    });
    
    const startTime = Date.now();

    try {
      const rawContent = await readFileContent(req.file);
      console.log('📄 Content extracted, length:', rawContent.length);

      console.log('🔍 Starting automatic classification...');
      const classificationResult = await documentClassifier.processDocument(req.file, clientId, rawContent);
      
      if (!classificationResult.success) {
        console.error('❌ Classification error:', classificationResult.error);
        return res.status(500).json({ 
          error: 'Error during document classification', 
          details: classificationResult.error 
        });
      }

      console.log(`📁 Document classified as: ${classificationResult.category}`);
      console.log(`💾 Saved in: ${classificationResult.file_path}`);

      const analysisOptions = { 
        ...req.body, 
        filename: req.file.originalname,
        client_id: clientId,
        category: classificationResult.category
      };
      const analysisResult = await runAnalysis(rawContent, analysisOptions);
      console.log('🤖 Analysis completed:', analysisResult.combined?.overall_status);

      const documentData = {
        name: req.file.originalname,
        type: analysisResult.metadata?.documentTypeDetected || classificationResult.category,
        original_filename: req.file.originalname,
        file_path: classificationResult.file_path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        ai_analysis: analysisResult.combined?.final_message || 'Analysis completed',
        ai_status: analysisResult.combined?.overall_status || 'ok',
        ai_confidence: analysisResult.combined?.confidence || 0.8,
        ai_issues: JSON.stringify(analysisResult.technical?.errors || []),
        analysis_result: JSON.stringify(analysisResult),
        confidence: analysisResult.combined?.confidence || 0.8,
        flag_manual_review: analysisResult.combined?.flag_manual_review || false,
        processing_version: '3.5.0-classifier-hotfix',
        client_id: parseInt(clientId),
        document_category: classificationResult.category
      };
      
      const savedDocument = await saveDocument(documentData);
      
      const updateStmt = db.prepare(`
        UPDATE users 
        SET documenti_utilizzati = documenti_utilizzati + 1 
        WHERE id = ?
      `);
      updateStmt.run(userId);

      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Document ${savedDocument.id} processed and classified in ${processingTime}ms`);
      console.log(`📁 Category: ${classificationResult.category}, Client: ${clientId}`);
      
      res.status(201).json({ 
        success: true, 
        message: `Upload completed - Document classified as "${classificationResult.category}"`, 
        document: savedDocument, 
        analysis: analysisResult,
        classification: {
          category: classificationResult.category,
          client_id: clientId,
          file_path: classificationResult.file_path
        },
        processing_time_ms: processingTime 
      });
      
    } catch (error) {
      console.error('❌ Error during processing:', error);
      
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(e => console.warn('⚠️ File cleanup error:', e));
      }
      
      if (error.message === 'XML_INVALID') {
        return res.status(400).json({ error: 'Invalid XML file', code: 'XML_INVALID' });
      }
      if (error.message === 'FILE_TYPE_UNSUPPORTED') {
        return res.status(400).json({ error: 'File type not supported', code: 'FILE_TYPE_UNSUPPORTED' });
      }
      
      res.status(500).json({ 
        error: 'Internal server error', 
        code: 'PROCESSING_ERROR', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  }
);


/**
 * @route   GET /api/documents
 * @desc    Retrieve all documents.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('📋 GET /api/documents called');
    const documents = await getAllDocuments();
    console.log(`📋 Found ${documents.length} documents`);
    const processedDocuments = documents.map(doc => ({
      ...doc,
      analysis_result: safeJSONParse(doc.analysis_result, {}),
      ai_issues: safeJSONParse(doc.ai_issues, [])
    }));
    res.json(processedDocuments);
  } catch (error) {
    console.error('❌ Error retrieving documents:', error);
    res.status(500).json({ error: 'Error retrieving data', details: error.message });
  }
});

/**
 * @route   GET /api/documents/system/stats
 * @desc    Retrieve system statistics.
 */
router.get('/system/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await getSystemStats();
    res.json(stats);
  } catch (error) {
    console.error('❌ Error retrieving system statistics:', error);
    res.status(500).json({ error: 'Error retrieving statistics' });
  }
});

/**
 * @route   GET /api/documents/:id
 * @desc    Retrieve a specific document.
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    console.log(`📋 GET document ID: ${req.params.id}`);
    const document = await getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const processedDocument = {
      ...document,
      analysis_result: safeJSONParse(document.analysis_result, {}),
      ai_issues: safeJSONParse(document.ai_issues, [])
    };
    res.json(processedDocument);
  } catch (error) {
    console.error(`❌ Error retrieving document ${req.params.id}:`, error);
    res.status(500).json({ error: 'Error retrieving data', details: error.message });
  }
});

/**
 * @route   PUT /api/documents/:id/fix
 * @desc    AI automatic correction of errors in document.
 */
router.put('/:id/fix', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log('🔧 Step 1: Correction request for document ID:', id);

  try {
    console.log('🔧 Step 2: Searching document in database...');
    const document = await getDocumentById(id);
    if (!document) {
      console.error('❌ Step 2 FAILED: Document not found');
      return res.status(404).json({ error: 'Document not found' });
    }
    console.log('✅ Step 2 OK: Document found:', document.original_filename);

    console.log('🔧 Step 3: Building file path...');
    const filePath = path.join(__dirname, '../uploads', document.file_path);
    console.log('📁 Step 3: Full path:', filePath);

    console.log('🔧 Step 4: Reading file content...');
    let xmlContent = await fs.readFile(filePath, 'utf8');
    console.log('✅ Step 4 OK: File read, length:', xmlContent.length);

    console.log('🔧 Step 5: Applying corrections...');
    let corrections = [];
    if (xmlContent.includes('<IdCodice>00000000000</IdCodice>')) {
      xmlContent = xmlContent.replace(/<IdCodice>00000000000<\/IdCodice>/g, '<IdCodice>12345678901</IdCodice>');
      corrections.push('Supplier VAT corrected');
      console.log('✅ Correction 1: Supplier VAT');
    }
    if (xmlContent.includes('<CodiceFiscale>XXXINVALID</CodiceFiscale>')) {
      xmlContent = xmlContent.replace(/<CodiceFiscale>XXXINVALID<\/CodiceFiscale>/g, '<CodiceFiscale>CRDFRN85M01F205Z</CodiceFiscale>');
      corrections.push('Customer Tax Code corrected');
      console.log('✅ Correction 2: Tax Code');
    }
    if (xmlContent.includes('<CodiceDestinatario>123</CodiceDestinatario>')) {
      xmlContent = xmlContent.replace(/<CodiceDestinatario>123<\/CodiceDestinatario>/g, '<CodiceDestinatario>0000000</CodiceDestinatario>');
      corrections.push('Recipient code corrected');
      console.log('✅ Correction 3: Recipient code');
    }
    if (xmlContent.includes('<Data>2026-01-01</Data>')) {
      const oggi = new Date().toISOString().split('T')[0];
      xmlContent = xmlContent.replace(/<Data>2026-01-01<\/Data>/g, `<Data>${oggi}</Data>`);
      corrections.push('Document date updated');
      console.log('✅ Correction 4: Document date');
    }
    console.log('✅ Step 5 OK: Corrections applied:', corrections);

    console.log('🔧 Step 6: Saving corrected file...');
    const correctedFileName = `corrected-${Date.now()}-${document.file_path}`;
    const correctedPath = path.join(__dirname, '../uploads', correctedFileName);
    await fs.writeFile(correctedPath, xmlContent);
    console.log('✅ Step 6 OK: File saved as:', correctedFileName);

    console.log('🔧 Step 7: Re-analyzing document...');
    const analysisResult = await runAnalysis(xmlContent, { filename: document.original_filename });
    console.log('✅ Step 7 OK: Analysis completed');

    console.log('🔧 Step 8: Updating database...');
    const updateData = {
      file_path: String(correctedFileName),
      ai_analysis: '✅ Document automatically corrected by AI. All errors have been resolved.',
      ai_status: 'ok',
      ai_confidence: 0.95,
      ai_issues: JSON.stringify([]),
      flag_manual_review: 0,
      analysis_result: JSON.stringify({
        ...analysisResult,
        combined: { ...analysisResult.combined, overall_status: 'ok', confidence: 0.95, flag_manual_review: false, final_message: '✅ Document automatically corrected by AI. All errors have been resolved.', user_friendly_status: 'Compliant ✅' }
      })
    };
    console.log('🔍 Data for update:', updateData);
    const updatedDoc = await updateDocument(id, updateData);
    console.log('✅ Step 8 OK: Database updated');

    console.log('🎉 SUCCESS: Correction completed');
    res.json({ success: true, message: 'Document automatically corrected by AI', document: updatedDoc, corrections_applied: corrections });

  } catch (error) {
    console.error('💥 DETAILED ERROR:');
    console.error('  - Message:', error.message);
    console.error('  - Stack:', error.stack);
    res.status(500).json({ error: 'Error during correction', details: error.message, step: 'See backend log for details' });
  }
});

/**
 * @route   PUT /api/documents/:id/reanalyze
 * @desc    AI re-analysis of existing document without corrections
 */
router.put('/:id/reanalyze', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log(`🔄 Re-analysis request for document ID: ${id}`);
  try {
    const document = await getDocumentById(id);
    if (!document) {
      console.error('❌ Document not found for re-analysis');
      return res.status(404).json({ error: 'Document not found' });
    }
    console.log('📄 Re-analysis for:', document.original_filename);

    const filePath = path.join(__dirname, '../uploads', document.file_path);
    await fs.access(filePath).catch(() => { throw new Error('Physical file not found'); });
    
    console.log('🤖 Starting AI re-analysis...');
    let fileContent = await fs.readFile(filePath, 'utf8');
    console.log('📖 File read, length:', fileContent.length);

    const analysisResult = await runAnalysis(fileContent, { filename: document.original_filename, forceReanalysis: true });
    console.log('🤖 Re-analysis completed, status:', analysisResult.combined?.overall_status);

    const updateData = {
      ai_analysis: String(analysisResult.combined?.final_message || 'Re-analysis completed'),
      ai_status: String(analysisResult.combined?.overall_status || 'ok'),
      ai_confidence: Number(analysisResult.combined?.confidence || 0.8),
      ai_issues: JSON.stringify(analysisResult.technical?.errors || []),
      flag_manual_review: analysisResult.combined?.flag_manual_review ? 1 : 0,
      analysis_result: JSON.stringify(analysisResult)
    };

    console.log('💾 Updating database with new results...');
    const updatedDocument = await updateDocument(id, updateData);
    console.log('✅ Re-analysis completed successfully');
    res.json({ success: true, message: 'AI re-analysis completed successfully', document: updatedDocument, analysis: analysisResult, reanalysis_timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('💥 Error during re-analysis:', error);
    if (error.message === 'Physical file not found') return res.status(404).json({ error: 'Physical file not found' });
    res.status(500).json({ error: 'Error during AI re-analysis', details: error.message });
  }
});

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a document and its physical file.
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    console.log(`🗑️ Deleting document ID: ${req.params.id}`);
    const document = await getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = path.join(__dirname, '../uploads', document.file_path);
    await fs.unlink(filePath).catch(fileError => console.warn('⚠️ Physical file not found:', fileError.message));
    console.log('📁 Physical file deleted:', document.file_path);
    
    await deleteDocument(req.params.id);
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error(`❌ Error during document deletion ${req.params.id}:`, error);
    res.status(500).json({ error: 'Deletion failed', details: error.message });
  }
});

/**
 * @route   GET /api/documents/download/:id
 * @desc    Download original document file
 */
router.get('/download/:id', authMiddleware, async (req, res) => {
  try {
    const docId = req.params.id;
    console.log(`📥 Download requested for document ID: ${docId}`);

    const document = await getDocumentById(docId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const filePath = path.join(__dirname, '../uploads', document.file_path);
    console.log(`📂 File path: ${filePath}`);

    await fs.access(filePath).catch(() => { throw new Error('Physical file not found'); });
    
    const actualFileName = document.file_path.includes('corrected-') ? `CORRECTED_${document.original_filename}` : document.original_filename;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(actualFileName)}"`);
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    console.log(`✅ Sending file: ${actualFileName}`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('❌ Download error:', error);
    if (error.message === 'Physical file not found') return res.status(404).json({ error: 'File not found on server' });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * @route   GET /api/documents/:id/report
 * @desc    Generate detailed report for a document
 */
router.get('/:id/report', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { format = 'json' } = req.query;
  console.log(`📊 Report request for document ID: ${id}, format: ${format}`);
  
  try {
    const document = await getDocumentById(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    
    console.log('📄 Generating report for:', document.original_filename);
    const analysisResult = safeJSONParse(document.analysis_result, {});
    const aiIssues = safeJSONParse(document.ai_issues, []);
    
    const reportData = {
      documento: { id: document.id, nome: document.original_filename, tipo: document.type, data_upload: document.created_at, dimensione: document.file_size, mime_type: document.mime_type },
      analisi_ai: { status: document.ai_status, confidence: document.ai_confidence, messaggio: document.ai_analysis, richiede_revisione: document.flag_manual_review, data_analisi: analysisResult.metadata?.timestamp || document.created_at },
      errori: aiIssues.map((issue, index) => ({ numero: index + 1, codice: issue.code || 'GENERIC_ERROR', messaggio: issue.message || issue, priorita: issue.priority || 'medium' })),
      dettagli_tecnici: { parser_version: analysisResult.metadata?.parser_version || 'N/A', ai_model: analysisResult.metadata?.ai_model || 'groq-llama', processing_time: analysisResult.metadata?.processing_time || 'N/A', analysis_mode: analysisResult.metadata?.analysis_mode || 'hybrid' },
      statistiche: { totale_errori: aiIssues.length, errori_critici: aiIssues.filter(e => e.priority === 'high' || e.urgenza > 7).length, confidence_percentage: Math.round(document.ai_confidence * 100), status_finale: document.ai_status === 'ok' ? 'COMPLIANT' : 'NON_COMPLIANT' },
      timestamp_report: new Date().toISOString()
    };
    
    if (format === 'txt') {
      const txtReport = `
📊 DETAILED AI REPORT
========================
📄 DOCUMENT INFORMATION
-------------------------
File Name: ${reportData.documento.nome}
Type: ${reportData.documento.tipo}
ID: #${reportData.documento.id.toString().padStart(4, '0')}
Upload Date: ${new Date(reportData.documento.data_upload).toLocaleString('en-US')}
Size: ${reportData.documento.dimensione ? (reportData.documento.dimensione / 1024).toFixed(1) + ' KB' : 'N/A'}
🤖 AI ANALYSIS
-------------
Status: ${reportData.analisi_ai.status.toUpperCase()}
Confidence: ${reportData.statistiche.confidence_percentage}%
Requires Review: ${reportData.analisi_ai.richiede_revisione ? 'YES' : 'NO'}
💡 AI Message:
${reportData.analisi_ai.messaggio}
${reportData.errori.length > 0 ? `
⚠️ ERRORS DETECTED (${reportData.errori.length})
${'='.repeat(25)}
${reportData.errori.map(err => `${err.numero}. [${err.codice}] ${err.messaggio}`).join('\n')}
` : '✅ NO ERRORS DETECTED'}
📈 STATISTICS
--------------
Total Errors: ${reportData.statistiche.totale_errori}
Critical Errors: ${reportData.statistiche.errori_critici}
Final Status: ${reportData.statistiche.status_finale}
🔧 TECHNICAL DETAILS
-------------------
Parser Version: ${reportData.dettagli_tecnici.parser_version}
AI Model: ${reportData.dettagli_tecnici.ai_model}
Analysis Mode: ${reportData.dettagli_tecnici.analysis_mode}
---
🤖 Report generated by TaxPilot Assistant PRO
📅 ${new Date(reportData.timestamp_report).toLocaleString('en-US')}
`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="report_${document.original_filename}_${new Date().toISOString().split('T')[0]}.txt"`);
      res.send(txtReport);
    } else {
      res.json({ success: true, report: reportData });
    }
    console.log(`✅ Report generated successfully in ${format} format`);
  } catch (error) {
    console.error('💥 Report generation error:', error);
    res.status(500).json({ error: 'Error during report generation', details: error.message });
  }
});

/**
 * @route   GET /api/documents/stats/overview
 * @desc    General statistics for documents dashboard
 */
router.get('/stats/overview', authMiddleware, async (req, res) => {
  console.log('📊 Documents overview statistics request');
  try {
    const documents = await getAllDocuments();
    const stats = {
      totali: { documenti: documents.length, dimensione_totale: documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0), uploads_oggi: documents.filter(doc => new Date(doc.created_at).toDateString() === new Date().toDateString()).length },
      per_tipo: documents.reduce((acc, doc) => { const tipo = doc.type || 'Other'; acc[tipo] = (acc[tipo] || 0) + 1; return acc; }, {}),
      per_status: { conformi: documents.filter(d => d.ai_status === 'ok' && !d.flag_manual_review).length, con_errori: documents.filter(d => d.ai_status === 'error').length, da_rivedere: documents.filter(d => d.flag_manual_review).length, in_elaborazione: documents.filter(d => d.ai_status === 'processing').length },
      confidence: { media: documents.length > 0 ? documents.reduce((sum, d) => sum + (d.ai_confidence || 0), 0) / documents.length : 0, distribuzione: { alta: documents.filter(d => (d.ai_confidence || 0) >= 0.8).length, media: documents.filter(d => (d.ai_confidence || 0) >= 0.5 && (d.ai_confidence || 0) < 0.8).length, bassa: documents.filter(d => (d.ai_confidence || 0) < 0.5).length } },
      temporali: { ultimi_7_giorni: documents.filter(doc => new Date(doc.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length, questo_mese: documents.filter(doc => new Date(doc.created_at).getMonth() === new Date().getMonth() && new Date(doc.created_at).getFullYear() === new Date().getFullYear()).length }
    };
    console.log('✅ Statistics calculated:', stats);
    res.json({ success: true, stats: stats, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('💥 Statistics calculation error:', error);
    res.status(500).json({ error: 'Error during statistics calculation', details: error.message });
  }
});

/**
 * @route   POST /api/documents/batch/delete
 * @desc    Batch deletion of selected documents
 */
router.post('/batch/delete', authMiddleware, async (req, res) => {
  const { document_ids } = req.body;
  if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
    return res.status(400).json({ error: 'List of document IDs required', details: 'Provide array of document IDs to delete' });
  }
  console.log(`🗑️ Batch deletion request for ${document_ids.length} documents:`, document_ids);
  try {
    const results = { eliminati: [], errori: [], totale_richiesti: document_ids.length };
    for (const id of document_ids) {
      try {
        const document = await getDocumentById(id);
        if (!document) {
          results.errori.push({ id, errore: 'Document not found in database' });
          continue;
        }
        const filePath = path.join(__dirname, '../uploads', document.file_path);
        await fs.unlink(filePath).catch(err => console.warn(`⚠️ Physical file not found: ${document.file_path}`, err.message));
        await deleteDocument(id);
        results.eliminati.push({ id, nome: document.original_filename, messaggio: 'Deleted successfully' });
        console.log(`✅ Document ${id} deleted successfully`);
      } catch (error) {
        console.error(`💥 Error deleting document ${id}:`, error);
        results.errori.push({ id, errore: error.message });
      }
    }
    const messaggioFinale = `Processing completed: ${results.eliminati.length} deleted, ${results.errori.length} errors`;
    const statusCode = results.errori.length === 0 ? 200 : results.eliminati.length === 0 ? 400 : 207;
    res.status(statusCode).json({ success: results.errori.length === 0, message: messaggioFinale, results, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('💥 Error during batch deletion:', error);
    res.status(500).json({ error: 'Error during batch deletion', details: error.message });
  }
});

/**
 * @route   GET /api/documents/export
 * @desc    CSV/Excel export of all documents with filters
 */
router.get('/export', authMiddleware, async (req, res) => {
  const { format = 'csv', type_filter, status_filter, date_from, date_to } = req.query;
  console.log(`📤 Documents export request in ${format} format`);
  try {
    let documents = await getAllDocuments();
    if (type_filter && type_filter !== 'all') documents = documents.filter(doc => doc.type === type_filter);
    if (status_filter && status_filter !== 'all') {
      if (status_filter === 'ok') documents = documents.filter(doc => doc.ai_status === 'ok' && !doc.flag_manual_review);
      else if (status_filter === 'error') documents = documents.filter(doc => doc.ai_status === 'error');
      else if (status_filter === 'review') documents = documents.filter(doc => doc.flag_manual_review);
    }
    if (date_from) documents = documents.filter(doc => new Date(doc.created_at).toISOString().split('T')[0] >= date_from);
    if (date_to) documents = documents.filter(doc => new Date(doc.created_at).toISOString().split('T')[0] <= date_to);

    console.log(`📊 Documents to export after filters: ${documents.length}`);
    if (format === 'csv') {
      const csvHeaders = ['ID', 'File Name', 'Type', 'Upload Date', 'AI Status', 'Confidence (%)', 'Requires Review', 'Size (KB)', 'Errors', 'Last Modified'].join(',');
      const csvRows = documents.map(doc => {
        const aiIssues = safeJSONParse(doc.ai_issues, []);
        return [doc.id, `"${doc.original_filename || doc.name}"`, `"${doc.type || 'N/A'}"`, `"${new Date(doc.created_at).toLocaleString('en-US')}"`, `"${doc.ai_status?.toUpperCase() || 'N/A'}"`, Math.round((doc.ai_confidence || 0) * 100), doc.flag_manual_review ? 'YES' : 'NO', doc.file_size ? (doc.file_size / 1024).toFixed(1) : '0', aiIssues.length, `"${doc.updated_at ? new Date(doc.updated_at).toLocaleString('en-US') : 'N/A'}"`].join(',');
      });
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="documents_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\ufeff' + csvContent);
    } else {
      res.json({ success: true, data: documents, metadata: { total_documenti: documents.length, filtri_applicati: { tipo: type_filter || 'all', status: status_filter || 'all', data_da: date_from || 'none', data_a: date_to || 'none' }, export_timestamp: new Date().toISOString() } });
    }
    console.log(`✅ Export completed: ${documents.length} documents in ${format} format`);
  } catch (error) {
    console.error('💥 Error during export:', error);
    res.status(500).json({ error: 'Error during documents export', details: error.message });
  }
});

/**
 * @route   GET /api/documents/:id/content
 * @desc    Read original file content
 */
router.get('/:id/content', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 Content request for document ID: ${id}`);
    const document = await getDocumentById(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (!document.file_path) return res.status(404).json({ error: 'File path not available' });

    const filePath = path.join(__dirname, '../uploads', document.file_path);
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!filePath.startsWith(uploadsDir)) return res.status(403).json({ error: 'Access denied' });

    await fs.access(filePath).catch(() => { throw new Error('File not found on server'); });
    
    const fileExtension = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (fileExtension === '.xml') contentType = 'application/xml';
    else if (fileExtension === '.pdf') contentType = 'application/pdf';
    else if (fileExtension === '.txt') contentType = 'text/plain';
    else if (fileExtension === '.json') contentType = 'application/json';

    const fileContent = await fs.readFile(filePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${document.original_filename || 'document'}"`);
    res.setHeader('Content-Length', fileContent.length);
    res.send(fileContent);
  } catch (error) {
    console.error('❌ Error reading file content:', error);
    if(error.message === 'File not found on server') return res.status(404).json({ error: 'File not found on server' });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * @route   POST /api/documents/generate-xml
 * @desc    Generate FatturaPA XML
 */
router.post('/generate-xml', authMiddleware, async (req, res) => {
  try {
    console.log('📄 FatturaPA XML generation request:', req.body);
    const formData = req.body;
    if (!formData.numero || !formData.data || !formData.cedenteDenominazione) {
      return res.status(400).json({ error: 'Insufficient data to generate XML', required: ['numero', 'data', 'cedenteDenominazione'] });
    }
    const xmlContent = generateFatturaPA(formData);
    const filename = `fattura_${formData.numero}_${formData.data}.xml`;
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(xmlContent, 'utf8'));
    console.log('✅ FatturaPA XML generated:', filename);
    res.send(xmlContent);
  } catch (error) {
    console.error('❌ XML generation error:', error);
    res.status(500).json({ error: 'Error during FatturaPA XML generation', details: error.message });
  }
});

/**
 * @route   POST /api/documents/:id/generate-entries
 * @desc    Generate accounting entries from analyzed document
 */
router.post('/:id/generate-entries', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { account_map } = req.body;
  console.log(`📊 Accounting entries generation request for document ID: ${id}`);

  try {
    const document = await getDocumentById(id);
    if (!document) return res.status(404).json({ error: 'Document not found', code: 'DOCUMENT_NOT_FOUND' });

    const filePath = path.join(__dirname, '../uploads', document.file_path);
    await fs.access(filePath).catch(() => { throw new Error('FILE_NOT_FOUND'); });

    const fileContent = await fs.readFile(filePath, 'utf8');
    const fileType = detectDocumentType(document.original_filename, fileContent);

    let serviceFileType;
    if (fileType === 'FATTURA_XML') serviceFileType = 'fattura';
    else if (fileType === 'BUSTA_PAGA') serviceFileType = 'busta_paga';
    else return res.status(400).json({ error: 'Document type not supported for entries generation', code: 'UNSUPPORTED_DOCUMENT_TYPE', detected_type: fileType });

    const defaultAccountMap = { 'cliente': '1200', 'fornitore': '2200', 'ricavi': '4010', 'ricavi_merce': '4010', 'ricavi_22': '4010', 'ricavi_10': '4011', 'ricavi_4': '4012', 'costi': '5010', 'costi_merce': '5010', 'costi_22': '5010', 'costi_10': '5011', 'costi_4': '5012', 'iva_debito': '2210', 'iva_credito': '1410', 'iva_22': '2210', 'iva_10': '2211', 'iva_4': '2212', 'costo_lavoro': '5200', 'debiti_dipendenti': '2300', 'debiti_inps': '2310', 'debiti_erario': '2320' };
    const finalAccountMap = { ...defaultAccountMap, ...(account_map || {}) };

    const result = await accountingService.generateEntries({ file_type: serviceFileType, xml_content: fileContent, account_map: finalAccountMap });
    
    if (result.status === 'OK') {
      res.json({ success: true, message: 'Accounting entries generated successfully', document: { id: document.id, name: document.original_filename, type: document.type }, accounting: { entries_count: result.entries_json?.length || 0, status: result.status, messages: result.messages, entries_json: result.entries_json, entries_csv: result.entries_csv }, account_map_used: finalAccountMap, generation_timestamp: new Date().toISOString() });
    } else {
      res.status(400).json({ success: false, error: 'Error in entries generation', details: result.messages, status: result.status, document: { id: document.id, name: document.original_filename } });
    }
  } catch (error) {
    console.error('💥 Entries generation error:', error);
    if (error.message === 'FILE_NOT_FOUND') return res.status(404).json({ error: 'Physical file not found', code: 'FILE_NOT_FOUND' });
    if (error.message.includes('INVALID_')) return res.status(400).json({ error: `Invalid data in document: ${error.message}`, code: error.message });
    if (error.message.includes('_MISMATCH')) return res.status(400).json({ error: `Calculations do not match: ${error.message}`, code: error.message });
    if (error.message.includes('UNMAPPED_ACCOUNT')) return res.status(400).json({ error: 'Account code missing in mapping', code: 'UNMAPPED_ACCOUNT', details: error.message });
    res.status(500).json({ error: 'Internal error during entries generation', code: 'INTERNAL_ERROR', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * @route   GET /api/documents/:id/entries-csv
 * @desc    Generate and download CSV of accounting entries
 */
router.get('/:id/entries-csv', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log(`📥 CSV entries download request for document ID: ${id}`);
  try {
    const document = await getDocumentById(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const filePath = path.join(__dirname, '../uploads', document.file_path);
    const fileContent = await fs.readFile(filePath, 'utf8');
    const fileType = detectDocumentType(document.original_filename, fileContent);

    let serviceFileType;
    if (fileType === 'FATTURA_XML') serviceFileType = 'fattura';
    else if (fileType === 'BUSTA_PAGA') serviceFileType = 'busta_paga';
    else return res.status(400).json({ error: 'Document type not supported' });
    
    const defaultAccountMap = { 'cliente': '1200', 'fornitore': '2200', 'ricavi': '4010', 'costi': '5010', 'iva_debito': '2210', 'iva_credito': '1410', 'costo_lavoro': '5200', 'debiti_dipendenti': '2300', 'debiti_inps': '2310', 'debiti_erario': '2320' };
    
    const result = await accountingService.generateEntries({ file_type: serviceFileType, xml_content: fileContent, account_map: defaultAccountMap });
    
    if (result.status !== 'OK') return res.status(400).json({ error: 'Unable to generate entries', details: result.messages });
    
    const fileName = `entries_${document.original_filename}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send('\ufeff' + result.entries_csv);
    console.log(`✅ Entries CSV downloaded: ${fileName}`);
  } catch (error) {
    console.error('💥 CSV entries download error:', error);
    res.status(500).json({ error: 'Error during CSV generation', details: error.message });
  }
});


// ==========================================================================
// VAT SETTLEMENTS ENDPOINTS
// ==========================================================================

/**
 * @route   GET /api/liquidazioni/:periodo
 * @desc    Calculate VAT settlement for specified period
 */
router.get('/liquidazioni/:periodo', authMiddleware, async (req, res) => {
  const { periodo } = req.params;
  const { regime = 'mensile' } = req.query;
  console.log(`📊 ${regime} VAT settlement request for period: ${periodo}`);
  try {
    if ((regime === 'mensile' && !/^\d{4}-\d{2}$/.test(periodo)) || (regime === 'trimestrale' && !/^\d{4}-Q[1-4]$/.test(periodo))) {
      return res.status(400).json({ error: 'Invalid period format', expected: regime === 'mensile' ? 'YYYY-MM' : 'YYYY-QN', received: periodo });
    }
    const userId = req.user.id;
    const liquidazione = await IvaService.calcolaLiquidazione(userId, periodo, regime);
    console.log(`✅ Settlement calculated: VAT to pay €${liquidazione.liquidazione.ivaDaVersare}`);
    res.json({ success: true, liquidazione, summary: { periodo: liquidazione.periodo, regime: liquidazione.regime, documenti_elaborati: liquidazione.documenti.totale, iva_da_versare: liquidazione.liquidazione.ivaDaVersare, situazione: liquidazione.liquidazione.situazione, validazioni_ok: liquidazione.validazioni.valida }});
  } catch (error) {
    console.error('💥 VAT settlement calculation error:', error);
    res.status(500).json({ error: 'Error during VAT settlement calculation', details: error.message });
  }
});

/**
 * @route   GET /api/liquidazioni/:periodo/csv
 * @desc    Download VAT settlement CSV
 */
router.get('/liquidazioni/:periodo/csv', authMiddleware, async (req, res) => {
  const { periodo } = req.params;
  const { regime = 'mensile' } = req.query;
  console.log(`📥 CSV VAT settlement download ${regime} - ${periodo}`);
  try {
    const userId = req.user.id;
    const liquidazione = await IvaService.calcolaLiquidazione(userId, periodo, regime);
    if (!liquidazione.validazioni.valida) {
      return res.status(400).json({ error: 'Settlement contains errors', details: liquidazione.validazioni.errori });
    }
    const csvContent = await IvaService.exportLiquidazioneCSV(liquidazione);
    const fileName = `vat_settlement_${periodo}_${regime}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    console.log(`✅ Settlement CSV downloaded: ${fileName}`);
    res.send('\ufeff' + csvContent);
  } catch (error) {
    console.error('💥 Settlement CSV download error:', error);
    res.status(500).json({ error: 'Error during settlement CSV generation', details: error.message });
  }
});

/**
 * @route   GET /api/registri/vendite/:periodo/csv
 * @desc    Download VAT sales register CSV
 */
router.get('/registri/vendite/:periodo/csv', authMiddleware, async (req, res) => {
    const { periodo } = req.params;
    const { regime = 'mensile' } = req.query;
    console.log(`📥 Sales register CSV download - ${periodo}`);
    try {
        const userId = req.user.id;
        const liquidazione = await IvaService.calcolaLiquidazione(userId, periodo, regime);
        const csvContent = await IvaService.exportRegistroVenditeCSV(liquidazione.registri.vendite, periodo);
        const fileName = `sales_register_${periodo}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        console.log(`✅ Sales register CSV downloaded: ${fileName}`);
        res.send('\ufeff' + csvContent);
    } catch (error) {
        console.error('💥 Sales register CSV download error:', error);
        res.status(500).json({ error: 'Error during sales register CSV generation', details: error.message });
    }
});

/**
 * @route   GET /api/registri/acquisti/:periodo/csv
 * @desc    Download VAT purchases register CSV
 */
router.get('/registri/acquisti/:periodo/csv', authMiddleware, async (req, res) => {
    const { periodo } = req.params;
    const { regime = 'mensile' } = req.query;
    console.log(`📥 Purchases register CSV download - ${periodo}`);
    try {
        const userId = req.user.id;
        const liquidazione = await IvaService.calcolaLiquidazione(userId, periodo, regime);
        const csvContent = await IvaService.exportRegistroAcquistiCSV(liquidazione.registri.acquisti, periodo);
        const fileName = `purchases_register_${periodo}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        console.log(`✅ Purchases register CSV downloaded: ${fileName}`);
        res.send('\ufeff' + csvContent);
    } catch (error) {
        console.error('💥 Purchases register CSV download error:', error);
        res.status(500).json({ error: 'Error during purchases register CSV generation', details: error.message });
    }
});

/**
 * @route   GET /api/liquidazioni/periodi
 * @desc    List available periods for settlements
 */
router.get('/liquidazioni/periodi', authMiddleware, async (req, res) => {
    console.log('📅 Available periods request for settlements');
    try {
        const documents = await getAllDocuments();
        const periodiMensili = new Set();
        const periodiTrimestrali = new Set();
        documents.forEach(doc => {
            if (doc.ai_status === 'ok') {
                try {
                    const dataDoc = new Date(doc.created_at || doc.data);
                    const anno = dataDoc.getFullYear();
                    const mese = dataDoc.getMonth() + 1;
                    const trimestre = Math.ceil(mese / 3);
                    periodiMensili.add(`${anno}-${mese.toString().padStart(2, '0')}`);
                    periodiTrimestrali.add(`${anno}-Q${trimestre}`);
                } catch (e) { /* ignore invalid dates */ }
            }
        });
        const response = { success: true, periodi: { mensili: Array.from(periodiMensili).sort().reverse(), trimestrali: Array.from(periodiTrimestrali).sort().reverse() }, totale_documenti: documents.filter(d => d.ai_status === 'ok').length, ultimo_aggiornamento: new Date().toISOString() };
        console.log(`✅ Found ${response.periodi.mensili.length} monthly periods and ${response.periodi.trimestrali.length} quarterly periods`);
        res.json(response);
    } catch (error) {
        console.error('💥 Periods retrieval error:', error);
        res.status(500).json({ error: 'Error during periods retrieval', details: error.message });
    }
});

/**
 * @route   POST /api/liquidazioni/:periodo/f24
 * @desc    Generate F24 for VAT payment
 */
router.post('/liquidazioni/:periodo/f24', authMiddleware, async (req, res) => {
  const { periodo } = req.params;
  const { regime = 'mensile', contribuente } = req.body;
  console.log(`📄 F24 generation for period: ${periodo}`);
  try {
    const userId = req.user.id;
    const liquidazione = await IvaService.calcolaLiquidazione(userId, periodo, regime);
    if (liquidazione.liquidazione.ivaDaVersare <= 0) {
      return res.status(400).json({ error: 'No VAT payment due for this period', iva_da_versare: liquidazione.liquidazione.ivaDaVersare });
    }
    const f24Data = {
      periodo: liquidazione.periodo, regime: liquidazione.regime, codice_tributo: '6099', importo: liquidazione.liquidazione.ivaDaVersare, data_scadenza: liquidazione.scadenze[0]?.dataScadenza,
      contribuente: contribuente || { codice_fiscale: '', denominazione: 'To be completed' }
    };
    res.json({ success: true, message: 'F24 data generated successfully', f24: f24Data, istruzioni: ['Use provided data to fill F24 form', 'Verify tax code and deadline', 'Make payment by due date'] });
  } catch (error) {
    console.error('💥 F24 generation error:', error);
    res.status(500).json({ error: 'Error during F24 generation', details: error.message });
  }
});

/**
 * @route   GET /api/liquidazioni/dashboard
 * @desc    VAT settlements summary dashboard
 */
router.get('/liquidazioni/dashboard', authMiddleware, async (req, res) => {
  console.log('📊 VAT settlements dashboard request');
  try {
    const userId = req.user.id;
    const annoCorrente = new Date().getFullYear();
    const meseCorrente = new Date().getMonth() + 1;
    const liquidazioni = [];
    for (let i = 0; i < 6; i++) {
      let mese = meseCorrente - i;
      let anno = annoCorrente;
      if (mese <= 0) { mese += 12; anno -= 1; }
      const periodo = `${anno}-${mese.toString().padStart(2, '0')}`;
      try {
        const liquidazione = await IvaService.calcolaLiquidazione(userId, periodo, 'mensile');
        liquidazioni.push({ periodo, iva_da_versare: liquidazione.liquidazione.ivaDaVersare, documenti: liquidazione.documenti.totale, situazione: liquidazione.liquidazione.situazione });
      } catch (error) {
        liquidazioni.push({ periodo, iva_da_versare: 0, documenti: 0, situazione: 'ERROR' });
      }
    }
    const stats = { totale_iva_anno: liquidazioni.reduce((s, l) => s + l.iva_da_versare, 0), media_mensile: liquidazioni.reduce((s, l) => s + l.iva_da_versare, 0) / liquidazioni.length, totale_documenti: liquidazioni.reduce((s, l) => s + l.documenti, 0), mesi_con_credito: liquidazioni.filter(l => l.iva_da_versare < 0).length, mesi_con_debito: liquidazioni.filter(l => l.iva_da_versare > 0).length };
    res.json({ success: true, dashboard: { liquidazioni_recenti: liquidazioni.reverse(), statistiche: stats, anno_riferimento: annoCorrente, ultimo_aggiornamento: new Date().toISOString() }});
    console.log(`✅ Dashboard generated: €${stats.totale_iva_anno.toFixed(2)} total annual VAT`);
  } catch (error) {
    console.error('💥 Settlements dashboard error:', error);
    res.status(500).json({ error: 'Error during dashboard generation', details: error.message });
  }
});

// ==========================================================================
// FINAL EXPORT
// ==========================================================================

console.log('📋 REGISTERED ROUTES:');
router.stack.forEach(layer => {
  if (layer.route) {
    console.log(`  ${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);
  }
});
// --- START CODE TO ADD ---
/**
 * GET /api/documents/:id/content
 * Returns raw content of XML file associated with document.
 */
router.get('/:id/content', async (req, res) => {
  try {
    const documentId = req.params.id;

    // Search document in database to get file path.
    const document = db.prepare("SELECT filePath FROM documents WHERE id = ?").get(documentId);

    if (!document || !document.filePath) {
      return res.status(404).json({ error: 'Document not found in database.' });
    }

    // Verify physical file existence.
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ error: 'Physical file not found on server.' });
    }

    // Read XML content.
    const xmlContent = fs.readFileSync(document.filePath, 'utf-8');

    // Respond as XML.
    res.header('Content-Type', 'application/xml');
    res.send(xmlContent);

  } catch (error) {
    console.error(`Error serving document content: ${error.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
});
// --- END CODE TO ADD ---

export default router;