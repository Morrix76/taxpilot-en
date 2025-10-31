import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import clientsRoutes from './routes/clients.js';
import documentsRoutes from './routes/documents.js';
import billingRoutes from './routes/billing.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// ====== CORS ======
app.use(cors({
  origin: function(origin, callback) {
    // Permetti richieste senza origin (es. Postman, curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://taxpilot-en-git-main-franks-projects-c85cd5ad.vercel.app',
      'https://taxpilot-en.vercel.app',
      'https://taxpilot-en-franks-projects-c85cd5ad.vercel.app',
      'https://taxpilot-en-production.up.railway.app'
    ];
    
    // Permetti tutti i domini Vercel
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ====== Middleware ======
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ====== Static files ======
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ====== API Routes ======
app.use('/api/auth', authRoutes);
console.log('✅ Rotte /api/auth montate');

app.use('/api/clients', clientsRoutes);
console.log('✅ Rotte /api/clients montate');

app.use('/api/documents', documentsRoutes);
console.log('✅ Rotte /api/documents montate');

app.use('/api/billing', billingRoutes);
console.log('✅ Rotte /api/billing montate');

// ====== Test interno ======
app.get('/api/auth/test-inline', (req, res) => {
  res.json({ message: 'Rotta inline funzionante!' });
});

// ====== Health Check ======
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
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

startServer();