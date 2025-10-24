// /backend/routes/documents.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Import services
const { FatturaElettronicaParser, BustaPagaOCR, TaxAIAnalyzer } = require('../services');

const router = express.Router();

// Setup multer per upload file
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../temp');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xml', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo file non supportato. Solo XML e PDF.'));
    }
  }
});

// Inizializza servizi
const xmlParser = new FatturaElettronicaParser();
const pdfOCR = new BustaPagaOCR();
const aiAnalyzer = new TaxAIAnalyzer(process.env.GROQ_API_KEY);

// POST /api/documents/upload - Upload e analisi documento
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const { documentType, clientId } = req.body;
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    let result;

    // Processamento basato sul tipo di documento
    if (documentType === 'fattura-elettronica' && fileExt === '.xml') {
      result = await processFatturaElettronica(filePath, clientId);
    } else if (documentType === 'busta-paga' && fileExt === '.pdf') {
      result = await processBustaPaga(filePath, clientId);
    } else {
      // Pulizia file temporaneo
      await fs.unlink(filePath);
      return res.status(400).json({ 
        error: 'Tipo documento non compatibile con estensione file' 
      });
    }

    // Pulizia file temporaneo
    await fs.unlink(filePath);

    res.json({
      success: true,
      documentId: result.documentId,
      analysis: result.analysis,
      validation: result.validation,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore upload documento:', error);
    
    // Pulizia file in caso di errore
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Errore pulizia file:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'Errore processamento documento',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Funzione per processare fattura elettronica
async function processFatturaElettronica(filePath, clientId) {
  // 1. Parse XML
  const parsedData = await xmlParser.parseXML(filePath);
  
  // 2. Analisi AI
  const aiResult = await aiAnalyzer.analyzeFatturaElettronica(
    parsedData, 
    parsedData.validation
  );

  // 3. Salva in database (simulato)
  const documentId = uuidv4();
  
  // TODO: Salvare in database reale
  console.log('Salvando fattura elettronica:', {
    documentId,
    clientId,
    type: 'fattura-elettronica',
    data: parsedData,
    aiAnalysis: aiResult
  });

  return {
    documentId,
    analysis: aiResult,
    validation: parsedData.validation,
    parsedData
  };
}

// Funzione per processare busta paga
async function processBustaPaga(filePath, clientId) {
  // 1. OCR PDF
  const ocrResult = await pdfOCR.processPDF(filePath);
  
  // 2. Analisi AI
  const aiResult = await aiAnalyzer.analyzeBustaPaga(
    ocrResult.parsedData, 
    ocrResult.validation
  );

  // 3. Salva in database (simulato)
  const documentId = uuidv4();
  
  // TODO: Salvare in database reale
  console.log('Salvando busta paga:', {
    documentId,
    clientId,
    type: 'busta-paga',
    data: ocrResult,
    aiAnalysis: aiResult
  });

  return {
    documentId,
    analysis: aiResult,
    validation: ocrResult.validation,
    parsedData: ocrResult.parsedData
  };
}

// GET /api/documents/:id - Recupera documento
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Recuperare da database reale
    res.json({
      message: `Recupero documento ${id} - da implementare con database`
    });
    
  } catch (error) {
    console.error('Errore recupero documento:', error);
    res.status(500).json({ error: 'Errore recupero documento' });
  }
});

// GET /api/documents - Lista documenti cliente
router.get('/', async (req, res) => {
  try {
    const { clientId, page = 1, limit = 10 } = req.query;
    
    // TODO: Implementare paginazione da database
    res.json({
      documents: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0
      }
    });
    
  } catch (error) {
    console.error('Errore lista documenti:', error);
    res.status(500).json({ error: 'Errore recupero lista documenti' });
  }
});

module.exports = router;