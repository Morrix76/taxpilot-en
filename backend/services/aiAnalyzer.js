/**
 * TaxPilot ASSISTANT PRO - AI Analyzer Module
 * File: services/aiAnalyzer.js
 *
 * Complete module for AI-powered tax analysis
 * Supports Groq and HuggingFace APIs
 */

import axios from 'axios';

class AIAnalyzer {
    constructor(config = {}) {
        this.config = {
            primaryProvider: config.primaryProvider || 'groq',
            fallbackProvider: config.fallbackProvider || 'huggingface',
            groqApiKey: null, // Lazy initialization
            huggingfaceApiKey: null, // Lazy initialization
            groqModel: config.groqModel || 'llama3-70b-8192',
            huggingfaceModel: config.huggingfaceModel || 'microsoft/DialoGPT-large',
            maxRetries: config.maxRetries || 2,
            timeout: config.timeout || 30000,
            confidenceThreshold: config.confidenceThreshold || 0.7,
            enableCache: config.enableCache || true,
            cacheExpiry: config.cacheExpiry || 3600
        };

        this.cache = new Map();
        this.requestCount = 0;
        this.errorCount = 0;
        this.initialized = false;

        console.log('🤖 AIAnalyzer created (lazy init)');
    }

    /**
     * Initialize API keys only when needed
     */
    _initializeApiKeys() {
        if (this.initialized) return;

        this.config.groqApiKey = process.env.GROQ_API_KEY;
        this.config.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
        this.initialized = true;

        console.log('🔑 AIAnalyzer initialized:', {
            primaryProvider: this.config.primaryProvider,
            hasGroqKey: !!this.config.groqApiKey,
            hasHFKey: !!this.config.huggingfaceApiKey
        });
    }

