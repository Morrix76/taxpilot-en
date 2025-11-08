/**
 * 🔧 PARSER TECNICO FATTURA ELETTRONICA
 * 
 * Controlli precisi e deterministici per documenti FatturaPA
 * Basato su specifiche tecniche v1.7.1 e normativa italiana
 */

import { parseStringPromise } from 'xml2js';

export class FatturaElettronicaValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.details = {};
  }

  /**
   * Validazione completa documento FatturaPA
   */
  async validate(xmlContent) {
    this.reset();
    
    try {
      // 1. Parsing XML
      const xmlDoc = await this.parseXML(xmlContent);
      if (!xmlDoc) return this.getResult();

      // 2. Controlli strutturali
      this.validateStructure(xmlDoc);
      
      // 3. Controlli campi obbligatori
      this.validateMandatoryFields(xmlDoc);
      
      // 4. Validazione Partita IVA
      this.validateVATNumbers(xmlDoc);
      
      // 5. Validazione Codice Fiscale
      this.validateTaxCodes(xmlDoc);
      
      // 6. Validazione Codice Destinatario
      this.validateDestinationCode(xmlDoc);
      
      // 7. Controlli matematici
      this.validateCalculations(xmlDoc);
      
      // 8. Validazione date
      this.validateDates(xmlDoc);
      
      // 9. Controlli formati
      this.validateFormats(xmlDoc);

      return this.getResult();
      
    } catch (error) {
      this.addError('PARSING_ERROR', `Errore parsing XML: ${error.message}`);
      return this.getResult();
    }
  }

  /**
   * Reset stato validatore
   */
  reset() {
    this.errors = [];
    this.warnings = [];
    this.details = {};
  }

  /**
   * Parsing XML con gestione errori
   */
  async parseXML(xmlContent) {
    try {
      const result = await parseStringPromise(xmlContent, {
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true
      });
      
      return result;
    } catch (error) {
      this.addError('XML_MALFORMED', 'Il file XML non è ben formato');
      return null;
    }
  }

  /**
   * Validazione struttura base FatturaPA
   */
  validateStructure(xmlDoc) {
    // Controllo root element
    if (!xmlDoc['p:FatturaElettronica'] && !xmlDoc['FatturaElettronica']) {
      this.addError('STRUCTURE_ROOT', 'Root element FatturaElettronica mancante');
      return;
    }

    const fattura = xmlDoc['p:FatturaElettronica'] || xmlDoc['FatturaElettronica'];
    
    // Controllo versione
    if (!fattura.versione && !fattura.Versione) {
      this.addWarning('STRUCTURE_VERSION', 'Versione documento non specificata');
    }

    // Controllo FatturaElettronicaHeader
    if (!fattura.FatturaElettronicaHeader) {
      this.addError('STRUCTURE_HEADER', 'FatturaElettronicaHeader mancante');
    }

    // Controllo FatturaElettronicaBody
    if (!fattura.FatturaElettronicaBody) {
      this.addError('STRUCTURE_BODY', 'FatturaElettronicaBody mancante');
    }

    this.details.structure = 'valid';
  }

  /**
   * Controllo campi obbligatori
   */
  validateMandatoryFields(xmlDoc) {
    const fattura = xmlDoc['p:FatturaElettronica'] || xmlDoc['FatturaElettronica'];
    if (!fattura) return;

    const header = fattura.FatturaElettronicaHeader;
    const body = fattura.FatturaElettronicaBody;

    if (header) {
      // Dati trasmissione
      const datiTrasmissione = header.DatiTrasmissione;
      if (!datiTrasmissione) {
        this.addError('MANDATORY_TRASMISSIONE', 'DatiTrasmissione mancanti');
      } else {
        if (!datiTrasmissione.IdTrasmittente) {
          this.addError('MANDATORY_ID_TRASMITTENTE', 'IdTrasmittente mancante');
        }
        if (!datiTrasmissione.ProgressivoInvio) {
          this.addError('MANDATORY_PROGRESSIVO', 'ProgressivoInvio mancante');
        }
        if (!datiTrasmissione.FormatoTrasmissione) {
          this.addError('MANDATORY_FORMATO', 'FormatoTrasmissione mancante');
        }
        if (!datiTrasmissione.CodiceDestinatario) {
          this.addError('MANDATORY_DESTINATARIO', 'CodiceDestinatario mancante');
        }
      }

      // Cedente prestatore
      const cedente = header.CedentePrestatore;
      if (!cedente) {
        this.addError('MANDATORY_CEDENTE', 'CedentePrestatore mancante');
      } else {
        if (!cedente.DatiAnagrafici) {
          this.addError('MANDATORY_CEDENTE_ANAGRAFICA', 'DatiAnagrafici cedente mancanti');
        }
        if (!cedente.Sede) {
          this.addError('MANDATORY_CEDENTE_SEDE', 'Sede cedente mancante');
        }
      }

      // Cessionario committente
      const cessionario = header.CessionarioCommittente;
      if (!cessionario) {
        this.addError('MANDATORY_CESSIONARIO', 'CessionarioCommittente mancante');
      }
    }

    if (body) {
      // Dati generali
      const datiGenerali = body.DatiGenerali;
      if (!datiGenerali || !datiGenerali.DatiGeneraliDocumento) {
        this.addError('MANDATORY_DATI_GENERALI', 'DatiGeneraliDocumento mancanti');
      }

      // Linee dettaglio
      const dettaglioLinee = body.DatiBeniServizi?.DettaglioLinee;
      if (!dettaglioLinee) {
        this.addError('MANDATORY_DETTAGLIO_LINEE', 'DettaglioLinee mancante');
      }
    }

    this.details.mandatoryFields = this.errors.length === 0 ? 'complete' : 'incomplete';
  }

  /**
   * Validazione Partite IVA
   */
  validateVATNumbers(xmlDoc) {
    const fattura = xmlDoc['p:FatturaElettronica'] || xmlDoc['FatturaElettronica'];
    if (!fattura?.FatturaElettronicaHeader) return;

    const header = fattura.FatturaElettronicaHeader;
    
    // P.IVA Cedente
    const cedenteVAT = header.CedentePrestatore?.DatiAnagrafici?.IdFiscaleIVA?.IdCodice;
    if (cedenteVAT) {
      if (!this.isValidVATNumber(cedenteVAT)) {
        this.addError('VAT_CEDENTE_INVALID', `Partita IVA cedente non valida: ${cedenteVAT}`);
      }
    }

    // P.IVA Cessionario (se presente)
    const cessionarioVAT = header.CessionarioCommittente?.DatiAnagrafici?.IdFiscaleIVA?.IdCodice;
    if (cessionarioVAT) {
      if (!this.isValidVATNumber(cessionarioVAT)) {
        this.addError('VAT_CESSIONARIO_INVALID', `Partita IVA cessionario non valida: ${cessionarioVAT}`);
      }
    }

    this.details.vatValidation = this.errors.filter(e => e.code.includes('VAT')).length === 0 ? 'valid' : 'invalid';
  }

  /**
   * Validazione Codici Fiscali
   */
  validateTaxCodes(xmlDoc) {
    const fattura = xmlDoc['p:FatturaElettronica'] || xmlDoc['FatturaElettronica'];
    if (!fattura?.FatturaElettronicaHeader) return;

    const header = fattura.FatturaElettronicaHeader;
    
    // CF Cedente
    const cedenteCF = header.CedentePrestatore?.DatiAnagrafici?.CodiceFiscale;
    if (cedenteCF) {
      if (!this.isValidTaxCode(cedenteCF)) {
        this.addError('CF_CEDENTE_INVALID', `Codice Fiscale cedente non valido: ${cedenteCF}`);
      }
    }

    // CF Cessionario
    const cessionarioCF = header.CessionarioCommittente?.DatiAnagrafici?.CodiceFiscale;
    if (cessionarioCF) {
      if (!this.isValidTaxCode(cessionarioCF)) {
        this.addError('CF_CESSIONARIO_INVALID', `Codice Fiscale cessionario non valido: ${cessionarioCF}`);
      }
    }

    this.details.taxCodeValidation = this.errors.filter(e => e.code.includes('CF')).length === 0 ? 'valid' : 'invalid';
  }

  /**
   * Validazione Codice Destinatario
   */
  validateDestinationCode(xmlDoc) {
    const fattura = xmlDoc['p:FatturaElettronica'] || xmlDoc['FatturaElettronica'];
    const codiceDestinatario = fattura?.FatturaElettronicaHeader?.DatiTrasmissione?.CodiceDestinatario;
    
    if (!codiceDestinatario) {
      this.addError('DEST_CODE_MISSING', 'Codice Destinatario mancante');
      return;
    }

    // Controllo formato (7 caratteri alfanumerici)
    if (!/^[A-Z0-9]{7}$/.test(codiceDestinatario)) {
      this.addError('DEST_CODE_FORMAT', `Codice Destinatario formato non valido: ${codiceDestinatario} (deve essere 7 caratteri alfanumerici)`);
    }

    // Controllo codici speciali
    const codiciSpeciali = ['0000000', 'XXXXXXX'];
    if (codiciSpeciali.includes(codiceDestinatario)) {
      const pec = fattura?.FatturaElettronicaHeader?.DatiTrasmissione?.PECDestinatario;
      if (!pec) {
        this.addError('DEST_CODE_SPECIAL', `Codice Destinatario ${codiceDestinatario} richiede PEC Destinatario`);
      }
    }

    this.details.destinationCode = codiceDestinatario;
  }

  /**
   * Controlli matematici su totali e IVA
   */
  validateCalculations(xmlDoc) {
    const fattura = xmlDoc['p:FatturaElettronica'] || xmlDoc['FatturaElettronica'];
    const body = fattura?.FatturaElettronicaBody;
    if (!body) return;

    // Calcolo totale linee
    const dettaglioLinee = body.DatiBeniServizi?.DettaglioLinee;
    if (!dettaglioLinee) return;

    const linee = Array.isArray(dettaglioLinee) ? dettaglioLinee : [dettaglioLinee];
    let totaleLineeCalcolato = 0;

    linee.forEach((linea, index) => {
      const quantita = parseFloat(linea.Quantita || 1);
      const prezzoUnitario = parseFloat(linea.PrezzoUnitario || 0);
      const scontoMaggiorazione = parseFloat(linea.ScontoMaggiorazione?.Percentuale || 0);
      
      let importoLinea = quantita * prezzoUnitario;
      
      // Applica sconto/maggiorazione
      if (scontoMaggiorazione !== 0) {
        if (linea.ScontoMaggiorazione?.Tipo === 'SC') {
          importoLinea = importoLinea * (1 - scontoMaggiorazione / 100);
        } else {
          importoLinea = importoLinea * (1 + scontoMaggiorazione / 100);
        }
      }

      // Confronta con PrezzoTotale dichiarato
      const prezzoTotaleDichiarato = parseFloat(linea.PrezzoTotale || 0);
      if (Math.abs(importoLinea - prezzoTotaleDichiarato) > 0.01) {
        this.addError('CALC_LINEA_TOTALE', `Linea ${index + 1}: PrezzoTotale non corretto (calcolato: ${importoLinea.toFixed(2)}, dichiarato: ${prezzoTotaleDichiarato.toFixed(2)})`);
      }

      totaleLineeCalcolato += prezzoTotaleDichiarato;
    });

    // Controllo riepilogo IVA
    const datiRiepilogo = body.DatiBeniServizi?.DatiRiepilogo;
    if (datiRiepilogo) {
      const riepiloghi = Array.isArray(datiRiepilogo) ? datiRiepilogo : [datiRiepilogo];
      let totaleImponibile = 0;
      let totaleIVA = 0;

      riepiloghi.forEach((riepilogo, index) => {
        const imponibile = parseFloat(riepilogo.ImponibileImporto || 0);
        const aliquota = parseFloat(riepilogo.AliquotaIVA || 0);
        const imposta = parseFloat(riepilogo.Imposta || 0);

        // Verifica calcolo IVA
        const impostaCalcolata = Math.round((imponibile * aliquota / 100) * 100) / 100;
        if (Math.abs(imposta - impostaCalcolata) > 0.01) {
          this.addError('CALC_IVA_RIEPILOGO', `Riepilogo ${index + 1}: IVA non corretta (calcolata: ${impostaCalcolata.toFixed(2)}, dichiarata: ${imposta.toFixed(2)})`);
        }

        totaleImponibile += imponibile;
        totaleIVA += imposta;
      });

      // Controllo con totale documento
      const datiGenerali = body.DatiGenerali?.DatiGeneraliDocumento;
      if (datiGenerali) {
        const importoTotaleDocumento = parseFloat(datiGenerali.ImportoTotaleDocumento || 0);
        const totaleCalcolato = totaleImponibile + totaleIVA;
        
        if (Math.abs(importoTotaleDocumento - totaleCalcolato) > 0.01) {
          this.addError('CALC_TOTALE_DOCUMENTO', `ImportoTotaleDocumento non corretto (calcolato: ${totaleCalcolato.toFixed(2)}, dichiarato: ${importoTotaleDocumento.toFixed(2)})`);
        }
      }
    }

    this.details.calculations = this.errors.filter(e => e.code.includes('CALC')).length === 0 ? 'correct' : 'incorrect';
  }

  /**
   * Validazione date
   */
  validateDates(xmlDoc) {
    const fattura = xmlDoc['p:FatturaElettronica'] || xmlDoc['FatturaElettronica'];
    const datiGenerali = fattura?.FatturaElettronicaBody?.DatiGenerali?.DatiGeneraliDocumento;
    if (!datiGenerali) return;

    const dataDocumento = datiGenerali.Data;
    if (!dataDocumento) {
      this.addError('DATE_MISSING', 'Data documento mancante');
      return;
    }

    // Controllo formato data (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dataDocumento)) {
      this.addError('DATE_FORMAT', `Formato data documento non valido: ${dataDocumento} (richiesto YYYY-MM-DD)`);
      return;
    }

    // Controllo validità data
    const parsedDate = new Date(dataDocumento);
    if (isNaN(parsedDate.getTime())) {
      this.addError('DATE_INVALID', `Data documento non valida: ${dataDocumento}`);
      return;
    }

    // Controllo data non futura
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    if (parsedDate > oggi) {
      this.addError('DATE_FUTURE', `Data documento futura non ammessa: ${dataDocumento}`);
    }

    // Controllo data non troppo vecchia (più di 5 anni)
    const cinqueAnniFA = new Date();
    cinqueAnniFA.setFullYear(cinqueAnniFA.getFullYear() - 5);
    if (parsedDate < cinqueAnniFA) {
      this.addWarning('DATE_OLD', `Data documento molto vecchia: ${dataDocumento}`);
    }

    this.details.dateValidation = 'valid';
  }

  /**
   * Controllo formati vari
   */
  validateFormats(xmlDoc) {
    const fattura = xmlDoc['p:FatturaElettronica'] || xmlDoc['FatturaElettronica'];
    const datiGenerali = fattura?.FatturaElettronicaBody?.DatiGenerali?.DatiGeneraliDocumento;
    
    if (datiGenerali) {
      // Controllo numero documento
      const numero = datiGenerali.Numero;
      if (!numero) {
        this.addError('FORMAT_NUMERO_MISSING', 'Numero documento mancante');
      } else if (numero.length > 20) {
        this.addWarning('FORMAT_NUMERO_LONG', `Numero documento molto lungo: ${numero}`);
      }

      // Controllo tipo documento
      const tipoDocumento = datiGenerali.TipoDocumento;
      const tipiValidi = ['TD01', 'TD02', 'TD03', 'TD04', 'TD05', 'TD06', 'TD16', 'TD17', 'TD18', 'TD19', 'TD20', 'TD21', 'TD22', 'TD23', 'TD24', 'TD25', 'TD26', 'TD27'];
      if (!tipoDocumento) {
        this.addError('FORMAT_TIPO_MISSING', 'TipoDocumento mancante');
      } else if (!tipiValidi.includes(tipoDocumento)) {
        this.addError('FORMAT_TIPO_INVALID', `TipoDocumento non valido: ${tipoDocumento}`);
      }

      // Controllo divisa
      const divisa = datiGenerali.Divisa;
      if (!divisa) {
        this.addError('FORMAT_DIVISA_MISSING', 'Divisa mancante');
      } else if (!/^[A-Z]{3}$/.test(divisa)) {
        this.addError('FORMAT_DIVISA_INVALID', `Formato divisa non valido: ${divisa} (richiesto ISO 4217)`);
      }
    }

    this.details.formatValidation = this.errors.filter(e => e.code.includes('FORMAT')).length === 0 ? 'valid' : 'invalid';
  }

  /**
   * Validazione Partita IVA italiana/europea
   */
  isValidVATNumber(vatNumber) {
    if (!vatNumber || typeof vatNumber !== 'string') return false;

    // P.IVA italiana (11 cifre)
    if (/^\d{11}$/.test(vatNumber)) {
      return this.checkItalianVAT(vatNumber);
    }

    // P.IVA europea (formato CC123456789)
    if (/^[A-Z]{2}\d{8,12}$/.test(vatNumber)) {
      return true; // Controllo base formato
    }

    return false;
  }

  /**
   * Controllo checksum P.IVA italiana + sequenze non valide
 */
