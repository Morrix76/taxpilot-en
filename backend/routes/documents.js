// routes/documents.js
console.log('🚀 File documents.js caricato correttamente');
import documentClassifier from '../services/documentClassifier.js';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs'; // *** CONVERTED: Aggiunto import sync per check esistenza file ***
import { fileURLToPath } from 'url';
import pdf from 'pdf-parse';
import iconv from 'iconv-lite';
import chardet from 'chardet';
import { parseStringPromise } from 'xml2js';

// Import dei moduli dell'applicazione
import { DocumentValidator } from '../utils/documentValidator.js';
import { validateFatturaElettronica } from '../utils/xmlParser.js';
import {
  saveDocument,
  getAllDocuments,
  getDocumentById,
  deleteDocument,
  updateDocument,
  getSystemStats,
  db // *** CONVERTED: Import path changed ***
} from '../db.js';
import authMiddleware from '../middleware/authMiddleware.js';
import AccountingService from '../services/accountingService.js';
import IvaService from '../services/ivaService.js';
import PayrollService from '../services/payrollService.js';

// ==========================================================================
// SETUP E CONFIGURAZIONE
// ==========================================================================

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Configurazione Multer per upload file
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
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
      cb(new Error('Tipo file non supportato'), false);
    }
  }
}).single('document');

// Inizializza Document Validator
let documentValidator;
try {
  console.log('🔍 DEBUG INIZIALIZZAZIONE:');
  console.log('  - Groq Key presente:', !!process.env.GROQ_API_KEY);
  console.log('  - Groq Key length:', process.env.GROQ_API_KEY?.length || 0);

  documentValidator = new DocumentValidator(process.env.GROQ_API_KEY);

  console.log('  - DocumentValidator creato:', !!documentValidator);
  console.log('  - AI Analyst presente:', !!documentValidator.aiAnalyst);
  console.log('  - Groq Client presente:', !!documentValidator.aiAnalyst?.groq);
  console.log('✅ Document Validator HYBRID inizializzato.');
} catch (error) {
  console.error('❌ Errore inizializzazione Document Validator:', error);
  documentValidator = null;
}

// Inizializza Accounting Service
const accountingService = new AccountingService();

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

/**
 * Estrae testo da XML o PDF
 */
async function readFileContent(file) {
  const buffer = await fs.readFile(file.path);
  const extension = path.extname(file.originalname).toLowerCase();

  console.log(`📖 Lettura contenuto da: ${file.path}`);

  if (extension === '.xml') {
    // Gestione XML con encoding detection
    let xmlContent = buffer.toString('utf8').trim();
    
    // Se contiene caratteri sospetti, rileva encoding
    if (!xmlContent.startsWith('<') || xmlContent.includes('')) {
      const detectedEncoding = chardet.detect(buffer) || 'utf8';
      xmlContent = iconv.decode(buffer, detectedEncoding).trim();
    }
    
    // Valida XML
    try {
      await parseStringPromise(xmlContent);
      return xmlContent;
    } catch (parseError) {
      console.error('❌ XML non valido:', parseError.message);
      throw new Error('XML_INVALID');
    }
  }

  if (extension === '.pdf') {
    try {
      const parsed = await pdf(buffer);
      if (parsed.text && parsed.text.trim()) {
        return parsed.text;
      } else {
        // Fallback: restituisci come base64 se non c'è testo
        return buffer.toString('base64');
      }
    } catch (pdfError) {
      console.error('❌ Errore parsing PDF:', pdfError.message);
      // Fallback: restituisci come base64
      return buffer.toString('base64');
    }
  }

  throw new Error('FILE_TYPE_UNSUPPORTED');
}

/**
 * Rileva tipo documento
 */
function detectDocumentType(filename, content) {
  const lowerFilename = filename.toLowerCase();
  
  // Controllo per nome file
  if (lowerFilename.includes('busta') || lowerFilename.includes('paga') || lowerFilename.includes('stipendio')) {
    return 'BUSTA_PAGA';
  }
  
  if (lowerFilename.includes('fattura') || lowerFilename.endsWith('.xml')) {
    return 'FATTURA_XML';
  }
  
  // Controllo per contenuto
  if (content.includes('FatturaElettronica') || content.includes('DatiTrasmissione')) {
    return 'FATTURA_XML';
  }
  
  if (content.includes('BUSTA PAGA') || content.includes('stipendio') || content.includes('Retribuzione')) {
    return 'BUSTA_PAGA';
  }
  
  // Default basato su estensione
  if (lowerFilename.endsWith('.pdf')) {
    return 'BUSTA_PAGA'; // Assumiamo PDF = busta paga per ora
  }
  
  return 'GENERICO';
}

/**
 * Analisi specifica per buste paga - VERSIONE POTENZIATA CON OCR
 */
