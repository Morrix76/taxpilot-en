// File: backend/utils/disposableEmail.js
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load disposable email domains list
let disposableDomains = new Set();

try {
  const domainsPath = join(__dirname, '../config/disposable-email-domains.json');
  const domainsData = readFileSync(domainsPath, 'utf8');
  const domainsList = JSON.parse(domainsData);
  disposableDomains = new Set(domainsList.map(d => d.toLowerCase()));
  console.log(`✅ Loaded ${disposableDomains.size} disposable email domains`);
} catch (err) {
  console.error('⚠️  Failed to load disposable email domains:', err.message);
  console.warn('⚠️  Disposable email blocking will be disabled');
}

/**
 * Checks if an email address uses a disposable/temporary email domain
 * @param {string} email - The email address to check
 * @returns {boolean} - Returns true if the email is from a disposable domain
 */
export function isDisposableEmail(email) {
  // Handle empty or invalid input
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  // Extract domain (part after '@')
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }

  // Normalize domain to lowercase
  const domain = parts[1].toLowerCase().trim();

  // Check if domain is in the disposable list
  return disposableDomains.has(domain);
}

/**
 * Gets the total count of blocked disposable domains
 * @returns {number} - The number of domains in the blocklist
 */
export function getDisposableDomainsCount() {
  return disposableDomains.size;
}

/**
 * Checks if a domain is in the disposable list (case-insensitive)
 * @param {string} domain - The domain to check
 * @returns {boolean} - Returns true if the domain is disposable
 */
export function isDomainDisposable(domain) {
  if (!domain || typeof domain !== 'string') {
    return false;
  }
  return disposableDomains.has(domain.toLowerCase().trim());
}

