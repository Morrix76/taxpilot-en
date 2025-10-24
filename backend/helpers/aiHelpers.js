// ============================================
// HELPER FUNCTIONS - AI ANALYZER V1
// Utility functions per TaxPilot Assistant Pro
// ============================================

const crypto = require('crypto');

/**
 * Formatta dati per AI ottimizzando dimensione e struttura
 * @param {Object} documentData - Dati documento originali
 * @param {string} documentType - Tipo documento ('invoice' | 'payslip')
 * @returns {Object} Dati ottimizzati per AI
 */
function formatJsonForAi(documentData, documentType) {
    try {
        if (documentType === 'invoice') {
            return formatInvoiceForAi(documentData);
        } else if (documentType === 'payslip') {
            return formatPayslipForAi(documentData);
        } else {
            throw new Error(`Unknown document type: ${documentType}`);
        }
    } catch (error) {
        console.error('Error formatting data for AI:', error);
        return documentData; // Fallback to original data
    }
}

/**
 * Formatta fattura per AI
 * @param {Object} invoiceData - Dati fattura
 * @returns {Object} Fattura formattata
 */
function formatInvoiceForAi(invoiceData) {
    return {
        // Dati finanziari core
        imponibile: cleanNumber(invoiceData.imponibile || invoiceData.importoImponibile),
        aliquotaIva: cleanNumber(invoiceData.aliquotaIva || invoiceData.iva_rate),
        importoIva: cleanNumber(invoiceData.importoIva || invoiceData.iva_amount),
        totale: cleanNumber(invoiceData.totale || invoiceData.importoTotale),
        
        // Dati anagrafica (sanitizzati)
        cliente: sanitizeString(invoiceData.cliente || invoiceData.cessionario || 'N/D'),
        partitaIvaCliente: sanitizeString(invoiceData.partitaIvaCliente || invoiceData.piva_cliente),
        
        // Dati temporali
        dataEmissione: formatDate(invoiceData.dataEmissione || invoiceData.data),
        annoRiferimento: extractYear(invoiceData.dataEmissione || invoiceData.data),
        
        // Regime fiscale
        regimeFiscale: normalizeRegime(invoiceData.regimeFiscale || invoiceData.regime),
        regimeForfettario: detectForfettario(invoiceData),
        
        // Indicatori speciali
        splitPayment: detectSplitPayment(invoiceData),
        esigibitaIva: invoiceData.esigibitaIva || 'I', // Immediata default
        
        // Metadati per analisi
        numeroRighe: Array.isArray(invoiceData.righe) ? invoiceData.righe.length : 1,
        categoriaServizio: detectServiceCategory(invoiceData),
        flagRischio: calculateRiskFlags(invoiceData)
    };
}

/**
 * Formatta busta paga per AI
 * @param {Object} payslipData - Dati busta paga
 * @returns {Object} Busta paga formattata
 */
