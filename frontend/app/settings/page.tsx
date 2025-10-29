'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = '${process.env.NEXT_PUBLIC_API_URL}';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    nomeStudio: '',
    telefono: '',
    partitaIva: '',
    codiceFiscale: '',
    indirizzo: '',
    sitoWeb: ''
  });
  const [preferences, setPreferences] = useState({
    lingua: 'IT Italian',
    fusoOrario: 'Europe/Rome (GMT+1)',
    formatoData: 'DD/MM/YYYY',
    valuta: 'EUR Euro',
    tema: 'Light'
  });
  const [aiSettings, setAiSettings] = useState({
    autoElaborazione: true,
    sogliaConfidenza: 85,
    notificaErrori: true,
    analisiAvanzata: false
  });
  const [notifications, setNotifications] = useState({
    documentiElaborati: true,
    erroriRilevati: true,
    reportPeriodici: false,
    digestSettimanale: true
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('taxpilot_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch profilo
      const profileRes = await fetch(`${API_BASE_URL}/api/settings/profile`, { headers });
      if (profileRes.ok) {
        const profileResult = await profileRes.json();
        if (profileResult.success) {
          setProfileData(profileResult.profile);
        }
      }

      // Fetch preferenze
      const prefRes = await fetch(`${API_BASE_URL}/api/settings/preferences`, { headers });
      if (prefRes.ok) {
        const prefResult = await prefRes.json();
        if (prefResult.success) {
          setPreferences(prefResult.preferences);
        }
      }

      // Fetch impostazioni AI
      const aiRes = await fetch(`${API_BASE_URL}/api/settings/ai`, { headers });
      if (aiRes.ok) {
        const aiResult = await aiRes.json();
        if (aiResult.success) {
          setAiSettings(aiResult.aiSettings);
        }
      }

      // Fetch notifiche
      const notifRes = await fetch(`${API_BASE_URL}/api/settings/notifications`, { headers });
      if (notifRes.ok) {
        const notifResult = await notifRes.json();
        if (notifResult.success) {
          setNotifications(notifResult.notifications);
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('taxpilot_token');
      
      const response = await fetch(`${API_BASE_URL}/api/settings/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage('success', 'Profile saved successfully');
      } else {
        showMessage('error', result.error || 'Error saving profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showMessage('error', 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('taxpilot_token');
      
      const response = await fetch(`${API_BASE_URL}/api/settings/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage('success', 'Preferences saved successfully');
      } else {
        showMessage('error', result.error || 'Error saving preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      showMessage('error', 'Error saving preferences');
    } finally {
      setSaving(false);
    }
  };

  const saveAiSettings = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('taxpilot_token');
      
      const response = await fetch(`${API_BASE_URL}/api/settings/ai`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(aiSettings)
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage('success', 'AI settings saved successfully');
      } else {
        showMessage('error', result.error || 'Error saving AI settings');
      }
    } catch (error) {
      console.error('Error saving AI:', error);
      showMessage('error', 'Error saving AI settings');
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('taxpilot_token');
      
      const response = await fetch(`${API_BASE_URL}/api/settings/notifications`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notifications)
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage('success', 'Notifications saved successfully');
      } else {
        showMessage('error', result.error || 'Error saving notifications');
      }
    } catch (error) {
      console.error('Error saving notifications:', error);
      showMessage('error', 'Error saving notifications');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    try {
      if (!passwordData.currentPassword || !passwordData.newPassword) {
        showMessage('error', 'Enter current password and new password');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        showMessage('error', 'Passwords do not match');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        showMessage('error', 'New password must be at least 6 characters long');
        return;
      }

      setSaving(true);
      const token = localStorage.getItem('taxpilot_token');
      
      const response = await fetch(`${API_BASE_URL}/api/settings/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage('success', 'Password changed successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showMessage('error', result.error || 'Error changing password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showMessage('error', 'Error changing password');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const tabs = [
    { id: 'profilo', label: 'Profile', icon: '👤' },
    { id: 'preferenze', label: 'Preferences', icon: '⚙️' },
    { id: 'ai', label: 'AI & Automation', icon: '🤖' },
    { id: 'notifiche', label: 'Notifications', icon: '🔔' },
    { id: 'sicurezza', label: 'Security', icon: '🔒' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 dark:from-slate-200 dark:to-indigo-400 bg-clip-text text-transparent mb-4">
            ⚙️ Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-lg">Configure your account and preferences</p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
              
              {/* Profilo Tab */}
              {activeTab === 'profilo' && (
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">👤 Profile Information</h2>
                    <button 
                      onClick={saveProfile}
                      disabled={saving}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : '💾 Save Changes'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={profileData.email}
                        disabled
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400"
                      />
                      <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Firm Name</label>
                      <input
                        type="text"
                        value={profileData.nomeStudio}
                        onChange={(e) => setProfileData({...profileData, nomeStudio: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={profileData.telefono}
                        onChange={(e) => setProfileData({...profileData, telefono: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">VAT Number</label>
                      <input
                        type="text"
                        value={profileData.partitaIva}
                        onChange={(e) => setProfileData({...profileData, partitaIva: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Tax Code</label>
                      <input
                        type="text"
                        value={profileData.codiceFiscale}
                        onChange={(e) => setProfileData({...profileData, codiceFiscale: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Website</label>
                      <input
                        type="url"
                        value={profileData.sitoWeb}
                        onChange={(e) => setProfileData({...profileData, sitoWeb: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Address</label>
                    <textarea
                      value={profileData.indirizzo}
                      onChange={(e) => setProfileData({...profileData, indirizzo: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Preferenze Tab */}
              {activeTab === 'preferenze' && (
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">⚙️ General Preferences</h2>
                    <button 
                      onClick={savePreferences}
                      disabled={saving}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : '💾 Save Preferences'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">🌍 Language</label>
                      <select 
                        value={preferences.lingua}
                        onChange={(e) => setPreferences({...preferences, lingua: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="IT Italian">IT Italian</option>
                        <option value="EN English">EN English</option>
                        <option value="FR Français">FR French</option>
                        <option value="ES Español">ES Spanish</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">⏰ Time Zone</label>
                      <select 
                        value={preferences.fusoOrario}
                        onChange={(e) => setPreferences({...preferences, fusoOrario: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="Europe/Rome (GMT+1)">Europe/Rome (GMT+1)</option>
                        <option value="Europe/London (GMT+0)">Europe/London (GMT+0)</option>
                        <option value="America/New_York (GMT-5)">America/New_York (GMT-5)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">📅 Date Format</label>
                      <select 
                        value={preferences.formatoData}
                        onChange={(e) => setPreferences({...preferences, formatoData: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (12/06/2025)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (06/12/2025)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (2025-06-12)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">💰 Currency</label>
                      <select 
                        value={preferences.valuta}
                        onChange={(e) => setPreferences({...preferences, valuta: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="EUR Euro">€ Euro</option>
                        <option value="USD Dollar">$ USD</option>
                        <option value="GBP Pound">£ GBP</option>
                        <option value="JPY Yen">¥ JPY</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-8">
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-4">🎨 Theme</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['Light', 'Dark', 'Automatic'].map((tema) => (
                        <div
                          key={tema}
                          onClick={() => setPreferences({...preferences, tema})}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                            preferences.tema === tema
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                              : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-2">
                              {tema === 'Light' ? '☀️' : tema === 'Dark' ? '🌙' : '🔄'}
                            </div>
                            <div className="font-bold text-slate-800 dark:text-white">
                              {tema === 'Light' ? 'Light' : tema === 'Dark' ? 'Dark' : 'Automatic'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Tab */}
              {activeTab === 'ai' && (
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">🤖 AI Settings</h2>
                    <button 
                      onClick={saveAiSettings}
                      disabled={saving}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : '🤖 Save AI Settings'}
                    </button>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200">⚡ Automatic Processing</h3>
                          <p className="text-sm text-blue-600 dark:text-blue-300">Automatically process uploaded documents</p>
                        </div>
                        <div className="relative">
                          <div
                            onClick={() => setAiSettings({...aiSettings, autoElaborazione: !aiSettings.autoElaborazione})}
                            className={`w-12 h-6 rounded-full cursor-pointer transition-colors duration-300 ${
                              aiSettings.autoElaborazione ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                                aiSettings.autoElaborazione ? 'translate-x-6' : 'translate-x-0.5'
                              } translate-y-0.5`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 p-6 rounded-xl border border-purple-200 dark:border-purple-700">
                      <h3 className="text-lg font-bold text-purple-800 dark:text-purple-200 mb-4">🎯 Confidence Threshold</h3>
                      <p className="text-sm text-purple-600 dark:text-purple-300 mb-4">Minimum AI accuracy: {aiSettings.sogliaConfidenza}%</p>
                      
                      <div className="relative">
                        <input
                          type="range"
                          min="50"
                          max="99"
                          value={aiSettings.sogliaConfidenza}
                          onChange={(e) => setAiSettings({...aiSettings, sogliaConfidenza: parseInt(e.target.value)})}
                          className="w-full h-2 bg-purple-200 dark:bg-purple-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-purple-600 dark:text-purple-300 mt-2">
                          <span>50% (Fast)</span>
                          <span>75% (Balanced)</span>
                          <span>99% (Accurate)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifiche Tab */}
              {activeTab === 'notifiche' && (
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">🔔 Notification Preferences</h2>
                    <button 
                      onClick={saveNotifications}
                      disabled={saving}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : '🔔 Save Notifications'}
                    </button>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-6 rounded-xl border border-green-200 dark:border-green-700">
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-200 mb-6">📧 Email Notifications</h3>
                    
                    <div className="space-y-6">
                      {[
                        { key: 'documentiElaborati', label: 'Documents processed', desc: 'Receive email when a document has been processed' },
                        { key: 'erroriRilevati', label: 'Errors detected', desc: 'Notify when errors are found in documents' },
                        { key: 'reportPeriodici', label: 'Periodic reports', desc: 'Weekly/monthly activity reports' },
                        { key: 'digestSettimanale', label: 'Weekly digest', desc: 'Weekly summary of activities' }
                      ].map((notif) => (
                        <div key={notif.key} className="flex items-center justify-between p-4 bg-white dark:bg-slate-700 rounded-lg">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-white">{notif.label}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-300">{notif.desc}</div>
                          </div>
                          <div className="relative">
                            <div
                              onClick={() => setNotifications({...notifications, [notif.key]: !notifications[notif.key]})}
                              className={`w-12 h-6 rounded-full cursor-pointer transition-colors duration-300 ${
                                notifications[notif.key] ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                                  notifications[notif.key] ? 'translate-x-6' : 'translate-x-0.5'
                                } translate-y-0.5`}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sicurezza Tab */}
              {activeTab === 'sicurezza' && (
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">🔒 Security</h2>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 p-6 rounded-xl border border-red-200 dark:border-red-700">
                      <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-6">🔑 Change Password</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Current Password</label>
                          <input
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">New Password</label>
                          <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>

                        <button 
                          onClick={changePassword}
                          disabled={saving}
                          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {saving ? 'Changing...' : '🔑 Change Password'}
                        </button>
                      </div>
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
}