    /**
     * Analyze tax document with AI
     */
    async analyzeDocument(documentData, documentType) {
        try {
            // Initialize API keys on first use
            this._initializeApiKeys();

            console.log('🔍 Starting AI analysis:', { type: documentType, data: Object.keys(documentData) });

            // Input validation
            this._validateInput(documentData, documentType);

            // Check cache
            const cacheKey = this._generateCacheKey(documentData, documentType);
            if (this.config.enableCache && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.config.cacheExpiry * 1000) {
                    console.log('✅ Using cached result');
                    return { ...cached.result, fromCache: true };
                }
            }

            // Generate contextual prompt
            const prompt = this._generatePrompt(documentData, documentType);

            // Attempt with primary provider
            let result;
            try {
                console.log(`🚀 Calling ${this.config.primaryProvider}...`);
                result = await this._callAI(prompt, this.config.primaryProvider);
            } catch (primaryError) {
                console.warn(`⚠️ Primary provider ${this.config.primaryProvider} failed:`, primaryError.message);

                // Fallback to secondary provider
                try {
                    console.log(`🔄 Fallback to ${this.config.fallbackProvider}...`);
                    result = await this._callAI(prompt, this.config.fallbackProvider);
                    result.usedFallback = true;
                } catch (fallbackError) {
                    console.error('❌ Both AI providers failed');
                    throw new Error('AI service temporarily unavailable');
                }
            }

            // Validate and parse response
            const analysis = this._parseAIResponse(result.response, documentType);

            // Add metadata
            analysis.metadata = {
                provider: result.usedFallback ? this.config.fallbackProvider : this.config.primaryProvider,
                model: result.model,
                processingTime: result.processingTime,
                requestId: this._generateRequestId(),
                timestamp: new Date().toISOString()
            };

            // Save to cache
            if (this.config.enableCache) {
                this.cache.set(cacheKey, {
                    result: analysis,
                    timestamp: Date.now()
                });
            }

            this.requestCount++;
            console.log('✅ AI Analysis completed:', {
                confidence: analysis.confidence,
                provider: analysis.metadata.provider,
                time: analysis.metadata.processingTime + 'ms'
            });

            return analysis;

        } catch (error) {
            this.errorCount++;
            console.error('❌ Error during AI analysis:', error.message);

            // Fallback to basic analysis
            return this._generateFallbackAnalysis(documentData, documentType, error.message);
        }
    }

    /**
     * Call specified AI service
     */
    async _callAI(prompt, provider) {
        const startTime = Date.now();

        if (provider === 'groq') {
            return await this._callGroq(prompt, startTime);
        } else if (provider === 'huggingface') {
            return await this._callHuggingFace(prompt, startTime);
        } else {
            throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }

    /**
     * Groq API call
     */
    async _callGroq(prompt, startTime) {
        if (!this.config.groqApiKey) {
            throw new Error('GROQ_API_KEY not configured');
        }

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: this.config.groqModel,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert Italian tax consultant specialized in fiscal document analysis. Always respond in valid JSON format in English.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 1000
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.config.groqApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.config.timeout
            }
        );

        return {
            response: response.data.choices[0].message.content,
            model: this.config.groqModel,
            processingTime: Date.now() - startTime
        };
    }

    /**
     * HuggingFace API call
     */
    async _callHuggingFace(prompt, startTime) {
        if (!this.config.huggingfaceApiKey) {
            throw new Error('HUGGINGFACE_API_KEY not configured');
        }

        const response = await axios.post(
            `https://api-inference.huggingface.co/models/${this.config.huggingfaceModel}`,
            {
                inputs: prompt,
                parameters: {
                    max_new_tokens: 800,
                    temperature: 0.1,
                    return_full_text: false
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.config.huggingfaceApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.config.timeout
            }
        );

        const responseText = Array.isArray(response.data)
            ? response.data[0].generated_text
            : response.data.generated_text || response.data;

        return {
            response: responseText,
            model: this.config.huggingfaceModel,
            processingTime: Date.now() - startTime
        };
    }

    /**
     * Generate contextual prompt for AI
     */
    _generatePrompt(documentData, documentType) {
        const basePrompt = this._getBasePrompt();
        const specificPrompt = documentType === 'invoice' // Changed from 'fattura'
            ? this._getInvoicePrompt(documentData)
            : this._getPayslipPrompt(documentData); // Changed from 'busta_paga'

        return `${basePrompt}\n\n${specificPrompt}\n\n${this._getOutputFormat()}`;
    }

    /**
     * Base prompt with 2025 Italian tax regulations
     */
    _getBasePrompt() {
        return `ITALIAN TAX REGULATIONS 2025:

VAT:
- Standard rates: 4% (essential goods), 10% (food, pharmaceuticals), 22% (standard)
- Split payment: mandatory for PA and large companies
- Flat-rate regime (forfettario): 5% flat tax first 5 years, then various rates

INCOME TAX (IRPEF) 2025:
- First bracket: 23% (0 - 28,000€)
- Second bracket: 35% (28,001 - 50,000€)
- Third bracket: 43% (over 50,000€)

SOCIAL SECURITY (INPS):
- Employee contributions: 9.19%
- Employer contributions: ~30%

DEDUCTIONS 2025:
- Employee work: €1,880 up to 15,000€, decreasing
- Dependents: €800-950 per child
- Fringe benefits: threshold €600 (was €258 in 2024)

ANALYZE THE DOCUMENT AND IDENTIFY:
1. Tax inconsistencies
2. Possible regulation application errors
3. Missed tax optimizations
4. Tax audit risks`;
    }

    /**
     * Invoice-specific prompt
     */
    _getInvoicePrompt(data) {
        // Keeping Italian keys as they might be specific identifiers from the data extraction phase
        return `INVOICE TO ANALYZE:
${JSON.stringify(data, null, 2)}

CHECK SPECIFICALLY:
- Correct VAT rate for type of goods/services
- Split payment application if required
- Seller's tax regime (regimeFiscale)
- Consistency between taxable amount (imponibile), VAT (importoIva) and total (totale)
- Presence of SDI recipient codes if necessary`;
    }

    /**
     * Payslip-specific prompt
     */
    _getPayslipPrompt(data) {
        // Keeping Italian keys as they might be specific identifiers from the data extraction phase
        return `PAYSLIP TO ANALYZE:
${JSON.stringify(data, null, 2)}

CHECK SPECIFICALLY:
- Correct application of 2025 IRPEF brackets
- INPS contributions in correct measure
- Family and work deductions (detrazioni)
- Fringe benefits within €600 threshold
- Consistency between gross (stipendioLordo), deductions and net (stipendioNetto)`;
    }

    /**
     * Required output format
     */
    _getOutputFormat() {
        return `RESPOND ONLY IN THIS JSON FORMAT:
{
    "summary": "Brief analysis summary",
    "confidence": 0.95,
    "recommendations": [
        "First specific recommendation",
        "Second recommendation",
        "Third recommendation"
    ],
    "risks": [
        "First identified risk",
        "Second risk"
    ],
    "optimizations": [
        "First possible optimization",
        "Second optimization"
    ]
}`;
    }

    /**
     * Parse and validate AI response
     */
    _parseAIResponse(response, documentType) {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Validate required fields
            const required = ['summary', 'confidence', 'recommendations'];
            for (const field of required) {
                if (!parsed[field]) {
                    throw new Error(`Required field missing: ${field}`);
                }
            }

            // Normalize confidence
            if (typeof parsed.confidence === 'string') {
                parsed.confidence = parseFloat(parsed.confidence);
            }

            if (parsed.confidence < 0 || parsed.confidence > 1) {
                parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));
            }

            // Ensure array for recommendations
            if (!Array.isArray(parsed.recommendations)) {
                parsed.recommendations = [parsed.recommendations].filter(Boolean);
            }

            // Optional fields with defaults
            parsed.risks = parsed.risks || [];
            parsed.optimizations = parsed.optimizations || [];

            return parsed;

        } catch (error) {
            console.error('❌ Error parsing AI response:', error.message);

            return {
                summary: 'Analysis completed with partial result',
                confidence: 0.5,
                recommendations: ['Manual document verification recommended'],
                risks: ['Unable to determine specific risks'],
                optimizations: [],
                parseError: error.message
            };
        }
    }

    /**
     * Generate fallback analysis in case of AI error
     */
    _generateFallbackAnalysis(documentData, documentType, errorMessage) {
        const basicChecks = documentType === 'invoice' // Changed from 'fattura'
            ? this._basicInvoiceChecks(documentData)
            : this._basicPayslipChecks(documentData); // Changed from 'busta_paga'

        return {
            summary: 'Basic analysis completed (AI unavailable)',
            confidence: 0.4,
            recommendations: basicChecks.recommendations,
            risks: ['AI service temporarily unavailable'],
            optimizations: basicChecks.optimizations,
            fallback: true,
            error: errorMessage,
            metadata: {
                provider: 'fallback',
                processingTime: 0,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Basic invoice checks (without AI)
     */
    _basicInvoiceChecks(data) {
        const recommendations = [];
        const optimizations = [];

        // Check VAT rate (using Italian key from data)
        if (data.aliquotaIva && ![4, 10, 22].includes(data.aliquotaIva)) {
            recommendations.push(`VAT rate ${data.aliquotaIva}% is non-standard - verify applicability`);
        }

        // Check VAT calculation (using Italian keys from data)
        if (data.imponibile && data.aliquotaIva && data.importoIva) {
            const calculatedVAT = Math.round((data.imponibile * data.aliquotaIva / 100) * 100) / 100;
            if (Math.abs(calculatedVAT - data.importoIva) > 0.01) {
                recommendations.push('Verify VAT calculation - possible rounding error');
            }
        }

        return { recommendations, optimizations };
    }

    /**
     * Basic payslip checks (without AI)
     */
    _basicPayslipChecks(data) {
        const recommendations = [];
        const optimizations = [];

        // Check INPS (using Italian keys from data)
        if (data.stipendioLordo && data.inps) {
            const calculatedINPS = Math.round((data.stipendioLordo * 0.0919) * 100) / 100;
            if (Math.abs(calculatedINPS - data.inps) > 10) { // Using a tolerance threshold
                recommendations.push('Verify INPS contributions - may not be aligned with 9.19%');
            }
        }

        return { recommendations, optimizations };
    }

    /**
     * Input validation
     */
    _validateInput(documentData, documentType) {
        if (!documentData || typeof documentData !== 'object') {
            throw new Error('documentData must be a valid object');
        }

        if (!['invoice', 'payslip'].includes(documentType)) { // Changed from 'fattura', 'busta_paga'
            throw new Error('documentType must be "invoice" or "payslip"');
        }
    }

    /**
     * Generate unique cache key
     */
    _generateCacheKey(documentData, documentType) {
        const dataString = JSON.stringify(documentData);
        return `${documentType}_${this._hashString(dataString)}`;
    }

    /**
     * Simple hash for cache key
     */
    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Generate unique request ID
     */
    _generateRequestId() {
        return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Usage statistics
     */
    getStats() {
        return {
            totalRequests: this.requestCount,
            totalErrors: this.errorCount,
            errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) : 0,
            cacheSize: this.cache.size,
            uptime: process.uptime()
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Test AI connection
     */
    async testConnection(provider = null) {
        // Initialize API keys if needed
        this._initializeApiKeys();

        const testProvider = provider || this.config.primaryProvider;

        try {
            const prompt = `Test AI connection. Respond with: {"status": "ok", "provider": "${testProvider}"}`;
            const result = await this._callAI(prompt, testProvider);
            return {
                success: true,
                provider: testProvider,
                responseTime: result.processingTime
            };
        } catch (error) {
            return {
                success: false,
                provider: testProvider,
                error: error.message
            };
        }
    }
}

// Export ES module
export default AIAnalyzer;