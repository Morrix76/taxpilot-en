// File: frontend/src/components/TrialBanner.tsx
// NUOVO FILE DA CREARE

import React from 'react';
import { AlertCircle, Crown, Clock } from 'lucide-react';

interface TrialInfo {
  isTrialActive: boolean;
  daysLeft: number;
  documentsUsed: number;
  documentsLimit: number;
  documentsRemaining: number;
  subscriptionStatus: string;
  needsUpgrade: boolean;
}

interface TrialBannerProps {
  trialInfo: TrialInfo;
  onUpgrade: () => void;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ trialInfo, onUpgrade }) => {
  // Se non è trial, non mostrare nulla
  if (trialInfo.subscriptionStatus !== 'trial') {
    return null;
  }

  // Se trial scaduto
  if (!trialInfo.isTrialActive || trialInfo.daysLeft <= 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600" size={24} />
            <div>
              <h3 className="font-semibold text-red-800">
                Trial Scaduto
              </h3>
              <p className="text-sm text-red-700">
                Il tuo periodo di prova è terminato. Effettua l'upgrade per continuare.
              </p>
            </div>
          </div>
          <button 
            onClick={onUpgrade}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Upgrade Ora
          </button>
        </div>
      </div>
    );
  }

  // Se limite documenti raggiunto
  if (trialInfo.documentsUsed >= trialInfo.documentsLimit) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-orange-600" size={24} />
            <div>
              <h3 className="font-semibold text-orange-800">
                Limite Documenti Raggiunto
              </h3>
              <p className="text-sm text-orange-700">
                Hai utilizzato tutti i {trialInfo.documentsLimit} documenti del trial. 
                Upgrade per documenti illimitati.
              </p>
            </div>
          </div>
          <button 
            onClick={onUpgrade}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            Upgrade Ora
          </button>
        </div>
      </div>
    );
  }

  // Trial attivo - banner normale
  const warningLevel = trialInfo.daysLeft <= 3 ? 'critical' : 
                      trialInfo.daysLeft <= 7 ? 'warning' : 'normal';

  const bgColor = warningLevel === 'critical' ? 'bg-red-50 border-red-200' :
                  warningLevel === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200';

  const textColor = warningLevel === 'critical' ? 'text-red-800' :
                    warningLevel === 'warning' ? 'text-yellow-800' :
                    'text-blue-800';

  const iconColor = warningLevel === 'critical' ? 'text-red-600' :
                    warningLevel === 'warning' ? 'text-yellow-600' :
                    'text-blue-600';

  const buttonColor = warningLevel === 'critical' ? 'bg-red-600 hover:bg-red-700' :
                      warningLevel === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                      'bg-blue-600 hover:bg-blue-700';

  return (
    <div className={`${bgColor} border rounded-lg p-4 mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className={iconColor} size={24} />
          <div>
            <h3 className={`font-semibold ${textColor}`}>
              Trial: {trialInfo.daysLeft} {trialInfo.daysLeft === 1 ? 'giorno' : 'giorni'} rimanenti
            </h3>
            <div className="flex items-center gap-4 mt-1">
              <span className={`text-sm ${textColor.replace('800', '700')}`}>
                Documenti: {trialInfo.documentsUsed}/{trialInfo.documentsLimit}
              </span>
              <div className="w-32 bg-white bg-opacity-50 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    warningLevel === 'critical' ? 'bg-red-500' :
                    warningLevel === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, (trialInfo.documentsUsed / trialInfo.documentsLimit) * 100)}%` 
                  }}
                ></div>
              </div>
              <span className={`text-sm ${textColor.replace('800', '700')}`}>
                {trialInfo.documentsRemaining} rimanenti
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {warningLevel !== 'normal' && (
            <div className="text-right mr-2">
              <p className={`text-xs ${textColor.replace('800', '600')}`}>
                {warningLevel === 'critical' ? 'Scadenza imminente!' : 'Upgrade consigliato'}
              </p>
            </div>
          )}
          <button 
            onClick={onUpgrade}
            className={`${buttonColor} text-white px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2`}
          >
            <Crown size={16} />
            Upgrade Premium
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialBanner;