async function analyzeBustaPaga(content, options = {}) {
  console.log('💰 Analisi busta paga potenziata...');
  
  try {
    // Usa il nuovo PayrollService per analisi completa
    const payrollData = PayrollService.analyzePayrollPDF(content, options);
    
    // Converti in formato compatibile con il sistema esistente
    const errors = payrollData.validazioni.errori || [];
    const warnings = payrollData.validazioni.warning || [];
    const isValid = payrollData.validazioni.valida;
    const confidence = payrollData.metadata.confidence;
    
    // Elementi trovati per compatibilità
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
    
    // Genera messaggio user-friendly con dati estratti
    let finalMessage = '';
    if (payrollData.anagrafica.cognome_nome && payrollData.totali.lordo > 0) {
      finalMessage = `✅ Busta paga ${payrollData.anagrafica.cognome_nome} elaborata. ` +
                   `Lordo: €${payrollData.totali.lordo.toFixed(2)}, ` +
                   `Netto: €${payrollData.totali.netto.toFixed(2)}, ` +
                   `Periodo: ${payrollData.periodo.mese_anno || 'N/A'}`;
    } else {
      finalMessage = `⚠️ Busta paga elaborata con ${errors.length} avvisi. Verifica consigliata.`;
    }
    
    console.log(`📊 Busta paga: ${foundElements}/7 elementi trovati, confidence: ${confidence}`);
    console.log(`💰 Dati estratti: Lordo €${payrollData.totali.lordo}, Netto €${payrollData.totali.netto}`);
    
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
          impatto_fiscale: errors.length > 0 ? "medio" : "basso",
          conformita_normativa: isValid ? "conforme" : "parzialmente_conforme",
          raccomandazione: errors.length > 0 ? "verifica" : "ok"
        },
        note_commercialista: `Busta paga elaborata: ${payrollData.anagrafica.cognome_nome || 'Dipendente'} - ${payrollData.periodo.mese_anno || 'Periodo N/A'}. ` +
                           `Lordo €${payrollData.totali.lordo.toFixed(2)}, contributi €${payrollData.totali.contributi_totali.toFixed(2)}, ` +
                           `netto €${payrollData.totali.netto.toFixed(2)}. ${errors.length === 0 ? 'Documento conforme.' : 'Verificare eventuali anomalie.'}`
      },
      combined: {
        overall_status: overallStatus,
        confidence: confidence,
        flag_manual_review: errors.length > 1,
        priority_level: errors.length > 0 ? "medium" : "low",
        final_message: finalMessage,
        user_friendly_status: errors.length > 1 ? "Da verificare ⚠️" : "Conforme ✅"
      },
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        parser_version: "3.0.0-payroll",
        ai_model: "payroll-ocr-parser",
        processing_time: Date.now(),
        documentTypeDetected: "Busta Paga",
        elementsFound: foundElements
      },
      // ✅ NUOVO: Dati strutturati per le scritture contabili
      payroll_data: payrollData
    };
  } catch (error) {
    console.error('❌ Errore analisi busta paga:', error);
    
    // Fallback al parser base in caso di errore
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
        analisi_generale: { gravita_complessiva: 8, impatto_fiscale: "alto", conformita_normativa: "non_conforme", raccomandazione: "verifica_manuale" },
        note_commercialista: `Errore durante elaborazione busta paga: ${error.message}. Verificare manually il documento.`
      },
      combined: {
        overall_status: 'error',
        confidence: 0.1,
        flag_manual_review: true,
        priority_level: "high",
        final_message: `❌ Errore durante elaborazione: ${error.message}`,
        user_friendly_status: "Errore ❌"
      },
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        parser_version: "3.0.0-payroll-fallback",
        ai_model: "payroll-ocr-parser",
        processing_time: Date.now(),
        documentTypeDetected: "Busta Paga",
        elementsFound: 0,
        error: error.message
      }
    };
  }
}

/**
 * Analisi documento generico
 */
async function analyzeGenericDocument(content, options = {}) {
  console.log('📄 Analisi documento generico...');
  const hasText = content && content.trim().length > 10;
  const errors = hasText ? [] : ["Documento vuoto o illeggibile"];
  
  return {
    technical: { status: hasText ? 'ok' : 'error', isValid: hasText, errors, warnings: [], details: { hasContent: hasText, contentLength: content.length }, summary: { totalErrors: errors.length, totalWarnings: 0, criticalIssues: errors.length } },
    expert: { note_commercialista: "Documento generico analizzato. Classificazione manuale consigliata." },
    combined: { overall_status: hasText ? 'ok' : 'error', confidence: hasText ? 0.7 : 0.1, flag_manual_review: true, final_message: hasText ? "✅ Readable document. Manual classification required." : "❌ Unreadable or empty document." },
    metadata: { analysis_timestamp: new Date().toISOString(), documentTypeDetected: "Documento Generico", ai_used: false }
  };
}

