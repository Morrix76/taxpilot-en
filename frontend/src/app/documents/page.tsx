'use client'

import React, { useState, useEffect, useMemo } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api'

// ========================================================================
// FUNZIONE HELPER AGGIUNTA COME DA ISTRUZIONI
// ========================================================================
const safeParseJSON = (jsonString, fallback = []) => {
  try {
    return typeof jsonString === 'string' && jsonString.trim()
       ? JSON.parse(jsonString)
       : fallback;
  } catch {
    return fallback;
  }
};

interface Document {
  id: number;
  name: string;
  type: string;
  document_type_detected?: string;
  created_at: string;
  ai_status: 'ok' | 'error' | 'warning';
  ai_confidence: number;
  flag_manual_review: boolean;
  file_size: number;
  ai_analysis: string;
  ai_issues: string;
  analysis_result?: any;
}

interface Filters {
  type: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [selectedDocs, setSelectedDocs] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<keyof Document>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  // Filtri funzionali
  const [filters, setFilters] = useState<Filters>({
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  })

  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/documents`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(Array.isArray(data) ? data : data.data || [])
      }
    } catch (error) {
      console.error('Errore caricamento documenti:', error)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  // Filtri e sort applicati
  const filteredDocuments = useMemo(() => {
    let filtered = documents.filter(doc => {
      // Filtro tipo
      if (filters.type && doc.document_type_detected !== filters.type && doc.type !== filters.type) return false
      
      // Filtro status
      if (filters.status) {
        if (filters.status === 'ok' && doc.ai_status !== 'ok') return false
        if (filters.status === 'error' && doc.ai_status !== 'error') return false
        if (filters.status === 'review' && !doc.flag_manual_review) return false
      }
      
      // Filtro date
      if (filters.dateFrom) {
        const docDate = new Date(doc.created_at).toISOString().split('T')[0]
        if (docDate < filters.dateFrom) return false
      }
      if (filters.dateTo) {
        const docDate = new Date(doc.created_at).toISOString().split('T')[0]
        if (docDate > filters.dateTo) return false
      }
      
      // Filtro ricerca
      if (filters.search && !doc.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      
      return true
    })

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]
      
      if (sortField === 'created_at') {
        aValue = new Date(aValue as string).getTime()
        bValue = new Date(bValue as string).getTime()
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [documents, filters, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE)
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset pagination quando filtri cambiano
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const handleSort = (field: keyof Document) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({
      type: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    })
  }

  const handleSelectDocument = (id: number) => {
    setSelectedDocs(prev => 
      prev.includes(id) 
        ? prev.filter(docId => docId !== id)
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedDocs.length === paginatedDocuments.length) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(paginatedDocuments.map(doc => doc.id))
    }
  }

  const handleViewDocument = (doc: Document) => {
    setSelectedDoc(doc)
    setShowModal(true)
  }

  const handleDeleteDocument = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchDocuments()
        setSelectedDocs(prev => prev.filter(docId => docId !== id))
        alert('✅ Documento eliminato con successo!')
      } else {
        throw new Error('Errore durante eliminazione')
      }
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('❌ Errore durante l\'eliminazione del documento')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedDocs.length === 0) return
    if (!confirm(`Eliminare ${selectedDocs.length} documenti selezionati?`)) return
    
    try {
      const deletePromises = selectedDocs.map(id => 
        fetch(`${API_BASE_URL}/documents/${id}`, { method: 'DELETE' })
      )
      
      await Promise.all(deletePromises)
      await fetchDocuments()
      setSelectedDocs([])
      alert(`✅ ${selectedDocs.length} documenti eliminati con successo!`)
    } catch (error) {
      console.error('Errore eliminazione batch:', error)
      alert('❌ Errore durante l\'eliminazione dei documenti')
    }
  }

  const handleReAnalyze = async (docId) => {
    if (!confirm('Rilanciare l\'analisi AI per questo documento?')) return;
  
    try {
      console.log('🔄 Ri-analisi da dashboard per documento:', docId);
  
      const response = await fetch(`${API_BASE_URL}/documents/${docId}/reanalyze`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
  
      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }
  
      const result = await response.json();
  
      if (result.success) {
        alert('🤖 Ri-analisi completata!\n\nIl documento è stato riprocessato con successo.');
        // Ricarica documenti se hai una funzione per farlo
        await fetchDocuments?.();
      } else {
        throw new Error('Ri-analisi fallita');
      }
  
    } catch (error) {
      console.error('❌ Errore ri-analisi:', error);
      alert('❌ Errore durante la ri-analisi: ' + error.message);
    }
  };

  const handleDownload = (doc) => {
    // Nuovo URL
    const link = document.createElement('a')
    link.href = `${API_BASE_URL}/documents/download/${doc.id}`
    link.download = doc.name
    link.click()
  }

  const exportToExcel = () => {
    const csvContent = [
      ['Nome', 'Tipo', 'Data', 'Status', 'Confidence'],
      ...filteredDocuments.map(doc => [
        doc.name,
        doc.document_type_detected || doc.type,
        new Date(doc.created_at).toLocaleDateString('it-IT'),
        doc.ai_status === 'ok' ? 'Conforme' : 'Con errori',
        `${(doc.ai_confidence * 100).toFixed(1)}%`
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `documenti_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusInfo = (doc: Document) => {
    if (doc.ai_status === 'error') {
      return { 
        text: 'Con errori', 
        color: 'from-red-100 to-pink-100 dark:from-red-900 dark:to-pink-900 text-red-700 dark:text-red-300',
        icon: '❌'
      }
    }
    if (doc.flag_manual_review) {
      return { 
        text: 'Da rivedere', 
        color: 'from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 text-yellow-700 dark:text-yellow-300',
        icon: '⚠️'
      }
    }
    return { 
      text: 'Conforme', 
      color: 'from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 text-emerald-700 dark:text-emerald-300',
      icon: '✅'
    }
  }

