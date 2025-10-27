import jwt from 'jsonwebtoken';
import { db } from '../database/db.js';

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
    
    // Recupera utente dal database con info piano
    const result = await db.execute({
      sql: `
        SELECT 
          u.id, u.email, u.name, 
          u.trial_end_date, u.documents_used, u.documents_limit,
          u.piano_data_fine, u.documenti_utilizzati,
          p.documenti_mensili
        FROM users u
        LEFT JOIN piani p ON u.piano_id = p.id
        WHERE u.id = ?
      `,
      args: [decoded.id]
    });

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Utente non trovato' 
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
      name: user.name
    };
    
    req.userId = user.id;
    req.userEmail = user.email;
    req.trialActive = trialActive;
    req.daysLeft = Math.max(0, daysLeft);
    req.documentsUsed = user.documenti_utilizzati || user.documents_used || 0;
    req.documentsLimit = user.documenti_mensili || user.documents_limit || 20;

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
