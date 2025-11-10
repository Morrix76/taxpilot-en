/**
 * 🤖 AI ANALYST - CONSULENTE FISCALE INTELLIGENTE
 * - Spiegazioni umane degli errori
 * - Suggerimenti step-by-step
 * - Priorità, impatto, prossimi passi
 * - Safe per Vercel/Railway: nessun throw se manca GROQ_API_KEY
 */

import Groq from 'groq-sdk';

export class AIDocumentAnalyst {
  constructor(apiKey) {
    // Lettura chiave in modo sicuro
    const envKey = (process.env.GROQ_API_KEY || '').trim();
    this.apiKey = (apiKey || envKey || '').trim();

    this.model = 'llama3-8b-8192'; // mantieni il tuo modello
    this.groq = null;

    // Instanzia solo se c'è la chiave; non lanciare mai qui
    if (this.apiKey) {
      try {
        this.groq = new Groq({ apiKey: this.apiKey });
        console.log('✅ AIDocumentAnalyst: AI abilitata (Groq key presente)');
      } catch (e) {
        console.error('⚠️ AIDocumentAnalyst: init Groq fallito:', e?.message);
        this.groq = null;
      }
    } else {
      console.log('ℹ️ AIDocumentAnalyst: AI disabilitata (manca GROQ_API_KEY)');
    }
  }

  /**
   * Analisi esperta basata sui risultati del parser
   */
  async analyzeWithContext(parserResults, xmlContent, documentInfo = {}) {
    try {
      // Se AI non disponibile → fallback immediato
      if (!this.groq) {
        return this.getFallbackAnalysis(parserResults);
      }

      // 1) Prompt
      const prompt = this.buildAnalysisPrompt(parserResults, documentInfo);

      // 2) Chiamata AI
      const aiResponse = await this.callGroqAPI(prompt);

      // 3) Parse risposta
      const analysis = this.parseAIResponse(aiResponse);

      // 4) Merge
      return this.combineResults(parserResults, analysis);
    } catch (error) {
      console.error('🤖 AI Analyst Error:', error?.message || error);
      return this.getFallbackAnalysis(parserResults);
    }
  }

  /**
   * Costruisce prompt specifico
   */
  buildAnalysisPrompt(parserResults, documentInfo) {
    const { status, errors, warnings, details, summary } = parserResults;

    return `
RUOLO: Sei un COMMERCIALISTA ESPERTO specializzato in fatturazione elettronica italiana.

CONTESTO CONTROLLI TECNICI:
${JSON.stringify(
  {
    status,
    errori_critici: errors.length,
    avvertenze: warnings.length,
    dettagli_errori: errors.map((e) => ({ codice: e.code, messaggio: e.message })),
    dettagli_avvertenze: warnings.map((w) => ({ codice: w.code, messaggio: w.message })),
    risultati_validazione: details,
    documento: documentInfo || {}
  },
  null,
  2
)}

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
      "spiegazione": "Cosa significa in pratica",
      "conseguenze": "Cosa succede se non lo correggi",
      "soluzione": "Come correggere step-by-step",
      "urgenza": 1-10,
      "tempo_stimato": "5 minuti|30 minuti|1 ora|etc"
    }
  ],
  "suggerimenti_pratici": ["Suggerimento 1", "Suggerimento 2"],
  "valutazione_rischio": {
    "rischio_rigetto_sdi": "basso|medio|alto",
    "rischio_sanzioni": "nullo|basso|medio|alto",
    "rischio_controlli": "basso|medio|alto"
  },
  "prossimi_passi": ["Azione 1", "Azione 2", "Azione 3"],
  "note_commercialista": "Commento aggiuntivo se serve"
}

REGOLE:
- Se status="ok" → analisi positiva
- Se status="error" → analisi critica con soluzioni concrete
- Se status="warning" → analisi equilibrata con suggerimenti
- Sii specifico (es: "P.IVA formato IT12345678901")
- Rispondi SOLO con JSON valido (nessun testo fuori JSON)
RISPOSTA:`;
  }

