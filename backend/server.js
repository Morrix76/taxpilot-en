import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import delle route esistenti
import contabilitaRoutes from './routes/contabilita.js';
import analyticsRoutes from './routes/analytics.js';
import pianoContiRoutes from './routes/piano-conti.js';
import billingRoutes from './routes/billing.js';
import settingsRoutes from './routes/settings.js';
import authRoutes from './routes/auth.js';
import documentsRoutes from './routes/documents.js';
import clientsRouter from './routes/clients.js';

// Configura dotenv


// DEBUG: Verifica variabili d'ambiente
console.log('🔧 DEBUG Environment Variables:');
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ PRESENTE' : '❌ MANCANTE');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// DEBUG MIDDLEWARE - DEVE STARE PRIMA DI TUTTE LE ROUTE
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path.includes('documents')) {
    console.log(`🚨 POST DOCUMENTS INTERCETTATO: ${req.method} ${req.path}`);
    console.log(`🔐 Headers Authorization:`, req.headers.authorization ? 'PRESENTE' : 'ASSENTE');
  }
  next();
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/contabilita', contabilitaRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/piano-conti', pianoContiRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/clients', clientsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '3.6.0-billing',
    features: ['contabilita', 'analytics', 'piano-conti', 'billing']
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Errore server:', err);
  res.status(500).json({
    success: false,
    error: 'Errore interno del server',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ── File download API (/api/files/...) ──────────────────────────────────────
const UPLOADS_BASE = path.join(__dirname, 'uploads');

app.get('/api/files/*', (req, res) => {
  // Esempio path in DB: "clienti\\1\\buste-paga\\file.pdf"
  const relRaw = req.params[0] ?? '';
  const relDecoded = decodeURIComponent(relRaw);
  const relUnix = relDecoded.replaceAll('\\', '/'); // Windows -> POSIX
  const safeRel = path.normalize(relUnix).replace(/^(\.\.(\/|\\|$))+/g, '');
  const abs = path.join(UPLOADS_BASE, safeRel);

  // Anti path traversal
  if (!abs.startsWith(UPLOADS_BASE)) {
    return res.status(400).json({ success: false, error: 'Path non valido' });
  }

  fs.access(abs, fs.constants.R_OK, (err) => {
    if (err) {
      return res.status(404).json({ success: false, error: 'File non trovato' });
    }
    res.sendFile(abs);
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint non trovato',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`
🚀 Server Tax Assistant v3.7.0-gdpr
📂 Server: http://localhost:${PORT}
📊 Health: http://localhost:${PORT}/api/health
💰 Billing: http://localhost:${PORT}/api/billing/status
📈 Analytics: http://localhost:${PORT}/api/analytics/overview
🧮 Piano Conti: http://localhost:${PORT}/api/piano-conti/1
📚 Contabilità: http://localhost:${PORT}/api/contabilita/test
🔒 GDPR Privacy: http://localhost:${PORT}/api/gdpr/privacy-policy
  `);
});