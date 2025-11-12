import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import clientsRoutes from './routes/clients.js';
import documentsRoutes from './routes/documents.js';
import billingRoutes from './routes/billing.js';
import contabilitaRoutes from './routes/contabilita.js';
import checkTrialStatus from './middleware/trialMiddleware.js';

// ====== DEBUG: ENV INSPECTION ======
console.log('🔍 RAW ENV TEST:');
console.log('  - GROQ_API_KEY exists:', 'GROQ_API_KEY' in process.env);
console.log('  - GROQ_API_KEY value:', process.env.GROQ_API_KEY);
console.log('  - All env keys with GROQ:', Object.keys(process.env).filter(k => k.includes('GROQ')));

// ====== ENV LOADING ======
// Only load dotenv in development (via --import=dotenv/config)
// In production (Railway/Vercel), use provider's env vars directly
const isDev = process.env.NODE_ENV !== 'production';

// ====== FAIL-FAST ENV VALIDATION ======
/**
 * Validates required environment variables at startup
 * Exits process if any critical env var is missing
 */
function requireEnv(keys) {
  const missing = keys.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Set these variables in your Railway/Vercel dashboard or .env file\n');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables present');
}

// Validate critical env vars (only database and auth)
requireEnv([
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'JWT_SECRET'
]);

// ====== OPTIONAL ENV WARNING ======
// GROQ_API_KEY is optional - server works without it (AI disabled)
if (!process.env.GROQ_API_KEY) {
  console.warn('⚠️  WARNING: GROQ_API_KEY not found - AI document analysis will be disabled');
  console.warn('   Documents will be processed with technical parser only\n');
} else {
  console.log('✅ GROQ_API_KEY found - AI analysis enabled');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;

// ====== CORS CONFIGURATION ======
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://taxpilot-en.vercel.app'
];

// Add FRONTEND_URL if specified (for custom domains)
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    // Check allowlist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow all Vercel preview deployments (*.vercel.app)
    if (/\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    
    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ====== Middleware ======
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ====== Static files ======
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ====== File Serving Route ======
app.get('/api/files/:filePath(*)', (req, res) => {
  try {
    const filePath = decodeURIComponent(req.params.filePath);
    const fullPath = path.join(__dirname, 'uploads', filePath);
    
    // Security check: file must be in uploads folder
    if (!fullPath.startsWith(path.join(__dirname, 'uploads'))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.sendFile(fullPath);
  } catch (error) {
    console.error('File serve error:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

// ====== API Routes ======
app.use('/api/auth', authRoutes);
console.log('✅ Rotte /api/auth montate');

// ====== PROTECTED ROUTES (with trial check) ======
app.use('/api/clients', checkTrialStatus, clientsRoutes);
console.log('✅ Rotte /api/clients montate (protected)');

app.use('/api/documents', checkTrialStatus, documentsRoutes);
console.log('✅ Rotte /api/documents montate (protected)');

app.use('/api/billing', checkTrialStatus, billingRoutes);
console.log('✅ Rotte /api/billing montate (protected)');

app.use('/api/contabilita', checkTrialStatus, contabilitaRoutes);
console.log('✅ Rotte /api/contabilita montate (protected)');

// ====== HEALTHZ ENDPOINT ======
/**
 * Production-ready health check endpoint
 * Shows presence of critical env vars without exposing their values
 * Used by Railway/Vercel for readiness probes
 */
app.get('/healthz', (req, res) => {
  const envStatus = {
    TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
    JWT_SECRET: !!process.env.JWT_SECRET,
    GROQ_API_KEY: !!process.env.GROQ_API_KEY, // Optional - AI disabled if missing
    PORT: !!process.env.PORT,
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
  // Only check REQUIRED env vars (GROQ_API_KEY is optional)
  const requiredEnvs = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'JWT_SECRET'];
  const allRequiredPresent = requiredEnvs.every(key => envStatus[key] === true);
  
  res.status(allRequiredPresent ? 200 : 503).json({
    ok: allRequiredPresent,
    has: envStatus,
    ai_enabled: envStatus.GROQ_API_KEY,
    time: new Date().toISOString(),
    version: '3.7.0-turso',
    uptime: process.uptime()
  });
});

// ====== Legacy Health Check (kept for backward compatibility) ======
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '3.7.0-turso',
  });
});

// ====== Error Handling ======
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ====== Start Server ======
async function startServer() {
  try {
    console.log('\n🚀 TaxPilot Backend Starting...');
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌍 Port: ${PORT}`);
    console.log(`🔐 CORS: Vercel domains + ${allowedOrigins.length} explicit origins`);
    
    await initializeDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
      console.log(`🏥 Health check: http://0.0.0.0:${PORT}/healthz`);
      console.log(`📡 Ready to accept connections\n`);
    });
  } catch (err) {
    console.error('❌ Fatal error during startup:', err);
    process.exit(1);
  }
}

startServer();
