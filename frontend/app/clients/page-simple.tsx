'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = ' + process.env.NEXT_PUBLIC_API_URL + '';

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const fetchBillingData = async () => {
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

      const statusRes = await fetch(`${API_BASE_URL}/api/billing/status`, { headers });
      if (statusRes.ok) {
        const statusResult = await statusRes.json();
        if (statusResult.success) {
          setBillingData(statusResult.billing);
        }
      }
    } catch (error) {
      console.error('Error loading billing:', error);
      showMessage('error', 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulated submission - in production send email or save to DB
    console.log('Contact form:', contactForm);
    showMessage('success', 'Request sent! We will contact you soon.');
    setShowContactModal(false);
    setContactForm({ name: '', email: '', message: '' });
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!billingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Error loading data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-10">
        
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

        {/* Trial Banner */}
        {billingData.piano.nome === 'trial' && !billingData.periodo.scaduto && (
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white rounded-2xl p-8 mb-10 shadow-2xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-5">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 border border-white/30">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Trial Active</h2>
                  <p className="text-indigo-100 font-medium text-lg">
                    {billingData.periodo.giorni_rimasti} days remaining â€¢ {billingData.utilizzo.documenti_utilizzati}/{billingData.utilizzo.documenti_limite || 'âˆž'} documents used
                  </p>
                  <div className="w-64 bg-white/20 rounded-full h-3 mt-3">
                    <div 
                      className="bg-yellow-400 h-3 rounded-full" 
                      style={{ 
                        width: `${billingData.utilizzo.documenti_limite ? 
                          (billingData.utilizzo.documenti_utilizzati / billingData.utilizzo.documenti_limite) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowContactModal(true)}
                className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-bold hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105 shadow-lg text-lg"
              >
                Request Upgrade
              </button>
            </div>
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-10">
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 px-8 py-6 border-b">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Current Plan</h3>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{billingData.piano.nome}</h4>
                  <div className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">ACTIVE</span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  {billingData.piano.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resource Usage */}
              <div className="col-span-2">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Resource Usage</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Documents */}
                  <div className="text-center">
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-slate-800 dark:text-white">
                        {billingData.utilizzo.documenti_utilizzati}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        of {billingData.utilizzo.documenti_limite || 'âˆž'} documents
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 mb-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${billingData.utilizzo.documenti_limite ? 
                            Math.min(100, (billingData.utilizzo.documenti_utilizzati / billingData.utilizzo.documenti_limite) * 100) : 0}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* Storage */}
                  <div className="text-center">
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-slate-800 dark:text-white">
                        {Math.round(billingData.utilizzo.storage_utilizzato / 1024)}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        of {billingData.utilizzo.storage_limite ? Math.round(billingData.utilizzo.storage_limite / 1024) : 'âˆž'}MB storage
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 mb-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-600 h-4 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${billingData.utilizzo.storage_limite ? 
                            Math.min(100, (billingData.utilizzo.storage_utilizzato / billingData.utilizzo.storage_limite) * 100) : 0}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* Days remaining (trial only) */}
                  {billingData.piano.nome === 'trial' && (
                    <div className="text-center md:col-span-2">
                      <div className="mb-4">
                        <div className="text-3xl font-bold text-slate-800 dark:text-white">
                          {billingData.periodo.giorni_rimasti}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">days remaining</div>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 mb-2">
                        <div 
                          className="bg-gradient-to-r from-yellow-500 to-orange-600 h-4 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.max(0, (billingData.periodo.giorni_rimasti / 30) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Available Plans */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 px-8 py-6 border-b">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Available Plans</h3>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Standard Plan */}
              <div className="border-2 border-slate-200 dark:border-slate-600 rounded-2xl p-6">
                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Standard</h4>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Perfect to get started</div>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Basic document analysis
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    100 documents/month
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    5GB storage
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Email support
                  </li>
                </ul>

                <button 
                  onClick={() => setShowContactModal(true)}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  Request Info
                </button>
              </div>

              {/* Premium Plan */}
              <div className="border-2 border-yellow-400 dark:border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-6 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-xs font-bold uppercase">Popular</span>
                </div>

                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Premium</h4>
                  <div className="text-sm text-slate-500 dark:text-slate-400">For professionals</div>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Advanced document analysis
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Unlimited documents
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    50GB storage
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Client management
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Priority support
                  </li>
                </ul>

                <button 
                  onClick={() => setShowContactModal(true)}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-xl font-bold hover:from-yellow-600 hover:to-orange-600 transform hover:scale-105 transition-all"
                >
                  Request Info
                </button>
              </div>

              {/* Enterprise Plan */}
              <div className="border-2 border-slate-200 dark:border-slate-600 rounded-2xl p-6">
                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Enterprise</h4>
                  <div className="text-sm text-slate-500 dark:text-slate-400">For companies</div>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Everything from Premium
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Multi-user
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Unlimited storage
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    API access
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Dedicated support
                  </li>
                </ul>

                <button 
                  onClick={() => setShowContactModal(true)}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  Contact Us
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Request Information</h3>
              <button 
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message</label>
                <textarea
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="I'm interested in the..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
              >
                Send Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
