// File: backend/services/trialService.js
// NUOVO FILE DA CREARE

const { supabase } = require('./database');

class TrialService {
  // Controlla se trial è ancora valido
  async checkTrialStatus(studioId) {
    try {
      const { data: studio, error } = await supabase
        .from('studios')
        .select('*')
        .eq('id', studioId)
        .single();

      if (error) throw error;

      const now = new Date();
      const trialEnd = new Date(studio.trial_end_date);
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

      return {
        isTrialActive: now < trialEnd && studio.subscription_status === 'trial',
        daysLeft: Math.max(0, daysLeft),
        documentsUsed: studio.documents_used || 0,
        documentsLimit: studio.documents_limit || 20,
        clientsCount: studio.clients_count || 0,
        clientsLimit: studio.clients_limit || 5,
        subscriptionStatus: studio.subscription_status,
        needsUpgrade: now >= trialEnd || studio.documents_used >= studio.documents_limit
      };
    } catch (error) {
      console.error('Errore controllo trial:', error);
      return { isTrialActive: false, needsUpgrade: true };
    }
  }

  // Incrementa contatore documenti usati
  async incrementDocumentUsage(studioId) {
    try {
      const { data, error } = await supabase
        .from('studios')
        .update({ 
          documents_used: supabase.raw('documents_used + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('id', studioId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Errore incremento documenti:', error);
      throw error;
    }
  }

  // Controlla se può uploadare documenti
  async canUploadDocument(studioId) {
    const status = await this.checkTrialStatus(studioId);
    
    if (!status.isTrialActive) {
      return { 
        canUpload: false, 
        reason: 'Trial scaduto',
        upgradeRequired: true 
      };
    }

    if (status.documentsUsed >= status.documentsLimit) {
      return { 
        canUpload: false, 
        reason: 'Limite documenti raggiunto',
        upgradeRequired: true 
      };
    }

    return { 
      canUpload: true,
      documentsRemaining: status.documentsLimit - status.documentsUsed
    };
  }

  // Inizializza trial per nuovo studio
  async initializeTrial(studioId) {
    try {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 15);

      const { data, error } = await supabase
        .from('studios')
        .update({
          trial_start_date: new Date().toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          subscription_status: 'trial',
          documents_used: 0,
          clients_count: 0,
          documents_limit: 20,
          clients_limit: 5
        })
        .eq('id', studioId)
        .select()
        .single();

      if (error) throw error;

      // Crea piano subscription
      await supabase
        .from('subscription_plans')
        .insert({
          studio_id: studioId,
          plan_type: 'trial',
          end_date: trialEndDate.toISOString(),
          documents_limit: 20,
          clients_limit: 5,
          price_monthly: 0
        });

      return data;
    } catch (error) {
      console.error('Errore inizializzazione trial:', error);
      throw error;
    }
  }

  // Upgrade a premium
  async upgradeToPremium(studioId) {
    try {
      const { data, error } = await supabase
        .from('studios')
        .update({
          subscription_status: 'premium',
          documents_limit: 999999, // Illimitati
          clients_limit: 999999,   // Illimitati
          updated_at: new Date().toISOString()
        })
        .eq('id', studioId)
        .select()
        .single();

      if (error) throw error;

      // Aggiorna subscription plan
      await supabase
        .from('subscription_plans')
        .update({
          plan_type: 'premium',
          end_date: null, // No scadenza
          documents_limit: 999999,
          clients_limit: 999999,
          price_monthly: 49.00,
          status: 'active'
        })
        .eq('studio_id', studioId);

      return data;
    } catch (error) {
      console.error('Errore upgrade premium:', error);
      throw error;
    }
  }
}

module.exports = new TrialService();