'use client'

import React, { useState } from 'react'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAPIModal, setShowAPIModal] = useState(false)

  const [profileData, setProfileData] = useState({
    name: 'Studio Demo',
    email: 'info@studiodemo.it',
    phone: '+39 02 12345678',
    address: 'Via Roma 123, Milano',
    vatNumber: 'IT12345678901',
    fiscalCode: 'STDDMO80A01F205X',
    website: 'www.studiodemo.it'
  })

  const [preferences, setPreferences] = useState({
    language: 'it',
    timezone: 'Europe/Rome',
    dateFormat: 'DD/MM/YYYY',
    currency: 'EUR',
    theme: 'light'
  })

  const [notifications, setNotifications] = useState({
    emailDocuments: true,
    emailErrors: true,
    emailReports: true,
    pushNotifications: false,
    smsAlerts: false,
    weeklyDigest: true
  })

  const [aiSettings, setAISettings] = useState({
    autoProcess: true,
    confidenceThreshold: 85,
    autoCorrect: false,
    detailedAnalysis: true,
    customRules: true
  })

  const [securitySettings, setSecuritySettings] = useState({
    twoFactor: false,
    sessionTimeout: 30,
    ipWhitelist: '',
    auditLog: true
  })

  const tabs = [
    { id: 'profile', name: 'Profilo', icon: '👤' },
    { id: 'preferences', name: 'Preferenze', icon: '⚙️' },
    { id: 'ai', name: 'AI & Automazione', icon: '🤖' },
    { id: 'notifications', name: 'Notifiche', icon: '🔔' },
    { id: 'security', name: 'Sicurezza', icon: '🔐' }
  ]

  const apiKeys = [
    {
      id: 1,
      name: 'Produzione API',
      key: 'sk_live_1234...abcd',
      created: '2025-05-15',
      lastUsed: '2025-06-12',
      status: 'Attiva'
    },
    {
      id: 2,
      name: 'Test API',
      key: 'sk_test_5678...efgh',
      created: '2025-05-10',
      lastUsed: '2025-06-10',
      status: 'Attiva'
    }
  ]

  const handleSave = (section) => {
    console.log(`Salvando ${section}...`)
  }

  const generateAPIKey = () => {
    const newKey = `sk_live_${Math.random().toString(36).substring(2, 15)}`
    setShowAPIModal(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 dark:from-slate-200 dark:to-indigo-400 bg-clip-text text-transparent">
            ⚙️ Impostazioni
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2 text-lg">Configura il tuo account e preferenze</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Tabs */}
          <div className="lg:w-1/4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-xl transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600'
                    }`}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span className="font-medium">{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
              
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">👤 Informazioni Profilo</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Nome Studio</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Telefono</label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Partita IVA</label>
                      <input
                        type="text"
                        value={profileData.vatNumber}
                        onChange={(e) => setProfileData({...profileData, vatNumber: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Codice Fiscale</label>
                      <input
                        type="text"
                        value={profileData.fiscalCode}
                        onChange={(e) => setProfileData({...profileData, fiscalCode: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Sito Web</label>
                      <input
                        type="url"
                        value={profileData.website}
                        onChange={(e) => setProfileData({...profileData, website: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Indirizzo</label>
                      <input
                        type="text"
                        value={profileData.address}
                        onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-8">
                    <button 
                      onClick={() => handleSave('profile')}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                    >
                      💾 Salva Modifiche
                    </button>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">⚙️ Preferenze Generali</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">🌍 Lingua</label>
                      <select
                        value={preferences.language}
                        onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      >
                        <option value="it">🇮🇹 Italiano</option>
                        <option value="en">🇺🇸 English</option>
                        <option value="fr">🇫🇷 Français</option>
                        <option value="de">🇩🇪 Deutsch</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">🕐 Fuso Orario</label>
                      <select
                        value={preferences.timezone}
                        onChange={(e) => setPreferences({...preferences, timezone: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      >
                        <option value="Europe/Rome">Europe/Rome (GMT+1)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                        <option value="America/New_York">America/New_York (GMT-5)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">📅 Formato Data</label>
                      <select
                        value={preferences.dateFormat}
                        onChange={(e) => setPreferences({...preferences, dateFormat: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (12/06/2025)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (06/12/2025)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (2025-06-12)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">💰 Valuta</label>
                      <select
                        value={preferences.currency}
                        onChange={(e) => setPreferences({...preferences, currency: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      >
                        <option value="EUR">€ Euro</option>
                        <option value="USD">$ US Dollar</option>
                        <option value="GBP">£ British Pound</option>
                        <option value="CHF">CHF Swiss Franc</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">🎨 Tema</label>
                      <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                        <p className="text-slate-600 dark:text-slate-300 text-sm">
                          💡 Il tema si cambia dal toggle <span className="font-bold">🌙/☀️</span> nell'header in alto a destra.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-8">
                    <button 
                      onClick={() => handleSave('preferences')}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                    >
                      ⚙️ Salva Preferenze
                    </button>
                  </div>
                </div>
              )}

              {/* AI Settings Tab */}
              {activeTab === 'ai' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">🤖 Impostazioni AI</h2>
                  
                  <div className="space-y-8">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
                      <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">⚡ Elaborazione Automatica</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-700 dark:text-slate-300 font-medium">Auto-elaborazione documenti</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Elabora automaticamente i documenti caricati</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={aiSettings.autoProcess}
                            onChange={(e) => setAISettings({...aiSettings, autoProcess: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 p-6 rounded-xl border border-purple-200 dark:border-purple-700">
                      <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-4">🎯 Soglia di Confidenza</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Accuratezza minima AI: {aiSettings.confidenceThreshold}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="99"
                          value={aiSettings.confidenceThreshold}
                          onChange={(e) => setAISettings({...aiSettings, confidenceThreshold: parseInt(e.target.value)})}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>50% (Veloce)</span>
                          <span>99% (Preciso)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-8">
                    <button 
                      onClick={() => handleSave('ai')}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                    >
                      🤖 Salva Impostazioni AI
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">🔔 Preferenze Notifiche</h2>
                  
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 p-6 rounded-xl border border-emerald-200 dark:border-emerald-700">
                      <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-4">📧 Notifiche Email</h3>
                      <div className="space-y-4">
                        {[
                          { key: 'emailDocuments', label: 'Documenti elaborati', desc: 'Ricevi email quando un documento è stato elaborato' },
                          { key: 'emailErrors', label: 'Errori rilevati', desc: 'Notifica quando vengono trovati errori nei documenti' },
                          { key: 'emailReports', label: 'Report periodici', desc: 'Report settimanali/mensili delle attività' },
                          { key: 'weeklyDigest', label: 'Digest settimanale', desc: 'Riassunto settimanale delle attività' }
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                            <div>
                              <p className="text-slate-700 dark:text-slate-300 font-medium">{item.label}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={notifications[item.key]}
                                onChange={(e) => setNotifications({...notifications, [item.key]: e.target.checked})}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-8">
                    <button 
                      onClick={() => handleSave('notifications')}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                    >
                      🔔 Salva Notifiche
                    </button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">🔐 Sicurezza</h2>
                  
                  <div className="space-y-8">
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 p-6 rounded-xl border border-red-200 dark:border-red-700">
                      <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">🛡️ Autenticazione</h3>
                      
                      <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-slate-700 dark:text-slate-300 font-medium">Autenticazione a due fattori (2FA)</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Proteggi il tuo account con 2FA</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={securitySettings.twoFactor}
                                onChange={(e) => setSecuritySettings({...securitySettings, twoFactor: e.target.checked})}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-slate-700 dark:text-slate-300 font-medium">Timeout sessione: {securitySettings.sessionTimeout} minuti</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Disconnessione automatica dopo inattività</p>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="120"
                            value={securitySettings.sessionTimeout}
                            onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-3"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-8">
                    <button 
                      onClick={() => handleSave('security')}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                    >
                      🔐 Salva Sicurezza
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}