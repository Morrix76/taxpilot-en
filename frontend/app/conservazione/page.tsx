'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, Shield, Clock, Download, Search, CheckCircle, AlertCircle, FileCheck, Package, Hash, Calendar } from 'lucide-react'

export default function ConservazioneSostitutiva() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [documenti, setDocumenti] = useState([])
  const [documentiSelezionati, setDocumentiSelezionati] = useState([])
  const [pacchetti, setPacchetti] = useState([])
  const [filtri, setFiltri] = useState({
    tipo: '',
    dataInizio: '',
    dataFine: '',
    stato: 'da_conservare'
  })
  const [activeTab, setActiveTab] = useState('documenti')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Carica documenti
  useEffect(() => {
    caricaDocumenti()
    caricaPacchetti()
  }, [filtri])

  const caricaDocumenti = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        stato: filtri.stato,
        tipo: filtri.tipo,
        dataInizio: filtri.dataInizio,
        dataFine: filtri.dataFine
      })

      const response = await fetch(`/api/conservazione/documenti?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) throw new Error('Errore caricamento documenti')

      const data = await response.json()
      setDocumenti(data.documenti || [])
    } catch (err) {
      setError('Errore nel caricamento dei documenti')
    } finally {
      setLoading(false)
    }
  }

  const caricaPacchetti = async () => {
    try {
      const response = await fetch('/api/conservazione/pacchetti', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) throw new Error('Errore caricamento pacchetti')

      const data = await response.json()
      setPacchetti(data.pacchetti || [])
    } catch (err) {
      console.error('Errore caricamento pacchetti:', err)
    }
  }

  // Crea pacchetto di versamento
  const creaPacchettoVersamento = async () => {
    if (documentiSelezionati.length === 0) {
      setError('Seleziona almeno un documento da conservare')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/conservazione/crea-pacchetto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          documentIds: documentiSelezionati,
          options: {
            denominazione: 'Azienda S.r.l.',
            classificazione: 'DOCUMENTI_FISCALI'
          }
        })
      })

      if (!response.ok) throw new Error('Errore creazione pacchetto')

      const pacchetto = await response.json()
      setSuccess(`Pacchetto ${pacchetto.id} creato con successo!`)
      setDocumentiSelezionati([])
      await caricaDocumenti()
      await caricaPacchetti()
      setActiveTab('pacchetti')
    } catch (err) {
      setError('Errore durante la creazione del pacchetto')
    } finally {
      setLoading(false)
    }
  }

  // Verifica integrità pacchetto
  const verificaIntegrita = async (pacchettoId) => {
    try {
      const response = await fetch(`/api/conservazione/verifica/${pacchettoId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) throw new Error('Errore verifica')

      const risultato = await response.json()
      
      if (risultato.esito === 'SUCCESSO') {
        setSuccess('Verifica integrità completata con successo')
      } else {
        setError('Problemi rilevati durante la verifica integrità')
      }
    } catch (err) {
      setError('Errore durante la verifica')
    }
  }

  // Export pacchetto
  const exportPacchetto = async (pacchettoId) => {
    try {
      const response = await fetch(`/api/conservazione/export/${pacchettoId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) throw new Error('Errore export')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pacchetto_conservazione_${pacchettoId}.zip`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Errore durante l\'export del pacchetto')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
            <Archive className="w-8 h-8 mr-3 text-blue-600" />
            Conservazione Sostitutiva
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistema di conservazione digitale conforme alle normative AGID
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-600 dark:text-green-400 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              {success}
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Da Conservare</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {documenti.filter(d => !d.conservation_status).length}
                </p>
              </div>
              <FileCheck className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">In Conservazione</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {documenti.filter(d => d.conservation_status === 'IN_CONSERVAZIONE').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Conservati</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {documenti.filter(d => d.conservation_status === 'CONSERVATO').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pacchetti</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {pacchetti.length}
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('documenti')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'pacchetti'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                Pacchetti di Versamento
              </button>
              <button
                onClick={() => setActiveTab('normativa')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'normativa'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                Normativa
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Tab Documenti */}
            {activeTab === 'documenti' && (
              <div>
                {/* Filtri */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                  <select
                    value={filtri.stato}
                    onChange={(e) => setFiltri({...filtri, stato: e.target.value})}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="da_conservare">Da Conservare</option>
                    <option value="in_conservazione">In Conservazione</option>
                    <option value="conservato">Conservati</option>
                    <option value="tutti">Tutti</option>
                  </select>

                  <select
                    value={filtri.tipo}
                    onChange={(e) => setFiltri({...filtri, tipo: e.target.value})}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Tutti i tipi</option>
                    <option value="fattura">Fatture</option>
                    <option value="fattura_elettronica">Fatture Elettroniche</option>
                    <option value="documento_trasporto">DDT</option>
                    <option value="scontrino">Scontrini</option>
                  </select>

                  <input
                    type="date"
                    value={filtri.dataInizio}
                    onChange={(e) => setFiltri({...filtri, dataInizio: e.target.value})}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Data inizio"
                  />

                  <input
                    type="date"
                    value={filtri.dataFine}
                    onChange={(e) => setFiltri({...filtri, dataFine: e.target.value})}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Data fine"
                  />

                  <button
                    onClick={() => setFiltri({ tipo: '', dataInizio: '', dataFine: '', stato: 'da_conservare' })}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Reset Filtri
                  </button>
                </div>

                {/* Azioni Bulk */}
                {documentiSelezionati.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex justify-between items-center">
                      <p className="text-blue-700 dark:text-blue-300">
                        {documentiSelezionati.length} documenti selezionati
                      </p>
                      <button
                        onClick={creaPacchettoVersamento}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                      >
                        {loading ? 'Creazione in corso...' : 'Crea Pacchetto di Versamento'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista Documenti */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={documentiSelezionati.length === documenti.filter(d => !d.conservation_status).length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDocumentiSelezionati(documenti.filter(d => !d.conservation_status).map(d => d.id))
                              } else {
                                setDocumentiSelezionati([])
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Numero
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          File
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Stato
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Hash
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {documenti.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-3 py-2">
                            {!doc.conservation_status && (
                              <input
                                type="checkbox"
                                checked={documentiSelezionati.includes(doc.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setDocumentiSelezionati([...documentiSelezionati, doc.id])
                                  } else {
                                    setDocumentiSelezionati(documentiSelezionati.filter(id => id !== doc.id))
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {doc.type}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {doc.numero || `DOC-${doc.id}`}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(doc.date || doc.created_at).toLocaleDateString('it-IT')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {doc.original_filename}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              doc.conservation_status === 'CONSERVATO' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : doc.conservation_status === 'IN_CONSERVAZIONE'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {doc.conservation_status || 'Da Conservare'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                            {doc.conservation_hash ? doc.conservation_hash.substring(0, 8) + '...' : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab Pacchetti */}
            {activeTab === 'pacchetti' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pacchetti.map((pacchetto) => (
                    <div key={pacchetto.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {pacchetto.id}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(pacchetto.dataCreazione).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        <Package className="w-8 h-8 text-blue-500" />
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Documenti:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {pacchetto.metadati?.numeroDocumenti || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Dimensione:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {(pacchetto.metadati?.dimensioneTotale / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Stato:</span>
                          <span className={`font-medium ${
                            pacchetto.stato === 'PRONTO_PER_CONSERVAZIONE' 
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-yellow-600 dark:text-yellow-400'
                          }`}>
                            {pacchetto.stato}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                          <span className="flex items-center">
                            <Hash className="w-3 h-3 mr-1" />
                            SHA-256
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            Marca temporale
                          </span>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => verificaIntegrita(pacchetto.id)}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Verifica
                          </button>
                          <button
                            onClick={() => exportPacchetto(pacchetto.id)}
                            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                          >
                            Export
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {pacchetti.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Nessun pacchetto di conservazione presente
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Seleziona dei documenti e crea il tuo primo pacchetto
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab Normativa */}
            {activeTab === 'normativa' && (
              <div className="prose dark:prose-invert max-w-none">
                <h3 className="text-xl font-semibold mb-4">Riferimenti Normativi</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      📜 Normativa Principale
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li>• <strong>CAD</strong> - D.Lgs. 82/2005 (Codice Amministrazione Digitale)</li>
                      <li>• <strong>DPCM 3 dicembre 2013</strong> - Regole tecniche conservazione</li>
                      <li>• <strong>DPCM 13 novembre 2014</strong> - Regole tecniche documento informatico</li>
                      <li>• <strong>Linee Guida AGID 2020</strong> - Formazione, gestione e conservazione</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      🔒 Standard Tecnici
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li>• <strong>UNI 11386:2020</strong> - SInCRO (Standard conservazione)</li>
                      <li>• <strong>ISO 14721:2012</strong> - OAIS Reference Model</li>
                      <li>• <strong>ETSI TS 101 533-1</strong> - Signature policies</li>
                      <li>• <strong>RFC 3161</strong> - Time-Stamp Protocol (TSP)</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      📊 Documenti Conservabili
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li>• Fatture elettroniche e analogiche</li>
                      <li>• Libri e registri contabili</li>
                      <li>• Documenti di trasporto (DDT)</li>
                      <li>• Contratti e corrispondenza commerciale</li>
                      <li>• Documenti protocollati</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      ⏱️ Tempistiche Conservazione
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li>• <strong>Fatture:</strong> 10 anni dall'ultima registrazione</li>
                      <li>• <strong>Libri contabili:</strong> 10 anni dall'ultima registrazione</li>
                      <li>• <strong>Documenti di trasporto:</strong> 10 anni</li>
                      <li>• <strong>Contratti:</strong> 10 anni dalla cessazione</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Nota:</strong> Questo sistema implementa le funzionalità base per la conservazione sostitutiva. 
                    Per un utilizzo in produzione è necessario l'integrazione con una Certification Authority (CA) 
                    e un Time Stamping Authority (TSA) qualificati.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
<button
  onClick={() => setActiveTab('documenti')}
  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'documenti'
      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
  }`}
>
  Documenti
</button>