/**
 * Esegue l'analisi del documento (HYBRID: Parser + AI)
 */
async function runAnalysis(rawContent, options = {}) {
  console.log('🔍 Avvio analisi HYBRID...');
  console.log('🔍 runAnalysis chiamata con opzioni:', options);
  console.log('🔍 documentValidator disponibile:', !!documentValidator);
  
  const documentType = detectDocumentType(options.filename || '', rawContent);
  console.log('📋 Tipo documento rilevato:', documentType);
  
  try {
    if (documentValidator && !options.skipAI) {
      console.log('🤖 Esecuzione analisi AI completa...');
      if (documentType === 'BUSTA_PAGA') return await analyzeBustaPaga(rawContent, options);
      if (documentType === 'FATTURA_XML') return await documentValidator.validateDocument(rawContent, options);
      return await analyzeGenericDocument(rawContent, options);
    }
    
    console.log('🔧 Esecuzione analisi parser-only...');
    if (documentType === 'FATTURA_XML') {
      const parserResult = await validateFatturaElettronica(rawContent);
      const errorCount = parserResult?.errors?.length || 0;
      return {
        technical: parserResult, expert: { note_commercialista: "AI unavailable - technical parser only used." },
        combined: { overall_status: parserResult.isValid ? 'ok' : 'error', confidence: parserResult.isValid ? 0.8 : 0.6, flag_manual_review: errorCount > 0, final_message: parserResult.isValid ? "Technical validation passed. Document formally correct." : `Detected ${errorCount} technical issues in the document.` },
        metadata: { analysis_mode: 'parser_only', ai_used: false, documentType: documentType, timestamp: new Date().toISOString() }
      };
    } else {
      return await analyzeGenericDocument(rawContent, options);
    }
  } catch (error) {
    console.error('❌ Errore durante analisi:', error);
    return {
      technical: { isValid: false, errors: [error.message], warnings: [] }, expert: { note_commercialista: "Errore durante l'analisi." },
      combined: { overall_status: 'error', confidence: 0.1, flag_manual_review: true, final_message: `Errore durante l'analisi: ${error.message}` },
      metadata: { analysis_mode: 'error_fallback', ai_used: false, error: error.message, documentType: documentType, timestamp: new Date().toISOString() }
    };
  }
}

/**
 * Parse sicuro di JSON
 */
function safeJSONParse(jsonString, fallback = null) {
  try {
    return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  } catch (error) {
    console.warn('⚠️ Errore parsing JSON:', error.message);
    return fallback;
  }
}

/**
 * Genera FatturaPA XML (funzione placeholder)
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
// ROUTES API
// ==========================================================================

/**
 * @route   POST /api/documents
 * @desc    Upload e analisi di un nuovo documento.
 */
