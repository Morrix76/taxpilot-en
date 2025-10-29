'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusCircle, FolderTree, Edit3, Trash2, ArrowLeft, Save, X } from 'lucide-react'

interface Conto {
  id: number
  codice: string
  descrizione: string
  tipo: string
  categoria: string
  attivo: boolean
  saldo: number
}

interface Cliente {
  id: number
  name: string
  partitaIva: string
  codiceFiscale: string
  company?: string
}

export default function PianoContiPage() {
  const [conti, setConti] = useState<Conto[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [clienteSelezionato, setClienteSelezionato] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [contoInModifica, setContoInModifica] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    codice: '',
    descrizione: '',
    tipo: '',
    categoria: ''
  })

  const getAuthHeaders = () => {
    const token = localStorage.getItem('taxpilot_token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  useEffect(() => {
    caricaClienti()
  }, [])

  useEffect(() => {
    if (clienteSelezionato) {
      caricaDati(clienteSelezionato)
    }
  }, [clienteSelezionato])

  const caricaClienti = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients', {
        headers: getAuthHeaders()
      })

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

      if (response.ok) {
        const data = await response.json()
        setClienti(data.clients || data)
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const caricaDati = async (clienteId: string) => {
    try {
      setLoading(true)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/piano-conti/${clienteId}`, {
        headers: getAuthHeaders()
      })

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setConti(data.conti || [])
        } else {
          console.error('Error loading chart of accounts:', data.error)
          // Fallback ai dati mock se l'API non è ancora implementata
          setConti([
            { id: 1, codice: '110001', descrizione: 'Cassa', tipo: 'attivo', categoria: 'Liquidità', attivo: true, saldo: 1000 },
            { id: 2, codice: '120001', descrizione: 'Banca c/c', tipo: 'attivo', categoria: 'Liquidità', attivo: true, saldo: 5000 },
            { id: 3, codice: '130001', descrizione: 'Crediti vs clienti', tipo: 'attivo', categoria: 'Crediti', attivo: true, saldo: 2500 },
            { id: 4, codice: '210001', descrizione: 'Debiti vs fornitori', tipo: 'passivo', categoria: 'Debiti', attivo: true, saldo: -1500 },
            { id: 5, codice: '310001', descrizione: 'Capitale sociale', tipo: 'patrimonio', categoria: 'Patrimonio netto', attivo: true, saldo: 10000 },
            { id: 6, codice: '510001', descrizione: 'Ricavi vendite', tipo: 'ricavo', categoria: 'Ricavi caratteristici', attivo: true, saldo: 0 },
            { id: 7, codice: '610001', descrizione: 'Costi materie prime', tipo: 'costo', categoria: 'Costi caratteristici', attivo: true, saldo: 0 }
          ])
        }
      } else {
        throw new Error('Server response error')
      }
    } catch (error) {
      console.error('Error loading chart of accounts:', error)
      // Fallback ai dati mock
      setConti([
        { id: 1, codice: '110001', descrizione: 'Cassa', tipo: 'attivo', categoria: 'Liquidità', attivo: true, saldo: 1000 },
        { id: 2, codice: '120001', descrizione: 'Banca c/c', tipo: 'attivo', categoria: 'Liquidità', attivo: true, saldo: 5000 },
        { id: 3, codice: '130001', descrizione: 'Crediti vs clienti', tipo: 'attivo', categoria: 'Crediti', attivo: true, saldo: 2500 },
        { id: 4, codice: '210001', descrizione: 'Debiti vs fornitori', tipo: 'passivo', categoria: 'Debiti', attivo: true, saldo: -1500 },
        { id: 5, codice: '310001', descrizione: 'Capitale sociale', tipo: 'patrimonio', categoria: 'Patrimonio netto', attivo: true, saldo: 10000 },
        { id: 6, codice: '510001', descrizione: 'Ricavi vendite', tipo: 'ricavo', categoria: 'Ricavi caratteristici', attivo: true, saldo: 0 },
        { id: 7, codice: '610001', descrizione: 'Costi materie prime', tipo: 'costo', categoria: 'Costi caratteristici', attivo: true, saldo: 0 }
      ])
    } finally {
      setLoading(false)
    }
  }

  const iniziaModifica = (conto: Conto) => {
    setContoInModifica(conto.id)
    setFormData({
      codice: conto.codice,
      descrizione: conto.descrizione,
      tipo: conto.tipo,
      categoria: conto.categoria
    })
    setShowForm(false) // Chiude form nuovo conto se aperto
  }

  const annullaModifica = () => {
    setContoInModifica(null)
    resetForm()
  }

  const salvaModifica = async () => {
    if (!contoInModifica || !clienteSelezionato) return

    try {
      setSaving(true)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/piano-conti/${clienteSelezionato}/${contoInModifica}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Aggiorna la lista con i dati dal server
          setConti(prev => prev.map(conto => 
            conto.id === contoInModifica 
              ? { ...conto, ...formData }
              : conto
          ))
          setContoInModifica(null)
          resetForm()
          alert('Account updated successfully')
        } else {
          alert(`Error: ${data.error}`)
        }
      } else {
        // Fallback locale se API non disponibile
        setConti(prev => prev.map(conto => 
          conto.id === contoInModifica 
            ? { ...conto, ...formData }
            : conto
        ))
        setContoInModifica(null)
        resetForm()
        alert('Account updated (offline mode)')
      }
    } catch (error) {
      console.error('Error updating account:', error)
      // Fallback locale
      setConti(prev => prev.map(conto => 
        conto.id === contoInModifica 
          ? { ...conto, ...formData }
          : conto
      ))
      setContoInModifica(null)
      resetForm()
      alert('Account updated (offline mode)')
    } finally {
      setSaving(false)
    }
  }

  const salvaConto = async () => {
    if (!clienteSelezionato) return

    try {
      setSaving(true)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/piano-conti/${clienteSelezionato}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Ricarica i dati dal server
          await caricaDati(clienteSelezionato)
          setShowForm(false)
          resetForm()
          alert('Account saved successfully')
        } else {
          alert(`Error: ${data.error}`)
        }
      } else {
        // Fallback locale se API non disponibile
        const nuovoConto = {
          id: Math.max(...conti.map(c => c.id), 0) + 1,
          ...formData,
          attivo: true,
          saldo: 0
        }
        setConti(prev => [...prev, nuovoConto])
        setShowForm(false)
        resetForm()
        alert('Account saved (offline mode)')
      }
    } catch (error) {
      console.error('Error saving account:', error)
      // Fallback locale
      const nuovoConto = {
        id: Math.max(...conti.map(c => c.id), 0) + 1,
        ...formData,
        attivo: true,
        saldo: 0
      }
      setConti(prev => [...prev, nuovoConto])
      setShowForm(false)
      resetForm()
      alert('Account saved (offline mode)')
    } finally {
      setSaving(false)
    }
  }

  const eliminaConto = async (contoId: number) => {
    if (!confirm('Are you sure you want to delete this account?')) return
    if (!clienteSelezionato) return

    try {
      setSaving(true)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/piano-conti/${clienteSelezionato}/${contoId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setConti(prev => prev.filter(c => c.id !== contoId))
          alert('Account deleted successfully')
        } else {
          alert(`Error: ${data.error}`)
        }
      } else {
        // Fallback locale se API non disponibile
        setConti(prev => prev.filter(c => c.id !== contoId))
        alert('Account deleted (offline mode)')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      // Fallback locale
      setConti(prev => prev.filter(c => c.id !== contoId))
      alert('Account deleted (offline mode)')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      codice: '',
      descrizione: '',
      tipo: '',
      categoria: ''
    })
  }

  if (loading && !clienteSelezionato) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
            disabled={saving}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Chart of Accounts</h1>
            <p className="text-gray-600">Accounting structure management</p>
          </div>
        </div>
        {clienteSelezionato && !contoInModifica && (
          <Button 
            onClick={() => setShowForm(!showForm)} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={saving}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {showForm ? 'Close Form' : 'New Account'}
          </Button>
        )}
      </div>

      {/* Selezione Cliente */}
      <div className="mb-6 max-w-md">
        <Label>Client / Company</Label>
        <select 
          value={clienteSelezionato} 
          onChange={(e) => setClienteSelezionato(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={contoInModifica !== null || saving}
        >
          <option value="">Select a client to start</option>
          {clienti.map(c => (
            <option key={c.id} value={c.id.toString()}>
              {c.partitaIva ? (c.company || c.name) : c.name}
            </option>
          ))}
        </select>
      </div>

      {!clienteSelezionato && (
        <div className="text-center py-12 text-gray-500">
          <FolderTree className="mx-auto h-16 w-16 mb-4" />
          <p>Select a client to manage the chart of accounts</p>
        </div>
      )}

      {clienteSelezionato && showForm && !contoInModifica && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codice">Code</Label>
                <Input
                  id="codice"
                  value={formData.codice}
                  onChange={(e) => setFormData(prev => ({ ...prev, codice: e.target.value }))}
                  placeholder="e.g., 110001"
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="tipo">Type</Label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  disabled={saving}
                >
                  <option value="">Select type</option>
                  <option value="attivo">Asset</option>
                  <option value="passivo">Liability</option>
                  <option value="patrimonio">Equity</option>
                  <option value="ricavo">Revenue</option>
                  <option value="costo">Cost</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="descrizione">Description</Label>
                <Input
                  id="descrizione"
                  value={formData.descrizione}
                  onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                  placeholder="Account description"
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="categoria">Category</Label>
                <Input
                  id="categoria"
                  value={formData.categoria}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                  placeholder="e.g., Liquidity"
                  disabled={saving}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={salvaConto} 
                className="bg-green-600 hover:bg-green-700"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Account'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Modifica Inline */}
      {contoInModifica && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Edit3 className="h-5 w-5" />
              Edit Account #{contoInModifica}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-codice">Code</Label>
                <Input
                  id="edit-codice"
                  value={formData.codice}
                  onChange={(e) => setFormData(prev => ({ ...prev, codice: e.target.value }))}
                  placeholder="e.g., 110001"
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="edit-tipo">Type</Label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  disabled={saving}
                >
                  <option value="">Select type</option>
                  <option value="attivo">Asset</option>
                  <option value="passivo">Liability</option>
                  <option value="patrimonio">Equity</option>
                  <option value="ricavo">Revenue</option>
                  <option value="costo">Cost</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-descrizione">Description</Label>
                <Input
                  id="edit-descrizione"
                  value={formData.descrizione}
                  onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                  placeholder="Account description"
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="edit-categoria">Category</Label>
                <Input
                  id="edit-categoria"
                  value={formData.categoria}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                  placeholder="e.g., Liquidity"
                  disabled={saving}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={salvaModifica} 
                className="bg-green-600 hover:bg-green-700"
                disabled={saving}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button 
                variant="outline" 
                onClick={annullaModifica}
                disabled={saving}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {clienteSelezionato && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Registered Accounts ({conti.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p>Loading chart of accounts...</p>
              </div>
            ) : conti.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FolderTree className="mx-auto h-16 w-16 mb-4" />
                <p>No accounts registered</p>
                <p className="text-sm mt-2">Add the first account to start</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {conti.map((conto) => (
                      <tr 
                        key={conto.id} 
                        className={`hover:bg-gray-50 ${conto.id === contoInModifica ? 'bg-orange-50 border-l-4 border-orange-400' : ''}`}
                      >
                        <td className="px-4 py-4 text-sm font-mono font-medium">{conto.codice}</td>
                        <td className="px-4 py-4 text-sm">{conto.descrizione}</td>
                        <td className="px-4 py-4 text-sm capitalize">{conto.tipo}</td>
                        <td className="px-4 py-4 text-sm">{conto.categoria}</td>
                        <td className="px-4 py-4 text-sm text-right">
                          €{conto.saldo?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {conto.id === contoInModifica ? (
                              <span className="text-orange-600 text-sm font-medium">
                                {saving ? 'Saving...' : 'Editing...'}
                              </span>
                            ) : (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => iniziaModifica(conto)}
                                  disabled={contoInModifica !== null || saving}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-red-600"
                                  onClick={() => eliminaConto(conto.id)}
                                  disabled={contoInModifica !== null || saving}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
