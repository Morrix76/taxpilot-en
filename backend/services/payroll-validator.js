// File: backend/services/payroll-validator.js
// Controlli intelligenti per buste paga italiane
// Si integra con pdf-ocr.js SENZA modificarlo

class PayrollValidator {
  
  constructor() {
    // Database CCNL semplificato (i principali settori italiani)
    this.ccnlDatabase = {
      'commercio': {
        name: 'Commercio e Terziario',
        levels: {
          1: { minimo: 1200, descrizione: 'Livello 1° Super' },
          2: { minimo: 1350, descrizione: 'Livello 2°' },
          3: { minimo: 1500, descrizione: 'Livello 3°' },
          4: { minimo: 1750, descrizione: 'Livello 4°' },
          5: { minimo: 2100, descrizione: 'Livello 5°' },
          6: { minimo: 2500, descrizione: 'Livello 6°' },
          7: { minimo: 3200, descrizione: 'Livello 7° - Quadri' }
        },
        maxStraordinari: 250, // ore annue
        inpsRate: 9.19 // %
      },
      'metalmeccanico': {
        name: 'Metalmeccanici',
        levels: {
          1: { minimo: 1400, descrizione: 'Operaio generico' },
          2: { minimo: 1550, descrizione: 'Operaio qualificato' },
          3: { minimo: 1750, descrizione: 'Operaio specializzato' },
          4: { minimo: 2200, descrizione: 'Impiegato' },
          5: { minimo: 2800, descrizione: 'Impiegato direttivo' },
          6: { minimo: 3500, descrizione: 'Quadro' }
        },
        maxStraordinari: 200,
        inpsRate: 9.19
      },
      'edilizia': {
        name: 'Edilizia',
        levels: {
          1: { minimo: 1300, descrizione: 'Operaio comune' },
          2: { minimo: 1450, descrizione: 'Operaio qualificato' },
          3: { minimo: 1650, descrizione: 'Operaio specializzato' },
          4: { minimo: 2000, descrizione: 'Capo operaio' },
          5: { minimo: 2400, descrizione: 'Impiegato tecnico' }
        },
        maxStraordinari: 180,
        inpsRate: 10.0 // Edilizia ha aliquote diverse
      },
      'pubblico': {
        name: 'Pubblica Amministrazione',
        levels: {
          'A1': { minimo: 1350, descrizione: 'Area A - posizione A1' },
          'A2': { minimo: 1500, descrizione: 'Area A - posizione A2' },
          'B1': { minimo: 1700, descrizione: 'Area B - posizione B1' },
          'B3': { minimo: 2000, descrizione: 'Area B - posizione B3' },
          'C1': { minimo: 2200, descrizione: 'Area C - posizione C1' },
          'C5': { minimo: 2800, descrizione: 'Area C - posizione C5' },
          'D1': { minimo: 3200, descrizione: 'Area D - posizione D1' },
          'D6': { minimo: 4200, descrizione: 'Area D - posizione D6' }
        },
        maxStraordinari: 120,
        inpsRate: 9.19
      }
    };

    // Scaglioni IRPEF 2025 (aggiornati)
    this.irpefRates = [
      { max: 28000, rate: 23 },
      { max: 50000, rate: 35 },
      { max: Infinity, rate: 43 }
    ];

    // Detrazioni standard per tipologia
    this.standardDeductions = {
      lavoro_dipendente: 1880, // Base annua
      famiglia_numerosa: 1200,
      figli_carico: 950,
      coniuge_carico: 800,
      disabilita: 750
    };
  }

