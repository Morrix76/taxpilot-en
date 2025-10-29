'use client'

import React, { useState, useEffect } from 'react'

export default function HomePage() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light'
    setTheme(saved)
    document.documentElement.classList.toggle('dark', saved === 'dark')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  // Dati statici per la landing page
  const trialData = {
    daysLeft: 14,
    documentsLimit: 20
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Dark Mode Toggle - Solo per homepage */}
      <div className="fixed top-4 right-4 z-50">
        <button 
          onClick={toggleTheme}
          className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {/* Trial Banner - Marketing */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white px-6 py-5 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-5">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 border border-white/30">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg">🚀 Prova Premium Gratis</h3>
              <p className="text-indigo-100 font-medium">{trialData.daysLeft} giorni di prova • {trialData.documentsLimit} documenti inclusi</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            ⚡ Inizia Ora
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header - Marketing */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 dark:from-slate-200 dark:to-indigo-400 bg-clip-text text-transparent">
              🎯 La Tua Gestione Fiscale. Semplificata.
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-3 text-lg">Usa l'intelligenza artificiale per analizzare, correggere e archiviare i tuoi documenti.</p>
          </div>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold flex items-center space-x-3 transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <span>🚀 Inizia Gratis</span>
          </button>
        </div>

        {/* Stats Cards - Marketing */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="group bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200 dark:border-slate-700 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wide">Analisi Documenti</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">1M+</p>
                <p className="text-emerald-500 text-sm font-semibold mt-1">Elaborati con successo</p>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
            </div>
          </div>

          <div className="group bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200 dark:border-slate-700 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wide">Accuratezza AI</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">99.2%</p>
                <p className="text-emerald-500 text-sm font-semibold mt-1">Nella rilevazione errori</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>
          </div>

          <div className="group bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200 dark:border-slate-700 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wide">Clienti Soddisfatti</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">10,000+</p>
                <p className="text-purple-500 text-sm font-semibold mt-1">Professionisti e aziende</p>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>
            </div>
          </div>

          <div className="group bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200 dark:border-slate-700 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wide">Tempo Risparmiato</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">48h</p>
                <p className="text-orange-500 text-sm font-semibold mt-1">In media ogni mese</p>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Sezione Features */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 mt-12">
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white text-center mb-8">Come funziona?</h2>
           <div className="p-12 text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">Entra nella Dashboard e Carica</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-2xl mx-auto">Una volta entrato nella tua area riservata, potrai caricare in sicurezza fatture, buste paga e altri documenti. La nostra AI farà il resto.</p>
              <button 
                onClick={() => window.location.href = '/dashboard'}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Vai alla Dashboard
              </button>
            </div>
        </div>

      </div>
    </div>
  )
}
