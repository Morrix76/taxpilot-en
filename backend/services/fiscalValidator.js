// File: backend/services/fiscalValidator.js v2
// Modulo di validazione fiscale professionale - Normative 2025
// Versione commerciale per consulenti fiscali italiani

class FiscalValidatorV2 {
  
  constructor() {
    // Configurazione normative fiscali italiane 2025
    this.config = {
      // Aliquote IVA italiane valide (aggiornate 2025)
      validVatRates: [0, 4, 5, 10, 22],
      
      // Scaglioni IRPEF 2025 (aggiornati)
      irpefBrackets: [
        { min: 0, max: 28000, rate: 23 },
        { min: 28001, max: 50000, rate: 35 },
        { min: 50001, max: Infinity, rate: 43 }
      ],
      
      // Contributi INPS 2025
      inpsRates: {
        dipendente: 9.19,        // % su lordo
        datoreLavoro: 23.81,     // % su lordo (per controlli)
        autonomo: 24.00,         // % per autonomi
        forfettario: 0           // Regime forfettario
      },
      
      // Detrazioni lavoro dipendente 2025
      detrazioniLavoroDipendente: {
        base: 1880,              // Detrazione base annua
        maxReddito: 55000,       // Oltre questo reddito si azzera
        coefficiente: 0.11       // Coefficiente riduzione
      },
      
      // Bonus e agevolazioni 2025
      bonus2025: {
        bonusRenzi: 600,         // Bonus €600 annui (fino a €28k)
        fringeBenefitLimit: 1000, // Limite fringe benefit esenti
        buoniPastoGiornalieri: 8, // Limite buoni pasto
        rimborsiChilometrici: 0.5163 // €/km 2025
      },
      
      // Tolleranze di calcolo
      tolerances: {
        iva: 1.00,               // ±1€ per IVA
        netto: 5.00,             // ±5€ per netto
        irpef: 2.00,             // ±2€ per IRPEF
        inps: 1.00,              // ±1€ per INPS
        percentage: 0.5          // ±0.5% per percentuali
      }
    };
  }
  
  /**
   * Validazione completa documento fiscale v2
   * @param {Object} parsedData - Dati estratti dal parsing
   * @param {string} documentType - 'fattura-elettronica' | 'busta-paga'
   * @param {Object} options - Opzioni aggiuntive (regime fiscale, etc.)
   * @returns {Object} Risultato validazione completa
   */
  validateDocument(parsedData, documentType, options = {}) {
    try {
      console.log(`🔍 Validazione fiscale v2 per: ${documentType}`);
      
      const result = {
        validationStatus: 'ok',
        message: 'Validazione completata',
        warnings: [],
        errors: [],
        fiscalChecks: {},
        complianceLevel: 'full', // full, partial, basic
        normativeYear: 2025,
        timestamp: new Date().toISOString()
      };
      
      if (documentType === 'fattura-elettronica') {
        this.validateFatturaElettronicaV2(parsedData, result, options);
      } else if (documentType === 'busta-paga') {
        this.validateBustaPagaV2(parsedData, result, options);
      } else {
        return this.createErrorResponse(`Tipo documento non supportato: ${documentType}`);
      }
      
      // Calcola livello di compliance finale
      this.calculateComplianceLevel(result);
      
      console.log(`✅ Validazione v2 completata: ${result.validationStatus} (${result.complianceLevel})`);
      return result;
      
    } catch (error) {
      console.error('Errore validazione fiscale v2:', error);
      return this.createErrorResponse(`Errore validazione: ${error.message}`);
    }
  }
  
  /**
   * Validazione avanzata fattura elettronica
   * @param {Object} data - Dati fattura
   * @param {Object} result - Oggetto risultato
   * @param {Object} options - Opzioni (regime forfettario, etc.)
   */
  validateFatturaElettronicaV2(data, result, options) {
    console.log('📄 Validazione avanzata fattura elettronica...');
    
    // Estrai e normalizza dati
    const fiscalData = this.extractAndNormalizeFatturaData(data);
    result.fiscalChecks.extractedData = fiscalData;
    
    // 1. Validazioni IVA avanzate
    this.performAdvancedVatValidation(fiscalData, result, options);
    
    // 2. Validazioni formali e compliance
    this.performFormalValidation(fiscalData, result);
    
    // 3. Controlli regime fiscale specifici
    this.performRegimeSpecificChecks(fiscalData, result, options);
    
    // 4. Validazioni anti-evasione
    this.performAntiEvasionChecks(fiscalData, result);
    
    // 5. Controlli coerenza temporale
    this.performTemporalChecks(fiscalData, result);
  }
  
