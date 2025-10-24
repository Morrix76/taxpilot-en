// /backend/services/xml-parser.js

const xml2js = require('xml2js');
const fs = require('fs').promises;

class FatturaElettronicaParser {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    });
  }

  async parseXML(xmlFilePath) {
    try {
      const xmlData = await fs.readFile(xmlFilePath, 'utf8');
      const result = await this.parser.parseStringPromise(xmlData);
      
      const fattura = result['p:FatturaElettronica'] || result.FatturaElettronica;
      
      return {
        header: this.extractHeader(fattura.FatturaElettronicaHeader),
        body: this.extractBody(fattura.FatturaElettronicaBody),
        validation: this.validateCalculations(fattura.FatturaElettronicaBody)
      };
    } catch (error) {
      throw new Error(`Errore parsing XML: ${error.message}`);
    }
  }

  extractHeader(header) {
    const cedente = header.CedentePrestatore.DatiAnagrafici;
    const cessionario = header.CessionarioCommittente.DatiAnagrafici;

    return {
      cedente: {
        denominazione: cedente.Anagrafica.Denominazione,
        partitaIva: cedente.IdFiscaleIVA?.IdCodice,
        codiceFiscale: cedente.CodiceFiscale
      },
      cessionario: {
        denominazione: cessionario.Anagrafica?.Denominazione,
        nome: cessionario.Anagrafica?.Nome,
        cognome: cessionario.Anagrafica?.Cognome,
        codiceFiscale: cessionario.CodiceFiscale
      },
      datiTrasmissione: {
        idTrasmittente: header.DatiTrasmissione.IdTrasmittente,
        formatoTrasmissione: header.DatiTrasmissione.FormatoTrasmissione
      }
    };
  }

  extractBody(body) {
    const datiGenerali = body.DatiGenerali.DatiGeneraliDocumento;
    const linee = Array.isArray(body.DatiBeniServizi.DettaglioLinee) 
      ? body.DatiBeniServizi.DettaglioLinee 
      : [body.DatiBeniServizi.DettaglioLinee];

    return {
      documento: {
        numero: datiGenerali.Numero,
        data: datiGenerali.Data,
        tipoDocumento: datiGenerali.TipoDocumento,
        divisa: datiGenerali.Divisa
      },
      linee: linee.map(linea => ({
        numeroLinea: linea.NumeroLinea,
        descrizione: linea.Descrizione,
        quantita: parseFloat(linea.Quantita || 1),
        prezzoUnitario: parseFloat(linea.PrezzoUnitario),
        prezzoTotale: parseFloat(linea.PrezzoTotale),
        aliquotaIva: parseFloat(linea.AliquotaIVA || 0)
      })),
      riepilogoIva: this.extractRiepilogoIva(body.DatiBeniServizi.DatiRiepilogo)
    };
  }

  extractRiepilogoIva(riepilogo) {
    const riepiloghi = Array.isArray(riepilogo) ? riepilogo : [riepilogo];
    
    return riepiloghi.map(r => ({
      aliquotaIva: parseFloat(r.AliquotaIVA || 0),
      imponibileImporto: parseFloat(r.ImponibileImporto),
      imposta: parseFloat(r.Imposta || 0),
      natura: r.Natura,
      riferimentoNormativo: r.RiferimentoNormativo
    }));
  }

  validateCalculations(body) {
    const errors = [];
    const warnings = [];
    
    // Validazione calcoli IVA
    const riepilogoIva = this.extractRiepilogoIva(body.DatiBeniServizi.DatiRiepilogo);
    
    riepilogoIva.forEach((riepilogo, index) => {
      const calcoloIva = riepilogo.imponibileImporto * (riepilogo.aliquotaIva / 100);
      const differenza = Math.abs(calcoloIva - riepilogo.imposta);
      
      if (differenza > 0.01) {
        errors.push({
          type: 'IVA_CALCULATION_ERROR',
          message: `Riepilogo ${index + 1}: IVA calcolata ${calcoloIva.toFixed(2)}€, dichiarata ${riepilogo.imposta}€`,
          severity: 'high'
        });
      }
    });

    // Validazione totali
    const totaleImponibile = riepilogoIva.reduce((sum, r) => sum + r.imponibileImporto, 0);
    const totaleIva = riepilogoIva.reduce((sum, r) => sum + r.imposta, 0);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totali: {
        imponibile: totaleImponibile,
        iva: totaleIva,
        totale: totaleImponibile + totaleIva
      }
    };
  }
}

module.exports = FatturaElettronicaParser;