  // Statistiche calcolate
  const stats = useMemo(() => {
    const total = filteredDocuments.length
    const conforme = filteredDocuments.filter(d => d.ai_status === 'ok' && !d.flag_manual_review).length
    const errori = filteredDocuments.filter(d => d.ai_status === 'error').length
    const daRivedere = filteredDocuments.filter(d => d.flag_manual_review).length
    const confidenceMedia = total > 0 
      ? filteredDocuments.reduce((sum, d) => sum + d.ai_confidence, 0) / total 
      : 0

    return { total, conforme, errori, daRivedere, confidenceMedia }
  }, [filteredDocuments])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-slate-600 dark:text-slate-300">Caricamento documenti...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 dark:from-slate-200 dark:to-indigo-400 bg-clip-text text-transparent">
              📁 Gestione Documenti
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-3 text-lg">
              Visualizza e gestisci tutti i documenti analizzati ({filteredDocuments.length} di {documents.length})
            </p>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={exportToExcel}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              📊 Export CSV
            </button>
            <button 
              onClick={fetchDocuments}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              🔄 Aggiorna
            </button>
          </div>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Totale Filtrati</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="text-3xl font-bold text-green-600">{stats.conforme}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Conformi</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="text-3xl font-bold text-red-600">{stats.errori}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Con Errori</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="text-3xl font-bold text-yellow-600">{stats.daRivedere}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Da Rivedere</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="text-3xl font-bold text-purple-600">{(stats.confidenceMedia * 100).toFixed(1)}%</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Confidence Media</div>
          </div>
        </div>