function formatPayslipForAi(payslipData) {
    const lordo = cleanNumber(payslipData.stipendioLordo || payslipData.lordo);
    
    return {
        // Dati salariali core
        stipendioLordo: lordo,
        stipendioNetto: cleanNumber(payslipData.stipendioNetto || payslipData.netto || payslipData.nettoPercepito),
        
        // Tasse e contributi
        irpef: cleanNumber(payslipData.irpef || payslipData.imposte),
        inps: cleanNumber(payslipData.inps || payslipData.contributiINPS),
        inail: cleanNumber(payslipData.inail || 0),
        
        // Detrazioni
        detrazioni: cleanNumber(payslipData.detrazioni || payslipData.detrazioniFiscali),
        detrazioniFamiliari: cleanNumber(payslipData.detrazioniFamiliari || 0),
        detrazioniLavoro: cleanNumber(payslipData.detrazioniLavoro || 0),
        
        // Benefit e rimborsi
        fringeBenefits: cleanNumber(payslipData.fringeBenefits || 0),
        buoniPasto: cleanNumber(payslipData.buoniPasto || 0),
        rimborsiSpese: cleanNumber(payslipData.rimborsiSpese || 0),
        
        // Dati contrattuali
        tipoContratto: normalizeContractType(payslipData.tipoContratto || payslipData.contratto),
        livello: sanitizeString(payslipData.livello || payslipData.inquadramento),
        oreLavorate: cleanNumber(payslipData.oreLavorate || payslipData.ore),
        
        // Dati temporali
        meseRiferimento: formatYearMonth(payslipData.meseRiferimento || payslipData.periodo),
        annoRiferimento: extractYear(payslipData.meseRiferimento || payslipData.periodo),
        
        // Indicatori calcolati
        aliquotaMediaIrpef: lordo > 0 ? Math.round((cleanNumber(payslipData.irpef) / lordo) * 100 * 100) / 100 : 0,
        aliquotaINPS: lordo > 0 ? Math.round((cleanNumber(payslipData.inps) / lordo) * 100 * 100) / 100 : 0,
        
        // Metadati per analisi
        flagRischio: calculatePayslipRiskFlags(payslipData, lordo)
    };
}

/**
 * Pulisce e normalizza numeri
 * @param {any} value - Valore da pulire
 * @returns {number} Numero pulito
 */
function cleanNumber(value) {
    if (value === null || value === undefined || value === '') {
        return 0;
    }
    
    // Se già numero
    if (typeof value === 'number') {
        return isNaN(value) ? 0 : Math.round(value * 100) / 100;
    }
    
    // Se stringa, pulisci formato italiano
    if (typeof value === 'string') {
        const cleaned = value
            .replace(/[€$£¥\s]/g, '') // Rimuovi simboli valuta e spazi
            .replace(/\./g, '') // Rimuovi separatori migliaia
            .replace(/,/g, '.') // Cambia virgola decimale in punto
            .replace(/[^0-9.-]/g, ''); // Rimuovi tutto tranne numeri, punto e meno
        
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : Math.round(number * 100) / 100;
    }
    
    return 0;
}

/**
 * Sanitizza stringhe rimuovendo dati sensibili
 * @param {string} str - Stringa da sanitizzare
 * @returns {string} Stringa sanitizzata
 */
function sanitizeString(str) {
    if (!str || typeof str !== 'string') {
        return 'N/D';
    }
    
    // Rimuovi email, telefoni, indirizzi dettagliati
    return str
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
        .replace(/\b\d{10,11}\b/g, '[PHONE]')
        .replace(/\b\d{11}\b/g, '[CF]') // Codice fiscale
        .replace(/\b\d{11}\b/g, '[PIVA]') // Partita IVA
        .substring(0, 100) // Limita lunghezza
        .trim();
}

/**
 * Formatta date in formato standardizzato
 * @param {string|Date} date - Data da formattare
 * @returns {string} Data formattata YYYY-MM-DD
 */
function formatDate(date) {
    if (!date) return 'N/D';
    
    try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return 'N/D';
        
        return dateObj.toISOString().split('T')[0];
    } catch (error) {
        return 'N/D';
    }
}

/**
 * Estrae anno da data
 * @param {string|Date} date - Data
 * @returns {number} Anno
 */
function extractYear(date) {
    if (!date) return new Date().getFullYear();
    
    try {
        const dateObj = new Date(date);
        const year = dateObj.getFullYear();
        return (year >= 2020 && year <= 2030) ? year : new Date().getFullYear();
    } catch (error) {
        return new Date().getFullYear();
    }
}

/**
 * Formatta anno-mese
 * @param {string} period - Periodo (vari formati)
 * @returns {string} Formato YYYY-MM
 */