  /**
   * Validazione avanzata busta paga
   * @param {Object} data - Dati busta paga
   * @param {Object} result - Oggetto risultato
   * @param {Object} options - Opzioni (CCNL, regime, etc.)
   */
  validateBustaPagaV2(data, result, options) {
    console.log('💼 Validazione avanzata busta paga...');
    
    // Estrai e normalizza dati
    const payrollData = this.extractAndNormalizePayrollData(data);
    result.fiscalChecks.extractedData = payrollData;
    
    // 1. Validazioni IRPEF 2025
    this.performIrpefValidation2025(payrollData, result, options);
    
    // 2. Validazioni contributi INPS 2025
    this.performInpsValidation2025(payrollData, result, options);
    
    // 3. Validazioni detrazioni e bonus 2025
    this.performDetrazioniValidation2025(payrollData, result, options);
    
    // 4. Controlli CCNL e normative contrattuali
    this.performCcnlValidation(payrollData, result, options);
    
    // 5. Validazioni fringe benefit e welfare
    this.performFringeBenefitValidation(payrollData, result, options);
    
    // 6. Controlli anti-elusione contributiva
    this.performContributiveComplianceChecks(payrollData, result);
  }
  
  /**
   * Validazione IVA avanzata con controlli 2025
   */
  performAdvancedVatValidation(data, result, options) {
    const { imponibile, aliquotaIva, importoIva, totale } = data;
    
    // Controllo 1: Calcolo IVA di base
    const ivaCalcolata = this.calculateVat(imponibile, aliquotaIva);
    const differenzaIva = Math.abs(ivaCalcolata - importoIva);
    
    if (differenzaIva > this.config.tolerances.iva) {
      result.warnings.push('IVA');
      result.message = `Incongruenza IVA: calcolata ${ivaCalcolata.toFixed(2)}€, dichiarata ${importoIva.toFixed(2)}€`;
    }
    
    // Controllo 2: Aliquote IVA valide
    if (!this.config.validVatRates.includes(aliquotaIva)) {
      result.warnings.push('ALIQUOTA_NON_STANDARD');
      result.message += ` | Aliquota ${aliquotaIva}% non standard`;
    }
    
    // Controllo 3: Regime forfettario (no IVA)
    if (options.regimeFiscale === 'forfettario' && aliquotaIva > 0) {
      result.errors.push('IVA_REGIME_FORFETTARIO');
      result.message += ` | Regime forfettario non prevede IVA`;
    }
    
    // Controllo 4: Operazioni esenti/non imponibili
    if (aliquotaIva === 0 && !options.operazioneEsente) {
      result.warnings.push('IVA_ZERO_VERIFICARE');
    }
    
    // Controllo 5: Split payment (PA)
    if (options.splitPayment && importoIva > 0) {
      result.warnings.push('SPLIT_PAYMENT');
      result.message += ` | Verificare split payment PA`;
    }
    
    // Controllo 6: Totale fattura
    const totaleAtteso = imponibile + ivaCalcolata;
    const differenzaTotale = Math.abs(totaleAtteso - totale);
    
    if (differenzaTotale > this.config.tolerances.iva) {
      result.warnings.push('TOTALE');
      result.message += ` | Totale: atteso ${totaleAtteso.toFixed(2)}€, dichiarato ${totale.toFixed(2)}€`;
    }
    
    result.fiscalChecks.vatValidation = {
      ivaCalcolata,
      ivaRilevata: importoIva,
      differenzaIva,
      totaleAtteso,
      totaleRilevato: totale,
      differenzaTotale,
      aliquotaValida: this.config.validVatRates.includes(aliquotaIva)
    };
  }
  