        {/* Filtri Funzionali */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
            🔍 Filtri Ricerca
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Tipo Documento</label>
              <select 
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
              >
                <option value="">Tutti i tipi</option>
                <option value="Fattura Elettronica">Fatture Elettroniche</option>
                <option value="Busta Paga">Buste Paga</option>
                <option value="Documento Fiscale">Altri Documenti</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Status</label>
              <select 
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
              >
                <option value="">Tutti gli stati</option>
                <option value="ok">Conformi</option>
                <option value="error">Con errori</option>
                <option value="review">Da rivedere</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Data Da</label>
              <input 
                type="date" 
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Data A</label>
              <input 
                type="date" 
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Ricerca</label>
              <input 
                type="text" 
                placeholder="Nome file..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={resetFilters}
                className="w-full bg-slate-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-slate-600 transition-colors"
              >
                🗑️ Reset
              </button>
            </div>
          </div>
        </div>

        {/* Azioni Batch */}
        {selectedDocs.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 dark:text-blue-200 font-medium">
                {selectedDocs.length} documenti selezionati
              </span>
              <button
                onClick={handleBatchDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold"
              >
                🗑️ Elimina Selezionati
              </button>
            </div>
          </div>
        )}

        {/* Tabella Documenti */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 px-8 py-6 border-b border-slate-200 dark:border-slate-600">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">📄 Documenti</h2>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Mostrando {paginatedDocuments.length} di {filteredDocuments.length} documenti
              </span>
            </div>
          </div>
          
          {filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📂</div>
              <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">
                {documents.length === 0 ? 'Nessun documento caricato' : 'Nessun documento corrisponde ai filtri'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {documents.length === 0 
                  ? 'Carica il tuo primo documento dalla Dashboard per iniziare'
                  : 'Prova a modificare i filtri di ricerca'
                }
              </p>
              {documents.length === 0 ? (
                <a 
                  href="/dashboard"
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg inline-block"
                >
                  🎯 Vai alla Dashboard
                </a>
              ) : (
                <button 
                  onClick={resetFilters}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  🔄 Rimuovi Filtri
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600">
                  <tr>
                    <th className="p-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedDocs.length === paginatedDocuments.length && paginatedDocuments.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 dark:border-slate-600"
                      />
                    </th>
                    <th 
                      className="px-8 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Nome File</span>
                        {sortField === 'name' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-8 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Tipo</span>
                        {sortField === 'type' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-8 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Data</span>
                        {sortField === 'created_at' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Status</th>
                    <th 
                      className="px-8 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                      onClick={() => handleSort('ai_confidence')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Confidence</span>
                        {sortField === 'ai_confidence' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Azioni</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                  {paginatedDocuments.map((doc) => {
                    const statusInfo = getStatusInfo(doc)
                    return (
                      <tr key={doc.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-slate-700 dark:hover:to-slate-600 transition-all duration-300">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedDocs.includes(doc.id)}
                            onChange={() => handleSelectDocument(doc.id)}
                            className="rounded border-slate-300 dark:border-slate-600"
                          />
                        </td>
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
                              <div className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-xs">{doc.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">ID: #{doc.id.toString().padStart(3, '0')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex px-4 py-2 text-sm font-bold rounded-xl ${
                            (doc.document_type_detected || doc.type) === 'Fattura Elettronica' 
                              ? 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 text-indigo-700 dark:text-indigo-300' 
                              : 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 text-purple-700 dark:text-purple-300'
                          }`}>
                            {(doc.document_type_detected || doc.type) === 'Fattura Elettronica' ? '🧾' : '💰'} {doc.document_type_detected || doc.type}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                          {new Date(doc.created_at).toLocaleDateString('it-IT')}
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r ${statusInfo.color}`}>
                            {statusInfo.icon} {statusInfo.text}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                          {(doc.ai_confidence * 100).toFixed(1)}%
                        </td>
                        <td className="px-8 py-6 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleViewDocument(doc)}
                              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-3 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-xs"
                            >
                              👁️ Visualizza
                            </button>
                            <button 
                              onClick={() => handleDownload(doc)}
                              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-3 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-xs"
                            >
                              📥 Scarica
                            </button>
                          
                            <button 
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white px-3 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-xs"
                            >
                              🗑️ Elimina
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-8 py-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredDocuments.length)} di {filteredDocuments.length} documenti
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-500 transition-colors"
                  >
                    ⏮️ Prima
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-500 transition-colors"
                  >
                    ← Precedente
                  </button>
                  <span className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold">
                    {currentPage} di {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-500 transition-colors"
                  >
                    Successivo →
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-500 transition-colors"
                  >
                    ⏭️ Ultima
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Dettagli Documento Migliorato */}
      {showModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-5xl mx-auto max-h-[90vh] overflow-y-auto shadow-2xl">
            
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  📋 Dettagli Documento
                </h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-white/80 hover:text-white bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-all duration-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8">
              {/* Info Principale */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 p-6 rounded-xl border border-indigo-200 dark:border-indigo-700">
                    <label className="block text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-2 uppercase tracking-wide">📄 Nome File</label>
                    <p className="text-slate-800 dark:text-white font-medium text-lg break-all">{selectedDoc.name}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 p-6 rounded-xl border border-purple-200 dark:border-purple-700">
                    <label className="block text-sm font-bold text-purple-600 dark:text-purple-400 mb-2 uppercase tracking-wide">📋 Tipo Documento</label>
                    <p className="text-slate-800 dark:text-white font-medium text-lg">
                      {selectedDoc.document_type_detected || selectedDoc.type}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 p-6 rounded-xl border border-emerald-200 dark:border-emerald-700">
                    <label className="block text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2 uppercase tracking-wide">💾 Dimensione File</label>
                    <p className="text-slate-800 dark:text-white font-medium text-lg">
                      {selectedDoc.file_size ? `${(selectedDoc.file_size / 1024).toFixed(1)} KB` : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-900/30 p-6 rounded-xl border border-orange-200 dark:border-orange-700">
                    <label className="block text-sm font-bold text-orange-600 dark:text-orange-400 mb-2 uppercase tracking-wide">📅 Data Elaborazione</label>
                    <p className="text-slate-800 dark:text-white font-medium text-lg">
                      {new Date(selectedDoc.created_at).toLocaleString('it-IT')}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/30 p-6 rounded-xl border border-pink-200 dark:border-pink-700">
                    <label className="block text-sm font-bold text-pink-600 dark:text-pink-400 mb-2 uppercase tracking-wide">🎯 Status</label>
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const statusInfo = getStatusInfo(selectedDoc)
                        return (
                          <span className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r ${statusInfo.color}`}>
                            {statusInfo.icon} {statusInfo.text}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 p-6 rounded-xl border border-cyan-200 dark:border-cyan-700">
                    <label className="block text-sm font-bold text-cyan-600 dark:text-cyan-400 mb-2 uppercase tracking-wide">📊 Confidence AI</label>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" 
                          style={{ width: `${(selectedDoc.ai_confidence * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-slate-800 dark:text-white font-bold text-lg">
                        {(selectedDoc.ai_confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analisi AI */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-4 uppercase tracking-wide">🤖 Analisi AI Dettagliata</label>
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-2 border-emerald-200 dark:border-emerald-700 rounded-xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-emerald-100 dark:bg-emerald-800 p-3 rounded-xl flex-shrink-0">
                      <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed whitespace-pre-wrap">
                        {selectedDoc.ai_analysis || selectedDoc.analysis_result?.message || 'Analisi completata con successo'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Errori/Issues se presenti */}
              {(() => {
                  try {
                    const issues = typeof selectedDoc.ai_issues === 'string'
                      ? JSON.parse(selectedDoc.ai_issues)
                      : selectedDoc.ai_issues || [];
                    return issues.length > 0;
                  } catch {
                    return false;
                  }
                })() && (
                <div className="mb-8">
                  <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-4 uppercase tracking-wide">⚠️ Errori Rilevati</label>
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 border-2 border-red-200 dark:border-red-700 rounded-xl p-6">
                    <pre className="text-red-800 dark:text-red-200 text-sm whitespace-pre-wrap font-mono">
                      {(() => {
                        try {
                          const issues = typeof selectedDoc.ai_issues === 'string'
                            ? JSON.parse(selectedDoc.ai_issues)
                            : selectedDoc.ai_issues || [];
                          return JSON.stringify(issues, null, 2);
                        } catch {
                          return 'Errore nel parsing degli errori';
                        }
                      })()}
                    </pre>
                  </div>
                </div>
              )}

              {/* Flags e Metadati */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Revisione Manuale</label>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">
                    {selectedDoc.flag_manual_review ? '⚠️ Richiesta' : '✅ Non Necessaria'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">ID Documento</label>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">#{selectedDoc.id.toString().padStart(4, '0')}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">AI Status</label>
                  <p className="text-lg font-bold text-slate-800 dark:text-white uppercase">{selectedDoc.ai_status}</p>
                </div>
              </div>
              
              {/* Azioni Footer */}
              <div className="flex flex-wrap justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-500 font-bold transition-all duration-300"
                >
                  ✕ Chiudi
                </button>
                <button 
                  onClick={() => handleReAnalyze(selectedDoc.id)}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-600 text-white rounded-xl hover:from-orange-600 hover:to-yellow-700 font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  🔄 Ri-analizza
                </button>
                <button 
                  onClick={() => {
                    const reportContent = `📊 REPORT AI DETTAGLIATO

📄 File: ${selectedDoc.name}
🤖 Tipo: ${selectedDoc.document_type_detected || selectedDoc.type}
📅 Data: ${new Date(selectedDoc.created_at).toLocaleString('it-IT')}
📈 Confidence: ${(selectedDoc.ai_confidence * 100).toFixed(1)}%
🎯 Status: ${selectedDoc.ai_status?.toUpperCase()}

🔍 Revisione Manuale: ${selectedDoc.flag_manual_review ? 'RICHIESTA' : 'NON NECESSARIA'}

💡 Analisi AI:
${selectedDoc.ai_analysis || 'Analisi completata con successo'}

${safeParseJSON(selectedDoc.ai_issues).length > 0 ? 
`⚠️ ERRORI RILEVATI:
${JSON.stringify(safeParseJSON(selectedDoc.ai_issues), null, 2)}` : 
'✅ Nessun errore rilevato'
}

---
🤖 Report generato da TaxPilot Assistant Pro
📅 ${new Date().toLocaleString('it-IT')}`;

                    // Crea e scarica il report
                    const blob = new Blob([reportContent], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `report_${selectedDoc.name}_${new Date().toISOString().split('T')[0]}.txt`;
                    link.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  📊 Scarica Report
                </button>
                <button 
                  onClick={() => handleDownload(selectedDoc)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  📥 Scarica File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
