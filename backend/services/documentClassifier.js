console.log('🔍 Document Classifier caricato');
import fs from 'fs/promises';
import path from 'path';

class DocumentClassifier {
  
  // Classificazione migliorata dal nome file
  classifyByFilename(filename) {
    const lower = filename.toLowerCase();
    
    // MIGLIORATO: Riconoscimento buste paga
    if (lower.includes('busta') || lower.includes('paga') || lower.includes('stipendio') || 
        lower.includes('payroll') || lower.includes('cedolino') ||
        // Riconoscimento per mesi
        lower.match(/\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s*\d{4}/) ||
        // Pattern per date numeriche tipo "03 2025" o "marzo 2025"
        lower.match(/\b\d{1,2}\/\d{4}/) || lower.match(/\bmese|mensile/)) {
      return 'buste-paga';
    }
    
    // Fatture
    if (lower.includes('fattura') || lower.includes('invoice') || lower.includes('ricevuta') || 
        lower.endsWith('.xml') || lower.includes('fatt_')) {
      return 'fatture';
    }
    
    return 'altri';
  }

  // Classificazione migliorata dal contenuto
  classifyByContent(content) {
    const lower = content.toLowerCase();
    
    // Buste paga - pattern più specifici
    const bustaPagaKeywords = [
      'retribuzione', 'stipendio', 'inps', 'irpef', 'tfr', 'cedolino',
      'trattenute', 'contributi', 'busta paga', 'emolumenti',
      'imp.agg.tfp', 'quota tfr', 'detr. lav. dip', 'aliquota inail',
      'bonifico bancario', 'netto paghe'
    ];
    
    const bustaPagaCount = bustaPagaKeywords.filter(keyword => lower.includes(keyword)).length;
    
    if (bustaPagaCount >= 3) {
      return 'buste-paga';
    }
    
    // Fatture elettroniche
    if (lower.includes('fatturaelettronica') || lower.includes('datitrasmissione') || 
        lower.includes('cedenteprestatore') || lower.includes('<fattura')) {
      return 'fatture';
    }
    
    return 'altri';
  }

  // Crea cartelle per cliente
  async createClientFolders(clientId) {
    const basePath = path.join(process.cwd(), 'uploads', 'clienti', clientId.toString());
    const folders = ['fatture', 'buste-paga', 'altri'];
    
    for (const folder of folders) {
      const folderPath = path.join(basePath, folder);
      await fs.mkdir(folderPath, { recursive: true });
    }
    
    return basePath;
  }

  // Classifica e salva file - MIGLIORATO
  async processDocument(file, clientId, content = '') {
    try {
      console.log(`🔍 Processo documento: ${file.originalname} per cliente ${clientId}`);
      
      // 1. Crea cartelle
      await this.createClientFolders(clientId);
      
      // 2. Classifica con DOPPIO controllo (filename + content)
      let category = this.classifyByFilename(file.originalname);
      
      // Se il contenuto è disponibile, usa anche quello
      if (content && content.length > 100) {
        const contentCategory = this.classifyByContent(content);
        // Se il contenuto suggerisce una categoria diversa e più specifica, usala
        if (contentCategory !== 'altri' && category === 'altri') {
          category = contentCategory;
        }
      }
      
      console.log(`📋 Categoria finale: ${category} (file: ${this.classifyByFilename(file.originalname)}, content: ${content ? this.classifyByContent(content) : 'N/A'})`);
      
      // 3. Nuovo percorso
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const extension = path.extname(file.originalname);
      const newFilename = `${timestamp}-${randomId}${extension}`;
      
      const finalPath = path.join('clienti', clientId.toString(), category, newFilename);
      const fullPath = path.join(process.cwd(), 'uploads', finalPath);
      
      // 4. Sposta file
      await fs.rename(file.path, fullPath);
      
      console.log(`✅ File salvato: ${finalPath}`);
      
      return {
        success: true,
        category: category,
        file_path: finalPath,
        client_id: clientId
      };
      
    } catch (error) {
      console.error('❌ Errore classificazione:', error);
      return {
        success: false,
        category: 'altri',
        file_path: file.path,
        error: error.message
      };
    }
  }
}

export default new DocumentClassifier();