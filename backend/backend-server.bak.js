// /backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const clientRoutes = require('./routes/clients');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware di sicurezza
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100 // massimo 100 richieste per IP
});
app.use(limiter);

// Middleware base
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cartella per file temporanei
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handler globale
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Errore interno del server' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

// Avvio server
app.listen(PORT, () => {
  console.log(`🚀 Server TaxPilot Assistant avviato su porta ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});