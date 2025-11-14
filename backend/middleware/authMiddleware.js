import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'Token mancante o malformato' 
      });
    }

    const token = authHeader.substring(7);
    
    // Verifica token JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // VALIDAZIONE: verifica che decoded.userId esista e sia valido
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Token non valido: ID utente mancante' 
      });
    }

    // Converti in numero se è stringa
    const userId = typeof decoded.userId === 'string' ? parseInt(decoded.userId) : decoded.userId;
    
    if (isNaN(userId)) {
      return res.status(401).json({ 
        success: false,
        error: 'Token non valido: ID utente non numerico' 
      });
    }
    
    // Recupera utente dal database
    const result = await db.execute({
      sql: `
        SELECT 
          u.id, u.email, u.nome, u.email_verified,
          u.trial_end_date, u.documents_used, u.documents_limit,
          u.piano_data_fine
        FROM users u
        WHERE u.id = ?
      `,
      args: [userId]
    });

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Utente non trovato' 
      });
    }

    // Verifica email verificata (con eccezioni per certe route)
    const exemptRoutes = [
      '/api/auth/verify-email',
      '/api/auth/resend-verification',
      '/api/auth/login',
      '/api/auth/register'
    ];
    
    const currentPath = req.originalUrl || req.path;
    const isExemptRoute = exemptRoutes.some(route => currentPath.startsWith(route));
    
    if (!isExemptRoute && user.email_verified === 0) {
      return res.status(403).json({ 
        success: false,
        error: 'Email non verificata',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Calcola giorni rimasti dal piano
    let daysLeft = 0;
    let trialActive = true;
    
    if (user.piano_data_fine) {
      const now = new Date();
      const trialEnd = new Date(user.piano_data_fine);
      daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      trialActive = now < trialEnd;
    } else if (user.trial_end_date) {
      const now = new Date();
      const trialEnd = new Date(user.trial_end_date);
      daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      trialActive = now < trialEnd;
    }

    // Aggiungi dati utente alla request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.nome
    };
    
    req.userId = user.id;
    req.userEmail = user.email;
    req.trialActive = trialActive;
    req.daysLeft = Math.max(0, daysLeft);
    req.documentsUsed = user.documents_used || 0;
    req.documentsLimit = user.documents_limit || 20;

    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        success: false,
        error: 'Token non valido' 
      });
    }
    
    console.error('Errore middleware auth:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Errore interno del server' 
    });
  }
};

export default authMiddleware;