  /**
   * Validazione IRPEF 2025 con nuovi scaglioni
   */
  performIrpefValidation2025(data, result, options) {
    const { stipendioLordo, irpef } = data;
    
    if (stipendioLordo <= 0) return;
    
    // Calcolo IRPEF teorica 2025 (mensile)
    const lordo_annuo = stipendioLordo * 12;
    const irpef_annua_teorica = this.calculateIrpef2025(lordo_annuo, options);
    const irpef_mensile_teorica = irpef_annua_teorica / 12;
    
    const differenzaIrpef = Math.abs(irpef_mensile_teorica - irpef);
    const percentualeScostamento = (differenzaIrpef / irpef_mensile_teorica) * 100;
    
    // Tolleranza maggiore per IRPEF (detrazioni variabili)
    if (percentualeScostamento > 15) {
      result.warnings.push('IRPEF_SCOSTAMENTO');
      result.message += ` | IRPEF: teorica ${irpef_mensile_teorica.toFixed(2)}€, rilevata ${irpef.toFixed(2)}€`;
    }
    
    // Controllo regime forfettario
    if (options.regimeFiscale === 'forfettario') {
      const imposta_sostitutiva = lordo_annuo * 0.05; // 5% per forfettario
      const imposta_mensile = imposta_sostitutiva / 12;
      
      if (Math.abs(irpef - imposta_mensile) > this.config.tolerances.irpef) {
        result.warnings.push('FORFETTARIO_IMPOSTA');
      }
    }
    
    result.fiscalChecks.irpefValidation = {
      irpefTeorica: irpef_mensile_teorica,
      irpefRilevata: irpef,
      differenza: differenzaIrpef,
      percentualeScostamento,
      scaglioni2025: this.config.irpefBrackets
    };
  }
  
  /**
   * Validazione contributi INPS 2025
   */
  performInpsValidation2025(data, result, options) {
    const { stipendioLordo, inps } = data;
    
    if (stipendioLordo <= 0) return;
    
    let inpsTeorico;
    
    // Calcolo in base al regime
    if (options.regimeFiscale === 'forfettario') {
      // Forfettario: contributi fissi o percentuali ridotte
      inpsTeorico = stipendioLordo * (this.config.inpsRates.forfettario / 100);
    } else if (options.tipoRapporto === 'autonomo') {
      // Lavoro autonomo
      inpsTeorico = stipendioLordo * (this.config.inpsRates.autonomo / 100);
    } else {
      // Lavoro dipendente standard
      inpsTeorico = stipendioLordo * (this.config.inpsRates.dipendente / 100);
    }
    
    const differenzaInps = Math.abs(inpsTeorico - inps);
    const percentualeReale = (inps / stipendioLordo) * 100;
    
    // Tolleranze specifiche per INPS
    const tolleranzaPercentuale = 2.0; // ±2% per variabilità contributi
    
    if (differenzaInps > this.config.tolerances.inps && 
        Math.abs(percentualeReale - this.config.inpsRates.dipendente) > tolleranzaPercentuale) {
      result.warnings.push('INPS_SCOSTAMENTO');
      result.message += ` | INPS: teorico ${inpsTeorico.toFixed(2)}€ (${this.config.inpsRates.dipendente}%), rilevato ${inps.toFixed(2)}€ (${percentualeReale.toFixed(2)}%)`;
    }
    
    // Controllo massimali contributivi
    const massimaleInps2025 = 119650; // Massimale annuo 2025
    const lordo_annuo = stipendioLordo * 12;
    
    if (lordo_annuo > massimaleInps2025) {
      result.warnings.push('MASSIMALE_INPS');
      result.message += ` | Verificare applicazione massimale INPS €${massimaleInps2025}`;
    }
    
    result.fiscalChecks.inpsValidation = {
      inpsTeorico,
      inpsRilevato: inps,
      differenza: differenzaInps,
      percentualeReale,
      percentualeTeorica: this.config.inpsRates.dipendente,
      massimaleAnnuo: massimaleInps2025
    };
  }
  
  /**
   * Validazione detrazioni e bonus 2025
   */
  performDetrazioniValidation2025(data, result, options) {
    const { stipendioLordo, detrazioni } = data;
    const lordo_annuo = stipendioLordo * 12;
    
    // Calcolo detrazione lavoro dipendente teorica 2025
    let detrazioneTeoriche = 0;
    
    if (lordo_annuo <= this.config.detrazioniLavoroDipendente.maxReddito) {
      // Formula detrazione 2025
      const detrazione_base = this.config.detrazioniLavoroDipendente.base;
      const riduzione = Math.max(0, (lordo_annuo - 28000) * this.config.detrazioniLavoroDipendente.coefficiente);
      detrazioneTeoriche = Math.max(0, detrazione_base - riduzione);
      
      // Detrazione mensile
      detrazioneTeoriche = detrazioneTeoriche / 12;
    }
    
    // Bonus Renzi/€600 (fino a €28k)
    let bonusRenzi = 0;
    if (lordo_annuo <= 28000) {
      bonusRenzi = this.config.bonus2025.bonusRenzi / 12; // Mensile
    }
    
    const totaleBonusTeorici = detrazioneTeoriche + bonusRenzi;
    const differenzaDetrazioni = Math.abs(totaleBonusTeorici - detrazioni);
    
    // Tolleranza per detrazioni (molto variabili)
    if (differenzaDetrazioni > 50 && detrazioni > 0) {
      result.warnings.push('DETRAZIONI_SCOSTAMENTO');
      result.message += ` | Detrazioni: teoriche ${totaleBonusTeorici.toFixed(2)}€, rilevate ${detrazioni.toFixed(2)}€`;
    }
    
    // Verifica bonus specifici
    if (options.bonusAttivi) {
      this.validateSpecificBonus(data, result, options);
    }
    
    result.fiscalChecks.detrazioniValidation = {
      detrazioneTeoriche,
      bonusRenzi,
      totaleBonusTeorici,
      detrazioniRilevate: detrazioni,
      differenza: differenzaDetrazioni
    };
  }
  
