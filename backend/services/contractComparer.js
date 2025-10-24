import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

class ContractComparer {
  
  async confrontaDocumenti(contrattoPath, bustaPagaPath, userId) {
    const contrattoData = await this.estraiDatiContratto(contrattoPath);
    const bustaPagaData = await this.estraiDatiBustaPaga(bustaPagaPath);
    
    return this.confronta(contrattoData, bustaPagaData);
  }

  async estraiDatiContratto(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return this.normalizzaContratto(jsonData);
    }
    
    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      const data = await pdf(buffer);
      return this.estraiCampiContrattoPDF(data.text);
    }
    
    throw new Error('Formato contratto non supportato');
  }

  async estraiDatiBustaPaga(filePath) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer);
    return this.estraiCampiBustaPagaPDF(data.text);
  }

  normalizzaContratto(json) {
    return {
      nome: json.nome || '',
      livello: String(json.livello || ''),
      ore_settimanali: Number(json.ore_settimanali || 0),
      ferie_annue: Number(json.ferie_annue || 0),
      netto_mensile: Number(json.netto_mensile || 0)
    };
  }

  estraiCampiContrattoPDF(text) {
    const data = {};
    
    // Regex per estrarre campi dal PDF contratto
    const patterns = {
      nome: /(?:nome|dipendente|lavoratore)[:\s]+([A-Za-z\s]+)/i,
      livello: /(?:livello|inquadramento)[:\s]+(\w+)/i,
      ore_settimanali: /(?:ore.*settimanali?|orario)[:\s]*(\d+)/i,
      ferie_annue: /(?:ferie.*annue?|giorni.*ferie)[:\s]*(\d+)/i,
      netto_mensile: /(?:netto.*mensile|retribuzione.*netta)[:\s]*€?\s*(\d+[.,]?\d*)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        data[key] = key === 'nome' ? match[1].trim() : 
                   key.includes('mensile') ? Number(match[1].replace(',', '.')) :
                   key === 'livello' ? match[1] : Number(match[1]);
      }
    }

    return data;
  }

  estraiCampiBustaPagaPDF(text) {
    const data = {};
    
    // Regex per estrarre campi dalla busta paga
    const patterns = {
      nome: /(?:cognome e nome|dipendente)[:\s]+([A-Za-z\s]+)/i,
      livello: /(?:livello|categoria)[:\s]+(\w+)/i,
      ore_settimanali: /(?:ore.*contratto|ore.*settimana)[:\s]*(\d+)/i,
      ferie_annue: /(?:ferie.*residue|giorni.*ferie)[:\s]*(\d+)/i,
      netto_mensile: /(?:netto in busta|totale netto)[:\s]*€?\s*(\d+[.,]?\d*)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        data[key] = key === 'nome' ? match[1].trim() : 
                   key.includes('mensile') ? Number(match[1].replace(',', '.')) :
                   key === 'livello' ? match[1] : Number(match[1]);
      }
    }

    return data;
  }

  confronta(contratto, bustaPaga) {
    const nome = contratto.nome || bustaPaga.nome || 'N/D';
    const confronto = {};
    const campiDaConfrontare = ['livello', 'ore_settimanali', 'ferie_annue', 'netto_mensile'];
    
    let discrepanze = 0;

    for (const campo of campiDaConfrontare) {
      const valoreContratto = contratto[campo] || 0;
      const valoreBusta = bustaPaga[campo] || 0;
      const match = valoreContratto === valoreBusta;
      
      if (!match) discrepanze++;
      
      confronto[campo] = {
        contratto: valoreContratto,
        busta_paga: valoreBusta,
        match
      };
    }

    return {
      nome,
      confronto,
      discrepanze,
      status: discrepanze > 0 ? 'Richiede verifica' : 'Tutto in regola'
    };
  }
}

export default new ContractComparer();