function formatYearMonth(period) {
    if (!period) return 'N/D';
    
    try {
        // Gestisce formati: "2025-05", "05/2025", "maggio 2025", etc.
        const cleaned = period.toString().replace(/[^\d]/g, '');
        
        if (cleaned.length >= 6) {
            // Formato YYYYMM o MMYYYY
            if (cleaned.substring(0, 4) > 2020) {
                return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}`;
            } else {
                return `${cleaned.substring(2, 6)}-${cleaned.substring(0, 2)}`;
            }
        }
        
        return 'N/D';
    } catch (error) {
        return 'N/D';
    }
}

/**
 * Normalizza regime fiscale
 * @param {string} regime - Regime fiscale grezzo
 * @returns {string} Regime normalizzato
 */
function normalizeRegime(regime) {
    if (!regime) return 'ordinario';
    
    const regimeLower = regime.toLowerCase();
    
    if (regimeLower.includes('forfett')) return 'forfettario';
    if (regimeLower.includes('minim')) return 'minimi';
    if (regimeLower.includes('agrar')) return 'agricolo';
    if (regimeLower.includes('margin')) return 'margine';
    
    return 'ordinario';
}

/**
 * Rileva regime forfettario da vari indicatori
 * @param {Object} invoiceData - Dati fattura
 * @returns {boolean} True se forfettario
 */
function detectForfettario(invoiceData) {
    // Controlli multipli per regime forfettario
    const regime = (invoiceData.regimeFiscale || '').toLowerCase();
    const iva = cleanNumber(invoiceData.importoIva || invoiceData.aliquotaIva);
    const note = (invoiceData.note || '').toLowerCase();
    
    return regime.includes('forfett') || 
           iva === 0 || 
           note.includes('forfett') ||
           note.includes('art. 1 comma 54-89');
}

/**
 * Rileva split payment
 * @param {Object} invoiceData - Dati fattura
 * @returns {boolean} True se split payment
 */
function detectSplitPayment(invoiceData) {
    const cliente = (invoiceData.cliente || '').toLowerCase();
    const note = (invoiceData.note || '').toLowerCase();
    const esigibitaIva = invoiceData.esigibitaIva || '';
    
    return cliente.includes('asl') ||
           cliente.includes('comune') ||
           cliente.includes('provincia') ||
           cliente.includes('regione') ||
           note.includes('split') ||
           note.includes('scissione') ||
           esigibitaIva === 'S';
}

/**
 * Rileva categoria servizio per analisi IVA
 * @param {Object} invoiceData - Dati fattura
 * @returns {string} Categoria servizio
 */
function detectServiceCategory(invoiceData) {
    const descrizione = ((invoiceData.descrizione || '') + ' ' + (invoiceData.oggetto || '')).toLowerCase();
    
    if (descrizione.includes('medic') || descrizione.includes('sanit')) return 'sanitario';
    if (descrizione.includes('legal') || descrizione.includes('avvocat')) return 'legale';
    if (descrizione.includes('consulen') || descrizione.includes('fiscal')) return 'consulenza';
    if (descrizione.includes('software') || descrizione.includes('IT')) return 'informatico';
    if (descrizione.includes('formaz') || descrizione.includes('corso')) return 'formazione';
    if (descrizione.includes('pubbl') || descrizione.includes('market')) return 'marketing';
    
    return 'generico';
}

/**
 * Normalizza tipo contratto
 * @param {string} contract - Tipo contratto grezzo
 * @returns {string} Contratto normalizzato
 */
function normalizeContractType(contract) {
    if (!contract) return 'tempo_indeterminato';
    
    const contractLower = contract.toLowerCase();
    
    if (contractLower.includes('determin') && !contractLower.includes('indetermin')) return 'tempo_determinato';
    if (contractLower.includes('apprendist')) return 'apprendistato';
    if (contractLower.includes('collaboraz') || contractLower.includes('cococo')) return 'collaborazione';
    if (contractLower.includes('consulen') || contractLower.includes('partita_iva')) return 'consulenza';
    if (contractLower.includes('stagiona')) return 'stagionale';
    if (contractLower.includes('part_time') || contractLower.includes('parziale')) return 'part_time';
    
    return 'tempo_indeterminato';
}

/**
 * Calcola flag di rischio per fatture
 * @param {Object} invoiceData - Dati fattura
 * @returns {Array} Array di flag rischio
 */
function calculateRiskFlags(invoiceData) {
    const flags = [];
    
    const imponibile = cleanNumber(invoiceData.imponibile);
    const iva = cleanNumber(invoiceData.aliquotaIva);
    const totale = cleanNumber(invoiceData.totale);
    
    // Importi anomali
    if (imponibile > 50000) flags.push('HIGH_AMOUNT');
    if (imponibile === totale && iva > 0) flags.push('IVA_MISMATCH');
    if (iva > 25 || (iva > 0 && iva < 4)) flags.push('UNUSUAL_VAT_RATE');
    
    // Date anomale
    const year = extractYear(invoiceData.dataEmissione);
    if (year !== new Date().getFullYear()) flags.push('OLD_INVOICE');
    
    // Cliente anomalo
    const cliente = (invoiceData.cliente || '').toLowerCase();
    if (cliente.includes('test') || cliente.includes('prova')) flags.push('TEST_CLIENT');
    
    return flags;
}

/**
 * Calcola flag di rischio per buste paga
 * @param {Object} payslipData - Dati busta paga
 * @param {number} lordo - Stipendio lordo
 * @returns {Array} Array di flag rischio
 */
function calculatePayslipRiskFlags(payslipData, lordo) {
    const flags = [];
    
    const netto = cleanNumber(payslipData.stipendioNetto || payslipData.netto);
    const irpef = cleanNumber(payslipData.irpef);
    const inps = cleanNumber(payslipData.inps);
    
    // Controlli rapporti
    if (lordo > 0) {
        const nettoPercentage = (netto / lordo) * 100;
        const irpefPercentage = (irpef / lordo) * 100;
        const inpsPercentage = (inps / lordo) * 100;
        
        if (nettoPercentage > 85) flags.push('HIGH_NET_RATIO');
        if (nettoPercentage < 60) flags.push('LOW_NET_RATIO');
        if (irpefPercentage > 45) flags.push('HIGH_TAX_RATE');
        if (irpefPercentage < 10 && lordo > 20000) flags.push('LOW_TAX_RATE');
        if (inpsPercentage < 8 || inpsPercentage > 12) flags.push('UNUSUAL_INPS_RATE');
    }
    
    // Importi anomali
    if (lordo > 8000) flags.push('HIGH_SALARY');
    if (lordo < 800) flags.push('LOW_SALARY');
    
    // Fringe benefits
    const fringe = cleanNumber(payslipData.fringeBenefits);
    if (fringe > 600) flags.push('FRINGE_OVER_LIMIT');
    
    return flags;
}

/**
 * Genera hash per caching
 * @param {Object} data - Dati da hash
 * @returns {string} Hash MD5
 */
function generateDataHash(data) {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('md5').update(dataString).digest('hex');
}

/**
 * Valida struttura dati AI response
 * @param {Object} response - Risposta AI
 * @returns {boolean} True se valida
 */
function validateAIResponse(response) {
    if (!response || typeof response !== 'object') return false;
    
    const requiredFields = ['summary', 'confidence', 'recommendations'];
    return requiredFields.every(field => field in response);
}

/**
 * Merge configurazioni con defaults
 * @param {Object} config - Configurazione utente
 * @param {Object} defaults - Valori default
 * @returns {Object} Configurazione merged
 */
function mergeConfig(config, defaults) {
    return {
        ...defaults,
        ...config,
        // Merge nested objects
        ...(config.providers && {
            providers: { ...defaults.providers, ...config.providers }
        })
    };
}

/**
 * Retry con exponential backoff
 * @param {Function} fn - Funzione da ritentare
 * @param {number} maxRetries - Max tentativi
 * @param {number} baseDelay - Delay base in ms
 * @returns {Promise} Risultato funzione
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxRetries - 1) {
                throw lastError;
            }
            
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Logging sicuro che nasconde dati sensibili
 * @param {string} level - Livello log
 * @param {string} message - Messaggio
 * @param {Object} data - Dati da loggare
 */
function secureLog(level, message, data = {}) {
    const sanitizedData = { ...data };
    
    // Rimuovi campi sensibili
    const sensitiveFields = ['partitaIva', 'codiceFiscale', 'email', 'telefono', 'indirizzo'];
    sensitiveFields.forEach(field => {
        if (sanitizedData[field]) {
            sanitizedData[field] = '[REDACTED]';
        }
    });
    
    console[level](message, sanitizedData);
}

/**
 * Formatta errori per logging
 * @param {Error} error - Errore
 * @returns {Object} Errore formattato
 */
function formatError(error) {
    return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    };
}

/**
 * Calcola statistiche base da array di numeri
 * @param {Array<number>} numbers - Array numeri
 * @returns {Object} Statistiche
 */
function calculateStats(numbers) {
    if (!Array.isArray(numbers) || numbers.length === 0) {
        return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }
    
    const validNumbers = numbers.filter(n => typeof n === 'number' && !isNaN(n));
    
    if (validNumbers.length === 0) {
        return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }
    
    const sum = validNumbers.reduce((a, b) => a + b, 0);
    const avg = sum / validNumbers.length;
    const min = Math.min(...validNumbers);
    const max = Math.max(...validNumbers);
    
    return {
        count: validNumbers.length,
        sum: Math.round(sum * 100) / 100,
        avg: Math.round(avg * 100) / 100,
        min,
        max
    };
}

/**
 * Throttle per limitare chiamate API
 * @param {Function} func - Funzione da throttlare
 * @param {number} delay - Delay in ms
 * @returns {Function} Funzione throttled
 */
function throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    
    return function (...args) {
        const currentTime = Date.now();
        
        if (currentTime - lastExecTime > delay) {
            func.apply(this, args);
            lastExecTime = currentTime;
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
                lastExecTime = Date.now();
            }, delay - (currentTime - lastExecTime));
        }
    };
}

/**
 * Debounce per raggruppare chiamate multiple
 * @param {Function} func - Funzione da debounceare
 * @param {number} delay - Delay in ms
 * @returns {Function} Funzione debounced
 */
function debounce(func, delay) {
    let timeoutId;
    
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Converte oggetto in query string sicura
 * @param {Object} params - Parametri
 * @returns {string} Query string
 */
function toQueryString(params) {
    return Object.keys(params)
        .filter(key => params[key] !== null && params[key] !== undefined)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
}

/**
 * Deep clone di oggetti
 * @param {Object} obj - Oggetto da clonare
 * @returns {Object} Oggetto clonato
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Valida ambiente di produzione
 * @returns {Object} Stato validazione ambiente
 */
function validateEnvironment() {
    const checks = {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        apiKeys: {
            groq: !!process.env.GROQ_API_KEY,
            huggingface: !!process.env.HUGGINGFACE_API_KEY
        },
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    };
    
    checks.isProduction = checks.environment === 'production';
    checks.hasAIProvider = checks.apiKeys.groq || checks.apiKeys.huggingface;
    checks.memoryMB = Math.round(checks.memory.heapUsed / 1024 / 1024);
    
    return checks;
}

/**
 * Benchmark per misurare performance
 * @param {Function} fn - Funzione da benchmarkare
 * @param {number} iterations - Numero iterazioni
 * @returns {Object} Risultati benchmark
 */
async function benchmark(fn, iterations = 10) {
    const times = [];
    let errors = 0;
    
    for (let i = 0; i < iterations; i++) {
        const start = process.hrtime.bigint();
        
        try {
            await fn();
            const end = process.hrtime.bigint();
            times.push(Number(end - start) / 1000000); // Convert to ms
        } catch (error) {
            errors++;
        }
    }
    
    const stats = calculateStats(times);
    
    return {
        iterations,
        errors,
        successRate: ((iterations - errors) / iterations) * 100,
        times: {
            avg: stats.avg,
            min: stats.min,
            max: stats.max,
            total: stats.sum
        }
    };
}

/**
 * Cache LRU semplice per risultati AI
 */
class SimpleLRUCache {
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }
    
    get(key) {
        if (this.cache.has(key)) {
            // Move to end (most recently used)
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            return value;
        }
        return null;
    }
    
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Remove least recently used (first item)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
    
    clear() {
        this.cache.clear();
    }
    
    size() {
        return this.cache.size;
    }
}

/**
 * Formattatore per response API standardizzate
 * @param {boolean} success - Successo operazione
 * @param {any} data - Dati risposta
 * @param {string} message - Messaggio
 * @param {Object} metadata - Metadati aggiuntivi
 * @returns {Object} Response formattata
 */
function formatApiResponse(success, data = null, message = '', metadata = {}) {
    return {
        success,
        data,
        message,
        timestamp: new Date().toISOString(),
        ...metadata
    };
}

/**
 * Validatore specifico per dati fiscali italiani
 * @param {Object} data - Dati da validare
 * @param {string} type - Tipo validazione
 * @returns {Object} Risultato validazione
 */
function validateFiscalData(data, type) {
    const errors = [];
    const warnings = [];
    
    if (type === 'invoice') {
        // Validazioni fattura
        if (!data.imponibile || data.imponibile <= 0) {
            errors.push('Imponibile deve essere maggiore di zero');
        }
        
        if (data.aliquotaIva && ![4, 5, 10, 22].includes(data.aliquotaIva)) {
            warnings.push('Aliquota IVA non standard per normative italiane');
        }
        
        if (data.totale && data.imponibile && data.importoIva) {
            const calculatedTotal = data.imponibile + data.importoIva;
            const difference = Math.abs(data.totale - calculatedTotal);
            if (difference > 0.02) { // Tolleranza 2 centesimi per arrotondamenti
                warnings.push('Totale non corrisponde a imponibile + IVA');
            }
        }
        
    } else if (type === 'payslip') {
        // Validazioni busta paga
        if (!data.stipendioLordo || data.stipendioLordo <= 0) {
            errors.push('Stipendio lordo deve essere maggiore di zero');
        }
        
        if (data.stipendioNetto > data.stipendioLordo) {
            errors.push('Netto non può essere maggiore del lordo');
        }
        
        // Controllo range INPS
        if (data.stipendioLordo > 0 && data.inps > 0) {
            const inpsPercentage = (data.inps / data.stipendioLordo) * 100;
            if (inpsPercentage < 8 || inpsPercentage > 12) {
                warnings.push('Percentuale INPS fuori range normale (8-12%)');
            }
        }
        
        // Controllo fringe benefits
        if (data.fringeBenefits > 600) {
            warnings.push('Fringe benefits superano soglia esenzione €600');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        score: Math.max(0, 100 - (errors.length * 30) - (warnings.length * 10))
    };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Main formatters
    formatJsonForAi,
    formatInvoiceForAi,
    formatPayslipForAi,
    
    // Data cleaners
    cleanNumber,
    sanitizeString,
    formatDate,
    extractYear,
    formatYearMonth,
    
    // Normalizers
    normalizeRegime,
    normalizeContractType,
    
    // Detectors
    detectForfettario,
    detectSplitPayment,
    detectServiceCategory,
    
    // Risk calculators
    calculateRiskFlags,
    calculatePayslipRiskFlags,
    
    // Utilities
    generateDataHash,
    validateAIResponse,
    mergeConfig,
    retryWithBackoff,
    
    // Logging & debugging
    secureLog,
    formatError,
    
    // Math & stats
    calculateStats,
    
    // Performance
    throttle,
    debounce,
    benchmark,
    
    // API helpers
    toQueryString,
    formatApiResponse,
    
    // Validation
    validateFiscalData,
    validateEnvironment,
    
    // Objects
    deepClone,
    SimpleLRUCache
};