// /backend/services/ai-analyzer.js

const axios = require('axios');

class TaxAIAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
  }

  async analyzeFatturaElettronica(parsedData, validationResult) {
    const prompt = this.buildFatturaPrompt(parsedData, validationResult);
    
    const messages = [
      {
        role: "system",
        content: "Sei un commercialista esperto italiano. Analizza fatture elettroniche e fornisci consulenza fiscale precisa secondo la normativa italiana 2024-2025."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    return await this.callGroqAPI(messages);
  }

  async analyzeBustaPaga(parsedData, validationResult) {
    const prompt = this.buildBustaPagaPrompt(parsedData, validationResult);
    
    const messages = [
      {
        role: "system",
        content: "Sei un consulente del lavoro esperto. Analizza buste paga italiane e verifica calcoli IRPEF, INPS, contributi secondo la normativa 2024-2025."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    return await this.callGroqAPI(messages);
  }

  buildFatturaPrompt(data, validation) {
    return `
Analizza questa fattura elettronica italiana:

DATI FATTURA:
- Numero: ${data.body.documento.numero}
- Data: ${data.body.documento.data}
- Totale Imponibile: €${validation.totali.imponibile}
- Totale IVA: €${validation.totali.iva}
- Totale Fattura: €${validation.totali.totale}

RIEPILOGO IVA:
${data.body.riepilogoIva.map(r => 
  `- Aliquota ${r.aliquotaIva}%: Imponibile €${r.imponibileImporto}, IVA €${r.imposta}`
).join('\n')}

VALIDAZIONE:
- Calcoli corretti: ${validation.isValid ? 'SÌ' : 'NO'}
- Errori: ${validation.errors.length}
- Avvisi: ${validation.warnings.length}

Fornisci:
1. Verifica calcoli IVA
2. Controllo conformità SDI
3. Eventuali anomalie fiscali
4. Suggerimenti per correzioni
`;
  }

  buildBustaPagaPrompt(data, validation) {
    return `
Analizza questa busta paga italiana:

ANAGRAFICA:
- Nome: ${data.anagrafica.nome}
- Codice Fiscale: ${data.anagrafica.codiceFiscale}
- Periodo: ${data.periodo}

RETRIBUZIONE:
- Stipendio Base: €${data.retribuzione.stipendioBase}
- Super Minimo: €${data.retribuzione.superMinimo}
- Straordinari: €${data.retribuzione.straordinari}
- LORDO TOTALE: €${validation.totali.lordo}

TRATTENUTE:
- INPS: €${data.contributi.inps}
- IRPEF: €${data.imposte.irpef}
- Addizionali: €${data.imposte.addizionali}

NETTO: €${data.netto}

VALIDAZIONE:
- Calcoli corretti: ${validation.isValid ? 'SÌ' : 'NO'}
- Avvisi: ${validation.warnings.length}

Fornisci:
1. Verifica calcoli IRPEF 2024
2. Controllo contributi INPS
3. Verifica detrazioni applicate
4. Conformità normativa lavoro
5. Suggerimenti ottimizzazione fiscale
`;
  }

  async callGroqAPI(messages) {
    try {
      const response = await axios.post(this.baseUrl, {
        model: "llama-3.1-70b-versatile",
        messages: messages,
        temperature: 0.1,
        max_tokens: 800
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        analysis: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

module.exports = TaxAIAnalyzer;