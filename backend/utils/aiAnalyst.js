/**
 * 🤖 AI ANALYST - CONSULENTE FISCALE INTELLIGENTE
 * 
 * Analizza i risultati del parser tecnico e fornisce:
 * - Spiegazioni umane degli errori
 * - Suggerimenti di correzione step-by-step
 * - Priorità di intervento
 * - Valutazione impatto fiscale
 */

import Groq from 'groq-sdk';

export class AIDocumentAnalyst {
  constructor(apiKey) {
    this.groq = new Groq({ apiKey: apiKey || process.env.GROQ_API_KEY });
    this.model = 'llama3-8b-8192'; // AGGIORNATO: nuovo modello supportato
  }

  /**
   * Analisi esperta basata sui risultati del parser
   */
  async analyzeWithContext(parserResults, xmlContent, documentInfo = {}) {
    try {
      // 1. Genera prompt strutturato
      const prompt = this.buildAnalysisPrompt(parserResults, documentInfo);
      
      // 2. Chiamata AI
      const aiResponse = await this.callGroqAPI(prompt);
      
      // 3. Parse e validazione risposta
      const analysis = this.parseAIResponse(aiResponse);
      
      // 4. Combina con dati parser
      return this.combineResults(parserResults, analysis);
      
    } catch (error) {
      console.error('🤖 AI Analyst Error:', error);
      return this.getFallbackAnalysis(parserResults);
    }
  }

  /**
   * Costruisce prompt specifico per l'analisi
   */
  buildAnalysisPrompt(parserResults, documentInfo) {
    const { status, errors, warnings, details, summary } = parserResults;
    
    return `
RUOLO: Sei un COMMERCIALISTA ESPERTO specializzato in fatturazione elettronica italiana.

CONTESTO CONTROLLI TECNICI:
${JSON.stringify({
  status: status,
  errori_critici: errors.length,
  avvertenze: warnings.length,
  dettagli_errori: errors.map(e => ({ codice: e.code, messaggio: e.message })),
  dettagli_avvertenze: warnings.map(w => ({ codice: w.code, messaggio: w.message })),
  risultati_validazione: details
}, null, 2)}

COMPITO: Fornisci un'analisi PROFESSIONALE e ACTIONABLE in formato JSON:

{
  "analisi_generale": {
    "gravita_complessiva": 1-10,
    "impatto_fiscale": "basso|medio|alto|critico",
    "conformita_sdi": "conforme|non_conforme|dubbioso",
    "raccomandazione": "approva|correggi|revisiona_approfondita"
  },
  "errori_prioritizzati": [
    {
      "codice": "codice_errore",
      "titolo": "Nome errore comprensibile",
      "spiegazione": "Cosa significa questo errore in termini pratici",
      "conseguenze": "Cosa succede se non lo correggi",
      "soluzione": "Come correggere step-by-step",
      "urgenza": 1-10,
      "tempo_stimato": "5 minuti|30 minuti|1 ora|etc"
    }
  ],
  "suggerimenti_pratici": [
    "Suggerimento pratico 1",
    "Suggerimento pratico 2"
  ],
  "valutazione_rischio": {
    "rischio_rigetto_sdi": "basso|medio|alto",
    "rischio_sanzioni": "nullo|basso|medio|alto",
    "rischio_controlli": "basso|medio|alto"
  },
  "prossimi_passi": [
    "Azione 1 da fare subito",
    "Azione 2 da fare dopo",
    "Azione 3 per il futuro"
  ],
  "note_commercialista": "Commento professionale aggiuntivo se necessario"
}

REGOLE IMPORTANTI:
- Se NON ci sono errori, status="ok" → analisi POSITIVA
- Se status="error" → analisi CRITICA con soluzioni concrete
- Se status="warning" → analisi EQUILIBRATA con suggerimenti
- Sii SPECIFICO: non dire "controlla i dati" ma "verifica che la P.IVA sia nel formato IT12345678901"
- Usa linguaggio PROFESSIONALE ma COMPRENSIBILE
- Ogni errore DEVE avere una soluzione pratica
- Stima tempi realistici per le correzioni
- Considera il contesto della normativa italiana

RISPOSTA (solo JSON valido, nessun altro testo):`;
  }

