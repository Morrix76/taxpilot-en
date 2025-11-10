/**
 * 🎯 DOCUMENT VALIDATOR - UNIFIED CONTROLLER
 *
 * Orchestrates the entire validation process:
 * 1. Technical parser (deterministic checks)
 * 2. AI Analyst (expert analysis)
 * 3. Unified and optimized result
 */

import { FatturaElettronicaValidator } from './xmlParser.js';
import { AIDocumentAnalyst } from './aiAnalyst.js';
import fs from 'fs/promises';

export class DocumentValidator {
  constructor(groqApiKey) {
    this.parser = new FatturaElettronicaValidator();
    this.aiAnalyst = new AIDocumentAnalyst(groqApiKey);
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

      // 1. PARSER PHASE - Quick technical checks
      console.log('⚡ Phase 1: Technical checks...');
      const parserResults = await this.runTechnicalValidation(fileContent);

      // 2. AI PHASE - Expert analysis (only if necessary)
      console.log('🤖 Phase 2: AI Analysis...');
      const finalResults = await this.runExpertAnalysis(parserResults, fileContent, options);

      // 3. OPTIMIZATION - Post-processing
      console.log('✨ Phase 3: Finalizing...');
      const optimizedResults = this.optimizeResults(finalResults);

      // 4. METRICS
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

  /**
   * PHASE 1: Technical checks with deterministic parser
   */
  async runTechnicalValidation(fileContent) {
    try {
      // Convert Buffer to string if necessary
      const xmlContent = Buffer.isBuffer(fileContent)
        ? fileContent
        : Buffer.from(fileContent, 'utf-8');

      // Parser validation
      const results = await this.parser.parseInvoice(xmlContent);
      
      // Converti formato parser -> formato atteso
      const formattedResults = {
        status: results.technicalIssues > 0 ? 'error' : 'ok',
        isValid: results.technicalIssues === 0,
        errors: results.validationErrors || [],
        warnings: results.warnings || [],
        details: {
          taxableAmount: results.taxableAmount,
          vatRate: results.vatRate,
          vatAmount: results.vatAmount,
          total: results.total,
          issueDate: results.issueDate,
          invoiceNumber: results.invoiceNumber
        },
        summary: {
          totalErrors: results.technicalIssues || 0,
          totalWarnings: results.warnings?.length || 0,
          criticalIssues: results.validationErrors?.filter(e => e.severity === 'critical').length || 0
        }
      };

      console.log(`📊 Parser: ${formattedResults.errors.length} errors, ${formattedResults.warnings.length} warnings`);

      return {
        ...formattedResults,
        phase: 'technical',
        confidence: formattedResults.isValid ? 0.9 : 0.7, // Parser = high confidence
        source: 'deterministic_parser'
      };

    } catch (error) {
      console.error('❌ Technical parser error:', error);
      throw new Error(`Parser failed: ${error.message}`);
    }
  }

  /**
   * PHASE 2: Expert analysis with AI
   */
  async runExpertAnalysis(parserResults, xmlContent, options = {}) {
    try {
      console.log('🔍 DEBUG BEFORE AI:', {
        parser_status: parserResults.status,
        parser_errors: parserResults.errors.length,
        parser_isValid: parserResults.isValid
      });

      // Smart strategy: AI only when needed
      const needsAIAnalysis = this.shouldRunAIAnalysis(parserResults, options);

      if (!needsAIAnalysis) {
        console.log('⚡ Skip AI: simple document, parser only');
        return this.buildParserOnlyResult(parserResults);
      }

      console.log('🤖 Running in-depth AI analysis...');

      // Prepare context for AI
      const documentContext = this.prepareDocumentContext(parserResults, options);

      // AI call with context
      const aiResults = await this.aiAnalyst.analyzeWithContext(
        parserResults,
        xmlContent,
        documentContext
      );

      console.log('🔍 DEBUG AFTER AI:', {
        ai_status: aiResults.combined?.overall_status,
        final_confidence: aiResults.combined?.confidence
      });

      console.log(`🧠 AI: Analysis completed - ${aiResults.expert?.errori_prioritizzati?.length || 0} recommendations`);

      return aiResults;

    } catch (error) {
      console.error('⚠️ AI analysis failed, using parser only:', error);

      // Fallback: parser results only
      return this.buildParserOnlyResult(parserResults, {
        ai_error: error.message,
        fallback_mode: true
      });
    }
  }

  /**
   * Determines if AI analysis is needed
   */
  shouldRunAIAnalysis(parserResults, options) {
    // Force AI if requested
    if (options.forceAI) return true;

    // Skip AI if disabled
    if (options.skipAI) return false;

    // AI always for complex errors
    if (parserResults.errors.length > 0) return true;

    // AI for multiple warnings
    if (parserResults.warnings.length > 2) return true;

    // AI for complex documents (based on parser summary)
    if (parserResults.summary?.criticalIssues > 0) return true;

    // Skip for perfect documents
    if (parserResults.isValid && parserResults.warnings.length === 0) return false;

    // Default: use AI for in-depth analysis
    return true;
  }

  /**
   * Prepares context for AI analysis
   */
  prepareDocumentContext(parserResults, options) {
    // Note: 'fattura_elettronica' kept as it might be an identifier
    return {
      document_type: options.documentType || 'fattura_elettronica',
      business_context: options.businessContext || 'standard',
      user_level: options.userLevel || 'basic',
      priority: options.priority || 'normal',
      compliance_requirements: options.complianceRequirements || ['standard_sdi'],
      parser_summary: {
        total_checks: 15, // Example value
        passed_checks: 15 - parserResults.errors.length - parserResults.warnings.length,
        critical_issues: parserResults.summary?.criticalIssues || 0
      }
    };
  }

  /**
   * FIXED - Parser-only result (without AI)
   */
  buildParserOnlyResult(parserResults, metadata = {}) {
    const hasErrors = parserResults.errors.length > 0;
    console.log('🔍 DEBUG PARSER ERRORS:', {
      totalErrors: parserResults.errors.length,
      errors: parserResults.errors.map(e => ({
        code: e.code,
        message: e.message
      }))
    });
    const hasWarnings = parserResults.warnings.length > 0;

    // FIX: Correct logic to determine status
    let finalStatus;
    if (hasErrors) {
      finalStatus = 'error';
    } else if (hasWarnings) {
      finalStatus = 'warning';
    } else {
      finalStatus = 'ok';
    }

    // FIX: Confidence based on actual errors
    let confidence;
    if (hasErrors) {
      confidence = Math.max(0.3, 0.8 - (parserResults.errors.length * 0.15));
    } else if (hasWarnings) {
      confidence = Math.max(0.6, 0.85 - (parserResults.warnings.length * 0.05));
    } else {
      confidence = 0.9;
    }

    // Note: Italian keys like 'analisi_generale', 'errori_prioritizzati' kept if they are expected by other parts of the system
    // User-facing strings within these structures are translated.
    return {
      technical: parserResults,
      expert: {
        analisi_generale: {
          gravita_complessiva: hasErrors ? 8 : (hasWarnings ? 3 : 1), // Severity level (internal)
          impatto_fiscale: hasErrors ? 'high' : (hasWarnings ? 'medium' : 'low'), // Fiscal impact (internal)
          conformita_sdi: hasErrors ? 'non_compliant' : 'compliant', // SDI compliance (internal)
          raccomandazione: hasErrors ? 'correction_mandatory' : (hasWarnings ? 'review' : 'approve') // Recommendation code (internal)
        },
        errori_prioritizzati: parserResults.errors.map(error => ({
          codice: error.code, // Error code (internal)
          titolo: this.humanizeErrorCode(error.code), // Title (translated)
          spiegazione: error.message, // Explanation (often technical, keep as is or requires context)
          conseguenze: this.getErrorConsequences(error.code), // Consequences (translated)
          soluzione: this.getErrorSolution(error.code), // Solution (translated)
          urgenza: this.getErrorUrgency(error.code), // Urgency level (internal)
          tempo_stimato: this.getErrorFixTime(error.code) // Estimated time (translated)
        })),
        suggerimenti_pratici: this.generatePracticalSuggestions(parserResults), // Practical suggestions (translated)
        valutazione_rischio: { // Risk assessment (internal codes)
          rischio_rigetto_sdi: hasErrors ? 'high' : (hasWarnings ? 'medium' : 'low'),
          rischio_sanzioni: hasErrors ? 'medium' : 'low',
          rischio_controlli: hasErrors ? 'medium' : 'low'
        },
        prossimi_passi: this.generateNextSteps(parserResults), // Next steps (translated)
        note_commercialista: metadata.ai_error // Accountant notes (translated)
          ? "AI analysis unavailable - based only on technical checks"
          : "Quick analysis based on deterministic checks"
      },
      combined: {
        overall_status: finalStatus, // ← FIX: use correctly calculated status
        confidence: confidence,       // ← FIX: realistic confidence
        flag_manual_review: hasErrors || parserResults.warnings.length > 2,
        priority_level: hasErrors ? 'high' : (hasWarnings ? 'medium' : 'low'), // Priority level (internal)
        estimated_fix_time: this.calculateTotalFixTime(parserResults.errors), // Estimated time (translated)
        compliance_score: Math.max(100 - (parserResults.errors.length * 20) - (parserResults.warnings.length * 5), 0) // Score (internal)
      },
      metadata: {
        analysis_mode: 'parser_only',
        ai_used: false,
        ...metadata
      }
    };
  }

  /**
   * PHASE 3: Optimize final results
   */
  optimizeResults(results) {
    // 1. Deduplicate errors
    const dedupedResults = this.deduplicateIssues(results);

    // 2. Smart prioritization
    const prioritizedResults = this.prioritizeIssues(dedupedResults);

    // 3. Smart final message
    const finalMessage = this.generateFinalMessage(prioritizedResults);

    // 4. Confidence adjustment
    const adjustedConfidence = this.adjustConfidence(prioritizedResults);

    return {
      ...prioritizedResults,
      combined: {
        ...prioritizedResults.combined,
        confidence: adjustedConfidence,
        final_message: finalMessage,
        user_friendly_status: this.getUserFriendlyStatus(prioritizedResults)
      }
    };
  }

  /**
   * Removes duplicate errors
   */
  deduplicateIssues(results) {
    // Assuming 'errori_prioritizzati' contains the list
    if (!results.expert?.errori_prioritizzati) return results;

    const uniqueErrors = results.expert.errori_prioritizzati.filter((error, index, arr) =>
      // Keep only the first occurrence of each error code
      arr.findIndex(e => e.codice === error.codice) === index
    );

    return {
      ...results,
      expert: {
        ...results.expert,
        errori_prioritizzati: uniqueErrors
      }
    };
  }

  /**
   * Smart prioritization
   */
  prioritizeIssues(results) {
    // Assuming 'errori_prioritizzati' contains the list
    if (!results.expert?.errori_prioritizzati) return results;

    const prioritized = results.expert.errori_prioritizzati.sort((a, b) => {
      // First, critical for SDI
      const aCritical = this.isCriticalForSDI(a.codice);
      const bCritical = this.isCriticalForSDI(b.codice);
      if (aCritical !== bCritical) return bCritical - aCritical; // Critical first

      // Then by urgency (higher urgency first)
      return (b.urgenza || 5) - (a.urgenza || 5);
    });

    return {
      ...results,
      expert: {
        ...results.expert,
        errori_prioritizzati: prioritized
      }
    };
  }

  /**
   * Generates smart final message
   */
  generateFinalMessage(results) {
    const status = results.combined?.overall_status;
    const errorsCount = results.technical?.errors?.length || 0;
    const warningsCount = results.technical?.warnings?.length || 0;

    if (status === 'error') {
       const criticalCount = results.technical?.summary?.criticalIssues || errorsCount;
       // Ensure correct grammar for singular/plural errors
       const errorText = criticalCount === 1 ? 'critical error' : 'critical errors';
       return `❌ Detected ${criticalCount} ${errorText} preventing submission. Correction needed.`;
    }

    if (status === 'warning') {
       // Ensure correct grammar for singular/plural warnings
       const warningText = warningsCount === 1 ? 'warning' : 'warnings';
       return `⚠️ Valid document with ${warningsCount} ${warningText}. Submission possible, review recommended.`;
    }

    // Default message when status is 'ok' or unknown
    return "📋 Analysis completed - consult details for specific recommendations.";
  }


  /**
   * User-friendly status
   */
  getUserFriendlyStatus(results) {
    const status = results.combined?.overall_status;

    switch (status) {
      case 'ok': return 'Compliant ✅';
      case 'warning': return 'Valid with warnings ⚠️';
      case 'error': return 'Errors to correct ❌';
      default: return 'Processing 🔄';
    }
  }

  /**
   * Adjusts confidence based on multiple sources
   */
  adjustConfidence(results) {
    let confidence = results.combined?.confidence || 0.5;

    // Boost for parser + AI agreement
    if (results.metadata?.ai_used && results.technical?.isValid) {
      confidence = Math.min(confidence + 0.1, 0.95);
    }

    // Penalty for fallback mode
    if (results.metadata?.fallback_mode) {
      confidence = Math.max(confidence - 0.15, 0.3);
    }

    return confidence;
  }

  /**
   * Handles validation errors
   */
  handleValidationError(error, processingTime) {
    console.error('💥 Validation Error:', error);

    return {
      technical: {
        status: 'error',
        isValid: false,
        errors: [{
          code: 'VALIDATION_FAILED',
          message: `Error during validation: ${error.message}`,
          level: 'error'
        }],
        warnings: [],
        details: {},
        summary: { totalErrors: 1, totalWarnings: 0, criticalIssues: 1 }
      },
      expert: {
        analisi_generale: { // Internal codes
          gravita_complessiva: 10,
          impatto_fiscale: 'critical',
          conformita_sdi: 'non_compliant',
          raccomandazione: 'in_depth_review'
        },
        note_commercialista: "Technical error during analysis - recheck the file and try again" // Translated
      },
      combined: {
        overall_status: 'error',
        confidence: 0.1,
        flag_manual_review: true,
        priority_level: 'critical', // Internal code
        final_message: "❌ Technical error during document analysis", // Translated
        user_friendly_status: 'Technical Error ⚠️' // Translated
      },
      processing: {
        duration_ms: processingTime,
        timestamp: new Date().toISOString(),
        error: error.message
      }
    };
  }

  // ============ UTILITY FUNCTIONS ============
  // These functions provide user-facing explanations, so they need translation.

  humanizeErrorCode(code) {
    // Map of technical codes to human-readable English titles
    const codeMap = {
      'VAT_CEDENTE_INVALID': 'Invalid Seller VAT Number',
      'CF_CEDENTE_INVALID': 'Invalid Seller Tax Code',
      'DEST_CODE_FORMAT': 'Incorrect Destination Code Format',
      'CALC_TOTALE_DOCUMENTO': 'Error Calculating Document Total',
      'MANDATORY_TRASMISSIONE': 'Missing Transmission Data',
      'STRUCTURE_HEADER': 'Invalid Header Structure'
      // Add more mappings as needed
    };
    // Fallback: format the code itself if no specific mapping exists
    return codeMap[code] || code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
  }

  getErrorConsequences(code) {
    // English explanations of consequences for different error types
    if (code.includes('VAT') || code.includes('CF')) {
      return "The Interchange System (SDI) will automatically reject the document.";
    }
    if (code.includes('CALC')) {
      return "Potential tax audits due to mathematical inconsistencies.";
    }
    if (code.includes('MANDATORY')) {
      return "Document cannot be processed by the Interchange System (SDI).";
    }
    // Default consequence
    return "Potential issues in transmission or processing by recipients.";
  }

  getErrorSolution(code) {
    // English explanations of how to fix different error types
    if (code.includes('VAT')) {
      return "Verify the VAT number format (IT + 11 digits) and the check digit. Check VIES if applicable.";
    }
    if (code.includes('CF')) {
      return "Check the Tax Code (Codice Fiscale) against the official Revenue Agency database.";
    }
    if (code.includes('CALC')) {
      return "Recalculate totals, verifying the applied VAT rates, discounts, and rounding.";
    }
    // Default solution reference
    return "Consult the official FatturaPA technical specifications (version 1.7.1 or later).";
  }

  getErrorUrgency(code) {
    // Internal urgency levels (numeric) - No translation needed
    if (code.includes('STRUCTURE') || code.includes('MANDATORY')) return 10; // Highest
    if (code.includes('VAT') || code.includes('CF') || code.includes('DEST_CODE')) return 9;
    if (code.includes('CALC')) return 7;
    return 5; // Medium default
  }

  getErrorFixTime(code) {
    // Estimated fix times in English
    if (code.includes('VAT') || code.includes('CF')) return "2 minutes";
    if (code.includes('CALC')) return "10 minutes";
    if (code.includes('FORMAT')) return "5 minutes";
    return "15 minutes"; // Default estimate
  }

  generatePracticalSuggestions(parserResults) {
    const suggestions = []; // Array to hold English suggestions

    if (parserResults.errors.some(e => e.code.includes('VAT'))) {
      suggestions.push("Use the VIES service to verify European VAT numbers if applicable.");
    }

    if (parserResults.errors.some(e => e.code.includes('CALC'))) {
      suggestions.push("Ensure all monetary amounts have a maximum of two decimal places.");
    }

    if (parserResults.warnings.length > 0) {
      suggestions.push("Warnings do not block submission to SDI, but resolving them is recommended for clarity and best practice.");
    }

    // Default suggestion if no specific issues trigger others
    return suggestions.length > 0 ? suggestions : [
      "Document appears technically correct according to FatturaPA specifications."
    ];
  }

  generateNextSteps(parserResults) {
    const steps = []; // Array to hold English next steps

    if (parserResults.errors.length > 0) {
      steps.push("Correct the highlighted errors based on priority.");
      steps.push("Regenerate the XML file with the corrected data.");
      steps.push("Repeat the validation process before submitting to SDI.");
    } else {
      steps.push("The document is ready for submission to the Interchange System (SDI).");
      steps.push("Keep a digital copy of the file for 10 years (regulatory requirement).");
      if (parserResults.warnings.length > 0) {
           steps.push("Consider addressing the warnings for improved data quality, although not mandatory for submission.");
      }
    }

    return steps;
  }


  calculateTotalFixTime(errors) {
    if (!errors || errors.length === 0) return "0 minutes";

    const totalMinutes = errors.reduce((total, error) => {
      const timeString = this.getErrorFixTime(error.code);
      // Extract number from strings like "2 minutes", "10 minutes"
      const minutes = parseInt(timeString.match(/\d+/)?.[0] || "5"); // Default to 5 mins if parsing fails
      return total + minutes;
    }, 0);

    // Return in minutes or hours
    return totalMinutes < 60 ? `${totalMinutes} minutes` : `${Math.ceil(totalMinutes / 60)} hours`;
  }

  isCriticalForSDI(errorCode) {
    // List of prefixes indicating errors critical for SDI submission
    const criticalCodes = [
      'STRUCTURE_', 'MANDATORY_', 'VAT_', 'CF_', 'DEST_CODE_'
      // Add other critical prefixes if known
    ];
    // Check if the errorCode starts with any of the critical prefixes
    return criticalCodes.some(prefix => errorCode.startsWith(prefix));
  }

  // --- Statistics Methods ---

  updateStats(processingTime, results) {
    this.processingStats.totalProcessed++;

    // Calculate success rate (considering 'error' status as failure)
    const isSuccess = results.combined?.overall_status !== 'error';
    const currentSuccessTotal = (this.processingStats.successRate * (this.processingStats.totalProcessed - 1)) + (isSuccess ? 1 : 0);
    this.processingStats.successRate = currentSuccessTotal / this.processingStats.totalProcessed;

    // Calculate average processing time
    const currentTotalTime = (this.processingStats.averageProcessingTime * (this.processingStats.totalProcessed - 1)) + processingTime;
    this.processingStats.averageProcessingTime = currentTotalTime / this.processingStats.totalProcessed;
  }

  getStats() {
    // Return a copy of the stats object
    return { ...this.processingStats };
  }
}

// Export a factory function for direct use
export const createDocumentValidator = (groqApiKey) => {
  return new DocumentValidator(groqApiKey);
};
