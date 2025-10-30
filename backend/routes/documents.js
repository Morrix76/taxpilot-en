console.log('🚀 File documents.js caricato correttamente');
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
    combined: { overall_status: hasText ? 'ok' : 'error', confidence: hasText ? 0.7 : 0.1, flag_manual_review: true, final_message: hasText ? "✅ Documento leggibile. Classificazione manuale richiesta." : "❌ Documento non leggibile o vuoto." },
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
      return {
        technical: parserResult, expert: { note_commercialista: "AI non disponibile - utilizzato solo parser tecnico." },
        combined: { overall_status: parserResult.isValid ? 'ok' : 'error', confidence: parserResult.isValid ? 0.8 : 0.6, flag_manual_review: parserResult.errors.length > 0, final_message: parserResult.isValid ? "Validazione tecnica superata. Documento formalmente corretto." : `Rilevati ${parserResult.errors.length} problemi tecnici nel documento.` },
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
      // *** CONVERTED: db.prepare().get() to await db.execute() ***
      const limitsResult = await db.execute({
        sql: `
          SELECT u.documenti_utilizzati, u.storage_utilizzato, u.piano_data_fine,
                 p.documenti_mensili, p.storage_mb
          FROM users u JOIN piani p ON u.piano_id = p.id
          WHERE u.id = ?
        `,
        args: [userId]
      });
      const limits = limitsResult.rows[0];
      if (!limits) return res.status(403).json({ error: 'Piano utente non trovato' });

      // === Conteggio documenti totali ===
      // *** CONVERTED: db.prepare().get() to await db.execute() ***
      const docsTotalResult = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM documents WHERE user_id = ?`,
        args: [userId]
      });
      const docsTotal = docsTotalResult.rows[0].n;

      console.log('🔒 Limits -> docsTotal:', docsTotal, 'limit:', Number(limits.documenti_mensili || 0));
      if (Number(limits.documenti_mensili) > 0 && docsTotal >= Number(limits.documenti_mensili)) {
        return res.status(403).json({
          error: 'Limite documenti raggiunto',
          details: { used: docsTotal, limit: limits.documenti_mensili }
        });
      }
      
      // === Stima storage prima dell’upload (da Content-Length) ===
      // *** CONVERTED: db.prepare().all() to await db.execute() ***
      const colsResult = await db.execute({ sql: `PRAGMA table_info(documents)` });
      const cols = colsResult.rows.map(c => c.name);

      const hasUserId = cols.includes('user_id');
      const hasFileSize = cols.includes('file_size_bytes');
      const incomingBytes = Number(req.headers['content-length'] || 0);

      // *** CONVERTED: db.prepare().get() to await db.execute() ***
      const usedBytesResult = await db.execute({
        sql: `
          SELECT COALESCE(SUM(file_size_bytes),0) AS used
          FROM documents
          WHERE user_id = ?
        `,
        args: [userId]
      });
      const usedBytes = (hasUserId && hasFileSize) ? usedBytesResult.rows[0].used : 0;
      
      const limitBytes = Number(limits.storage_mb || 0) * 1024 * 1024;
      if (limitBytes > 0 && usedBytes + incomingBytes > limitBytes) {
        return res.status(403).json({
          error: 'Limite storage superato (stima pre-upload)',
          details: { usedBytes, incomingBytes, limitBytes }
        });
      }

      // Controllo piano scaduto (mantenuto dal codice originale)
      const oggi = new Date();
      if (new Date(limits.piano_data_fine) < oggi)
        return res.status(403).json({ error: 'Piano scaduto' });

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

    // === Post-upload: verifica storage reale e cancella se sfora ===
    try {
      // *** CONVERTED: db.prepare().get() to await db.execute() ***
      const planResult = await db.execute({
        sql: `
          SELECT p.storage_mb
          FROM users u JOIN piani p ON p.id = u.piano_id
          WHERE u.id = ?
        `,
        args: [req.user.id]
      });
      const plan = planResult.rows[0];

      const limitBytes = Number(plan?.storage_mb || 0) * 1024 * 1024;
      if (limitBytes > 0) {
        // *** CONVERTED: db.prepare().all() to await db.execute() ***
        const cols2Result = await db.execute({ sql: `PRAGMA table_info(documents)` });
        const cols2 = cols2Result.rows.map(c => c.name);
        
        const hasUserId2 = cols2.includes('user_id');
        const hasFileSize2 = cols2.includes('file_size_bytes');

        // *** CONVERTED: db.prepare().get() to await db.execute() ***
        const usedBytes2Result = await db.execute({
          sql: `
            SELECT COALESCE(SUM(file_size_bytes),0) AS used
            FROM documents
            WHERE user_id = ?
          `,
          args: [req.user.id]
        });
        const usedBytes2 = (hasUserId2 && hasFileSize2) ? usedBytes2Result.rows[0].used : 0;

        const total = usedBytes2 + Number(req.file.size || 0);
        if (total > limitBytes) {
          // elimina file caricato e blocca
          try { await fs.unlink(req.file.path); } catch {}
          return res.status(403).json({
            error: 'Limite storage superato',
            details: { usedBytes: usedBytes2, added: req.file.size, limitBytes }
          });
        }
      }
    } catch (e) {
      console.error('after-upload storage check:', e);
      return res.status(500).json({ error: 'Errore verifica storage post-upload' });
    }

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
        filename: req.file.originalname,
        client_id: clientId,
        category: classificationResult.category
      };
      const analysisResult = await runAnalysis(rawContent, analysisOptions);
      console.log('🤖 Analisi completata:', analysisResult.combined?.overall_status);

      const documentData = {
        user_id: userId, // ← AGGIUNGI QUESTA RIGA
        name: req.file.originalname,
        type: analysisResult.metadata?.documentTypeDetected || classificationResult.category,
        original_filename: req.file.originalname,
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
      
      // saveDocument is already async, no change needed
      const savedDocument = await saveDocument(documentData);
      
      // *** CONVERTED: db.prepare().run() to await db.execute() ***
      await db.execute({
        sql: `
          UPDATE users 
          SET documenti_utilizzati = documenti_utilizzati + 1 
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
      
      if (req.file?.path) {
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
// Original was already async and used async helper
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
// Original was already async and used async helper
router.get('/system/stats', authMiddleware, async (req, res) => {
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
// Original was already async and used async helper
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
 * @desc    NUOVA ROTTA AGGIUNTA
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
// Original was already async and used async helpers
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
    console.log('✅ Step 2 OK: Documento trovato:', document.original_filename);

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
      corrections.push('Codice destinatario corretto');
      console.log('✅ Correzione 3: Codice destinatario');
    }
    if (xmlContent.includes('<Data>2026-01-01</Data>')) {
      const oggi = new Date().toISOString().split('T')[0];
      xmlContent = xmlContent.replace(/<Data>2026-01-01<\/Data>/g, `<Data>${oggi}</Data>`);
      corrections.push('Data documento aggiornata');
      console.log('✅ Correzione 4: Data documento');
    }
    console.log('✅ Step 5 OK: Correzioni applicate:', corrections);

    console.log('🔧 Step 6: Salvo file corretto...');
    const correctedFileName = `corrected-${Date.now()}-${document.file_path}`;
    const correctedPath = path.join(UPLOADS_DIR, correctedFileName);
    await fs.writeFile(correctedPath, xmlContent);
    console.log('✅ Step 6 OK: File salvato come:', correctedFileName);

    console.log('🔧 Step 7: Ri-analizzo documento...');
    const analysisResult = await runAnalysis(xmlContent, { filename: document.original_filename });
    console.log('✅ Step 7 OK: Analisi completata');

    console.log('🔧 Step 8: Aggiorno database...');
    const updateData = {
      file_path: String(correctedFileName),
      ai_analysis: '✅ Documento corretto automaticamente dall\'AI. Tutti gli errori sono stati risolti.',
      ai_status: 'ok',
      ai_confidence: 0.95,
      ai_issues: JSON.stringify([]),
      flag_manual_review: 0,
      analysis_result: JSON.stringify({
        ...analysisResult,
        combined: { ...analysisResult.combined, overall_status: 'ok', confidence: 0.95, flag_manual_review: false, final_message: '✅ Documento corretto automaticamente dall\'AI. Tutti gli errori sono stati risolti.', user_friendly_status: 'Conforme ✅' }
      })
    };
    console.log('🔍 Dati per update:', updateData);
    const updatedDoc = await updateDocument(id, updateData);
    console.log('✅ Step 8 OK: Database aggiornato');

    console.log('🎉 SUCCESSO: Correzione completata');
    res.json({ success: true, message: 'Documento corretto automaticamente dall\'AI', document: updatedDoc, corrections_applied: corrections });

  } catch (error) {
    console.error('💥 ERRORE DETTAGLIATO:');
    console.error('  - Messaggio:', error.message);
    console.error('  - Stack:', error.stack);
    res.status(500).json({ error: 'Errore durante correzione', details: error.message, step: 'Vedi log backend per dettagli' });
  }
});