  /**
   * Chiamata API Groq
   */
  async callGroqAPI(prompt) {
    const completion = await this.groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Sei un commercialista esperto in fatturazione elettronica italiana. Rispondi SOLO con JSON valido, senza markup o commenti."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      model: this.model,
      temperature: 0.1, // Bassa creatività per consistenza
      max_tokens: 4000
    });

    return completion.choices[0]?.message?.content || '';
  }

  /**
   * Parse e validazione risposta AI
   */
  parseAIResponse(aiResponse) {
    try {
      // Rimuovi eventuali markup
      const cleanResponse = aiResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^[^{]*/g, '')
        .replace(/[^}]*$/g, '');

      const parsed = JSON.parse(cleanResponse);
      
      // Validazione struttura base
      if (!parsed.analisi_generale || !parsed.errori_prioritizzati) {
        throw new Error('Struttura risposta AI incompleta');
      }

      return parsed;
      
    } catch (error) {
      console.error('🤖 Parse AI Response Error:', error);
      console.error('🤖 Raw Response:', aiResponse);
      
      // Fallback con analisi base
      return this.getBasicAnalysis(aiResponse);
    }
  }

  /**
   * Combina risultati parser + AI
   */
  combineResults(parserResults, aiAnalysis) {
    return {
      // Dati tecnici dal parser
      technical: {
        status: parserResults.status,
        isValid: parserResults.isValid,
        errors: parserResults.errors,
        warnings: parserResults.warnings,
        details: parserResults.details,
        summary: parserResults.summary
      },
      
      // Analisi esperta dall'AI
      expert: aiAnalysis,
      
      // Combinazione intelligente
      combined: {
        overall_status: this.determineOverallStatus(parserResults, aiAnalysis),
        confidence: this.calculateConfidence(parserResults, aiAnalysis),
        flag_manual_review: this.shouldFlagForReview(parserResults, aiAnalysis),
        priority_level: this.determinePriorityLevel(parserResults, aiAnalysis),
        estimated_fix_time: this.estimateFixTime(aiAnalysis),
        compliance_score: this.calculateComplianceScore(parserResults, aiAnalysis)
      },
      
      // Metadati
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        parser_version: '1.0.0',
        ai_model: this.model,
        processing_time: Date.now()
      }
    };
  }

  /**
   * Determina status complessivo
   */
  determineOverallStatus(parserResults, aiAnalysis) {
    // Parser ha priorità per errori tecnici
    if (parserResults.status === 'error') return 'error';
    
    // AI può degradare da ok a warning
    if (aiAnalysis.analisi_generale?.raccomandazione === 'revisiona_approfondita') {
      return 'warning';
    }
    
    if (aiAnalysis.analisi_generale?.raccomandazione === 'correggi') {
      return 'error';
    }
    
    return parserResults.status;
  }

  /**
   * Calcola livello di confidenza
   */
  calculateConfidence(parserResults, aiAnalysis) {
    let confidence = 0.5; // Base
    
    // Parser deterministico aumenta confidenza
    if (parserResults.isValid) {
      confidence += 0.3;
    }
    
    // Pochi errori = maggiore confidenza
    if (parserResults.errors.length === 0) {
      confidence += 0.15;
    } else if (parserResults.errors.length <= 2) {
      confidence += 0.05;
    }
    
    // AI analysis quality
    if (aiAnalysis.analisi_generale?.gravita_complessiva <= 3) {
      confidence += 0.05;
    }
    
    return Math.min(confidence, 0.99); // Max 99%
  }

  /**
   * Determina se richiede revisione manuale
   */
  shouldFlagForReview(parserResults, aiAnalysis) {
    // Errori critici sempre in revisione
    if (parserResults.summary?.criticalIssues > 0) return true;
    
    // AI raccomanda revisione
    if (aiAnalysis.analisi_generale?.raccomandazione === 'revisiona_approfondita') return true;
    
    // Rischio alto
    if (aiAnalysis.valutazione_rischio?.rischio_rigetto_sdi === 'alto') return true;
    
    return false;
  }

  /**
   * Determina livello priorità
   */
  determinePriorityLevel(parserResults, aiAnalysis) {
    if (parserResults.errors.length === 0) return 'low';
    if (parserResults.summary?.criticalIssues > 0) return 'critical';
    if (aiAnalysis.analisi_generale?.gravita_complessiva >= 7) return 'high';
    return 'medium';
  }

  /**
   * Stima tempo correzione
   */
  estimateFixTime(aiAnalysis) {
    const errori = aiAnalysis.errori_prioritizzati || [];
    if (errori.length === 0) return '0 minuti';
    
    // Somma tempi stimati
    const tempiTotali = errori.reduce((acc, errore) => {
      const tempo = errore.tempo_stimato || '5 minuti';
      const minuti = parseInt(tempo.match(/\d+/)?.[0] || '5');
      return acc + minuti;
    }, 0);
    
    if (tempiTotali < 60) return `${tempiTotali} minuti`;
    return `${Math.ceil(tempiTotali / 60)} ore`;
  }

  /**
   * Calcola score conformità
   */
  calculateComplianceScore(parserResults, aiAnalysis) {
    let score = 100;
    
    // Penalità errori
    score -= parserResults.errors.length * 15;
    score -= parserResults.warnings.length * 5;
    
    // Bonus conformità AI
    if (aiAnalysis.analisi_generale?.conformita_sdi === 'conforme') {
      score += 10;
    }
    
    return Math.max(score, 0);
  }

  /**
   * Analisi di fallback se AI fallisce
   */
  getFallbackAnalysis(parserResults) {
    const hasErrors = parserResults.errors.length > 0;
    const hasWarnings = parserResults.warnings.length > 0;
    
    return this.combineResults(parserResults, {
      analisi_generale: {
        gravita_complessiva: hasErrors ? 8 : (hasWarnings ? 4 : 2),
        impatto_fiscale: hasErrors ? 'alto' : (hasWarnings ? 'medio' : 'basso'),
        conformita_sdi: hasErrors ? 'non_conforme' : 'conforme',
        raccomandazione: hasErrors ? 'correggi' : (hasWarnings ? 'revisiona' : 'approva')
      },
      errori_prioritizzati: parserResults.errors.map(error => ({
        codice: error.code,
        titolo: error.message,
        spiegazione: "Errore rilevato dal controllo automatico",
        conseguenze: "Potrebbe causare problemi nell'invio",
        soluzione: "Verificare e correggere il dato indicato",
        urgenza: 7,
        tempo_stimato: "15 minuti"
      })),
      suggerimenti_pratici: [
        "Verificare tutti i campi obbligatori",
        "Controllare i calcoli matematici",
        "Validare codici fiscali e partite IVA"
      ],
      valutazione_rischio: {
        rischio_rigetto_sdi: hasErrors ? 'alto' : 'basso',
        rischio_sanzioni: hasErrors ? 'medio' : 'nullo',
        rischio_controlli: 'basso'
      },
      prossimi_passi: [
        "Correggere gli errori evidenziati",
        "Ricontrollare il documento",
        "Procedere con l'invio"
      ],
      note_commercialista: "Analisi automatica - consultare un professionista per casi complessi"
    });
  }

  /**
   * Analisi base da testo grezzo (se JSON parse fallisce)
   */
  getBasicAnalysis(rawResponse) {
    const hasErrorKeywords = /errore|critico|problema|rigetto/i.test(rawResponse);
    const hasWarningKeywords = /attenzione|verifica|controlla/i.test(rawResponse);
    
    return {
      analisi_generale: {
        gravita_complessiva: hasErrorKeywords ? 7 : 3,
        impatto_fiscale: hasErrorKeywords ? 'alto' : 'basso',
        conformita_sdi: hasErrorKeywords ? 'dubbioso' : 'conforme',
        raccomandazione: hasErrorKeywords ? 'correggi' : 'approva'
      },
      errori_prioritizzati: [],
      suggerimenti_pratici: [rawResponse.substring(0, 200)],
      valutazione_rischio: {
        rischio_rigetto_sdi: hasErrorKeywords ? 'medio' : 'basso',
        rischio_sanzioni: 'basso',
        rischio_controlli: 'basso'
      },
      prossimi_passi: ["Verificare il documento manualmente"],
      note_commercialista: "Analisi AI parziale - richiesta revisione manuale"
    };
  }
}

// Export per uso diretto
export const analyzeDocumentWithAI = async (parserResults, xmlContent, apiKey) => {
  const analyst = new AIDocumentAnalyst(apiKey);
  return await analyst.analyzeWithContext(parserResults, xmlContent);
};