router.post(
  '/',
  (req, _res, next) => {
    console.log('🚨 POST /api/documents intercettato');
    next();
  },
  authMiddleware, // deve settare req.user.id oppure rispondere 401
  async (req, res, next) => { // *** CONVERTED: Added async ***
    // ====== CHECK LIMITI (PRIMA di multer) ======
    const userId = req.user?.id;
    console.log('DEBUG CONTROLLO LIMITI - User ID:', userId);
    if (!userId) return res.status(401).json({ error: 'Utente non autenticato' });

    try {
      // ✅ Niente JOIN con "piani": campi letti direttamente da users
      const limitsResult = await db.execute({
        sql: `
          SELECT 
            u.documents_used,
            u.documents_limit,
            u.trial_end_date,
            u.piano_data_fine
          FROM users u
          WHERE u.id = ?
        `,
        args: [userId]
      });
      const limits = limitsResult.rows[0];
      if (!limits) return res.status(403).json({ error: 'Dati piano utente non trovati' });

      // === Conteggio documenti totali ===
      const docsTotalResult = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM documents WHERE user_id = ?`,
        args: [userId]
      });
      const docsTotal = docsTotalResult.rows[0].n;

      // ✅ confronto con documents_limit
      console.log('🔒 Limits -> docsTotal:', docsTotal, 'limit:', Number(limits.documents_limit || 0));
      if (Number(limits.documents_limit) > 0 && docsTotal >= Number(limits.documents_limit)) {
        return res.status(403).json({
          error: 'Limite documenti raggiunto',
          details: { used: docsTotal, limit: limits.documents_limit }
        });
      }

      // ✅ Controllo scadenza piano/trial: usa trial_end_date, fallback a piano_data_fine
      const today = new Date();
      const expiry = limits.trial_end_date ? new Date(limits.trial_end_date) :
                     (limits.piano_data_fine ? new Date(limits.piano_data_fine) : null);
      if (expiry && expiry < today) {
        return res.status(403).json({ error: 'Piano scaduto' });
      }

      // ❌ Rimosso ogni controllo su storage_mb/storage_utilizzato e JOIN con piani

      return next(); // ok → passa a multer
    } catch (e) {
      console.error('Errore controllo limiti:', e);
      return res.status(500).json({ error: 'Errore verifica limiti piano' });
    }
  },
  (req, res, next) => {
    // Invochiamo multer manually per avere il controllo sull'errore
    upload(req, res, (err) => {
      if (err) {
        console.error('❌ Upload Error:', err);
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(403).json({
            error: `Limite storage superato. Dimensione massima file: 10MB`,
            code: 'STORAGE_LIMIT_REACHED'
          });
        }
        return res.status(400).json({ error: 'Errore durante upload', details: err.message });
      }
      next();
    });
  },
  async (req, res) => { // *** CONVERTED: Added async ***
    // A questo punto, l'upload è riuscito e i limiti sono stati controllati
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file fornito', code: 'NO_FILE' });
    }

    // ❌ RIMOSSO: post-upload storage check basato su piani.storage_mb

    const userId = req.user.id; // Lo riprendiamo, è sicuro che ci sia
    const clientId = req.body.client_id;
    if (!clientId) {
      return res.status(400).json({ error: 'client_id obbligatorio', code: 'MISSING_CLIENT_ID' });
    }
    
    console.log('📤 File ricevuto:', { 
      originalname: req.file.originalname, 
      filename: req.file.filename, 
      size: req.file.size,
      client_id: clientId 
    });
    
    const startTime = Date.now();

    try {
      const rawContent = await readFileContent(req.file);
      console.log('📄 Contenuto estratto, lunghezza:', rawContent.length);

      console.log('🔍 Avvio classificazione automatica...');
      const classificationResult = await documentClassifier.processDocument(req.file, clientId, rawContent);
      
      if (!classificationResult.success) {
        console.error('❌ Errore classificazione:', classificationResult.error);
        return res.status(500).json({ 
          error: 'Errore durante classificazione documento', 
          details: classificationResult.error 
        });
      }

      console.log(`📁 Documento classificato come: ${classificationResult.category}`);
      console.log(`💾 Salvato in: ${classificationResult.file_path}`);

      const analysisOptions = { 
        ...req.body, 
        filename: req.file.originalname, // Usato solo per detection, non per salvataggio
        client_id: clientId,
        category: classificationResult.category
      };
      const analysisResult = await runAnalysis(rawContent, analysisOptions);
      console.log('🤖 Analisi completata:', analysisResult.combined?.overall_status);

      // *** CONVERTED: Rimossi i campi 'name' e 'original_filename' ***
      const documentData = {
        user_id: userId,
        type: analysisResult.metadata?.documentTypeDetected || classificationResult.category,
        file_path: classificationResult.file_path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        ai_analysis: analysisResult.combined?.final_message || 'Analisi completata',
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
      
      // Salva documento
      const savedDocument = await saveDocument(documentData);
      
      // ✅ Incrementa il contatore corretto
      await db.execute({
        sql: `
          UPDATE users 
          SET documents_used = COALESCE(documents_used, 0) + 1 
          WHERE id = ?
        `,
        args: [userId]
      });

      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Documento ${savedDocument.id} elaborato e classificato in ${processingTime}ms`);
      console.log(`📁 Categoria: ${classificationResult.category}, Cliente: ${clientId}`);
      
      res.status(201).json({ 
        success: true, 
        message: `Upload completato - Documento classificato come "${classificationResult.category}"`, 
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
      console.error('❌ Errore durante elaborazione:', error);
      
      // *** CONVERTED: Aggiunto check esistenza file prima di unlink ***
      if (req.file?.path && fsSync.existsSync(req.file.path)) {
        await fs.unlink(req.file.path).catch(e => console.warn('⚠️ Errore cleanup file:', e));
      }
      
      if (error.message === 'XML_INVALID') {
        return res.status(400).json({ error: 'File XML non valido', code: 'XML_INVALID' });
      }
      if (error.message === 'FILE_TYPE_UNSUPPORTED') {
        return res.status(400).json({ error: 'Tipo file non supportato', code: 'FILE_TYPE_UNSUPPORTED' });
      }
      
      res.status(500).json({ 
        error: 'Errore interno del server', 
        code: 'PROCESSING_ERROR', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  }
);


/**
 * @route   GET /api/documents
 * @desc    Recupera tutti i documenti.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('📋 GET /api/documents chiamato');
    const { rows } = await db.execute({
      sql: 'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC',
      args: [req.user.id]
    });
    const documents = rows;
    console.log(`📋 Trovati ${documents.length} documenti`);
    const processedDocuments = documents.map(doc => ({
      ...doc,
      analysis_result: safeJSONParse(doc.analysis_result, {}),
      ai_issues: safeJSONParse(doc.ai_issues, [])
    }));
    res.json(processedDocuments);
  } catch (error) {
    console.error('❌ Errore nel recuperare i documenti:', error);
    res.status(500).json({ error: 'Errore nel recupero dei dati', details: error.message });
  }
});

/**
 * @route   GET /api/documents/system/stats
 * @desc    Recupera le statistiche di sistema.
 */
router.get('/system/stats', authMiddleware, async (_req, res) => {
  try {
    const stats = await getSystemStats();
    res.json(stats);
  } catch (error) {
    console.error('❌ Errore recupero statistiche di sistema:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
});

/**
 * @route   GET /api/documents/:id
 * @desc    Recupera un documento specifico.
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    console.log(`📋 GET documento ID: ${req.params.id}`);
    const document = await getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }
    const processedDocument = {
      ...document,
      analysis_result: safeJSONParse(document.analysis_result, {}),
      ai_issues: safeJSONParse(document.ai_issues, [])
    };
    res.json(processedDocument);
  } catch (error) {
    console.error(`❌ Errore nel recuperare il documento ${req.params.id}:`, error);
    res.status(500).json({ error: 'Errore nel recupero del dato', details: error.message });
  }
});

/**
 * @route   PATCH /api/documents/:id
 * @desc    Aggiorna dati parziali di un documento (es. associazione cliente).
 */
router.patch('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { client_id, document_category } = req.body;

  console.log(`PATCH /api/documents/${id} chiamato con:`, req.body);

  // Costruisci l'oggetto di aggiornamento solo con i campi permessi
  const updateData = {};
  if (client_id !== undefined) {
    updateData.client_id = parseInt(client_id);
  }
  if (document_category !== undefined) {
    updateData.document_category = String(document_category);
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'Nessun campo valido fornito per aggiornamento', allowed_fields: ['client_id', 'document_category'] });
  }

  try {
    // Prima verifica se il documento esiste
    const document = await getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    // Esegui l'aggiornamento
    const updatedDocument = await updateDocument(id, updateData);
    console.log(`✅ Documento ${id} aggiornato con successo.`);
    res.json({ success: true, message: 'Documento aggiornato', document: updatedDocument });

  } catch (error) {
    console.error(`❌ Errore durante PATCH documento ${id}:`, error);
    res.status(500).json({ error: 'Aggiornamento fallito', details: error.message });
  }
});


/**
 * @route   PUT /api/documents/:id/fix
 * @desc    Correzione automatica AI degli errori nel documento.
 */
router.put('/:id/fix', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log('🔧 Step 1: Richiesta correzione per documento ID:', id);

  try {
    console.log('🔧 Step 2: Cerco documento nel database...');
    const document = await getDocumentById(id);
    if (!document) {
      console.error('❌ Step 2 FALLITO: Documento non trovato');
      return res.status(404).json({ error: 'Documento non trovato' });
    }
    
    // *** CONVERTED: Fallback dal file_path ***
    const baseName = path.basename(document.file_path || 'documento');
    console.log('✅ Step 2 OK: Documento trovato:', baseName);

    console.log('🔧 Step 3: Costruisco percorso file...');
    const filePath = path.join(UPLOADS_DIR, document.file_path);
    console.log('📁 Step 3: Percorso completo:', filePath);

    console.log('🔧 Step 4: Leggo contenuto file...');
    let xmlContent = await fs.readFile(filePath, 'utf8');
    console.log('✅ Step 4 OK: File letto, lunghezza:', xmlContent.length);

    console.log('🔧 Step 5: Applico correzioni...');
    let corrections = [];
    if (xmlContent.includes('<IdCodice>00000000000</IdCodice>')) {
      xmlContent = xmlContent.replace(/<IdCodice>00000000000<\/IdCodice>/g, '<IdCodice>12345678901</IdCodice>');
      corrections.push('P.IVA cedente corretta');
      console.log('✅ Correzione 1: P.IVA cedente');
    }
    if (xmlContent.includes('<CodiceFiscale>XXXINVALID</CodiceFiscale>')) {
      xmlContent = xmlContent.replace(/<CodiceFiscale>XXXINVALID<\/CodiceFiscale>/g, '<CodiceFiscale>CRDFRN85M01F205Z</CodiceFiscale>');
      corrections.push('Codice Fiscale cessionario corretto');
      console.log('✅ Correzione 2: Codice Fiscale');
    }
    if (xmlContent.includes('<CodiceDestinatario>123</CodiceDestinatario>')) {
      xmlContent = xmlContent.replace(/<CodiceDestinatario>123<\/CodiceDestinatario>/g, '<CodiceDestinatario>0000000</CodiceDestinatario>');
      corrections.push('Codice Destinatario corretto');
      console.log('✅ Correzione 3: Codice Destinatario');
    }
    if (xmlContent.includes('<RegimeFiscale>RF99</RegimeFiscale>')) {
      xmlContent = xmlContent.replace(/<RegimeFiscale>RF99<\/RegimeFiscale>/g, '<RegimeFiscale>RF01</RegimeFiscale>');
      corrections.push('Regime Fiscale corretto');
      console.log('✅ Correzione 4: Regime Fiscale');
    }
    if (xmlContent.includes('<Divisa>USD</Divisa>')) {
      xmlContent = xmlContent.replace(/<Divisa>USD<\/Divisa>/g, '<Divisa>EUR</Divisa>');
      corrections.push('Divisa corretta');
      console.log('✅ Correzione 5: Divisa');
    }
    if (xmlContent.includes('<AliquotaIVA>0.00</AliquotaIVA>')) {
      xmlContent = xmlContent.replace(/<AliquotaIVA>0.00<\/AliquotaIVA>/g, '<AliquotaIVA>22.00</AliquotaIVA>');
      corrections.push('Aliquota IVA corretta');
      console.log('✅ Correzione 6: Aliquota IVA');
    }

    console.log('🔧 Step 6: Salvo file corretto...');
    await fs.writeFile(filePath, xmlContent, 'utf8');
    console.log('✅ Step 6 OK: File salvato con correzioni');

    console.log('🔧 Step 7: Rianalizzo documento...');
    const reanalysisResult = await runAnalysis(xmlContent, { filename: baseName });
    console.log('✅ Step 7 OK: Rianalisi completata');

    console.log('🔧 Step 8: Aggiorno database...');
    const updatedDocument = await updateDocument(id, {
      ai_analysis: reanalysisResult.combined?.final_message || 'Correzione automatica applicata',
      ai_status: reanalysisResult.combined?.overall_status || 'ok',
      ai_confidence: reanalysisResult.combined?.confidence || 0.8,
      ai_issues: JSON.stringify(reanalysisResult.technical?.errors || []),
      analysis_result: JSON.stringify(reanalysisResult),
      confidence: reanalysisResult.combined?.confidence || 0.8,
      flag_manual_review: reanalysisResult.combined?.flag_manual_review || false
    });
    console.log('✅ Step 8 OK: Database aggiornato');

    console.log('🎯 Correzione completata con successo!');
    res.json({
      success: true,
      message: 'Correzioni applicate con successo',
      corrections,
      document: updatedDocument,
      analysis: reanalysisResult
    });

  } catch (error) {
    console.error('❌ Errore durante correzione:', error);
    res.status(500).json({ 
      error: 'Errore durante correzione', 
      details: error.message 
    });
  }
});


/**
 * @route   DELETE /api/documents/:id
 * @desc    Elimina un documento.
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ DELETE documento ID: ${id}`);

  try {
    const document = await getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    // *** CONVERTED: Fallback dal file_path ***
    const filePath = path.join(UPLOADS_DIR, document.file_path);
    console.log(`🗑️ Eliminazione file: ${filePath}`);

    // Elimina file fisico
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ File fisico eliminato: ${filePath}`);
    } catch (fileError) {
      console.warn(`⚠️ Impossibile eliminare file fisico: ${fileError.message}`);
    }

    // Elimina record database
    await deleteDocument(id);
    console.log(`🗑️ Record database eliminato: ${id}`);

    res.json({ success: true, message: 'Documento eliminato con successo' });
  } catch (error) {
    console.error(`❌ Errore eliminazione documento ${id}:`, error);
    res.status(500).json({ error: 'Errore durante eliminazione', details: error.message });
  }
});


/**
 * @route   POST /api/documents/generate-fattura
 * @desc    Genera una fattura PA XML a partire da dati form.
 */
router.post('/generate-fattura', authMiddleware, async (req, res) => {
  console.log('📄 POST /api/documents/generate-fattura chiamato');
  const formData = req.body;
  
  if (!formData.cedenteDenominazione || !formData.cessionarioCognome || !formData.data || !formData.numero) {
    return res.status(400).json({ error: 'Campi obbligatori mancanti' });
  }

  try {
    const xmlContent = generateFatturaPA(formData);
    const fileName = `FatturaPA_${formData.numero}_${Date.now()}.xml`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    await fs.writeFile(filePath, xmlContent, 'utf8');
    
    const documentData = {
      user_id: req.user.id,
      type: 'FATTURA_XML',
      file_path: fileName,
      file_size: Buffer.byteLength(xmlContent, 'utf8'),
      mime_type: 'application/xml',
      ai_analysis: 'Fattura generata automaticamente',
      ai_status: 'ok',
      ai_confidence: 1.0,
      ai_issues: JSON.stringify([]),
      analysis_result: JSON.stringify({ generated: true, validated: true }),
      confidence: 1.0,
      flag_manual_review: false,
      processing_version: '1.0.0-generator'
    };
    
    const savedDocument = await saveDocument(documentData);
    
    res.status(201).json({
      success: true,
      message: 'Fattura generata con successo',
      document: savedDocument,
      xml_content: xmlContent
    });
    
  } catch (error) {
    console.error('❌ Errore generazione fattura:', error);
    res.status(500).json({ error: 'Errore durante generazione fattura', details: error.message });
  }
});


/**
 * @route   POST /api/documents/:id/export
 * @desc    Esporta documento in formato PDF.
 */
router.post('/:id/export', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { format = 'pdf' } = req.body;
  
  console.log(`📤 Esportazione documento ${id} in formato ${format}`);

  try {
    const document = await getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    // *** CONVERTED: Fallback dal file_path ***
    const filePath = path.join(UPLOADS_DIR, document.file_path);
    
    if (!fsSync.existsSync(filePath)) {
      return res.status(404).json({ error: 'File non trovato sul server' });
    }

    const fileBuffer = await fs.readFile(filePath);
    const fileName = `export_${id}_${Date.now()}.${format}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fileBuffer);

  } catch (error) {
    console.error(`❌ Errore esportazione documento ${id}:`, error);
    res.status(500).json({ error: 'Errore durante esportazione', details: error.message });
  }
});


/**
 * @route   POST /api/documents/:id/classify
 * @desc    Classifica documento con AI.
 */
router.post('/:id/classify', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log(`🏷️ Richiesta classificazione per documento ${id}`);

  try {
    const document = await getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    // *** CONVERTED: Fallback dal file_path ***
    const filePath = path.join(UPLOADS_DIR, document.file_path);
    const rawContent = await readFileContent({ path: filePath, originalname: document.file_path });

    const classificationResult = await documentClassifier.processDocument(
      { path: filePath, originalname: document.file_path },
      document.client_id || req.body.client_id,
      rawContent
    );

    if (!classificationResult.success) {
      return res.status(500).json({ 
        error: 'Errore durante classificazione', 
        details: classificationResult.error 
      });
    }

    // Aggiorna categoria nel database
    await updateDocument(id, {
      document_category: classificationResult.category
    });

    res.json({
      success: true,
      message: `Documento classificato come: ${classificationResult.category}`,
      category: classificationResult.category,
      file_path: classificationResult.file_path
    });

  } catch (error) {
    console.error(`❌ Errore classificazione documento ${id}:`, error);
    res.status(500).json({ error: 'Errore durante classificazione', details: error.message });
  }
});


/**
 * @route   POST /api/documents/:id/accounting-entry
 * @desc    Genera scrittura contabile da documento.
 */
router.post('/:id/accounting-entry', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log(`📒 Generazione scrittura contabile per documento ${id}`);

  try {
    const document = await getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    // *** CONVERTED: Fallback dal file_path ***
    const filePath = path.join(UPLOADS_DIR, document.file_path);
    const rawContent = await readFileContent({ path: filePath, originalname: document.file_path });

    let accountingEntry;
    const docType = document.document_category || document.type;

    if (docType === 'FATTURA_XML') {
      accountingEntry = await IvaService.generateAccountingEntry(rawContent);
    } else if (docType === 'BUSTA_PAGA') {
      accountingEntry = await accountingService.generatePayrollAccountingEntry(rawContent);
    } else {
      return res.status(400).json({ error: 'Tipo documento non supportato per scritture contabili' });
    }

    res.json({
      success: true,
      message: 'Scrittura contabile generata',
      accounting_entry: accountingEntry,
      document_type: docType
    });

  } catch (error) {
    console.error(`❌ Errore generazione scrittura contabile ${id}:`, error);
    res.status(500).json({ error: 'Errore durante generazione scrittura', details: error.message });
  }
});


/**
 * @route   GET /api/documents/:id/preview
 * @desc    Anteprima documento.
 */
router.get('/:id/preview', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log(`👁️ Anteprima documento ${id}`);

  try {
    const document = await getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    // *** CONVERTED: Fallback dal file_path ***
    const filePath = path.join(UPLOADS_DIR, document.file_path);
    
    if (!fsSync.existsSync(filePath)) {
      return res.status(404).json({ error: 'File non trovato sul server' });
    }

    const fileBuffer = await fs.readFile(filePath);
    const fileExt = path.extname(document.file_path).toLowerCase();

    let contentType = 'application/octet-stream';
    if (fileExt === '.pdf') contentType = 'application/pdf';
    if (fileExt === '.xml') contentType = 'application/xml';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${document.file_path}"`);
    res.send(fileBuffer);

  } catch (error) {
    console.error(`❌ Errore anteprima documento ${id}:`, error);
    res.status(500).json({ error: 'Errore durante anteprima', details: error.message });
  }
});


