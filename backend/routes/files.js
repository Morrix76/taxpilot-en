// backend/routes/files.js
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @route   GET /api/files/*
 * @desc    Serve file da percorsi completi in uploads/ con sicurezza
 * @access  Public (ma dovrebbe essere protetto da auth in produzione)
 */
router.get('/*', async (req, res) => {
  try {
    // Prende tutto il percorso dopo /api/files/
    const filePath = req.params[0];
    
    console.log(`📂 Richiesta file: ${filePath}`);
    
    // Validazione percorso per sicurezza
    if (!filePath || filePath.includes('..')) {
      console.error(`🚨 Percorso file non sicuro: ${filePath}`);
      return res.status(400).json({ 
        error: 'Percorso file non valido',
        message: 'Il percorso del file contiene caratteri non permessi'
      });
    }
    
    // Costruisci percorso completo
    // ✅ FIX: Usa process.cwd() per allinearsi con documentClassifier
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const fullPath = path.join(uploadsDir, filePath);
    
    // Verifica sicurezza: il file deve essere dentro uploads/
    const normalizedUploadsDir = path.resolve(uploadsDir);
    const normalizedFilePath = path.resolve(fullPath);
    
    if (!normalizedFilePath.startsWith(normalizedUploadsDir)) {
      console.error(`🚨 Tentativo path traversal: ${fullPath}`);
      return res.status(403).json({ 
        error: 'Accesso negato',
        message: 'Percorso file non autorizzato'
      });
    }
    
    console.log(`🔍 Percorso file risolto: ${normalizedFilePath}`);
    
    // Verifica esistenza file
    let fileStats;
    try {
      fileStats = await fs.stat(normalizedFilePath);
    } catch (error) {
      console.error(`❌ File non trovato: ${normalizedFilePath}`);
      return res.status(404).json({ 
        error: 'File non trovato',
        message: `Il file "${filePath}" non esiste sul server`,
        filePath: filePath
      });
    }
    
    // Determina tipo MIME basato su estensione
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(fileName).toLowerCase();
    
    // Gestione speciale per XML - converti in HTML
    if (fileExtension === '.xml') {
      try {
        const xmlContent = await fs.readFile(normalizedFilePath, 'utf8');
        const htmlContent = convertXmlToHtml(xmlContent, fileName);
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}.html"`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        
        console.log(`✅ Servendo XML come HTML: ${fileName}`);
        return res.send(htmlContent);
        
      } catch (error) {
        console.error('Errore conversione XML:', error);
        // Fallback a XML normale se conversione fallisce
      }
    }
    
    // Gestione normale per altri tipi di file
    let contentType = 'application/octet-stream';
    let disposition = 'inline';
    
    switch (fileExtension) {
      case '.pdf':
        contentType = 'application/pdf';
        disposition = 'inline';
        break;
      case '.xml':
        contentType = 'application/xml';
        disposition = 'inline';
        break;
      case '.txt':
        contentType = 'text/plain; charset=utf-8';
        disposition = 'inline';
        break;
      case '.json':
        contentType = 'application/json';
        disposition = 'inline';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        disposition = 'inline';
        break;
      case '.png':
        contentType = 'image/png';
        disposition = 'inline';
        break;
      default:
        contentType = 'application/octet-stream';
        disposition = 'attachment';
    }
    
    // Imposta headers di risposta
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileStats.size);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(fileName)}"`);
    
    // Headers CORS per iframe
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Headers sicurezza
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Per PDF, abilita visualizzazione in iframe da qualsiasi origine
    if (fileExtension === '.pdf') {
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Security-Policy', "frame-ancestors *");
    } else {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }
    
    console.log(`✅ Servendo file: ${fileName} (${contentType}, ${fileStats.size} bytes)`);
    
    // Leggi e invia file
    const fileBuffer = await fs.readFile(normalizedFilePath);
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('💥 Errore servizio file:', error);
    res.status(500).json({ 
      error: 'Errore interno del server',
      message: 'Impossibile servire il file richiesto',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Funzione per convertire XML in HTML formattato
function convertXmlToHtml(xmlContent, fileName) {
  // Escape HTML per sicurezza
  const escapeHtml = (text) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  
  // Formatta XML con indentazione
  const formatXml = (xml) => {
    let formatted = '';
    let indent = 0;
    
    xml.split(/>\s*</).forEach((node, index) => {
      if (index > 0) formatted += '\n';
      
      if (node.match(/^\/\w/)) indent--;
      formatted += '  '.repeat(indent) + '<' + node + '>';
      if (node.match(/^<?\w[^>]*[^\/]$/)) indent++;
    });
    
    return formatted.substring(1, formatted.length - 1);
  };
  
  let formattedXml;
  try {
    formattedXml = formatXml(xmlContent);
  } catch (error) {
    formattedXml = xmlContent;
  }
  
  const escapedXml = escapeHtml(formattedXml);
  
  return `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visualizzatore XML - ${escapeHtml(fileName)}</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
            line-height: 1.4;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0;
            font-size: 1.5em;
            font-weight: 600;
        }
        .header p {
            margin: 5px 0 0 0;
            opacity: 0.9;
            font-size: 0.9em;
        }
        .xml-container {
            background: white;
            border: 1px solid #e1e5e9;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            overflow-x: auto;
        }
        .xml-content {
            font-size: 14px;
            white-space: pre;
            margin: 0;
            color: #2d3748;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            padding: 10px;
            color: #666;
            font-size: 12px;
        }
        @media (max-width: 768px) {
            body { padding: 10px; }
            .xml-content { font-size: 12px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 Visualizzatore XML</h1>
        <p>File: ${escapeHtml(fileName)}</p>
    </div>
    
    <div class="xml-container">
        <pre class="xml-content">${escapedXml}</pre>
    </div>
    
    <div class="footer">
        TaxPilot Assistant - Visualizzatore File XML
    </div>
</body>
</html>`;
}

/**
 * @route   GET /api/files/:filename/info
 * @desc    Ottieni informazioni su un file senza scaricarlo (solo nomi file semplici)
 */
router.get('/:filename/info', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validazione per endpoint info (mantiene validazione originale)
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Nome file non valido' });
    }
    
    // ✅ FIX: Usa process.cwd() per allinearsi con documentClassifier
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, filename);
    const normalizedFilePath = path.resolve(filePath);
    const normalizedUploadsDir = path.resolve(uploadsDir);
    
    if (!normalizedFilePath.startsWith(normalizedUploadsDir)) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    // Verifica esistenza e ottieni info
    try {
      const fileStats = await fs.stat(normalizedFilePath);
      const fileExtension = path.extname(filename).toLowerCase();
      
      const fileInfo = {
        filename: filename,
        exists: true,
        size: fileStats.size,
        sizeFormatted: formatFileSize(fileStats.size),
        extension: fileExtension,
        mimeType: getMimeType(fileExtension),
        created: fileStats.birthtime,
        modified: fileStats.mtime,
        isViewable: ['.pdf', '.xml', '.txt', '.json'].includes(fileExtension),
        viewerType: getViewerType(fileExtension)
      };
      
      res.json(fileInfo);
      
    } catch (error) {
      res.json({
        filename: filename,
        exists: false,
        error: 'File non trovato'
      });
    }
    
  } catch (error) {
    console.error('💥 Errore info file:', error);
    res.status(500).json({ error: 'Errore recupero informazioni file' });
  }
});

// Funzioni helper
function getMimeType(extension) {
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

function getViewerType(extension) {
  const viewerTypes = {
    '.pdf': 'pdf',
    '.xml': 'html',
    '.txt': 'text',
    '.json': 'json'
  };
  
  return viewerTypes[extension] || 'download';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;