// File: frontend/src/components/UpgradeModal.tsx
// NUOVO FILE DA CREARE

import React from 'react';
import { X, Crown, Check, Zap, Shield, Star, Users, FileText, Clock } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (plan: string) => void;
  trialInfo?: {
    daysLeft: number;
    documentsUsed: number;
    documentsLimit: number;
  };
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ 
  isOpen, 
  onClose, 
  onUpgrade,
  trialInfo 
}) => {
  if (!isOpen) return null;

  const plans = [
    {
      id: 'premium',
      name: 'Premium',
      price: '49',
      period: 'mese',
      description: 'Perfetto per studi piccoli e medi',
      popular: true,
      features: [
        'Documenti illimitati',
        'Clienti illimitati', 
        'AI analysis avanzata',
        'Esportazioni illimitate',
        'Supporto email prioritario',
        'Dashboard analytics',
        'Backup automatico',
        'API access'
      ],
      color: 'blue',
      icon: Crown
    },
    {
      id: 'enterprise',
      name: 'Enterprise', 
      price: '99',
      period: 'mese',
      description: 'Per studi grandi e network',
      popular: false,
      features: [
        'Tutto del Premium',
        'Multi-studio management',
        'White label',
        'Integrazioni custom',
        'Supporto telefonico dedicato',
        'SLA garantiti',
        'Training personalizzato',
        'Account manager dedicato'
      ],
      color: 'purple',
      icon: Star
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Crown className="text-yellow-500" size={28} />
              Upgrade a Premium
            </h2>
            {trialInfo && (
              <p className="text-slate-600 mt-1">
                {trialInfo.daysLeft > 0 
                  ? `${trialInfo.daysLeft} giorni rimasti nel trial`
                  : 'Trial scaduto'
                } • {trialInfo.documentsUsed}/{trialInfo.documentsLimit} documenti utilizzati
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Trial Warning se scaduto */}
        {trialInfo && trialInfo.daysLeft <= 0 && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <Clock size={20} />
              <span className="font-medium">Il tuo trial è scaduto!</span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              Effettua l'upgrade ora per continuare ad utilizzare tutte le funzionalità.
            </p>
          </div>
        )}

        {/* Confronto vs Trial */}
        <div className="px-6 py-4 bg-slate-50">
          <h3 className="font-semibold text-slate-800 mb-3">Cosa ottieni con l'upgrade:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-slate-700">
              <FileText className="text-blue-600" size={20} />
              <span className="text-sm">Da 15 → Documenti illimitati</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Users className="text-green-600" size={20} />
              <span className="text-sm">Da 5 → Clienti illimitati</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Zap className="text-purple-600" size={20} />
              <span className="text-sm">Funzionalità avanzate</span>
            </div>
          </div>
        </div>

        {/* Piani */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isPopular = plan.popular;
              
              return (
                <div 
                  key={plan.id}
                  className={`relative border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
                    isPopular 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Più Popolare
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <Icon className={`mx-auto mb-2 ${
                      plan.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                    }`} size={32} />
                    <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                    <p className="text-slate-600 text-sm mt-1">{plan.description}</p>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-slate-800">€{plan.price}</span>
                      <span className="text-slate-600">/{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="text-green-600 flex-shrink-0" size={16} />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => onUpgrade(plan.id)}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      isPopular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-800 text-white hover:bg-slate-900'
                    }`}
                  >
                    Scegli {plan.name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-slate-50 px-6 py-4 rounded-b-xl">
          <div className="flex items-center justify-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Shield size={16} />
              <span>Pagamento sicuro</span>
            </div>
            <div className="flex items-center gap-1">
              <Check size={16} />
              <span>Nessun impegno</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={16} />
              <span>Attivazione immediata</span>
            </div>
          </div>
          <p className="text-center text-xs text-slate-500 mt-2">
            Puoi annullare in qualsiasi momento. Prezzi IVA esclusa.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