checkItalianVAT(vatNumber) {
  // ✅ CONTROLLO SEQUENZE NON VALIDE
  const invalidSequences = [
    '00000000000', '11111111111', '22222222222', '33333333333',
    '44444444444', '55555555555', '66666666666', '77777777777',
    '88888888888', '99999999999'
  ];
  
  if (invalidSequences.includes(vatNumber)) {
    return false; // ← BLOCCA 00000000000!
  }
  
  // ✅ CONTROLLO CHECKSUM MATEMATICO (come prima)
  const digits = vatNumber.split('').map(d => parseInt(d));
  let sum = 0;
  
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      sum += digits[i];
    } else {
      let doubled = digits[i] * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[10];
}

  /**
   * Validazione Codice Fiscale italiano
   */
  isValidTaxCode(taxCode) {
    if (!taxCode || typeof taxCode !== 'string') return false;

    // CF persona fisica (16 caratteri)
    if (/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(taxCode)) {
      return this.checkTaxCodeChecksum(taxCode);
    }

    // CF persona giuridica (11 cifre, come P.IVA)
    if (/^\d{11}$/.test(taxCode)) {
      return this.checkItalianVAT(taxCode);
    }

    return false;
  }

  /**
   * Controllo checksum Codice Fiscale
   */
  checkTaxCodeChecksum(taxCode) {
    const oddValues = {
      '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
      'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
      'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
      'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
    };

    const evenValues = {
      '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
      'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
      'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
    };

    const remainderToLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    let sum = 0;
    for (let i = 0; i < 15; i++) {
      const char = taxCode[i];
      if (i % 2 === 0) {
        sum += oddValues[char] || 0;
      } else {
        sum += evenValues[char] || 0;
      }
    }

    const expectedCheckChar = remainderToLetter[sum % 26];
    return expectedCheckChar === taxCode[15];
  }

  /**
   * Aggiunge errore critico
   */
  addError(code, message) {
    this.errors.push({ code, message, level: 'error' });
  }

  /**
   * Aggiunge avvertenza
   */
  addWarning(code, message) {
    this.warnings.push({ code, message, level: 'warning' });
  }

  /**
   * Restituisce risultato finale
   */
  getResult() {
    const hasErrors = this.errors.length > 0;
    const hasWarnings = this.warnings.length > 0;

    return {
      isValid: !hasErrors,
      status: hasErrors ? 'error' : (hasWarnings ? 'warning' : 'ok'),
      errors: this.errors,
      warnings: this.warnings,
      details: this.details,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        criticalIssues: this.errors.filter(e => 
          ['STRUCTURE_', 'MANDATORY_', 'VAT_', 'CALC_'].some(prefix => e.code.startsWith(prefix))
        ).length
      }
    };
  }
}

// Export per uso diretto
export const validateFatturaElettronica = async (xmlContent) => {
  const validator = new FatturaElettronicaValidator();
  return await validator.validate(xmlContent);
};
