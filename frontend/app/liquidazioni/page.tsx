'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Download, FileText, AlertCircle, TrendingUp, TrendingDown, DollarSign, CheckCircle } from 'lucide-react'

export default function LiquidazioniIVA() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [liquidazione, setLiquidazione] = useState(null)
  const [periodo, setPeriodo] = useState('')
  const [regime, setRegime] = useState('mensile')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('riepilogo')

  // Genera periodo corrente
  useEffect(() => {
    const now = new Date()
    const anno = now.getFullYear()
    const mese = now.getMonth() // 0-based, quindi è il mese precedente
    
    if (regime === 'mensile') {
      setPeriodo(`${anno}-${String(mese).padStart(2, '0')}`)
    } else {
      const trimestre = Math.ceil(mese / 3)
      setPeriodo(`${anno}-Q${trimestre}`)
    }
  }, [regime])

  // Calcola liquidazione
  const calcolaLiquidazione = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/iva/liquidazione', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ periodo, regime })
      })

      if (!response.ok) {
        throw new Error('Error calculating settlement')
      }

      const data = await response.json()
      setLiquidazione(data)
    } catch (err) {
      setError(err.message || 'Error during calculation')
    } finally {
      setLoading(false)
    }
  }

  // Export CSV
  const exportCSV = async (tipo) => {
    try {
      const response = await fetch(`/api/iva/export/${tipo}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ liquidazione })
      })

      if (!response.ok) throw new Error('Export error')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tipo}_${periodo}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Error during export')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            VAT Settlements
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Automatic calculation of monthly and quarterly settlements
          </p>
        </div>

        {/* Selezione Periodo */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Regime
              </label>
              <select
                value={regime}
                onChange={(e) => setRegime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="mensile">Monthly</option>
                <option value="trimestrale">Quarterly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Period
              </label>
              <input
                type="text"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder={regime === 'mensile' ? 'YYYY-MM' : 'YYYY-Q1'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={calcolaLiquidazione}
                disabled={loading || !periodo}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Calculating...' : 'Calculate Settlement'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-red-600 dark:text-red-400 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Risultati Liquidazione */}
        {liquidazione && (
          <>
            {/* Cards Riepilogo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sales VAT</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{liquidazione.liquidazione.ivaDebito.toFixed(2)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Purchases VAT</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{liquidazione.liquidazione.ivaCredito.toFixed(2)}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${
                liquidazione.liquidazione.ivaDaVersare > 0 ? 'border-2 border-orange-500' : 'border-2 border-green-500'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {liquidazione.liquidazione.ivaDaVersare > 0 ? 'Amount Due' : 'Credit'}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{Math.abs(liquidazione.liquidazione.ivaDaVersare).toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className={`w-8 h-8 ${
                    liquidazione.liquidazione.ivaDaVersare > 0 ? 'text-orange-500' : 'text-green-500'
                  }`} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Documents</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {liquidazione.documenti.totale}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  {['riepilogo', 'vendite', 'acquisti', 'scadenze'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                        activeTab === tab
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {tab === 'riepilogo' ? 'Summary' : tab === 'vendite' ? 'Sales' : tab === 'acquisti' ? 'Purchases' : 'Deadlines'}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Tab Riepilogo */}
                {activeTab === 'riepilogo' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Settlement Summary
                    </h3>

                    {/* Dettaglio per aliquota */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Sales by VAT Rate
                        </h4>
                        <div className="space-y-2">
                          {liquidazione.ivaVendite.perAliquota.map((aliq, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">
                                VAT {aliq.aliquota}%
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                €{aliq.iva.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Purchases by VAT Rate
                        </h4>
                        <div className="space-y-2">
                          {liquidazione.ivaAcquisti.perAliquota.map((aliq, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">
                                VAT {aliq.aliquota}%
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                €{aliq.iva.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Validazioni */}
                    {liquidazione.validazioni && (
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Validations
                        </h4>
                        {liquidazione.validazioni.valida ? (
                          <div className="flex items-center text-green-600 dark:text-green-400">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Settlement valid
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {liquidazione.validazioni.errori.map((err, idx) => (
                              <div key={idx} className="flex items-center text-red-600 dark:text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                {err}
                              </div>
                            ))}
                          </div>
                        )}
                        {liquidazione.validazioni.warning.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {liquidazione.validazioni.warning.map((warn, idx) => (
                              <div key={idx} className="flex items-center text-yellow-600 dark:text-yellow-400 text-sm">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                {warn}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Azioni Export */}
                    <div className="flex space-x-4 pt-4">
                      <button
                        onClick={() => exportCSV('liquidazione')}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Settlement CSV
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab Vendite */}
                {activeTab === 'vendite' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Sales Ledger
                      </h3>
                      <button
                        onClick={() => exportCSV('registro-vendite')}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              No.
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Number
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Customer
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              VAT No.
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Taxable Amount
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              VAT
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {liquidazione.registri.vendite.map((riga) => (
                            <tr key={riga.progressivo} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {riga.progressivo}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {new Date(riga.data).toLocaleDateString('en-US')}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {riga.numero}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                                {riga.cliente}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {riga.partitaIva}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                €{riga.imponibile.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                €{riga.iva.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                                €{riga.totale.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab Acquisti */}
                {activeTab === 'acquisti' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Purchases Ledger
                      </h3>
                      <button
                        onClick={() => exportCSV('registro-acquisti')}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              No.
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Number
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Supplier
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              VAT No.
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Taxable Amount
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              VAT
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {liquidazione.registri.acquisti.map((riga) => (
                            <tr key={riga.progressivo} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {riga.progressivo}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {new Date(riga.data).toLocaleDateString('en-US')}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {riga.numero}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                                {riga.fornitore}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {riga.partitaIva}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                €{riga.imponibile.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                €{riga.iva.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                                €{riga.totale.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab Scadenze */}
                {activeTab === 'scadenze' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      F24 Deadlines
                    </h3>
                    
                    {liquidazione.scadenze.length > 0 ? (
                      <div className="space-y-4">
                        {liquidazione.scadenze.map((scadenza, idx) => (
                          <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {scadenza.descrizione}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  Tax Code: {scadenza.codiceTribu}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Due Date: {new Date(scadenza.dataScadenza).toLocaleDateString('en-US')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  €{scadenza.importo.toFixed(2)}
                                </p>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 mt-2">
                                  {scadenza.stato}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No payment required for this period
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