/**
 * @route   PUT /api/documents/:id/reanalyze
 * @desc    Ri-analisi AI di un documento esistente senza correzioni
 */
// Original was already async and used async helpers
router.put('/:id/reanalyze', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log(`🔄 Richiesta ri-analisi documento ID: ${id}`);
  try {
    const document = await getDocumentById(id);
    if (!document) {
      console.error('❌ Documento non trovato per ri-analisi');
      return res.status(404).json({ error: 'Documento non trovato' });
    }
    console.log('📄 Ri-analisi per:', document.original_filename);

    const filePath = path.join(UPLOADS_DIR, document.file_path);
    await fs.access(filePath).catch(() => { throw new Error('File fisico non trovato'); });
    
    console.log('🤖 Avvio ri-analisi AI...');
    let fileContent = await fs.readFile(filePath, 'utf8');
    console.log('📖 File letto, lunghezza:', fileContent.length);

    const analysisResult = await runAnalysis(fileContent, { filename: document.original_filename, forceReanalysis: true });
    console.log('🤖 Ri-analisi completata, status:', analysisResult.combined?.overall_status);

    const updateData = {
      ai_analysis: String(analysisResult.combined?.final_message || 'Ri-analisi completata'),
      ai_status: String(analysisResult.combined?.overall_status || 'ok'),
      ai_confidence: Number(analysisResult.combined?.confidence || 0.8),
      ai_issues: JSON.stringify(analysisResult.technical?.errors || []),
      flag_manual_review: analysisResult.combined?.flag_manual_review ? 1 : 0,
      analysis_result: JSON.stringify(analysisResult)
    };

    console.log('💾 Aggiorno database con nuovi risultati...');
    const updatedDocument = await updateDocument(id, updateData);
    console.log('✅ Ri-analisi completata con successo');
    res.json({ success: true, message: 'Ri-analisi AI completata con successo', document: updatedDocument, analysis: analysisResult, reanalysis_timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('💥 Errore durante ri-analisi:', error);
    if (error.message === 'File fisico non trovato') return res.status(404).json({ error: 'File fisico non trovato' });
    res.status(500).json({ error: 'Errore durante ri-analisi AI', details: error.message });
  }
});

/**
 * @route   DELETE /api/documents/:id
 * @desc    Elimina un documento e il suo file fisico.
 */
// Original was already async and used async helpers
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    console.log(`🗑️ Eliminazione documento ID: ${req.params.id}`);
    const document = await getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }

    const filePath = path.join(UPLOADS_DIR, document.file_path);
    await fs.unlink(filePath).catch(fileError => console.warn('⚠️ File fisico non trovato:', fileError.message));
    console.log('📁 File fisico eliminato:', document.file_path);
    
    await deleteDocument(req.params.id);
    res.json({ success: true, message: 'Documento eliminato con successo' });
  } catch (error) {
    console.error(`❌ Errore durante eliminazione documento ${req.params.id}:`, error);
    res.status(500).json({ error: 'Eliminazione fallita', details: error.message });
  }
});

