"use client";
import React, { useState, useEffect } from 'react';
import { User, Lock, Bell, Brain, CreditCard, Shield, Database, Save, Eye, EyeOff } from 'lucide-react';

const SettingsPage = () => {
    // Stati per ogni sezione
    const [userProfile, setUserProfile] = useState({
        name: 'Mario Rossi',
        email: 'mario.rossi@studio.it',
        company: 'Studio Commerciale Rossi',
        phone: '+39 331 1234567',
        vatNumber: 'IT12345678901'
    });

    const [aiSettings, setAiSettings] = useState({
        primaryProvider: 'groq',
        confidenceThreshold: 0.8,
        language: 'it',
        autoAnalysis: true,
        notifyResults: true
    });

    const [planInfo, setPlanInfo] = useState({
        currentPlan: 'Premium',
        documentsUsed: 147,
        documentsLimit: 500,
        renewalDate: '2025-07-06',
        monthlyPrice: 49
    });

    const [security, setSecurity] = useState({
        twoFactorEnabled: false,
        lastLogin: '2025-06-06 14:30:00',
        activeDevices: 2
    });

    const [notifications, setNotifications] = useState({
        emailReports: true,
        analysisComplete: true,
        weeklyDigest: true,
        securityAlerts: true,
        marketingEmails: false
    });

    const [apiKeys, setApiKeys] = useState({
        groqKey: 'gsk_••••••••••••••••••••••••••••',
        huggingfaceKey: 'hf_••••••••••••••••••••••••••••',
        showGroq: false,
        showHF: false
    });

    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Funzione salvataggio
    const handleSave = async (section) => {
        setIsSaving(true);
        setSaveMessage('');
        
        try {
            // Simula chiamata API
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setSaveMessage('✅ Impostazioni salvate con successo!');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            setSaveMessage('❌ Errore durante il salvataggio');
        } finally {
            setIsSaving(false);
        }
    };

    // Calcolo percentuale utilizzo documenti
    const usagePercentage = (planInfo.documentsUsed / planInfo.documentsLimit) * 100;

    const tabs = [
        { id: 'profile', label: 'Profilo', icon: User },
        { id: 'ai', label: 'AI Settings', icon: Brain },
        { id: 'plan', label: 'Piano & Fatturazione', icon: CreditCard },
        { id: 'security', label: 'Sicurezza', icon: Shield },
        { id: 'notifications', label: 'Notifiche', icon: Bell },
        { id: 'api', label: 'API Keys', icon: Database }
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">SETTINGS COMPLETO 999</h1>
                    <p className="text-gray-600">Gestisci il tuo account e le preferenze AI</p>
                </div>

                {/* Message Area */}
                {saveMessage && (
                    <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-blue-800 font-medium">{saveMessage}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <nav className="space-y-1">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                                                activeTab === tab.id
                                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            <Icon size={18} />
                                            <span className="font-medium">{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            
                            {/* PROFILO */}
                            {activeTab === 'profile' && (
                                <div className="p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <User className="text-blue-600" size={24} />
                                        <h2 className="text-xl font-semibold">Informazioni Profilo</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nome Completo
                                            </label>
                                            <input
                                                type="text"
                                                value={userProfile.name}
                                                onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={userProfile.email}
                                                onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Studio/Azienda
                                            </label>
                                            <input
                                                type="text"
                                                value={userProfile.company}
                                                onChange={(e) => setUserProfile({...userProfile, company: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Telefono
                                            </label>
                                            <input
                                                type="tel"
                                                value={userProfile.phone}
                                                onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Partita IVA
                                            </label>
                                            <input
                                                type="text"
                                                value={userProfile.vatNumber}
                                                onChange={(e) => setUserProfile({...userProfile, vatNumber: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <button
                                            onClick={() => handleSave('profile')}
                                            disabled={isSaving}
                                            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                        >
                                            <Save size={18} />
                                            <span>{isSaving ? 'Salvando...' : 'Salva Modifiche'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* AI SETTINGS */}
                            {activeTab === 'ai' && (
                                <div className="p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <Brain className="text-blue-600" size={24} />
                                        <h2 className="text-xl font-semibold">Configurazione AI</h2>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Provider AI Primario
                                            </label>
                                            <select
                                                value={aiSettings.primaryProvider}
                                                onChange={(e) => setAiSettings({...aiSettings, primaryProvider: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="groq">Groq (Consigliato)</option>
                                                <option value="huggingface">HuggingFace</option>
                                            </select>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Groq offre risposte più veloci, HuggingFace è più economico
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Soglia Confidence Score: {(aiSettings.confidenceThreshold * 100).toFixed(0)}%
                                            </label>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="1"
                                                step="0.05"
                                                value={aiSettings.confidenceThreshold}
                                                onChange={(e) => setAiSettings({...aiSettings, confidenceThreshold: parseFloat(e.target.value)})}
                                                className="w-full"
                                            />
                                            <p className="text-sm text-gray-500 mt-1">
                                                Analisi con confidence inferiore verranno segnalate per revisione manuale
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Lingua Report
                                            </label>
                                            <select
                                                value={aiSettings.language}
                                                onChange={(e) => setAiSettings({...aiSettings, language: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="it">Italiano</option>
                                                <option value="en">English</option>
                                            </select>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-3">
                                                <input
                                                    type="checkbox"
                                                    id="autoAnalysis"
                                                    checked={aiSettings.autoAnalysis}
                                                    onChange={(e) => setAiSettings({...aiSettings, autoAnalysis: e.target.checked})}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <label htmlFor="autoAnalysis" className="text-sm font-medium text-gray-700">
                                                    Analisi automatica all'upload
                                                </label>
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <input
                                                    type="checkbox"
                                                    id="notifyResults"
                                                    checked={aiSettings.notifyResults}
                                                    onChange={(e) => setAiSettings({...aiSettings, notifyResults: e.target.checked})}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <label htmlFor="notifyResults" className="text-sm font-medium text-gray-700">
                                                    Notifica risultati via email
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <button
                                            onClick={() => handleSave('ai')}
                                            disabled={isSaving}
                                            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                        >
                                            <Save size={18} />
                                            <span>{isSaving ? 'Salvando...' : 'Salva Configurazione'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PIANO & FATTURAZIONE */}
                            {activeTab === 'plan' && (
                                <div className="p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <CreditCard className="text-blue-600" size={24} />
                                        <h2 className="text-xl font-semibold">Piano & Fatturazione</h2>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Piano Attuale */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-blue-900">Piano {planInfo.currentPlan}</h3>
                                                    <p className="text-blue-700">€{planInfo.monthlyPrice}/mese</p>
                                                </div>
                                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                                    Attivo
                                                </span>
                                            </div>
                                            
                                            <div className="mb-4">
                                                <div className="flex justify-between text-sm text-blue-700 mb-1">
                                                    <span>Documenti utilizzati</span>
                                                    <span>{planInfo.documentsUsed}/{planInfo.documentsLimit}</span>
                                                </div>
                                                <div className="w-full bg-blue-200 rounded-full h-2">
                                                    <div 
                                                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <p className="text-sm text-blue-700">
                                                Prossimo rinnovo: {planInfo.renewalDate}
                                            </p>
                                        </div>

                                        {/* Opzioni Piano */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="border border-gray-200 rounded-lg p-4">
                                                <h4 className="font-semibold text-gray-900 mb-2">Trial</h4>
                                                <p className="text-2xl font-bold text-gray-900 mb-2">€0</p>
                                                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                                                    <li>• 15 documenti/mese</li>
                                                    <li>• Analisi AI base</li>
                                                    <li>• Support email</li>
                                                </ul>
                                                <button className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                                                    Piano Base
                                                </button>
                                            </div>

                                            <div className="border border-blue-300 rounded-lg p-4 bg-blue-50">
                                                <h4 className="font-semibold text-blue-900 mb-2">Premium</h4>
                                                <p className="text-2xl font-bold text-blue-900 mb-2">€49</p>
                                                <ul className="text-sm text-blue-700 space-y-1 mb-4">
                                                    <li>• 500 documenti/mese</li>
                                                    <li>• Analisi AI avanzata</li>
                                                    <li>• Support prioritario</li>
                                                    <li>• Export PDF</li>
                                                </ul>
                                                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                                    Piano Attuale
                                                </button>
                                            </div>
                                        </div>

                                        {/* Fatturazione */}
                                        <div className="border-t border-gray-200 pt-6">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cronologia Fatturazione</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                                    <span className="text-sm text-gray-600">Giugno 2025</span>
                                                    <span className="text-sm font-medium">€49.00</span>
                                                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Pagata</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                                    <span className="text-sm text-gray-600">Maggio 2025</span>
                                                    <span className="text-sm font-medium">€49.00</span>
                                                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Pagata</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SICUREZZA */}
                            {activeTab === 'security' && (
                                <div className="p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <Shield className="text-blue-600" size={24} />
                                        <h2 className="text-xl font-semibold">Sicurezza Account</h2>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Cambio Password */}
                                        <div className="border border-gray-200 rounded-lg p-4">
                                            <h3 className="font-semibold text-gray-900 mb-4">Cambia Password</h3>
                                            <div className="space-y-3">
                                                <input
                                                    type="password"
                                                    placeholder="Password attuale"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                                <input
                                                    type="password"
                                                    placeholder="Nuova password"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                                <input
                                                    type="password"
                                                    placeholder="Conferma nuova password"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                                    Aggiorna Password
                                                </button>
                                            </div>
                                        </div>

                                        {/* 2FA */}
                                        <div className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 mb-2">Autenticazione a Due Fattori</h3>
                                                    <p className="text-sm text-gray-600">Aggiungi un ulteriore livello di sicurezza al tuo account</p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="twoFactor"
                                                        checked={security.twoFactorEnabled}
                                                        onChange={(e) => setSecurity({...security, twoFactorEnabled: e.target.checked})}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <label htmlFor="twoFactor" className="text-sm font-medium">
                                                        {security.twoFactorEnabled ? 'Attiva' : 'Disattiva'}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dispositivi Attivi */}
                                        <div className="border border-gray-200 rounded-lg p-4">
                                            <h3 className="font-semibold text-gray-900 mb-4">Dispositivi Attivi</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium">Windows PC - Chrome</p>
                                                        <p className="text-sm text-gray-600">Ultimo accesso: {security.lastLogin}</p>
                                                    </div>
                                                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Attuale</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium">iPhone - Safari</p>
                                                        <p className="text-sm text-gray-600">Ultimo accesso: 2025-06-05 09:15:00</p>
                                                    </div>
                                                    <button className="text-xs text-red-600 hover:text-red-800">Disconnetti</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* NOTIFICHE */}
                            {activeTab === 'notifications' && (
                                <div className="p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <Bell className="text-blue-600" size={24} />
                                        <h2 className="text-xl font-semibold">Preferenze Notifiche</h2>
                                    </div>

                                    <div className="space-y-4">
                                        {Object.entries(notifications).map(([key, value]) => {
                                            const labels = {
                                                emailReports: 'Report via email',
                                                analysisComplete: 'Analisi completata',
                                                weeklyDigest: 'Riassunto settimanale',
                                                securityAlerts: 'Alert di sicurezza',
                                                marketingEmails: 'Email marketing'
                                            };

                                            const descriptions = {
                                                emailReports: 'Ricevi i report di analisi via email',
                                                analysisComplete: 'Notifica quando l\'analisi AI è completata',
                                                weeklyDigest: 'Riassunto settimanale delle attività',
                                                securityAlerts: 'Notifiche per attività sospette',
                                                marketingEmails: 'Offerte e aggiornamenti prodotto'
                                            };

                                            return (
                                                <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{labels[key]}</p>
                                                        <p className="text-sm text-gray-600">{descriptions[key]}</p>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={value}
                                                        onChange={(e) => setNotifications({...notifications, [key]: e.target.checked})}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <button
                                            onClick={() => handleSave('notifications')}
                                            disabled={isSaving}
                                            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                        >
                                            <Save size={18} />
                                            <span>{isSaving ? 'Salvando...' : 'Salva Preferenze'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* API KEYS */}
                            {activeTab === 'api' && (
                                <div className="p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <Database className="text-blue-600" size={24} />
                                        <h2 className="text-xl font-semibold">API Keys</h2>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <div className="flex items-start space-x-3">
                                                <Shield className="text-yellow-600 mt-0.5" size={20} />
                                                <div>
                                                    <h3 className="font-medium text-yellow-800">Sicurezza API Keys</h3>
                                                    <p className="text-sm text-yellow-700 mt-1">
                                                        Le tue API keys sono crittografate e utilizzate solo per le analisi AI.
                                                        Non condividere mai le tue chiavi con terzi.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Groq API Key
                                                </label>
                                                <div className="flex space-x-2">
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type={apiKeys.showGroq ? 'text' : 'password'}
                                                            value={apiKeys.groqKey}
                                                            onChange={(e) => setApiKeys({...apiKeys, groqKey: e.target.value})}
                                                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            placeholder="gsk_..."
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setApiKeys({...apiKeys, showGroq: !apiKeys.showGroq})}
                                                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                                        >
                                                            {apiKeys.showGroq ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Ottieni la tua API key da: <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.groq.com</a>
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    HuggingFace API Key
                                                </label>
                                                <div className="flex space-x-2">
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type={apiKeys.showHF ? 'text' : 'password'}
                                                            value={apiKeys.huggingfaceKey}
                                                            onChange={(e) => setApiKeys({...apiKeys, huggingfaceKey: e.target.value})}
                                                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            placeholder="hf_..."
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setApiKeys({...apiKeys, showHF: !apiKeys.showHF})}
                                                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                                        >
                                                            {apiKeys.showHF ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Ottieni la tua API key da: <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">huggingface.co/settings/tokens</a>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <h3 className="font-medium text-blue-900 mb-2">Status Connessione</h3>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-blue-700">Groq API</span>
                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                        ✅ Connessa
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-blue-700">HuggingFace API</span>
                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                        ✅ Connessa
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                            <h3 className="font-medium text-gray-900 mb-2">Utilizzo API Corrente</h3>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-600">Groq - Questo mese</p>
                                                    <p className="font-semibold">847 / 1000 richieste</p>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                        <div className="bg-blue-600 h-1.5 rounded-full" style={{width: '84.7%'}}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">HuggingFace - Questo mese</p>
                                                    <p className="font-semibold">234 / 1000 richieste</p>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                        <div className="bg-green-600 h-1.5 rounded-full" style={{width: '23.4%'}}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => handleSave('api')}
                                                disabled={isSaving}
                                                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                            >
                                                <Save size={18} />
                                                <span>{isSaving ? 'Salvando...' : 'Salva API Keys'}</span>
                                            </button>
                                            
                                            <button
                                                onClick={() => {
                                                    // Test connection function
                                                    setSaveMessage('🧪 Test connessione in corso...');
                                                    setTimeout(() => {
                                                        setSaveMessage('✅ Connessione API testata con successo!');
                                                        setTimeout(() => setSaveMessage(''), 3000);
                                                    }, 2000);
                                                }}
                                                className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                                            >
                                                <Brain size={18} />
                                                <span>Test Connessione</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
