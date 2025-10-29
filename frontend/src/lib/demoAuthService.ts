// File: frontend/src/lib/demoAuthService.ts
// NUOVO FILE DA CREARE

// Demo Auth Service che funziona completamente offline per Vercel

interface DemoUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface DemoStudio {
  id: number;
  name: string;
  subscription_status: string;
}

interface TrialInfo {
  isTrialActive: boolean;
  daysLeft: number;
  documentsUsed: number;
  documentsLimit: number;
  documentsRemaining: number;
  subscriptionStatus: string;
  needsUpgrade: boolean;
}

class DemoAuthService {
  private isDemo = true;
  
  // Simula delay di rete
  private delay(ms: number = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Demo login che funziona sempre
  async demoLogin(): Promise<{
    success: boolean;
    data: {
      user: DemoUser;
      studio: DemoStudio;
      token: string;
      trialInfo: TrialInfo;
    };
  }> {
    await this.delay(300);
    
    const demoData = {
      success: true,
      data: {
        user: {
          id: 999,
          name: 'Demo User',
          email: 'demo@studiofiscale.it',
          role: 'admin'
        },
        studio: {
          id: 1,
          name: 'Studio Fiscale Demo',
          subscription_status: 'trial'
        },
        token: 'demo-token-12345',
        trialInfo: {
          isTrialActive: true,
          daysLeft: 12,
          documentsUsed: 3,
          documentsLimit: 20,
          documentsRemaining: 17,
          subscriptionStatus: 'trial',
          needsUpgrade: false
        }
      }
    };

    // Salva in localStorage per persistenza
    localStorage.setItem('demoAuth', JSON.stringify(demoData.data));
    
    return demoData;
  }

  // Simula upload documento
  async uploadDocument(file: File): Promise<{
    success: boolean;
    data: {
      document: any;
      trialInfo: TrialInfo;
    };
  }> {
    await this.delay(800);
    
    // Recupera stato corrente
    const currentAuth = this.getCurrentAuth();
    if (!currentAuth) throw new Error('Non autenticato');

    // Incrementa documenti usati
    const newDocumentsUsed = currentAuth.trialInfo.documentsUsed + 1;
    const newTrialInfo = {
      ...currentAuth.trialInfo,
      documentsUsed: newDocumentsUsed,
      documentsRemaining: currentAuth.trialInfo.documentsLimit - newDocumentsUsed,
      needsUpgrade: newDocumentsUsed >= currentAuth.trialInfo.documentsLimit
    };

    // Aggiorna localStorage
    const updatedAuth = {
      ...currentAuth,
      trialInfo: newTrialInfo
    };
    localStorage.setItem('demoAuth', JSON.stringify(updatedAuth));

    return {
      success: true,
      data: {
        document: {
          id: Date.now(),
          filename: file.name,
          type: file.name.endsWith('.xml') ? 'Fattura Elettronica' : 'Busta Paga',
          status: 'Processato',
          date: new Date().toLocaleDateString('it-IT')
        },
        trialInfo: newTrialInfo
      }
    };
  }

  // Recupera stato auth corrente
  getCurrentAuth() {
    try {
      const stored = localStorage.getItem('demoAuth');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Simula upgrade
  async upgrade(plan: string): Promise<{ success: boolean; message: string }> {
    await this.delay(1000);
    
    const currentAuth = this.getCurrentAuth();
    if (currentAuth) {
      const updatedAuth = {
        ...currentAuth,
        studio: {
          ...currentAuth.studio,
          subscription_status: 'premium'
        },
        trialInfo: {
          ...currentAuth.trialInfo,
          subscriptionStatus: 'premium',
          documentsLimit: 999999,
          documentsRemaining: 999999,
          needsUpgrade: false
        }
      };
      localStorage.setItem('demoAuth', JSON.stringify(updatedAuth));
    }

    return {
      success: true,
      message: `Upgrade a ${plan} completato! (Demo)`
    };
  }

  // Logout
  logout() {
    localStorage.removeItem('demoAuth');
  }

  // Check se è autenticato
  isAuthenticated(): boolean {
    return !!this.getCurrentAuth();
  }
}

export const demoAuthService = new DemoAuthService();
export default demoAuthService;
