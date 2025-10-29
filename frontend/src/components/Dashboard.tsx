'use client'

import React, { useState, useEffect } from 'react'

const API_BASE_URL = ' + process.env.NEXT_PUBLIC_API_URL + ''

export default function Dashboard() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [validationResult, setValidationResult] = useState(null)

  // Trial data
  const trialData = {
    daysLeft: 12,
    documentsUsed: 8,
    documentsLimit: 20
  }

  // Carica documenti dal backend
  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents`)
      const result = await response.json()
      if (result.status === 'success') {
        setDocuments(result.data)
      }
    } catch (error) {
      console.error('Errore caricamento documenti:', error)
      // Fallback ai dati mock se API non funziona
      setDocuments([
        {
          id: 1,
          name: 'Fattura_001.xml',
          type: 'Fattura Elettronica',
          date: '2025-06-10',
          status: 'Elaborato',
          aiAnalysis: 'Documento valido - Nessun errore rilevato'
        },
        {
          id: 2,
          name: 'BustaPaga_Gennaio.pdf',
          type: 'Busta Paga',
          date: '2025-06-09',
          status: 'Elaborato',
          aiAnalysis: 'Controllo IRPEF completato - Tutto regolare'
        }
      ])
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  // Upload file REALE con analisi AI Groq
  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (file) {
      setPendingFile(file)
      setShowUpload(false)
      setLoading(true)
      
      try {
        console.log('Uploading file:', file.name)
        
        const formData = new FormData()
        formData.append('document', file)
        
        const response = await fetch(`${API_BASE_URL}/api/documents`, {
          method: 'POST',
          body: formData,
          // Non impostare Content-Type, lascia che il browser lo gestisca per FormData
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('AI Analysis result:', result)
        
        setValidationResult(result)
        setLoading(false)
        
        if (result.flag_manual_review) {
          setShowValidationModal(true)
        } else {
          // Documento OK, aggiorna la lista
          processDocument(result.document)
        }
      } catch (error) {
        console.error('Errore upload:', error)
        setLoading(false)
        
        // Mostra errore user-friendly
        alert(`Errore durante l'upload: ${error.message}`)
        
        // Reset stato
        setPendingFile(null)
        setValidationResult(null)
      }
    }
  }

  const processDocument = (documentData) => {
    const newDoc = {
      id: documentData.id,
      name: documentData.name,
      type: documentData.type,
      date: new Date().toISOString().split('T')[0],
      status: 'Elaborato',
      aiAnalysis: documentData.aiAnalysis || validationResult?.message || 'Documento elaborato con successo'
    }
    setDocuments([newDoc, ...documents])
    setPendingFile(null)
    setValidationResult(null)
  }

  const handleProceedAnyway = () => {
    if (validationResult && validationResult.document) {
      processDocument(validationResult.document)
    }
    setShowValidationModal(false)
  }

  const handleCheckNow = () => {
    setShowValidationModal(false)
    if (validationResult && validationResult.issues) {
      const issuesText = validationResult.issues.join('\nâ€¢ ')
      alert(`ðŸ” ANALISI AI DETTAGLIATA:\n\nâ€¢ ${issuesText}\n\nConfidenza AI: ${(validationResult.confidence * 100).toFixed(1)}%`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Loading Overlay con Groq */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-md">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">ðŸ¤– Analisi AI in corso...</h3>
            <p className="text-slate-600 mb-4">Groq sta analizzando il documento per identificare errori fiscali</p>
            <div className="bg-slate-100 rounded-lg p-3">
              <p className="text-sm text-slate-700">
                âš¡ Controllo campi obbligatori<br/>
                ðŸ§® Verifica calcoli IVA/IRPEF<br/>
                ðŸ“‹ Validazione formato
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trial Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white px-6 py-5 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-5">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 border border-white/30">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg">ðŸš€ Trial Premium Attivo</h3>
              <p className="text-indigo-100 font-medium">{trialData.daysLeft} giorni rimasti â€¢ {trialData.documentsUsed}/{trialData.documentsLimit} documenti utilizzati</p>
              <div className="w-48 bg-white/20 rounded-full h-2 mt-2">
                <div 
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(trialData.documentsUsed / trialData.documentsLimit) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <button className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105 shadow-lg">
            âš¡ Upgrade Premium
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 bg-clip-text text-transparent">
              ðŸŽ¯ Dashboard AI
            </h1>
            <p className="text-slate-600 mt-3 text-lg">Gestisci i tuoi documenti fiscali con intelligenza artificiale</p>
          </div>
          <button 
            onClick={() => setShowUpload(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold flex items-center space-x-3 transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>ðŸ“„ Nuovo Documento</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Documenti Totali</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{documents.length}</p>
                <p className="text-emerald-500 text-sm font-semibold mt-1">+12% questo mese</p>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Elaborati Oggi</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">3</p>
                <p className="text-emerald-500 text-sm font-semibold mt-1">Record giornaliero!</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Accuratezza AI</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">98.7%</p>
                <p className="text-purple-500 text-sm font-semibold mt-1">ðŸ”¥ Ottima precisione</p>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Tempo Risparmiato</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">24h</p>
                <p className="text-orange-500 text-sm font-semibold mt-1">âš¡ Super efficiente</p>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50 px-8 py-6 border-b border-slate-200">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">ðŸ“ Documenti Recenti</h2>
              <div className="flex space-x-3">
                <button className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg transition-colors">
                  ðŸ” Cerca
                </button>
                <button className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg transition-colors">
                  ðŸ“Š Filtri
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-indigo-50">
                <tr>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">Nome File</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">Tipo</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">Data</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300">
                    <td className="px-8 py-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-5">
                          <div className="text-sm font-bold text-slate-800">{doc.name}</div>
                          <div className="text-xs text-slate-500">ID: #{doc.id.toString().padStart(3, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex px-4 py-2 text-sm font-bold rounded-xl ${
                        doc.type === 'Fattura Elettronica' 
                          ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-indigo-700' 
                          : 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700'
                      }`}>
                        {doc.type === 'Fattura Elettronica' ? 'ðŸ§¾' : 'ðŸ’°'} {doc.type}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-medium text-slate-700">{doc.date}</td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl ${
                        doc.status === 'Elaborato' 
                          ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700' 
                          : 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700'
                      }`}>
                        {doc.status === 'Elaborato' ? 'âœ…' : 'â³'} {doc.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-medium">
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => {setSelectedDoc(doc); setShowModal(true)}}
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105"
                        >
                          ðŸ‘ï¸ Visualizza
                        </button>
                        <button className="bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105">
                          ðŸ—‘ï¸ Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl">
            <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ðŸ“¤ Carica Documento per Analisi AI
            </h3>
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-6">
              <h4 className="font-bold text-blue-700 mb-2">ðŸ¤– Analisi AI Supportate:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>â€¢ <strong>PDF:</strong> Buste paga, ricevute (OCR + controllo IRPEF)</li>
                <li>â€¢ <strong>XML:</strong> Fatture elettroniche (parsing + validazione IVA)</li>
                <li>â€¢ <strong>Groq AI:</strong> Identifica errori fiscali automaticamente</li>
              </ul>
            </div>

            <div className="border-2 border-dashed border-indigo-300 rounded-2xl p-12 text-center bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-all duration-300">
              <svg className="mx-auto h-16 w-16 text-indigo-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-slate-600 mb-6 font-medium">Trascina i file qui o clicca per selezionare</p>
              <p className="text-slate-500 text-sm mb-6">Formati supportati: PDF, XML (Max 10MB)</p>
              <input 
                type="file" 
                onChange={handleUpload}
                className="hidden" 
                id="file-upload"
                accept=".xml,.pdf"
              />
              <label 
                htmlFor="file-upload"
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl cursor-pointer hover:from-indigo-600 hover:to-purple-700 font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                ðŸ“ Seleziona Documento
              </label>
            </div>
            <div className="flex justify-end space-x-4 mt-8">
              <button 
                onClick={() => setShowUpload(false)}
                className="px-6 py-3 text-slate-600 hover:text-slate-800 font-bold transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal - AI REALE */}
      {showValidationModal && validationResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">
                {validationResult.status === 'error' ? 'âŒ' : 
                 validationResult.status === 'warning' ? 'âš ï¸' : 'âœ…'}
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${
                validationResult.status === 'error' ? 'text-red-600' :
                validationResult.status === 'warning' ? 'text-orange-600' : 'text-green-600'
              }`}>
                {validationResult.status === 'error' ? 'Errori Critici Rilevati' :
                 validationResult.status === 'warning' ? 'Controllo Documento' : 'Documento Valido'}
              </h3>
              <p className="text-slate-600">
                {validationResult.message}
              </p>
              {validationResult.confidence && (
                <p className="text-sm text-slate-500 mt-2">
                  ðŸ¤– Confidenza AI: {(validationResult.confidence * 100).toFixed(1)}%
                </p>
              )}
            </div>
            
            {validationResult.issues && validationResult.issues.length > 0 && (
              <div className={`p-4 rounded-xl border mb-6 ${
                validationResult.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
              }`}>
                <h4 className={`font-bold mb-2 ${
                  validationResult.status === 'error' ? 'text-red-700' : 'text-orange-700'
                }`}>
                  ðŸ“‹ Problemi identificati dall'AI:
                </h4>
                <ul className="space-y-1">
                  {validationResult.issues.map((issue, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <span className={validationResult.status === 'error' ? 'text-red-500' : 'text-orange-500'}>â€¢</span>
                      <span className={`text-sm ${
                        validationResult.status === 'error' ? 'text-red-700' : 'text-orange-700'
                      }`}>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleCheckNow}
                className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 font-bold transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
              >
                <span>ðŸ”</span>
                <span>Dettagli AI</span>
              </button>
              <button 
                onClick={handleProceedAnyway}
                className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 font-bold transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
              >
                <span>âœ…</span>
                <span>Procedi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {showModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                ðŸ“‹ Dettagli Documento
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition-all duration-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
                  <label className="block text-sm font-bold text-indigo-600 mb-2 uppercase tracking-wide">Nome File</label>
                  <p className="text-slate-800 font-medium text-lg">{selectedDoc.name}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                  <label className="block text-sm font-bold text-purple-600 mb-2 uppercase tracking-wide">Tipo Documento</label>
                  <p className="text-slate-800 font-medium text-lg">{selectedDoc.type}</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-xl border border-emerald-200">
                  <label className="block text-sm font-bold text-emerald-600 mb-2 uppercase tracking-wide">Data Elaborazione</label>
                  <p className="text-slate-800 font-medium text-lg">{selectedDoc.date}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-xl border border-orange-200">
                  <label className="block text-sm font-bold text-orange-600 mb-2 uppercase tracking-wide">Status</label>
                  <p className="text-slate-800 font-medium text-lg">{selectedDoc.status}</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <label className="block text-sm font-bold text-slate-600 mb-4 uppercase tracking-wide">ðŸ¤– Analisi AI Groq</label>
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-emerald-100 p-3 rounded-xl">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-emerald-800 font-medium text-lg">{selectedDoc.aiAnalysis}</p>
                    <p className="text-emerald-600 text-sm mt-2">âœ¨ Powered by Groq AI</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-8">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 font-bold transition-all duration-300"
              >
                Chiudi
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 font-bold transition-all duration-300 transform hover:scale-105 shadow-lg">
                ðŸ“¥ Scarica
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