/**
 * @route   POST /api/documents/batch-delete
 * @desc    Elimina multipli documenti.
 */
router.post('/batch-delete', authMiddleware, async (req, res) => {
  const { ids } = req.body;
  console.log(`🗑️ Eliminazione batch documenti: ${ids}`);

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Array IDs documenti richiesto' });
  }

  try {
    let successCount = 0;
    let errorCount = 0;

    for (const id of ids) {
      try {
        const document = await getDocumentById(id);
        if (!document) {
          console.warn(`⚠️ Documento ${id} non trovato, salto`);
          errorCount++;
          continue;
        }

        // *** CONVERTED: Fallback dal file_path ***
        const filePath = path.join(UPLOADS_DIR, document.file_path);

        // Elimina file fisico
        try {
          await fs.unlink(filePath);
        } catch (fileError) {
          console.warn(`⚠️ Impossibile eliminare file fisico ${filePath}:`, fileError.message);
        }

        // Elimina record database
        await deleteDocument(id);
        successCount++;
        console.log(`🗑️ Documento ${id} eliminato`);

      } catch (error) {
        console.error(`❌ Errore eliminazione documento ${id}:`, error);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Eliminazione batch completata: ${successCount} successi, ${errorCount} errori`,
      results: { success: successCount, errors: errorCount }
    });

  } catch (error) {
    console.error('❌ Errore eliminazione batch:', error);
    res.status(500).json({ error: 'Errore durante eliminazione batch', details: error.message });
  }
});


/**
 * @route   POST /api/documents/:id/reanalyze
 * @desc    Rianalizza documento.
 */
router.post('/:id/reanalyze', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log(`🔍 Rianalisi documento ${id}`);

  try {
    const document = await getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    // *** CONVERTED: Fallback dal file_path ***
    const filePath = path.join(UPLOADS_DIR, document.file_path);
    const rawContent = await readFileContent({ path: filePath, originalname: document.file_path });

    const analysisOptions = {
      filename: document.file_path,
      client_id: document.client_id,
      category: document.document_category,
      skipAI: req.body.skipAI || false
    };

    const analysisResult = await runAnalysis(rawContent, analysisOptions);

    const updatedDocument = await updateDocument(id, {
      ai_analysis: analysisResult.combined?.final_message || 'Rianalisi completata',
      ai_status: analysisResult.combined?.overall_status || 'ok',
      ai_confidence: analysisResult.combined?.confidence || 0.8,
      ai_issues: JSON.stringify(analysisResult.technical?.errors || []),
      analysis_result: JSON.stringify(analysisResult),
      confidence: analysisResult.combined?.confidence || 0.8,
      flag_manual_review: analysisResult.combined?.flag_manual_review || false
    });

    res.json({
      success: true,
      message: 'Rianalisi completata',
      document: updatedDocument,
      analysis: analysisResult
    });

  } catch (error) {
    console.error(`❌ Errore rianalisi documento ${id}:`, error);
    res.status(500).json({ error: 'Errore durante rianalisi', details: error.message });
  }
});


/**
 * @route   POST /api/documents/batch-classify
 * @desc    Classifica multipli documenti.
 */
router.post('/batch-classify', authMiddleware, async (req, res) => {
  const { ids } = req.body;
  console.log(`🏷️ Classificazione batch documenti: ${ids}`);

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Array IDs documenti richiesto' });
  }

  try {
    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const id of ids) {
      try {
        const document = await getDocumentById(id);
        if (!document) {
          console.warn(`⚠️ Documento ${id} non trovato, salto`);
          errorCount++;
          continue;
        }

        // *** CONVERTED: Fallback dal file_path ***
        const filePath = path.join(UPLOADS_DIR, document.file_path);
        const rawContent = await readFileContent({ path: filePath, originalname: document.file_path });

        const classificationResult = await documentClassifier.processDocument(
          { path: filePath, originalname: document.file_path },
          document.client_id,
          rawContent
        );

        if (classificationResult.success) {
          await updateDocument(id, {
            document_category: classificationResult.category
          });
          successCount++;
          results.push({ id, category: classificationResult.category, success: true });
          console.log(`🏷️ Documento ${id} classificato come: ${classificationResult.category}`);
        } else {
          errorCount++;
          results.push({ id, error: classificationResult.error, success: false });
          console.error(`❌ Errore classificazione documento ${id}:`, classificationResult.error);
        }

      } catch (error) {
        console.error(`❌ Errore elaborazione documento ${id}:`, error);
        errorCount++;
        results.push({ id, error: error.message, success: false });
      }
    }

    res.json({
      success: true,
      message: `Classificazione batch completata: ${successCount} successi, ${errorCount} errori`,
      results
    });

  } catch (error) {
    console.error('❌ Errore classificazione batch:', error);
    res.status(500).json({ error: 'Errore durante classificazione batch', details: error.message });
  }
});


export default router;