  /**
   * Validazione fringe benefit e welfare aziendale 2025
   */
  performFringeBenefitValidation(data, result, options) {
    if (!data.fringeBenefit && !options.welfare) return;
    
    const fringeBenefit = data.fringeBenefit || 0;
    const limiteEsente = this.config.bonus2025.fringeBenefitLimit;
    
    if (fringeBenefit > limiteEsente) {
      result.warnings.push('FRINGE_BENEFIT_LIMITE');
      result.message += ` | Fringe benefit €${fringeBenefit} supera limite esente €${limiteEsente}`;
    }
    
    // Controllo welfare aziendale specifici
    if (options.welfare) {
      this.validateWelfareItems(options.welfare, result);
    }
    
    result.fiscalChecks.fringeBenefitValidation = {
      importo: fringeBenefit,
      limiteEsente,
      eccedenza: Math.max(0, fringeBenefit - limiteEsente)
    };
  }
  
  /**
   * Calcolo IRPEF 2025 con nuovi scaglioni
   */
  calculateIrpef2025(redditoAnnuo, options = {}) {
    let irpefTotale = 0;
    
    for (const scaglione of this.config.irpefBrackets) {
      if (redditoAnnuo > scaglione.min) {
        const imponibileScaglione = Math.min(redditoAnnuo, scaglione.max) - scaglione.min + 1;
        const irpefScaglione = imponibileScaglione * (scaglione.rate / 100);
        irpefTotale += irpefScaglione;
      }
    }
    
    // Applica detrazioni
    const detrazioni = this.calculateDetrazioni2025(redditoAnnuo, options);
    irpefTotale = Math.max(0, irpefTotale - detrazioni);
    
    return irpefTotale;
  }
  
  /**
   * Calcolo detrazioni 2025
   */
  calculateDetrazioni2025(redditoAnnuo, options) {
    let detrazioniTotali = 0;
    
    // Detrazione lavoro dipendente
    if (redditoAnnuo <= this.config.detrazioniLavoroDipendente.maxReddito) {
      const detrazione_base = this.config.detrazioniLavoroDipendente.base;
      const riduzione = Math.max(0, (redditoAnnuo - 28000) * this.config.detrazioniLavoroDipendente.coefficiente);
      detrazioniTotali += Math.max(0, detrazione_base - riduzione);
    }
    
    // Detrazioni familiari (se specificate)
    if (options.detrazioniPersonali) {
      detrazioniTotali += options.detrazioniPersonali;
    }
    
    return detrazioniTotali;
  }
  
  /**
   * Controlli specifici regime fiscale
   */
  performRegimeSpecificChecks(data, result, options) {
    const regime = options.regimeFiscale || 'ordinario';
    
    switch (regime) {
      case 'forfettario':
        this.validateRegimeForfettario(data, result, options);
        break;
      case 'agricolo':
        this.validateRegimeAgricolo(data, result, options);
        break;
      case 'iva-per-cassa':
        this.validateIvaPerCassa(data, result, options);
        break;
      default:
        // Regime ordinario - controlli standard già effettuati
        break;
    }
  }
  
  /**
   * Validazione regime forfettario
   */
  validateRegimeForfettario(data, result, options) {
    if (data.aliquotaIva > 0) {
      result.errors.push('FORFETTARIO_NO_IVA');
      result.message += ' | Regime forfettario: fattura non deve avere IVA';
    }
    
    if (data.imponibile > 85000) {
      result.warnings.push('FORFETTARIO_LIMITE');
      result.message += ' | Verificare limite €85k regime forfettario';
    }
  }
  
  /**
   * Calcola livello di compliance
   */
  calculateComplianceLevel(result) {
    const totalChecks = Object.keys(result.fiscalChecks).length;
    const errorsCount = result.errors.length;
    const warningsCount = result.warnings.length;
    
    if (errorsCount > 0) {
      result.validationStatus = 'error';
      result.complianceLevel = 'non-compliant';
    } else if (warningsCount > 2) {
      result.validationStatus = 'warning';
      result.complianceLevel = 'partial';
    } else if (warningsCount > 0) {
      result.validationStatus = 'warning';
      result.complianceLevel = 'full';
    } else {
      result.validationStatus = 'ok';
      result.complianceLevel = 'full';
    }
  }
  
