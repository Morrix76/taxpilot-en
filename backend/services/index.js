const FatturaElettronicaParser = require('./xml-parser');
const BustaPagaOCR = require('./pdf-ocr');
const TaxAIAnalyzer = require('./ai-analyzer');
const DatabaseService = require('./database');
const AuthService = require('./auth');

module.exports = {
  FatturaElettronicaParser,
  BustaPagaOCR,
  TaxAIAnalyzer,
  DatabaseService,
  AuthService
};