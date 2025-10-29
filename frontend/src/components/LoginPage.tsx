// File: frontend/src/components/LoginPage.tsx
// AGGIORNA IL FILE ESISTENTE

"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Zap, FileText, Users, BarChart3, Play } from 'lucide-react';
import demoAuthService from '../lib/demoAuthService';

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Demo login che funziona sempre
  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const result = await demoAuthService.demoLogin();
      
      if (result.success) {
        // Redirect alla dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Demo login error:', error);
      alert('Errore demo login');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: FileText,
      title: 'Analisi AI Documenti',
      description: 'Parser automatico fatture XML e buste paga PDF con AI'
    },
    {
      icon: Users, 
      title: 'Gestione Clienti',
      description: 'Organizza e gestisci tutti i tuoi clienti in un unico posto'
    },
    {
      icon: BarChart3,
      title: 'Dashboard Analytics',
      description: 'Statistiche e report avanzati per il tuo studio'
    },
    {
      icon: Shield,
      title: 'Sicurezza Enterprise',
      description: 'Protezione dati conforme GDPR e backup automatici'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Zap className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">
              TaxPilot Assistant PRO
            </h1>
          </div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            La piattaforma AI che rivoluziona la gestione fiscale del tuo studio
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6">
                Perché scegliere TaxPilot Assistant PRO?
              </h2>
              <div className="grid gap-6">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex gap-4 p-4 rounded-lg hover:bg-white hover:shadow-sm transition-all">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-slate-600 text-sm">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-semibold text-slate-800 mb-4">Risultati dei nostri clienti:</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">90%</div>
                  <div className="text-sm text-slate-600">Tempo risparmiato</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">50k+</div>
                  <div className="text-sm text-slate-600">Documenti processati</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">99.2%</div>
                  <div className="text-sm text-slate-600">Accuratezza AI</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Demo Login */}
          <div className="lg:pl-8">
            <div className="bg-white rounded-2xl shadow-xl p-8 border">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  Prova Gratis per 15 Giorni
                </h3>
                <p className="text-slate-600">
                  Accesso completo a tutte le funzionalità. Nessuna carta richiesta.
                </p>
              </div>

              {/* Trial Benefits */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <span className="text-slate-700">✅ 20 documenti inclusi</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <span className="text-slate-700">✅ Analisi AI completa</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <span className="text-slate-700">✅ Dashboard completa</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <span className="text-slate-700">✅ Supporto email</span>
                </div>
              </div>

              {/* Demo Button */}
              <button
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Accesso in corso...
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    🎮 Inizia Demo Gratuita
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-500 mt-4">
                Demo completa • Nessun impegno • Attivazione immediata
              </p>
            </div>

            {/* Trust Signals */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500 mb-2">Usato da 500+ studi fiscali in Italia</p>
              <div className="flex justify-center items-center gap-6 opacity-60">
                <div className="text-xs font-medium">🔒 GDPR Compliant</div>
                <div className="text-xs font-medium">⭐ 4.9/5 Rating</div>
                <div className="text-xs font-medium">🇮🇹 Made in Italy</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
