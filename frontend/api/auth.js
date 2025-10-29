// File: backend/routes/auth.js

import express from 'express';
const router = express.Router();

// Demo login funzionante
router.post('/demo-login', (req, res) => {
  res.json({
    success: true,
    message: 'Demo login effettuato',
    data: {
      user: { id: 999, name: 'Demo User', email: 'demo@studio.com' },
      studio: { id: 1, name: 'Studio Demo' },
      token: 'demo-token-123',
      trialInfo: {
        isTrialActive: true,
        daysLeft: 12,
        documentsUsed: 3,
        documentsLimit: 20,
      },
    },
  });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes funzionanti!' });
});

export default router;