  /**
   * Chiamata API Groq (guardata)
   */
  async callGroqAPI(prompt) {
    if (!this.groq) {
      throw new Error('AI_DISABLED');
    }

    const completion = await this.groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'Sei un commercialista esperto in fatturazione elettronica italiana. Rispondi SOLO con JSON valido, senza markup o commenti.'
        },
        { role: 'user', content: prompt }
      ],
      model: this.model,
      temperature: 0.1,
      max_tokens: 4000
    });

    const content = completion?.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('EMPTY_AI_RESPONSE');
    return content;
  }

  /**
   * Parse e validazione
   */
  parseAIResponse(aiResponse) {
    try {
      const cleanResponse = aiResponse
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      // Trova il primo JSON valido anche se c’è rumore
      const firstBrace = cleanResponse.indexOf('{');
      const lastBrace = cleanResponse.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('NO_JSON_FOUND');
      }

      const jsonSlice = cleanResponse.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonSlice);

      if (!parsed.analisi_generale || !Array.isArray(parsed.errori_prioritizzati)) {
        throw new Error('INVALID_AI_STRUCTURE');
      }

      return parsed;
    } catch (error) {
      console.error('🤖 Parse AI Response Error:', error?.message || error);
      console.error('🤖 Raw Response (truncated):', String(aiResponse).slice(0, 500));
      return this.getBasicAnalysis(aiResponse);
    }
  }

  /**
   * Merge parser + AI
   */
  combineResults(parserResults, aiAnalysis) {
    return {
      technical: {
        status: parserResults.status,
        isValid: parserResults.isValid,
        errors: parserResults.errors,
        warnings: parserResults.warnings,
        details: parserResults.details,
        summary: parserResults.summary
      },
      expert: aiAnalysis,
      combined: {
        overall_status: this.determineOverallStatus(parserResults, aiAnalysis),
        confidence: this.calculateConfidence(parserResults, aiAnalysis),
        flag_manual_review: this.shouldFlagForReview(parserResults, aiAnalysis),
        priority_level: this.determinePriorityLevel(parserResults, aiAnalysis),
        estimated_fix_time: this.estimateFixTime(aiAnalysis),
        compliance_score: this.calculateComplianceScore(parserResults, aiAnalysis)
      },
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        parser_version: '1.0.0',
        ai_model: this.groq ? this.model : 'disabled',
        ai_used: !!this.groq,
        processing_time: Date.now()
      }
    };
  }

  determineOverallStatus(parserResults, aiAnalysis) {
    if (parserResults.status === 'error') return 'error';
    if (aiAnalysis.analisi_generale?.raccomandazione === 'revisiona_approfondita') return 'warning';
    if (aiAnalysis.analisi_generale?.raccomandazione === 'correggi') return 'error';
    return parserResults.status;
  }

  calculateConfidence(parserResults, aiAnalysis) {
    let confidence = 0.5;
    if (parserResults.isValid) confidence += 0.3;
    if (parserResults.errors.length === 0) confidence += 0.15;
    else if (parserResults.errors.length <= 2) confidence += 0.05;
    if (aiAnalysis.analisi_generale?.gravita_complessiva <= 3) confidence += 0.05;
    return Math.min(confidence, 0.99);
  }

  shouldFlagForReview(parserResults, aiAnalysis) {
    if (parserResults.summary?.criticalIssues > 0) return true;
    if (aiAnalysis.analisi_generale?.raccomandazione === 'revisiona_approfondita') return true;
    if (aiAnalysis.valutazione_rischio?.rischio_rigetto_sdi === 'alto') return true;
    return false;
  }

  determinePriorityLevel(parserResults, aiAnalysis) {
    if (parserResults.errors.length === 0) return 'low';
    if (parserResults.summary?.criticalIssues > 0) return 'critical';
    if (aiAnalysis.analisi_generale?.gravita_complessiva >= 7) return 'high';
    return 'medium';
  }

  estimateFixTime(aiAnalysis) {
    const errori = aiAnalysis.errori_prioritizzati || [];
    if (errori.length === 0) return '0 minuti';
    const minutiTot = errori.reduce((acc, e) => {
      const m = parseInt(String(e.tempo_stimato || '5').match(/\d+/)?.[0] || '5', 10);
      return acc + m;
    }, 0);
    return minutiTot < 60 ? `${minutiTot} minuti` : `${Math.ceil(minutiTot / 60)} ore`;
  }

  calculateComplianceScore(parserResults, aiAnalysis) {
    let score = 100;
    score -= parserResults.errors.length * 15;
    score -= parserResults.warnings.length * 5;
    if (aiAnalysis.analisi_generale?.conformita_sdi === 'conforme') score += 10;
    return Math.max(score, 0);
  }

  // ---------- Fallbacks ----------
  getFallbackAnalysis(parserResults) {
    const hasErrors = parserResults.errors.length > 0;
    const hasWarnings = parserResults.warnings.length > 0;

    return this.combineResults(parserResults, {
      analisi_generale: {
        gravita_complessiva: hasErrors ? 8 : hasWarnings ? 4 : 2,
        impatto_fiscale: hasErrors ? 'alto' : hasWarnings ? 'medio' : 'basso',
        conformita_sdi: hasErrors ? 'non_conforme' : 'conforme',
        raccomandazione: hasErrors ? 'correggi' : hasWarnings ? 'revisiona' : 'approva'
      },
      errori_prioritizzati: parserResults.errors.map((error) => ({
        codice: error.code,
        titolo: error.message,
        spiegazione: 'Errore rilevato dal controllo automatico',
        conseguenze: 'Potrebbe causare problemi nell’invio',
        soluzione: 'Verificare e correggere il dato indicato',
        urgenza: 7,
        tempo_stimato: '15 minuti'
      })),
      suggerimenti_pratici: [
        'Verificare i campi obbligatori',
        'Controllare i calcoli',
        'Validare CF e P.IVA'
      ],
      valutazione_rischio: {
        rischio_rigetto_sdi: hasErrors ? 'alto' : 'basso',
        rischio_sanzioni: hasErrors ? 'medio' : 'nullo',
        rischio_controlli: 'basso'
      },
      prossimi_passi: ['Correggere gli errori', 'Ricontrollare il documento', 'Procedere con l’invio'],
      note_commercialista: 'Analisi automatica (AI non disponibile)'
    });
  }

  getBasicAnalysis(rawResponse) {
    const hasError = /errore|critico|problema|rigetto/i.test(rawResponse || '');
    const hasWarn = /attenzione|verifica|controlla/i.test(rawResponse || '');
    return {
      analisi_generale: {
        gravita_complessiva: hasError ? 7 : 3,
        impatto_fiscale: hasError ? 'alto' : 'basso',
        conformita_sdi: hasError ? 'dubbioso' : 'conforme',
        raccomandazione: hasError ? 'correggi' : 'approva'
      },
      errori_prioritizzati: [],
      suggerimenti_pratici: [String(rawResponse || '').slice(0, 200)],
      valutazione_rischio: {
        rischio_rigetto_sdi: hasError ? 'medio' : 'basso',
        rischio_sanzioni: 'basso',
        rischio_controlli: 'basso'
      },
      prossimi_passi: ['Verificare manualmente il documento'],
      note_commercialista: 'Analisi AI parziale - richiede revisione'
    };
  }
}

// Export helper
export const analyzeDocumentWithAI = async (parserResults, xmlContent, apiKey) => {
  const analyst = new AIDocumentAnalyst(apiKey);
  return analyst.analyzeWithContext(parserResults, xmlContent);
};