  /**
   * FUNZIONE PRINCIPALE - Valida dati busta paga estratti da OCR
   * @param {Object} ocrData - Dati estratti da pdf-ocr.js
   * @param {Object} employeeInfo - Info dipendente (CCNL, livello, etc.)
   * @returns {Object} Risultati validazione completa
   */
  async validatePayslip(ocrData, employeeInfo = {}) {
    console.log('🔍 Avvio controlli intelligenti busta paga...');
    
    const validationResult = {
      // Mantiene tutti i dati OCR originali
      ...ocrData,
      
      // Aggiunge risultati validazione
      validation: {
        overall: 'unknown',
        score: 0,
        issues: [],
        warnings: [],
        compliance: {},
        suggestions: []
      },
      
      // Info dipendente elaborata
      employee: this.processEmployeeInfo(employeeInfo),
      
      // Timestamp validazione
      validatedAt: new Date().toISOString()
    };

    try {
      // 1. CONTROLLI CCNL
      await this.validateCCNLCompliance(validationResult);
      
      // 2. CONTROLLI FISCALI
      await this.validateTaxCompliance(validationResult);
      
      // 3. CONTROLLI MATEMATICI
      await this.validateCalculations(validationResult);
      
      // 4. ANALISI ANOMALIE
      await this.detectAnomalies(validationResult);
      
      // 5. CONTROLLI CONTRIBUTIVI
      await this.validateContributions(validationResult);
      
      // 6. CALCOLO SCORE FINALE
      this.calculateOverallScore(validationResult);
      
      console.log(`✅ Validazione completata - Score: ${validationResult.validation.score}/100`);
      
    } catch (error) {
      console.error('❌ Errore durante validazione:', error);
      validationResult.validation.issues.push({
        type: 'system_error',
        severity: 'high',
        message: `Errore validazione: ${error.message}`,
        suggestion: 'Riprovare o contattare supporto tecnico'
      });
    }
    
    return validationResult;
  }

  /**
   * 1. CONTROLLI CONFORMITÀ CCNL
   */
  async validateCCNLCompliance(result) {
    const { employee } = result;
    
    if (!employee.ccnl || !employee.level) {
      result.validation.warnings.push({
        type: 'missing_ccnl_info',
        message: 'CCNL o livello non specificato - controlli limitati',
        suggestion: 'Fornire informazioni CCNL per controlli completi'
      });
      return;
    }

    const ccnl = this.ccnlDatabase[employee.ccnl];
    if (!ccnl) {
      result.validation.warnings.push({
        type: 'unknown_ccnl',
        message: `CCNL "${employee.ccnl}" non trovato nel database`,
        suggestion: 'Verificare correttezza CCNL o aggiornare database'
      });
      return;
    }

    const levelInfo = ccnl.levels[employee.level];
    if (!levelInfo) {
      result.validation.issues.push({
        type: 'invalid_level',
        severity: 'medium',
        message: `Livello "${employee.level}" non valido per CCNL ${ccnl.name}`,
        suggestion: `Livelli disponibili: ${Object.keys(ccnl.levels).join(', ')}`
      });
      return;
    }

    // Controllo minimo retributivo
    const minimoMensile = levelInfo.minimo;
    if (result.stipendioLordo < minimoMensile) {
      result.validation.issues.push({
        type: 'below_minimum_wage',
        severity: 'high',
        message: `Stipendio ${result.stipendioLordo}€ sotto minimo CCNL (${minimoMensile}€)`,
        suggestion: `Adeguare a minimo ${ccnl.name} livello ${employee.level}`,
        reference: `CCNL ${ccnl.name} - ${levelInfo.descrizione}`
      });
    } else if (result.stipendioLordo === minimoMensile) {
      result.validation.warnings.push({
        type: 'exact_minimum_wage',
        message: 'Stipendio pari al minimo CCNL',
        suggestion: 'Verificare eventuali scatti di anzianità o superminimi'
      });
    }

    // Controllo ore straordinarie (se disponibili)
    if (employee.extraHours > 0) {
      const maxStraordinariMensili = ccnl.maxStraordinari / 12;
      if (employee.extraHours > maxStraordinariMensili) {
        result.validation.issues.push({
          type: 'excessive_overtime',
          severity: 'medium',
          message: `Ore straordinarie ${employee.extraHours}h superano limite CCNL (${maxStraordinariMensili.toFixed(1)}h/mese)`,
          suggestion: 'Verificare conformità ai limiti contrattuali',
          reference: `CCNL ${ccnl.name} - max ${ccnl.maxStraordinari}h/anno`
        });
      }
    }

    result.validation.compliance.ccnl = {
      validated: true,
      ccnl: ccnl.name,
      level: employee.level,
      minimumWage: minimoMensile,
      actualWage: result.stipendioLordo,
      compliance: result.stipendioLordo >= minimoMensile
    };
  }