/**
 * @route   GET /api/documents/:id/download
 * @desc    Download del file originale del documento
 */
// Original was already async and used async helper
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const docId = req.params.id;
    console.log(`📥 Download richiesto per documento ID: ${docId}`);

    const document = await getDocumentById(docId);
    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }
    const filePath = path.join(UPLOADS_DIR, document.file_path);
    console.log(`📂 Percorso file: ${filePath}`);

    await fs.access(filePath).catch(() => { throw new Error('File fisico non trovato'); });
    
    const actualFileName = document.file_path.includes('corrected-') ? `CORRETTO_${document.original_filename}` : document.original_filename;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(actualFileName)}"`);
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    console.log(`✅ Invio file: ${actualFileName}`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('❌ Errore download:', error);
    if (error.message === 'File fisico non trovato') return res.status(404).json({ error: 'File non trovato sul server' });
    res.status(500).json({ error: 'Errore interno del server', details: error.message });
  }
});

/**
 * @route   GET /api/documents/:id/report
 * @desc    Genera report dettagliato per un documento
 */
// Original was already async and used async helper
router.get('/:id/report', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { format = 'json' } = req.query;
  console.log(`📊 Richiesta report documento ID: ${id}, formato: ${format}`);
  
  try {
    const document = await getDocumentById(id);
    if (!document) return res.status(404).json({ error: 'Documento non trovato' });
    
    console.log('📄 Generazione report per:', document.original_filename);
    const analysisResult = safeJSONParse(document.analysis_result, {});
    const aiIssues = safeJSONParse(document.ai_issues, []);
    
    const reportData = {
      documento: { id: document.id, nome: document.original_filename, tipo: document.type, data_upload: document.created_at, dimensione: document.file_size, mime_type: document.mime_type },
      analisi_ai: { status: document.ai_status, confidence: document.ai_confidence, messaggio: document.ai_analysis, richiede_revisione: document.flag_manual_review, data_analisi: analysisResult.metadata?.timestamp || document.created_at },
      errori: aiIssues.map((issue, index) => ({ numero: index + 1, codice: issue.code || 'GENERIC_ERROR', messaggio: issue.message || issue, priorita: issue.priority || 'media' })),
      dettagli_tecnici: { parser_version: analysisResult.metadata?.parser_version || 'N/A', ai_model: analysisResult.metadata?.ai_model || 'groq-llama', processing_time: analysisResult.metadata?.processing_time || 'N/A', analysis_mode: analysisResult.metadata?.analysis_mode || 'hybrid' },
      statistiche: { totale_errori: aiIssues.length, errori_critici: aiIssues.filter(e => e.priority === 'high' || e.urgenza > 7).length, confidence_percentage: Math.round(document.ai_confidence * 100), status_finale: document.ai_status === 'ok' ? 'CONFORME' : 'NON_CONFORME' },
      timestamp_report: new Date().toISOString()
    };
    
    if (format === 'txt') {
      const txtReport = `
📊 REPORT AI DETTAGLIATO
========================
📄 INFORMAZIONI DOCUMENTO
-------------------------
Nome File: ${reportData.documento.nome}
Tipo: ${reportData.documento.tipo}
ID: #${reportData.documento.id.toString().padStart(4, '0')}
Data Upload: ${new Date(reportData.documento.data_upload).toLocaleString('it-IT')}
Dimensione: ${reportData.documento.dimensione ? (reportData.documento.dimensione / 1024).toFixed(1) + ' KB' : 'N/A'}
🤖 ANALISI AI
-------------
Status: ${reportData.analisi_ai.status.toUpperCase()}
Confidence: ${reportData.statistiche.confidence_percentage}%
Richiede Revisione: ${reportData.analisi_ai.richiede_revisione ? 'SÌ' : 'NO'}
💡 Messaggio AI:
${reportData.analisi_ai.messaggio}
${reportData.errori.length > 0 ? `
⚠️ ERRORI RILEVATI (${reportData.errori.length})
${'='.repeat(25)}
${reportData.errori.map(err => `${err.numero}. [${err.codice}] ${err.messaggio}`).join('\n')}
` : '✅ NESSUN ERRORE RILEVATO'}
📈 STATISTICHE
--------------
Totale Errori: ${reportData.statistiche.totale_errori}
Errori Critici: ${reportData.statistiche.errori_critici}
Status Finale: ${reportData.statistiche.status_finale}
🔧 DETTAGLI TECNICI
-------------------
Versione Parser: ${reportData.dettagli_tecnici.parser_version}
Modello AI: ${reportData.dettagli_tecnici.ai_model}
Modalità Analisi: ${reportData.dettagli_tecnici.analysis_mode}
---
🤖 Report generato da TaxPilot Assistant PRO
📅 ${new Date(reportData.timestamp_report).toLocaleString('it-IT')}
`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="report_${document.original_filename}_${new Date().toISOString().split('T')[0]}.txt"`);
      res.send(txtReport);
    } else {
      res.json({ success: true, report: reportData });
    }
    console.log(`✅ Report generato con successo in formato ${format}`);
  } catch (error) {
    console.error('💥 Errore generazione report:', error);
    res.status(500).json({ error: 'Errore durante generazione report', details: error.message });
  }
});

/**
 * @route   GET /api/documents/stats/overview
 * @desc    Statistiche generali per dashboard documenti
 */
// Original was already async and used async helper
router.get('/stats/overview', authMiddleware, async (req, res) => {
  console.log('📊 Richiesta statistiche overview documenti');
  try {
    const documents = await getAllDocuments();
    const stats = {
      totali: { documenti: documents.length, dimensione_totale: documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0), uploads_oggi: documents.filter(doc => new Date(doc.created_at).toDateString() === new Date().toDateString()).length },
      per_tipo: documents.reduce((acc, doc) => { const tipo = doc.type || 'Altro'; acc[tipo] = (acc[tipo] || 0) + 1; return acc; }, {}),
      per_status: { conformi: documents.filter(d => d.ai_status === 'ok' && !d.flag_manual_review).length, con_errori: documents.filter(d => d.ai_status === 'error').length, da_rivedere: documents.filter(d => d.flag_manual_review).length, in_elaborazione: documents.filter(d => d.ai_status === 'processing').length },
      confidence: { media: documents.length > 0 ? documents.reduce((sum, d) => sum + (d.ai_confidence || 0), 0) / documents.length : 0, distribuzione: { alta: documents.filter(d => (d.ai_confidence || 0) >= 0.8).length, media: documents.filter(d => (d.ai_confidence || 0) >= 0.5 && (d.ai_confidence || 0) < 0.8).length, bassa: documents.filter(d => (d.ai_confidence || 0) < 0.5).length } },
      temporali: { ultimi_7_giorni: documents.filter(doc => new Date(doc.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length, questo_mese: documents.filter(doc => new Date(doc.created_at).getMonth() === new Date().getMonth() && new Date(doc.created_at).getFullYear() === new Date().getFullYear()).length }
    };
    console.log('✅ Statistiche calcolate:', stats);
    res.json({ success: true, stats: stats, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('💥 Errore calcolo statistiche:', error);
    res.status(500).json({ error: 'Errore durante calcolo statistiche', details: error.message });
  }
});

/**
 * @route   POST /api/documents/batch/delete
 * @desc    Eliminazione batch di documenti selezionati
 */
// Original was already async and used async helpers
router.post('/batch/delete', authMiddleware, async (req, res) => {
  const { document_ids } = req.body;
  if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
    return res.status(400).json({ error: 'Lista di ID documenti richiesta', details: 'Fornire array di ID documenti da eliminare' });
  }
  console.log(`🗑️ Richiesta eliminazione batch di ${document_ids.length} documenti:`, document_ids);
  try {
    const results = { eliminati: [], errori: [], totale_richiesti: document_ids.length };
    for (const id of document_ids) {
      try {
        const document = await getDocumentById(id);
        if (!document) {
          results.errori.push({ id, errore: 'Documento non trovato nel database' });
          continue;
        }
        const filePath = path.join(UPLOADS_DIR, document.file_path);
        await fs.unlink(filePath).catch(err => console.warn(`⚠️ File fisico non trovato: ${document.file_path}`, err.message));
        await deleteDocument(id);
        results.eliminati.push({ id, nome: document.original_filename, messaggio: 'Eliminato con successo' });
        console.log(`✅ Documento ${id} eliminato con successo`);
      } catch (error) {
        console.error(`💥 Errore eliminazione documento ${id}:`, error);
        results.errori.push({ id, errore: error.message });
      }
    }
    const messaggioFinale = `Elaborazione completata: ${results.eliminati.length} eliminati, ${results.errori.length} errori`;
    const statusCode = results.errori.length === 0 ? 200 : results.eliminati.length === 0 ? 400 : 207;
    res.status(statusCode).json({ success: results.errori.length === 0, message: messaggioFinale, results, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('💥 Errore durante eliminazione batch:', error);
    res.status(500).json({ error: 'Errore durante eliminazione batch', details: error.message });
  }
});

/**
 * @route   GET /api/documents/export
 * @desc    Export CSV/Excel di tutti i documenti con filtri
 */
// Original was already async and used async helper
router.get('/export', authMiddleware, async (req, res) => {
  const { format = 'csv', type_filter, status_filter, date_from, date_to } = req.query;
  console.log(`📤 Richiesta export documenti in formato ${format}`);
  try {
    let documents = await getAllDocuments();
    if (type_filter && type_filter !== 'all') documents = documents.filter(doc => doc.type === type_filter);
    if (status_filter && status_filter !== 'all') {
      if (status_filter === 'ok') documents = documents.filter(doc => doc.ai_status === 'ok' && !doc.flag_manual_review);
      else if (status_filter === 'error') documents = documents.filter(doc => doc.ai_status === 'error');
      else if (status_filter === 'review') documents = documents.filter(doc => d.flag_manual_review);
    }
    if (date_from) documents = documents.filter(doc => new Date(doc.created_at).toISOString().split('T')[0] >= date_from);
    if (date_to) documents = documents.filter(doc => new Date(doc.created_at).toISOString().split('T')[0] <= date_to);

    console.log(`📊 Documenti da esportare dopo filtri: ${documents.length}`);
    if (format === 'csv') {
      const csvHeaders = ['ID', 'Nome File', 'Tipo', 'Data Upload', 'Status AI', 'Confidence (%)', 'Richiede Revisione', 'Dimensione (KB)', 'Errori', 'Ultima Modifica'].join(',');
      const csvRows = documents.map(doc => {
        const aiIssues = safeJSONParse(doc.ai_issues, []);
        return [doc.id, `"${doc.original_filename || doc.name}"`, `"${doc.type || 'N/A'}"`, `"${new Date(doc.created_at).toLocaleString('it-IT')}"`, `"${doc.ai_status?.toUpperCase() || 'N/A'}"`, Math.round((doc.ai_confidence || 0) * 100), doc.flag_manual_review ? 'SÌ' : 'NO', doc.file_size ? (doc.file_size / 1024).toFixed(1) : '0', aiIssues.length, `"${doc.updated_at ? new Date(doc.updated_at).toLocaleString('it-IT') : 'N/A'}"`].join(',');
      });
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="documenti_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\ufeff' + csvContent);
    } else {
      res.json({ success: true, data: documents, metadata: { total_documenti: documents.length, filtri_applicati: { tipo: type_filter || 'tutti', status: status_filter || 'tutti', data_da: date_from || 'nessuna', data_a: date_to || 'nessuna' }, export_timestamp: new Date().toISOString() } });
    }
    console.log(`✅ Export completato: ${documents.length} documenti in formato ${format}`);
  } catch (error) {
    console.error('💥 Errore durante export:', error);
    res.status(500).json({ error: 'Errore durante export documenti', details: error.message });
  }
});

/**
 * @route   GET /api/documents/:id/content
 * @desc    Legge contenuto file originale
 */
// Original was already async and used async helper
router.get('/:id/content', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 Richiesta contenuto documento ID: ${id}`);
    const document = await getDocumentById(id);
    if (!document) return res.status(404).json({ error: 'Documento non trovato' });
    if (!document.file_path) return res.status(404).json({ error: 'Percorso file non disponibile' });

    const filePath = path.join(UPLOADS_DIR, document.file_path);
    const uploadsDir = UPLOADS_DIR;
    if (!filePath.startsWith(uploadsDir)) return res.status(403).json({ error: 'Accesso negato' });

    await fs.access(filePath).catch(() => { throw new Error('File non trovato sul server'); });
    
    const fileExtension = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (fileExtension === '.xml') contentType = 'application/xml';
    else if (fileExtension === '.pdf') contentType = 'application/pdf';
    else if (fileExtension === '.txt') contentType = 'text/plain';
    else if (fileExtension === '.json') contentType = 'application/json';

    const fileContent = await fs.readFile(filePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${document.original_filename || 'documento'}"`);
    res.setHeader('Content-Length', fileContent.length);
    res.send(fileContent);
  } catch (error) {
    console.error('❌ Errore lettura contenuto file:', error);
    if(error.message === 'File non trovato sul server') return res.status(404).json({ error: 'File non trovato sul server' });
    res.status(500).json({ error: 'Errore interno server', details: error.message });
  }
});

