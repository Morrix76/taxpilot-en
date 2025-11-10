/**
 * 🎯 DOCUMENT VALIDATOR - UNIFIED CONTROLLER
 *
 * Orchestrates the entire validation process:
 * 1. Technical parser (deterministic checks)
 * 2. AI Analyst (expert analysis)  ← used only if GROQ key is present
 * 3. Unified and optimized result
 */

import { FatturaElettronicaValidator } from './xmlParser.js';
import { AIDocumentAnalyst } from './aiAnalyst.js';

export class DocumentValidator {
  constructor(groqApiKey) {
    // Read env safely (works on Vercel/Railway)
    const envKey = (process.env.GROQ_API_KEY || '').trim();
    this.groqApiKey = (groqApiKey || envKey || '').trim();

    this.parser = new FatturaElettronicaValidator();

    // Instantiate AI only if key exists; never throw here
    this.aiAnalyst = null;
    if (this.groqApiKey) {
      try {
        this.aiAnalyst = new AIDocumentAnalyst(this.groqApiKey);
        console.log('✅ DocumentValidator: AI enabled (Groq key detected)');
      } catch (err) {
        console.error('⚠️ DocumentValidator: AI disabled (init error):', err?.message);
        this.aiAnalyst = null;
      }
    } else {
      console.log('ℹ️ DocumentValidator: AI disabled (missing GROQ_API_KEY)');
    }

    this.processingStats = {
      totalProcessed: 0,
      successRate: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * FULL VALIDATION - Main Entry Point
   *
   * @param {string|Buffer} fileContent - XML file content
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Complete validation result
   */
  async validateDocument(fileContent, options = {}) {
    const startTime = Date.now();

    try {
      console.log('🔍 Starting document validation...');

      // 1) PARSER
      console.log('⚡ Phase 1: Technical checks...');
      const parserResults = await this.runTechnicalValidation(fileContent);

      // 2) AI (only if available/needed)
      console.log('🤖 Phase 2: AI Analysis...');
      const finalResults = await this.runExpertAnalysis(parserResults, fileContent, options);

      // 3) OPTIMIZE
      console.log('✨ Phase 3: Finalizing...');
      const optimizedResults = this.optimizeResults(finalResults);

      // 4) METRICS
      const processingTime = Date.now() - startTime;
      this.updateStats(processingTime, optimizedResults);
      console.log(`✅ Validation completed in ${processingTime}ms`);

      return {
        ...optimizedResults,
        processing: {
          duration_ms: processingTime,
          timestamp: new Date().toISOString(),
          version: '2.0.0'
        }
      };
    } catch (error) {
      console.error('❌ Error during validation:', error);
      return this.handleValidationError(error, Date.now() - startTime);
    }
  }

  // ---------- PHASE 1: Parser ----------
  async runTechnicalValidation(fileContent) {
    try {
      const xmlContent = Buffer.isBuffer(fileContent)
        ? fileContent.toString('utf-8')
        : fileContent;

      const results = await this.parser.validate(xmlContent);
      console.log(`📊 Parser: ${results.errors.length} errors, ${results.warnings.length} warnings`);

      return {
        ...results,
        phase: 'technical',
        confidence: results.isValid ? 0.9 : 0.7,
        source: 'deterministic_parser'
      };
    } catch (error) {
      console.error('❌ Technical parser error:', error);
      throw new Error(`Parser failed: ${error.message}`);
    }
  }

  // ---------- PHASE 2: AI (guarded) ----------
  async runExpertAnalysis(parserResults, xmlContent, options = {}) {
    try {
      console.log('🔍 DEBUG BEFORE AI:', {
        parser_status: parserResults.status,
        parser_errors: parserResults.errors.length,
        parser_isValid: parserResults.isValid
      });

      // Skip AI entirely if not available
      if (!this.aiAnalyst) {
        return this.buildParserOnlyResult(parserResults, {
          ai_error: 'AI disabled: missing GROQ_API_KEY or init error',
          fallback_mode: true
        });
      }

      // Strategy: run AI only if it makes sense
      const needsAI = this.shouldRunAIAnalysis(parserResults, options);
      if (!needsAI) {
        console.log('⚡ Skip AI: simple document, parser only');
        return this.buildParserOnlyResult(parserResults);
      }

      console.log('🤖 Running in-depth AI analysis...');
      const documentContext = this.prepareDocumentContext(parserResults, options);

      const aiResults = await this.aiAnalyst.analyzeWithContext(
        parserResults,
        xmlContent,
        documentContext
      );

      console.log('🔍 DEBUG AFTER AI:', {
        ai_status: aiResults.combined?.overall_status,
        final_confidence: aiResults.combined?.confidence
      });
      console.log(
        `🧠 AI: Analysis completed - ${aiResults.expert?.errori_prioritizzati?.length || 0} recommendations`
      );

      return aiResults;
    } catch (error) {
      console.error('⚠️ AI analysis failed, using parser only:', error?.message);
      return this.buildParserOnlyResult(parserResults, {
        ai_error: error.message,
        fallback_mode: true
      });
    }
  }

  shouldRunAIAnalysis(parserResults, options) {
    if (options.forceAI) return true;
    if (options.skipAI) return false;
    if (parserResults.errors.length > 0) return true;
    if (parserResults.warnings.length > 2) return true;
    if (parserResults.summary?.criticalIssues > 0) return true;
    if (parserResults.isValid && parserResults.warnings.length === 0) return false;
    return true;
  }

  prepareDocumentContext(parserResults, options) {
    return {
      document_type: options.documentType || 'fattura_elettronica',
      business_context: options.businessContext || 'standard',
      user_level: options.userLevel || 'basic',
      priority: options.priority || 'normal',
      compliance_requirements: options.complianceRequirements || ['standard_sdi'],
      parser_summary: {
        total_checks: 15,
        passed_checks:
          15 - parserResults.errors.length - parserResults.warnings.length,
        critical_issues: parserResults.summary?.criticalIssues || 0
      }
    };
  }

  // ---------- Parser-only result ----------
  buildParserOnlyResult(parserResults, metadata = {}) {
    const hasErrors = parserResults.errors.length > 0;
    const hasWarnings = parserResults.warnings.length > 0;

    let finalStatus = 'ok';
    if (hasErrors) finalStatus = 'error';
    else if (hasWarnings) finalStatus = 'warning';

    let confidence = 0.9;
    if (hasErrors) confidence = Math.max(0.3, 0.8 - parserResults.errors.length * 0.15);
    else if (hasWarnings) confidence = Math.max(0.6, 0.85 - parserResults.warnings.length * 0.05);

    return {
      technical: parserResults,
      expert: {
        analisi_generale: {
          gravita_complessiva: hasErrors ? 8 : hasWarnings ? 3 : 1,
          impatto_fiscale: hasErrors ? 'high' : hasWarnings ? 'medium' : 'low',
          conformita_sdi: hasErrors ? 'non_compliant' : 'compliant',
          raccomandazione: hasErrors ? 'correction_mandatory' : hasWarnings ? 'review' : 'approve'
        },
        errori_prioritizzati: parserResults.errors.map(error => ({
          codice: error.code,
          titolo: this.humanizeErrorCode(error.code),
          spiegazione: error.message,
          conseguenze: this.getErrorConsequences(error.code),
          soluzione: this.getErrorSolution(error.code),
          urgenza: this.getErrorUrgency(error.code),
          tempo_stimato: this.getErrorFixTime(error.code)
        })),
        suggerimenti_pratici: this.generatePracticalSuggestions(parserResults),
        valutazione_rischio: {
          rischio_rigetto_sdi: hasErrors ? 'high' : hasWarnings ? 'medium' : 'low',
          rischio_sanzioni: hasErrors ? 'medium' : 'low',
          rischio_controlli: hasErrors ? 'medium' : 'low'
        },
        prossimi_passi: this.generateNextSteps(parserResults),
        note_commercialista: metadata.ai_error
          ? 'AI analysis unavailable - based only on technical checks'
          : 'Quick analysis based on deterministic checks'
      },
      combined: {
        overall_status: finalStatus,
        confidence,
        flag_manual_review: hasErrors || parserResults.warnings.length > 2,
        priority_level: hasErrors ? 'high' : hasWarnings ? 'medium' : 'low',
        estimated_fix_time: this.calculateTotalFixTime(parserResults.errors),
        compliance_score: Math.max(
          100 - parserResults.errors.length * 20 - parserResults.warnings.length * 5,
          0
        )
      },
      metadata: {
        analysis_mode: 'parser_only',
        ai_used: false,
        ...metadata
      }
    };
  }

  // ---------- Optimize ----------
  optimizeResults(results) {
    const deduped = this.deduplicateIssues(results);
    const prioritized = this.prioritizeIssues(deduped);
    const finalMessage = this.generateFinalMessage(prioritized);
    const adjustedConfidence = this.adjustConfidence(prioritized);

    return {
      ...prioritized,
      combined: {
        ...prioritized.combined,
        confidence: adjustedConfidence,
        final_message: finalMessage,
        user_friendly_status: this.getUserFriendlyStatus(prioritized)
      }
    };
  }

  deduplicateIssues(results) {
    if (!results.expert?.errori_prioritizzati) return results;
    const uniqueErrors = results.expert.errori_prioritizzati.filter((e, i, arr) =>
      arr.findIndex(x => x.codice === e.codice) === i
    );
    return { ...results, expert: { ...results.expert, errori_prioritizzati: uniqueErrors } };
    }

  prioritizeIssues(results) {
    if (!results.expert?.errori_prioritizzati) return results;
    const prioritized = results.expert.errori_prioritizzati.sort((a, b) => {
      const aCritical = this.isCriticalForSDI(a.codice);
      const bCritical = this.isCriticalForSDI(b.codice);
      if (aCritical !== bCritical) return bCritical - aCritical;
      return (b.urgenza || 5) - (a.urgenza || 5);
    });
    return { ...results, expert: { ...results.expert, errori_prioritizzati: prioritized } };
  }

  generateFinalMessage(results) {
    const status = results.combined?.overall_status;
    const errorsCount = results.technical?.errors?.length || 0;
    const warningsCount = results.technical?.warnings?.length || 0;

    if (status === 'error') {
      const criticalCount = results.technical?.summary?.criticalIssues || errorsCount;
      const errorText = criticalCount === 1 ? 'critical error' : 'critical errors';
      return `❌ Detected ${criticalCount} ${errorText} preventing submission. Correction needed.`;
    }
    if (status === 'warning') {
      const warningText = warningsCount === 1 ? 'warning' : 'warnings';
      return `⚠️ Valid document with ${warningsCount} ${warningText}. Submission possible, review recommended.`;
    }
    return '📋 Analysis completed - consult details for specific recommendations.';
  }

  getUserFriendlyStatus(results) {
    const status = results.combined?.overall_status;
    switch (status) {
      case 'ok': return 'Compliant ✅';
      case 'warning': return 'Valid with warnings ⚠️';
      case 'error': return 'Errors to correct ❌';
      default: return 'Processing 🔄';
    }
  }

  adjustConfidence(results) {
    let confidence = results.combined?.confidence || 0.5;
    if (results.metadata?.ai_used && results.technical?.isValid) {
      confidence = Math.min(confidence + 0.1, 0.95);
    }
    if (results.metadata?.fallback_mode) {
      confidence = Math.max(confidence - 0.15, 0.3);
    }
    return confidence;
  }

  handleValidationError(error, processingTime) {
    console.error('💥 Validation Error:', error);
    return {
      technical: {
        status: 'error',
        isValid: false,
        errors: [{ code: 'VALIDATION_FAILED', message: `Error during validation: ${error.message}`, level: 'error' }],
        warnings: [],
        details: {},
        summary: { totalErrors: 1, totalWarnings: 0, criticalIssues: 1 }
      },
      expert: {
        analisi_generale: { gravita_complessiva: 10, impatto_fiscale: 'critical', conformita_sdi: 'non_compliant', raccomandazione: 'in_depth_review' },
        note_commercialista: 'Technical error during analysis - recheck the file and try again'
      },
      combined: {
        overall_status: 'error',
        confidence: 0.1,
        flag_manual_review: true,
        priority_level: 'critical',
        final_message: '❌ Technical error during document analysis',
        user_friendly_status: 'Technical Error ⚠️'
      },
      processing: {
        duration_ms: processingTime,
        timestamp: new Date().toISOString(),
        error: error.message
      }
    };
  }

  // ===== Utilities =====
  humanizeErrorCode(code) {
    const codeMap = {
      VAT_CEDENTE_INVALID: 'Invalid Seller VAT Number',
      CF_CEDENTE_INVALID: 'Invalid Seller Tax Code',
      DEST_CODE_FORMAT: 'Incorrect Destination Code Format',
      CALC_TOTALE_DOCUMENTO: 'Error Calculating Document Total',
      MANDATORY_TRASMISSIONE: 'Missing Transmission Data',
      STRUCTURE_HEADER: 'Invalid Header Structure'
    };
    return codeMap[code] || code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  getErrorConsequences(code) {
    if (code.includes('VAT') || code.includes('CF')) return 'The Interchange System (SDI) will automatically reject the document.';
    if (code.includes('CALC')) return 'Potential tax audits due to mathematical inconsistencies.';
    if (code.includes('MANDATORY')) return 'Document cannot be processed by the Interchange System (SDI).';
    return 'Potential issues in transmission or processing by recipients.';
  }

  getErrorSolution(code) {
    if (code.includes('VAT')) return 'Verify the VAT number format (IT + 11 digits) and the check digit. Check VIES if applicable.';
    if (code.includes('CF')) return 'Check the Tax Code (Codice Fiscale) against the official Revenue Agency database.';
    if (code.includes('CALC')) return 'Recalculate totals, verifying the applied VAT rates, discounts, and rounding.';
    return 'Consult the official FatturaPA technical specifications (version 1.7.1 or later).';
  }

  getErrorUrgency(code) {
    if (code.includes('STRUCTURE') || code.includes('MANDATORY')) return 10;
    if (code.includes('VAT') || code.includes('CF') || code.includes('DEST_CODE')) return 9;
    if (code.includes('CALC')) return 7;
    return 5;
  }

  getErrorFixTime(code) {
    if (code.includes('VAT') || code.includes('CF')) return '2 minutes';
    if (code.includes('CALC')) return '10 minutes';
    if (code.includes('FORMAT')) return '5 minutes';
    return '15 minutes';
  }

  generatePracticalSuggestions(parserResults) {
    const suggestions = [];
    if (parserResults.errors.some(e => e.code.includes('VAT'))) {
      suggestions.push('Use the VIES service to verify European VAT numbers if applicable.');
    }
    if (parserResults.errors.some(e => e.code.includes('CALC'))) {
      suggestions.push('Ensure all monetary amounts have a maximum of two decimal places.');
    }
    if (parserResults.warnings.length > 0) {
      suggestions.push('Warnings do not block submission to SDI, but resolving them is recommended for clarity and best practice.');
    }
    return suggestions.length > 0 ? suggestions : [
      'Document appears technically correct according to FatturaPA specifications.'
    ];
  }

  generateNextSteps(parserResults) {
    const steps = [];
    if (parserResults.errors.length > 0) {
      steps.push('Correct the highlighted errors based on priority.');
      steps.push('Regenerate the XML file with the corrected data.');
      steps.push('Repeat the validation process before submitting to SDI.');
    } else {
      steps.push('The document is ready for submission to the Interchange System (SDI).');
      steps.push('Keep a digital copy of the file for 10 years (regulatory requirement).');
      if (parserResults.warnings.length > 0) {
        steps.push('Consider addressing the warnings for improved data quality, although not mandatory for submission.');
      }
    }
    return steps;
  }

  calculateTotalFixTime(errors) {
    if (!errors || errors.length === 0) return '0 minutes';
    const totalMinutes = errors.reduce((total, error) => {
      const timeString = this.getErrorFixTime(error.code);
      const minutes = parseInt(timeString.match(/\d+/)?.[0] || '5', 10);
      return total + minutes;
    }, 0);
    return totalMinutes < 60 ? `${totalMinutes} minutes` : `${Math.ceil(totalMinutes / 60)} hours`;
  }

  isCriticalForSDI(errorCode) {
    const criticalCodes = ['STRUCTURE_', 'MANDATORY_', 'VAT_', 'CF_', 'DEST_CODE_'];
    return criticalCodes.some(prefix => errorCode.startsWith(prefix));
  }

  // --- Statistics ---
  updateStats(processingTime, results) {
    this.processingStats.totalProcessed++;
    const isSuccess = results.combined?.overall_status !== 'error';
    const successTotal =
      this.processingStats.successRate * (this.processingStats.totalProcessed - 1) +
      (isSuccess ? 1 : 0);
    this.processingStats.successRate = successTotal / this.processingStats.totalProcessed;

    const timeTotal =
      this.processingStats.averageProcessingTime * (this.processingStats.totalProcessed - 1) +
      processingTime;
    this.processingStats.averageProcessingTime =
      timeTotal / this.processingStats.totalProcessed;
  }

  getStats() {
    return { ...this.processingStats };
  }
}

// Factory
export const createDocumentValidator = (groqApiKey) => {
  return new DocumentValidator(groqApiKey);
};