  /**
   * 2. CONTROLLI CONFORMITÀ FISCALE
   */
  async validateTaxCompliance(result) {
    if (result.stipendioLordo === 0) return;

    const stipendioAnnuo = result.stipendioLordo * 12;
    const irpefAnnua = result.irpef * 12;
    
    // Calcola IRPEF teorica
    const irpefTeorica = this.calculateTheoreticalIRPEF(stipendioAnnuo, result.detrazioni * 12);
    const irpefTeoricaMensile = irpefTeorica / 12;
    
    const differenzaPerc = Math.abs(result.irpef - irpefTeoricaMensile) / irpefTeoricaMensile * 100;
    
    if (differenzaPerc > 20) {
      result.validation.issues.push({
        type: 'irpef_mismatch',
        severity: 'medium',
        message: `IRPEF ${result.irpef}€ differisce dal teorico ${irpefTeoricaMensile.toFixed(2)}€ (${differenzaPerc.toFixed(1)}%)`,
        suggestion: 'Verificare calcolo IRPEF e detrazioni applicate',
        details: {
          actual: result.irpef,
          theoretical: irpefTeoricaMensile,
          difference: differenzaPerc
        }
      });
    } else if (differenzaPerc > 10) {
      result.validation.warnings.push({
        type: 'irpef_variance',
        message: `IRPEF varia del ${differenzaPerc.toFixed(1)}% dal teorico`,
        suggestion: 'Differenza accettabile ma verificare se normale'
      });
    }

    // Controllo detrazioni plausibili
    const detrazioneMassimaAnnua = this.calculateMaxDeduction(stipendioAnnuo);
    const detrazioneAnnua = result.detrazioni * 12;
    
    if (detrazioneAnnua > detrazioneMassimaAnnua * 1.5) {
      result.validation.issues.push({
        type: 'excessive_deductions',
        severity: 'medium',
        message: `Detrazioni ${detrazioneAnnua}€/anno sembrano eccessive (max teorico: ${detrazioneMassimaAnnua}€)`,
        suggestion: 'Verificare correttezza detrazioni familiari e lavoro dipendente'
      });
    }

    result.validation.compliance.tax = {
      validated: true,
      annualSalary: stipendioAnnuo,
      actualIRPEF: irpefAnnua,
      theoreticalIRPEF: irpefTeorica,
      variance: differenzaPerc,
      deductionsOk: detrazioneAnnua <= detrazioneMassimaAnnua * 1.5
    };
  }

  /**
   * 3. CONTROLLI MATEMATICI
   */
  async validateCalculations(result) {
    // Calcolo netto teorico
    const nettoTeorico = result.stipendioLordo - result.irpef - result.inps + result.detrazioni;
    const differenzaNetto = Math.abs(result.nettoPercepito - nettoTeorico);
    
    if (differenzaNetto > 50) {
      result.validation.issues.push({
        type: 'calculation_error',
        severity: 'high',
        message: `Errore calcolo: netto ${result.nettoPercepito}€ vs teorico ${nettoTeorico.toFixed(2)}€`,
        suggestion: 'Verificare calcoli o voci aggiuntive non rilevate',
        details: {
          formula: 'Lordo - IRPEF - INPS + Detrazioni',
          calculated: nettoTeorico,
          actual: result.nettoPercepito,
          difference: differenzaNetto
        }
      });
    } else if (differenzaNetto > 10) {
      result.validation.warnings.push({
        type: 'minor_calculation_variance',
        message: `Piccola differenza calcolo netto: ${differenzaNetto.toFixed(2)}€`,
        suggestion: 'Possibili voci aggiuntive (mensa, trasporti, etc.)'
      });
    }

    // Controllo percentuali ragionevoli
    const percIrpef = (result.irpef / result.stipendioLordo) * 100;
    const percInps = (result.inps / result.stipendioLordo) * 100;
    const percNetto = (result.nettoPercepito / result.stipendioLordo) * 100;

    if (percIrpef > 45) {
      result.validation.issues.push({
        type: 'high_tax_rate',
        severity: 'medium',
        message: `IRPEF ${percIrpef.toFixed(1)}% molto alta per questo stipendio`,
        suggestion: 'Verificare scaglioni IRPEF e detrazioni'
      });
    }

    if (percInps > 12) {
      result.validation.issues.push({
        type: 'high_inps_rate',
        severity: 'medium',
        message: `INPS ${percInps.toFixed(1)}% sopra standard (9.19%)`,
        suggestion: 'Verificare aliquote contributive settore/categoria'
      });
    }

    if (percNetto < 60) {
      result.validation.warnings.push({
        type: 'low_net_percentage',
        message: `Netto ${percNetto.toFixed(1)}% del lordo sembra basso`,
        suggestion: 'Verificare totalità trattenute e detrazioni'
      });
    }

    result.validation.compliance.calculations = {
      validated: true,
      netVariance: differenzaNetto,
      taxRate: percIrpef,
      inpsRate: percInps,
      netRate: percNetto,
      calculationsOk: differenzaNetto <= 50
    };
  }

