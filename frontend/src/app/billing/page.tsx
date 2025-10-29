'use client'

import React, { useState } from 'react'

export default function Billing() {
  const [currentPlan, setCurrentPlan] = useState('trial')
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)

  const plans = [
    {
      id: 'trial',
      name: 'Trial Gratuito',
      icon: '🆓',
      price: { monthly: 0, yearly: 0 },
      limits: {
        documents: 20,
        clients: 5,
        storage: '500MB',
        support: 'Email'
      },
      features: [
        'Analisi AI base',
        'Upload documenti PDF/XML',
        'Dashboard semplificata',
        '5 clienti massimo',
        'Support via email'
      ],
      popular: false,
      current: true
    },
    {
      id: 'standard',
      name: 'Standard',
      icon: '📊',
      price: { monthly: 29, yearly: 290 },
      limits: {
        documents: 500,
        clients: 50,
        storage: '10GB',
        support: 'Email + Chat'
      },
      features: [
        'Analisi AI avanzata',
        'Upload illimitati',
        'Dashboard completa',
        'Fino a 50 clienti',
        'Backup automatico',
        'Report mensili',
        'Support prioritario'
      ],
      popular: false,
      current: false
    },
    {
      id: 'premium',
      name: 'Premium',
      icon: '⭐',
      price: { monthly: 49, yearly: 490 },
      limits: {
        documents: 2000,
        clients: 200,
        storage: '50GB',
        support: 'Prioritario'
      },
      features: [
        'Tutto di Standard +',
        'API access',
        'Automazioni avanzate',
        'White-label reports',
        'Integrazioni con ERP',
        'Analytics avanzate',
        'Support telefonico'
      ],
      popular: true,
      current: false
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: '👑',
      price: { monthly: 99, yearly: 990 },
      limits: {
        documents: 'Illimitati',
        clients: 'Illimitati',
        storage: '500GB',
        support: 'Dedicato'
      },
      features: [
        'Tutto di Premium +',
        'Multi-studio',
        'SSO integrazione',
        'Compliance avanzata',
        'Custom integrations',
        'Account manager dedicato',
        'SLA garantito 99.9%'
      ],
      popular: false,
      current: false
    }
  ]

  const invoices = [
    {
      id: 'INV-2025-001',
      date: '2025-06-01',
      amount: 49.00,
      status: 'Pagata',
      plan: 'Premium',
      period: 'Giugno 2025'
    },
    {
      id: 'INV-2025-002',
      date: '2025-05-01',
      amount: 49.00,
      status: 'Pagata',
      plan: 'Premium',
      period: 'Maggio 2025'
    },
    {
      id: 'INV-2025-003',
      date: '2025-04-01',
      amount: 29.00,
      status: 'Pagata',
      plan: 'Standard',
      period: 'Aprile 2025'
    }
  ]

  const usage = {
    documents: { used: 12, limit: 20, percentage: 60 },
    clients: { used: 3, limit: 5, percentage: 60 },
    storage: { used: '245MB', limit: '500MB', percentage: 49 },
    apiCalls: { used: 0, limit: 'N/A', percentage: 0 }
  }

  const trialData = {
    daysLeft: 12,
    startDate: '2025-05-30',
    endDate: '2025-06-15'
  }

  const handleUpgrade = (plan) => {
    setSelectedPlan(plan)
    setShowUpgradeModal(true)
  }

  const confirmUpgrade = () => {
    setCurrentPlan(selectedPlan.id)
    setShowUpgradeModal(false)
    // Qui andrà l'integrazione con Stripe
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pagata': return 'bg-emerald-100 text-emerald-700'
      case 'In sospeso': return 'bg-yellow-100 text-yellow-700'
      case 'Scaduta': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 bg-clip-text text-transparent">
            💳 Fatturazione & Piani
          </h1>
          <p className="text-slate-600 mt-2 text-lg">Gestisci il tuo piano e pagamenti</p>
        </div>

        {/* Current Plan Status */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">📊 Piano Attuale</h2>
            {currentPlan === 'trial' && (
              <div className="bg-gradient-to-r from-orange-100 to-yellow-100 border border-orange-200 rounded-xl px-4 py-2">
                <span className="text-orange-700 font-bold">⏰ {trialData.daysLeft} giorni rimasti</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plan Info */}
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl">
                    <span className="text-2xl text-white">
                      {plans.find(p => p.id === currentPlan)?.icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {plans.find(p => p.id === currentPlan)?.name}
                    </h3>
                    <p className="text-slate-600">
                      {currentPlan === 'trial' ? 'Gratuito' : `€${plans.find(p => p.id === currentPlan)?.price[billingCycle]} /${billingCycle === 'monthly' ? 'mese' : 'anno'}`}
                    </p>
                  </div>
                </div>

                {currentPlan === 'trial' && (
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Periodo trial</span>
                      <span className="text-sm text-slate-600">{trialData.startDate} - {trialData.endDate}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="h-2 bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${100 - (trialData.daysLeft / 15 * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {currentPlan === 'trial' && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-xl border border-emerald-200">
                  <h4 className="font-bold text-emerald-600 mb-3">🚀 Upgrade Consigliato</h4>
                  <p className="text-emerald-700 mb-4">Il tuo trial scade presto. Upgrade al piano Premium per continuare senza interruzioni!</p>
                  <button 
                    onClick={() => handleUpgrade(plans.find(p => p.id === 'premium'))}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-xl font-bold hover:from-emerald-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105"
                  >
                    ⭐ Upgrade a Premium
                  </button>
                </div>
              )}
            </div>

            {/* Usage Stats */}
            <div className="space-y-6">
              <h4 className="text-lg font-bold text-slate-800">📈 Utilizzo Risorse</h4>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">📄 Documenti</span>
                    <span className="text-sm font-bold text-slate-800">{usage.documents.used} / {usage.documents.limit}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        usage.documents.percentage > 80 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                        usage.documents.percentage > 60 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                        'bg-gradient-to-r from-emerald-400 to-emerald-600'
                      }`}
                      style={{ width: `${usage.documents.percentage}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">👥 Clienti</span>
                    <span className="text-sm font-bold text-slate-800">{usage.clients.used} / {usage.clients.limit}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className="h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${usage.clients.percentage}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">💾 Storage</span>
                    <span className="text-sm font-bold text-slate-800">{usage.storage.used} / {usage.storage.limit}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className="h-3 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${usage.storage.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Plans Comparison */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">💎 Tutti i Piani</h2>
            <div className="flex items-center space-x-3 bg-white rounded-xl p-2 shadow-sm border border-slate-200">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  billingCycle === 'monthly'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Mensile
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  billingCycle === 'yearly'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Annuale <span className="text-emerald-500 font-bold">(-17%)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => (
              <div key={plan.id} className={`relative bg-white rounded-2xl shadow-xl border-2 overflow-hidden transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-2 ${
                plan.popular ? 'border-gradient-to-r from-indigo-500 to-purple-600' : 'border-slate-200'
              } ${plan.current ? 'ring-4 ring-emerald-200' : ''}`}>
                
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-center py-2">
                    <span className="font-bold text-sm">🔥 PIÙ POPOLARE</span>
                  </div>
                )}

                {plan.current && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-center py-2">
                    <span className="font-bold text-sm">✅ PIANO ATTUALE</span>
                  </div>
                )}

                <div className={`p-8 ${plan.popular || plan.current ? 'pt-12' : ''}`}>
                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-3">{plan.icon}</div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                    <div className="text-center">
                      <span className="text-4xl font-bold text-slate-800">€{plan.price[billingCycle]}</span>
                      <span className="text-slate-600">/{billingCycle === 'monthly' ? 'mese' : 'anno'}</span>
                    </div>
                  </div>

                  {/* Limits */}
                  <div className="mb-6 space-y-2">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Limiti</div>
                      <div className="text-sm text-slate-700">
                        <div>📄 {plan.limits.documents} documenti</div>
                        <div>👥 {plan.limits.clients} clienti</div>
                        <div>💾 {plan.limits.storage} storage</div>
                        <div>🎧 Support {plan.limits.support}</div>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mb-8">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span className="text-sm text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <div className="text-center">
                    {plan.current ? (
                      <button className="w-full bg-emerald-100 text-emerald-700 py-3 rounded-xl font-bold border border-emerald-200">
                        ✅ Piano Attuale
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpgrade(plan)}
                        className={`w-full py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                          plan.popular
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {plan.id === 'trial' ? '🆓 Inizia Gratis' : '🚀 Upgrade'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoices History */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">🧾 Storico Fatture</h2>
            <button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105">
              📥 Scarica Tutte
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-indigo-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-600 uppercase">Fattura</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-600 uppercase">Data</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-600 uppercase">Piano</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-600 uppercase">Periodo</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-600 uppercase">Importo</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-600 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800">{invoice.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700">{invoice.date}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
                        {invoice.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700">{invoice.period}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800">€ {invoice.amount.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(invoice.status)}`}>
                        {invoice.status === 'Pagata' ? '✅' : '⏳'} {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors">
                        📥 PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-center">
              🚀 Conferma Upgrade
            </h3>
            
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">{selectedPlan.icon}</div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">Piano {selectedPlan.name}</h4>
              <div className="text-3xl font-bold text-slate-800 mb-1">€{selectedPlan.price[billingCycle]}</div>
              <div className="text-slate-600">/{billingCycle === 'monthly' ? 'mese' : 'anno'}</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl mb-6">
              <h5 className="font-bold text-slate-800 mb-2">Cosa otterrai:</h5>
              <ul className="space-y-1">
                {selectedPlan.features.slice(0, 3).map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <span className="text-emerald-500">✓</span>
                    <span className="text-sm text-slate-700">{feature}</span>
                  </li>
                ))}
                {selectedPlan.features.length > 3 && (
                  <li className="text-sm text-slate-500">...e altro ancora</li>
                )}
              </ul>
            </div>
            
            <div className="flex space-x-4">
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 px-6 py-3 text-slate-600 hover:text-slate-800 font-bold transition-colors"
              >
                Annulla
              </button>
              <button 
                onClick={confirmUpgrade}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                💳 Upgrade Ora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
