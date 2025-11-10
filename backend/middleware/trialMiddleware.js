import jwt from 'jsonwebtoken';
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const checkTrialStatus = async (req, res, next) => {
  try {
    // Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const result = await db.execute({
      sql: 'SELECT id, email, trial_end_date, account_status, plan_type FROM users WHERE id = ?',
      args: [decoded.userId]
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // FIX: TRIAL CHECK DISABLED - Always pass through
    req.user = user;
    return next();

    /* ORIGINAL CODE - COMMENTED OUT
    // If paid, always pass
    if (user.plan_type === 'paid' || user.plan_type === 'premium') {
      req.user = user;
      return next();
    }

    // If trial, check expiration
    if (user.plan_type === 'trial') {
      const now = new Date();
      const trialEnd = new Date(user.trial_end_date);
      
      if (now > trialEnd) {
        // Trial expired
        await db.execute({
          sql: 'UPDATE users SET account_status = ? WHERE id = ?',
          args: ['expired', user.id]
        });
        
        return res.status(403).json({ 
          error: 'Trial expired',
          trialExpired: true 
        });
      }
    }

    // Trial still valid
    req.user = user;
    next();
    */
  } catch (error) {
    console.error('Trial middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export default checkTrialStatus;