  /**
   * 4. ANALISI ANOMALIE
   */
  async detectAnomalies(result) {
    const anomalies = [];

    // Anomalia 1: Stipendio molto alto/basso
    if (result.stipendioLordo > 8000) {
      anomalies.push({
        type: 'high_salary',
        severity: 'info',
        message: `Stipendio ${result.stipendioLordo}€ sopra media italiana`,
        suggestion: 'Verificare se dirigente/quadro superiore'
      });
    } else if (result.stipendioLordo < 1000) {
      anomalies.push({
        type: 'low_salary',
        severity: 'medium',
        message: `Stipendio ${result.stipendioLordo}€ sotto minimi usuali`,
        suggestion: 'Verificare part-time o apprendistato'
      });
    }

    // Anomalia 2: IRPEF zero con stipendio alto
    if (result.stipendioLordo > 1500 && result.irpef === 0) {
      anomalies.push({
        type: 'zero_tax_high_salary',
        severity: 'high',
        message: 'IRPEF zero con stipendio significativo',
        suggestion: 'Verificare detrazioni eccessive o errore calcolo'
      });
    }

    // Anomalia 3: Netto superiore al lordo
    if (result.nettoPercepito > result.stipendioLordo) {
      anomalies.push({
        type: 'net_higher_than_gross',
        severity: 'high',
        message: 'Netto superiore al lordo - errore grave',
        suggestion: 'Verificare estrazione dati OCR'
      });
    }

    // Anomalia 4: Tutte le voci uguali
    const uniqueValues = new Set([
      result.stipendioLordo, 
      result.irpef, 
      result.inps, 
      result.nettoPercepito
    ].filter(v => v > 0));
    
    if (uniqueValues.size === 1) {
      anomalies.push({
        type: 'identical_values',
        severity: 'high',
        message: 'Tutti gli importi identici - possibile errore OCR',
        suggestion: 'Verificare qualità scansione documento'
      });
    }

    result.validation.anomalies = anomalies;
    result.validation.warnings.push(...anomalies.filter(a => a.severity === 'info'));
    result.validation.issues.push(...anomalies.filter(a => a.severity !== 'info'));
  }

  /**
   * 5. CONTROLLI CONTRIBUTIVI
   */
  async validateContributions(result) {
    const { employee } = result;
    
    if (result.stipendioLordo === 0) return;

    // INPS standard
    let inpsRateExpected = 9.19; // Default
    
    if (employee.ccnl && this.ccnlDatabase[employee.ccnl]) {
      inpsRateExpected = this.ccnlDatabase[employee.ccnl].inpsRate;
    }

    const inpsExpected = (result.stipendioLordo * inpsRateExpected) / 100;
    const inpsVariance = Math.abs(result.inps - inpsExpected) / inpsExpected * 100;

    if (inpsVariance > 25) {
      result.validation.issues.push({
        type: 'inps_rate_mismatch',
        severity: 'medium',
        message: `INPS ${result.inps}€ differisce da atteso ${inpsExpected.toFixed(2)}€ (${inpsVariance.toFixed(1)}%)`,
        suggestion: `Verificare aliquota contributiva per ${employee.ccnl || 'settore'}`,
        details: {
          expectedRate: inpsRateExpected,
          actualAmount: result.inps,
          expectedAmount: inpsExpected
        }
      });
    }

    // Controllo contributi minimi/massimi
    const contributiTotali = result.inps;
    const percContributi = (contributiTotali / result.stipendioLordo) * 100;

    if (percContributi > 15) {
      result.validation.warnings.push({
        type: 'high_contributions',
        message: `Contributi totali ${percContributi.toFixed(1)}% sopra media`,
        suggestion: 'Verificare contributi aggiuntivi (fondi pensione, sanitari)'
      });
    }

    result.validation.compliance.contributions = {
      validated: true,
      expectedINPS: inpsExpected,
      actualINPS: result.inps,
      variance: inpsVariance,
      totalContributionRate: percContributi,
      contributionsOk: inpsVariance <= 25
    };
  }