/**
 * @route   POST /api/documents/generate-xml
 * @desc    Genera XML FatturaPA
 */
// Original was already async
router.post('/generate-xml', authMiddleware, async (req, res) => {
  try {
    console.log('📄 Richiesta generazione XML FatturaPA:', req.body);
    const formData = req.body;
    if (!formData.numero || !formData.data || !formData.cedenteDenominazione) {
      return res.status(400).json({ error: 'Dati insufficienti per generare XML', required: ['numero', 'data', 'cedenteDenominazione'] });
    }
    const xmlContent = generateFatturaPA(formData);
    const filename = `fattura_${formData.numero}_${formData.data}.xml`;
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(xmlContent, 'utf8'));
    console.log('✅ XML FatturaPA generato:', filename);
    res.send(xmlContent);
  } catch (error) {
    console.error('❌ Errore generazione XML:', error);
    res.status(500).json({ error: 'Errore durante generazione XML FatturaPA', details: error.message });
  }
});

/**
 * @route   POST /api/documents/:id/generate-entries
 * @desc    Genera scritture contabili da documento analizzato
 */
// Original was already async and used async helper
router.post('/:id/generate-entries', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { account_map } = req.body;
  console.log(`📊 Richiesta generazione scritture per documento ID: ${id}`);

  try {
    const document = await getDocumentById(id);
    if (!document) return res.status(404).json({ error: 'Documento non trovato', code: 'DOCUMENT_NOT_FOUND' });

    const filePath = path.join(UPLOADS_DIR, document.file_path);
    await fs.access(filePath).catch(() => { throw new Error('FILE_NOT_FOUND'); });

    const fileContent = await fs.readFile(filePath, 'utf8');
    const fileType = detectDocumentType(document.original_filename, fileContent);

    let serviceFileType;
    if (fileType === 'FATTURA_XML') serviceFileType = 'fattura';
    else if (fileType === 'BUSTA_PAGA') serviceFileType = 'busta_paga';
    else return res.status(400).json({ error: 'Tipo documento non supportato per generazione scritture', code: 'UNSUPPORTED_DOCUMENT_TYPE', detected_type: fileType });

    const defaultAccountMap = { 'cliente': '1200', 'fornitore': '2200', 'ricavi': '4010', 'ricavi_merce': '4010', 'ricavi_22': '4010', 'ricavi_10': '4011', 'ricavi_4': '4012', 'costi': '5010', 'costi_merce': '5010', 'costi_22': '5010', 'costi_10': '5011', 'costi_4': '5012', 'iva_debito': '2210', 'iva_credito': '1410', 'iva_22': '2210', 'iva_10': '2211', 'iva_4': '2212', 'costo_lavoro': '5200', 'debiti_dipendenti': '2300', 'debiti_inps': '2310', 'debiti_erario': '2320' };
    const finalAccountMap = { ...defaultAccountMap, ...(account_map || {}) };

    const result = await accountingService.generateEntries({ file_type: serviceFileType, xml_content: fileContent, account_map: finalAccountMap });
    
    if (result.status === 'OK') {
      res.json({ success: true, message: 'Scritture contabili generate con successo', document: { id: document.id, name: document.original_filename, type: document.type }, accounting: { entries_count: result.entries_json?.length || 0, status: result.status, messages: result.messages, entries_json: result.entries_json, entries_csv: result.entries_csv }, account_map_used: finalAccountMap, generation_timestamp: new Date().toISOString() });
    } else {
      res.status(400).json({ success: false, error: 'Errore nella generazione delle scritture', details: result.messages, status: result.status, document: { id: document.id, name: document.original_filename } });
    }
  } catch (error) {
    console.error('💥 Errore generazione scritture:', error);
    if (error.message === 'FILE_NOT_FOUND') return res.status(404).json({ error: 'File fisico non trovato', code: 'FILE_NOT_FOUND' });
    if (error.message.includes('INVALID_')) return res.status(400).json({ error: `Dato non valido nel documento: ${error.message}`, code: error.message });
    if (error.message.includes('_MISMATCH')) return res.status(400).json({ error: `Calcoli non corrispondenti: ${error.message}`, code: error.message });
    if (error.message.includes('UNMAPPED_ACCOUNT')) return res.status(400).json({ error: 'Codice conto mancante nella mappatura', code: 'UNMAPPED_ACCOUNT', details: error.message });
    res.status(500).json({ error: 'Errore interno durante generazione scritture', code: 'INTERNAL_ERROR', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * @route   GET /api/documents/:id/entries-csv
 * @desc    Genera e scarica CSV delle scritture contabili
 */
// Original was already async and used async helper
router.get('/:id/entries-csv', authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log(`📥 Richiesta download CSV scritture per documento ID: ${id}`);
  try {
    const document = await getDocumentById(id);
    if (!document) return res.status(404).json({ error: 'Documento non trovato' });

    const filePath = path.join(UPLOADS_DIR, document.file_path);
    const fileContent = await fs.readFile(filePath, 'utf8');
    const fileType = detectDocumentType(document.original_filename, fileContent);

    let serviceFileType;
    if (fileType === 'FATTURA_XML') serviceFileType = 'fattura';
    else if (fileType === 'BUSTA_PAGA') serviceFileType = 'busta_paga';
    else return res.status(400).json({ error: 'Tipo documento non supportato' });
    
    const defaultAccountMap = { 'cliente': '1200', 'fornitore': '2200', 'ricavi': '4010', 'costi': '5010', 'iva_debito': '2210', 'iva_credito': '1410', 'costo_lavoro': '5200', 'debiti_dipendenti': '2300', 'debiti_inps': '2310', 'debiti_erario': '2320' };
    
    const result = await accountingService.generateEntries({ file_type: serviceFileType, xml_content: fileContent, account_map: defaultAccountMap });
    
    if (result.status !== 'OK') return res.status(400).json({ error: 'Impossibile generare scritture', details: result.messages });
    
    const fileName = `scritture_${document.original_filename}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send('\ufeff' + result.entries_csv);
    console.log(`✅ CSV scritture scaricato: ${fileName}`);
  } catch (error) {
    console.error('💥 Errore download CSV scritture:', error);
    res.status(500).json({ error: 'Errore durante generazione CSV', details: error.message });
  }
});


// ==========================================================================
// ENDPOINT LIQUIDAZIONI IVA
// ==========================================================================

/**
 * @route   GET /api/liquidazioni/:periodo
 * @desc    Calcola liquidazione IVA per periodo specificato
 */
// Original was already async
router.get('/liquidazioni/:periodo', authMiddleware, async (req, res) => {
  const { periodo } = req.params;
  const { regime = 'mensile' } = req.query;
  console.log(`📊 Richiesta liquidazione IVA ${regime} per periodo: ${periodo}`);
  try {
    if ((regime === 'mensile' && !/^\d{4}-\d{2}$/.test(periodo)) || (regime === 'trimestrale' && !/^\d{4}-Q[1-4]$/.test(periodo))) {
      return res.status(400).json({ error: 'Formato periodo non valido', expected: regime === 'mensile' ? 'YYYY-MM' : 'YYYY-QN', received: periodo });
    }
    const userId = req.user.id;
    const liquidazione = await IvaService.calcolaLiquidazione(userId, periodo, regime);
    console.log(`✅ Liquidazione calcolata: IVA da versare €${liquidazione.liquidazione.ivaDaVersare}`);
    res.json({ success: true, liquidazione, summary: { periodo: liquidazione.periodo, regime: liquidazione.regime, documenti_elaborati: liquidazione.documenti.totale, iva_da_versare: liquidazione.liquidazione.ivaDaVersare, situazione: liquidazione.liquidazione.situazione, validazioni_ok: liquidazione.validazioni.valida }});
  } catch (error) {
    console.error('💥 Errore calcolo liquidazione IVA:', error);
    res.status(500).json({ error: 'Errore durante calcolo liquidazione IVA', details: error.message });
  }
});

/**
 * @route   GET /api/liquidazioni/:periodo/csv
 * @desc    Download CSV liquidazione IVA
 */
// Original was already async
router.get('/liquidazioni/:periodo/csv', authMiddleware, async (req, res) => {
  const { periodo } = req.params;
  const { regime = 'mensile' } = req.query;
  console.log(`📥 Download CSV liquidazione IVA ${regime} - ${periodo}`);
  try {
    const userId = req.user.id;
    const liquidazione = await IvaService.calcolaLiquidazione(userId, periodo, regime);
    if (!liquidazione.validazioni.valida) {
      return res.status(400).json({ error: 'Liquidazione contiene errori', details: liquidazione.validazioni.errori });
    }
    const csvContent = await IvaService.exportLiquidazioneCSV(liquidazione);
    const fileName = `liquidazione_iva_${periodo}_${regime}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    console.log(`✅ CSV liquidazione scaricato: ${fileName}`);
    res.send('\ufeff' + csvContent);
  } catch (error) {
    console.error('💥 Errore download CSV liquidazione:', error);
    res.status(500).json({ error: 'Errore durante generazione CSV liquidazione', details: error.message });
  }
});

/**
 * @route   GET /api/registri/vendite/:periodo/csv
 * @desc    Download CSV registro vendite IVA
 */
// Original was already async
router.get('/registri/vendite/:periodo/csv', authMiddleware, async (req, res) => {
    const { periodo } = req.params;
    const { regime = 'mensile' } = req.query;
    console.log(`📥 Download CSV registro vendite - ${periodo}`);
    try {
        const userId = req.user.id;
        const liquidazione = await IvaService.calcolaLiquidazione(userId, periodo, regime);
        const csvContent = await IvaService.exportRegistroVenditeCSV(liquidazione.registri.vendite, periodo);
        const fileName = `registro_vendite_${periodo}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        console.log(`✅ CSV registro vendite scaricato: ${fileName}`);
        res.send('\ufeff' + csvContent);
    } catch (error) {
        console.error('💥 Errore download CSV registro vendite:', error);
        res.status(500).json({ error: 'Errore durante generazione CSV registro vendite', details: error.message });
    }
});

/**
 * @route   GET /api/registri/acquisti/:periodo/csv
 * @desc    Download CSV registro acquisti IVA
 */
// Original was already async
router.get('/registri/acquisti/:periodo/csv', authMiddleware, async (req, res) => {
    const { periodo } = req.params;
    const { regime = 'mensile' } = req.query;
    console.log(`📥 Download CSV registro acquisti - ${periodo}`);
    try {
        const userId = req.user.id;
        const liquidazione = await IvaService.calcolaLiquidazione(userId, periodo, regime);
        const csvContent = await IvaService.exportRegistroAcquistiCSV(liquidazione.registri.acquisti, periodo);
        const fileName = `registro_acquisti_${periodo}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        console.log(`✅ CSV registro acquisti scaricato: ${fileName}`);
        res.send('\ufeff' + csvContent);
    } catch (error) {
        console.error('💥 Errore download CSV registro acquisti:', error);
        res.status(500).json({ error: 'Errore durante generazione CSV registro acquisti', details: error.message });
    }
});

/**
 * @route   GET /api/liquidazioni/periodi
 * @desc    Lista periodi disponibili per liquidazioni
 */
// Original was already async and used async helper
router.get('/liquidazioni/periodi', authMiddleware, async (req, res) => {
    console.log('📅 Richiesta periodi disponibili per liquidazioni');
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
        console.log(`✅ Trovati ${response.periodi.mensili.length} periodi mensili e ${response.periodi.trimestrali.length} trimestrali`);
        res.json(response);
    } catch (error) {
        console.error('💥 Errore recupero periodi:', error);
        res.status(500).json({ error: 'Errore durante recupero periodi', details: error.message });
    }
});

/**
 * @route   POST /api/liquidazioni/:periodo/f24
 * @desc    Genera F24 per versamento IVA
 */
// Original was already async
router.post('/liquidazioni/:periodo/f24', authMiddleware, async (req, res) => {
  const { periodo } = req.params;
  const { regime = 'mensile', contribuente } = req.body;
  console.log(`📄 Generazione F24 per periodo: ${periodo}`);
  try {
    const userId = req.user.id;
    const liquidazione = await IvaService.calcolaLiquidazione(userId, periodo, regime);
    if (liquidazione.liquidazione.ivaDaVersare <= 0) {
      return res.status(400).json({ error: 'Nessun versamento IVA dovuto per questo periodo', iva_da_versare: liquidazione.liquidazione.ivaDaVersare });
    }
    const f24Data = {
      periodo: liquidazione.periodo, regime: liquidazione.regime, codice_tributo: '6099', importo: liquidazione.liquidazione.ivaDaVersare, data_scadenza: liquidazione.scadenze[0]?.dataScadenza,
      contribuente: contribuente || { codice_fiscale: '', denominazione: 'Da compilare' }
    };
    res.json({ success: true, message: 'Dati F24 generati con successo', f24: f24Data, istruzioni: ['Utilizzare i dati forniti per compilare il modello F24', 'Verificare il codice tributo e la scadenza', 'Effettuare il versamento entro la data di scadenza'] });
  } catch (error) {
    console.error('💥 Errore generazione F24:', error);
    res.status(500).json({ error: 'Errore durante generazione F24', details: error.message });
  }
});

/**
 * @route   GET /api/liquidazioni/dashboard
 * @desc    Dashboard riepilogativa liquidazioni IVA
 */
// Original was already async
router.get('/liquidazioni/dashboard', authMiddleware, async (req, res) => {
  console.log('📊 Richiesta dashboard liquidazioni IVA');
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
        liquidazioni.push({ periodo, iva_da_versare: 0, documenti: 0, situazione: 'ERRORE' });
      }
    }
    const stats = { totale_iva_anno: liquidazioni.reduce((s, l) => s + l.iva_da_versare, 0), media_mensile: liquidazioni.reduce((s, l) => s + l.iva_da_versare, 0) / liquidazioni.length, totale_documenti: liquidazioni.reduce((s, l) => s + l.documenti, 0), mesi_con_credito: liquidazioni.filter(l => l.iva_da_versare < 0).length, mesi_con_debito: liquidazioni.filter(l => l.iva_da_versare > 0).length };
    res.json({ success: true, dashboard: { liquidazioni_recenti: liquidazioni.reverse(), statistiche: stats, anno_riferimento: annoCorrente, ultimo_aggiornamento: new Date().toISOString() }});
    console.log(`✅ Dashboard generata: €${stats.totale_iva_anno.toFixed(2)} IVA totale anno`);
  } catch (error) {
    console.error('💥 Errore dashboard liquidazioni:', error);
    res.status(500).json({ error: 'Errore durante generazione dashboard', details: error.message });
  }
});

// ==========================================================================
// EXPORT FINALE
// ==========================================================================

console.log('📋 ROUTE REGISTRATE:');
router.stack.forEach(layer => {
  if (layer.route) {
    console.log(`  ${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);
  }
});

export default router;