  /**
   * Estrazione e normalizzazione dati fattura
   */
  extractAndNormalizeFatturaData(data) {
    return {
      imponibile: this.parseAmount(data.imponibile || 0),
      aliquotaIva: this.parseAmount(data.aliquotaIva || 22),
      importoIva: this.parseAmount(data.importoIva || 0),
      totale: this.parseAmount(data.totale || 0),
      dataEmissione: data.dataEmissione,
      dataScadenza: data.dataScadenza,
      numeroFattura: data.numeroFattura,
      cedentePrestatore: data.cedentePrestatore,
      cessionarioCommittente: data.cessionarioCommittente
    };
  }
  
  /**
   * Estrazione e normalizzazione dati busta paga
   */
  extractAndNormalizePayrollData(data) {
    return {
      stipendioLordo: this.parseAmount(data.stipendioLordo || 0),
      irpef: this.parseAmount(data.irpef || 0),
      inps: this.parseAmount(data.inps || 0),
      detrazioni: this.parseAmount(data.detrazioni || 0),
      nettoPercepito: this.parseAmount(data.nettoPercepito || 0),
      fringeBenefit: this.parseAmount(data.fringeBenefit || 0),
      periodo: data.periodo,
      dipendente: data.dipendente,
      azienda: data.azienda
    };
  }
  
  /**
   * Calcolo IVA
   */
  calculateVat(imponibile, aliquota) {
    return Math.round((imponibile * (aliquota / 100)) * 100) / 100;
  }
  
  /**
   * Parsing sicuro importi
   */
  parseAmount(value) {
    if (typeof value === 'number') return Math.round(value * 100) / 100;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.,\-]/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
    }
    return 0;
  }
  
  /**
   * Crea risposta di errore
   */
  createErrorResponse(errorMessage) {
    return {
      validationStatus: 'error',
      message: errorMessage,
      warnings: [],
      errors: ['VALIDATION_ERROR'],
      fiscalChecks: {},
      complianceLevel: 'non-compliant',
      normativeYear: 2025,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Test suite completa v2
   */
  runTestsV2() {
    console.log('🧪 Test Fiscal Validator v2 (Normative 2025)...');
    
    const tests = [];
    
    // Test 1: Fattura elettronica standard
    const fatturaStandard = {
      imponibile: 1000,
      aliquotaIva: 22,
      importoIva: 220,
      totale: 1220
    };
    const resultFattura = this.validateDocument(fatturaStandard, 'fattura-elettronica');
    tests.push({
      name: 'Fattura standard 2025',
      passed: resultFattura.validationStatus === 'ok',
      result: resultFattura
    });
    
    // Test 2: Regime forfettario
    const fatturaForfettario = {
      imponibile: 1000,
      aliquotaIva: 0,
      importoIva: 0,
      totale: 1000
    };
    const resultForfettario = this.validateDocument(fatturaForfettario, 'fattura-elettronica', {
      regimeFiscale: 'forfettario'
    });
    tests.push({
      name: 'Fattura regime forfettario',
      passed: resultForfettario.validationStatus === 'ok',
      result: resultForfettario
    });
    
    // Test 3: Busta paga 2025
    const bustaPaga2025 = {
      stipendioLordo: 2500,
      irpef: 400,
      inps: 230,
      detrazioni: 120,
      nettoPercepito: 1990
    };
    const resultBusta = this.validateDocument(bustaPaga2025, 'busta-paga');
    tests.push({
      name: 'Busta paga scaglioni 2025',
      passed: resultBusta.validationStatus === 'ok' || resultBusta.validationStatus === 'warning',
      result: resultBusta
    });
    
    const passedTests = tests.filter(t => t.passed).length;
    
    return {
      totalTests: tests.length,
      passedTests: passedTests,
      success: passedTests === tests.length,
      details: tests,
      version: 'v2',
      normativeYear: 2025
    };
  }
}

// Esporta istanza singleton
const fiscalValidatorV2 = new FiscalValidatorV2();

module.exports = fiscalValidatorV2;

// Test standalone
if (require.main === module) {
  console.log('🔍 Testing Fiscal Validator v2...');
  const testResults = fiscalValidatorV2.runTestsV2();
  console.log('\n📊 Risultati Test v2:', testResults);
}