  /**
   * 6. CALCOLO SCORE FINALE
   */
  calculateOverallScore(result) {
    let score = 100;
    
    // Penalità per problemi
    result.validation.issues.forEach(issue => {
      switch (issue.severity) {
        case 'high': score -= 20; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    });

    // Penalità minori per warning
    score -= result.validation.warnings.length * 2;

    // Bonus per completezza dati
    if (result.employee.ccnl && result.employee.level) score += 5;
    if (result.ocrSuccess) score += 5;

    // Normalizza score
    result.validation.score = Math.max(0, Math.min(100, score));
    
    // Determina stato generale
    if (score >= 90) result.validation.overall = 'excellent';
    else if (score >= 75) result.validation.overall = 'good';
    else if (score >= 60) result.validation.overall = 'acceptable';
    else if (score >= 40) result.validation.overall = 'poor';
    else result.validation.overall = 'critical';

    // Genera suggerimenti generali
    this.generateGeneralSuggestions(result);
  }

  /**
   * METODI DI SUPPORTO
   */
  
  processEmployeeInfo(employeeInfo) {
    return {
      ccnl: employeeInfo.ccnl || null,
      level: employeeInfo.level || null,
      extraHours: employeeInfo.extraHours || 0,
      workingHours: employeeInfo.workingHours || 173, // Standard mensili
      seniority: employeeInfo.seniority || 0,
      familyDeductions: employeeInfo.familyDeductions || false
    };
  }

  calculateTheoreticalIRPEF(annualSalary, annualDeductions) {
    const taxableIncome = Math.max(0, annualSalary - annualDeductions);
    let tax = 0;
    let remainingIncome = taxableIncome;

    for (const bracket of this.irpefRates) {
      const bracketIncome = Math.min(remainingIncome, bracket.max);
      tax += (bracketIncome * bracket.rate) / 100;
      remainingIncome -= bracketIncome;
      
      if (remainingIncome <= 0) break;
    }

    return Math.round(tax * 100) / 100;
  }

  calculateMaxDeduction(annualSalary) {
    // Semplificazione detrazioni lavoro dipendente
    if (annualSalary <= 15000) return 1880;
    if (annualSalary <= 28000) return 1910 - (annualSalary - 15000) * 0.0018;
    if (annualSalary <= 55000) return 1783 - (annualSalary - 28000) * 0.0074;
    return 0;
  }

  generateGeneralSuggestions(result) {
    const suggestions = [];

    if (result.validation.score < 70) {
      suggestions.push('Verificare accuratezza dati estratti da busta paga');
    }

    if (!result.employee.ccnl) {
      suggestions.push('Fornire informazioni CCNL per controlli più approfonditi');
    }

    if (result.validation.issues.length > 3) {
      suggestions.push('Consultare consulente del lavoro per anomalie multiple');
    }

    if (result.ocrSuccess === false) {
      suggestions.push('Migliorare qualità scansione per estrazione dati più accurata');
    }

    result.validation.suggestions = suggestions;
  }

  /**
   * METODO DI TEST
   */
  async testValidator() {
    console.log('🧪 Test Payroll Validator...');

    // Dati test realistici
    const testOcrData = {
      stipendioLordo: 2200.00,
      irpef: 420.00,
      inps: 202.00,
      detrazioni: 150.00,
      nettoPercepito: 1728.00,
      ocrSuccess: true,
      warnings: []
    };

    const testEmployeeInfo = {
      ccnl: 'commercio',
      level: 4,
      extraHours: 15,
      familyDeductions: true
    };

    const result = await this.validatePayslip(testOcrData, testEmployeeInfo);

    return {
      success: true,
      testData: testOcrData,
      result: result.validation,
      note: 'Test completato con dati simulati'
    };
  }
}

// Export
module.exports = new PayrollValidator();