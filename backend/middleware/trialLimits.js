// File: backend/middleware/trialLimits.js
// NUOVO FILE DA CREARE

const trialService = require('../services/trialService');

// Middleware per controllare limiti trial
const checkTrialLimits = async (req, res, next) => {
  try {
    // Estrai studio ID dal token JWT
    const studioId = req.user?.studioId || req.user?.studio_id;
    
    if (!studioId) {
      return res.status(401).json({
        success: false,
        error: 'Studio ID non trovato',
        code: 'STUDIO_NOT_FOUND'
      });
    }

    // Controlla status trial
    const trialStatus = await trialService.checkTrialStatus(studioId);
    
    // Aggiungi info trial alla request per uso nei controller
    req.trialStatus = trialStatus;

    // Se trial scaduto, blocca
    if (!trialStatus.isTrialActive && trialStatus.subscriptionStatus === 'trial') {
      return res.status(403).json({
        success: false,
        error: 'Trial scaduto',
        code: 'TRIAL_EXPIRED',
        data: {
          daysLeft: 0,
          needsUpgrade: true,
          upgradeUrl: '/upgrade'
        }
      });
    }

    next();
  } catch (error) {
    console.error('Errore middleware trial:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore controllo trial',
      code: 'TRIAL_CHECK_ERROR'
    });
  }
};

// Middleware specifico per upload documenti
const checkDocumentLimits = async (req, res, next) => {
  try {
    const studioId = req.user?.studioId || req.user?.studio_id;
    
    const uploadPermission = await trialService.canUploadDocument(studioId);
    
    if (!uploadPermission.canUpload) {
      return res.status(403).json({
        success: false,
        error: uploadPermission.reason,
        code: uploadPermission.reason === 'Trial scaduto' ? 'TRIAL_EXPIRED' : 'DOCUMENT_LIMIT_REACHED',
        data: {
          upgradeRequired: uploadPermission.upgradeRequired,
          upgradeUrl: '/upgrade'
        }
      });
    }

    // Aggiungi info alla request
    req.uploadPermission = uploadPermission;
    next();
  } catch (error) {
    console.error('Errore controllo limiti documento:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore controllo limiti',
      code: 'LIMIT_CHECK_ERROR'
    });
  }
};

// Middleware per fornire trial info (non bloccante)
const addTrialInfo = async (req, res, next) => {
  try {
    const studioId = req.user?.studioId || req.user?.studio_id;
    
    if (studioId) {
      const trialStatus = await trialService.checkTrialStatus(studioId);
      req.trialStatus = trialStatus;
    }
    
    next();
  } catch (error) {
    console.error('Errore aggiunta trial info:', error);
    // Non bloccare, prosegui senza trial info
    next();
  }
};

module.exports = {
  checkTrialLimits,
  checkDocumentLimits,
  addTrialInfo
};