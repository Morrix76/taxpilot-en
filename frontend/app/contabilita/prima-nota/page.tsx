'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PlusCircle, FileText, Calendar, Euro, ArrowLeft } from 'lucide-react'

interface Movimento {
  id: number
  data: string
  numero: string
  descrizione: string
  totale: number
  righe: RigaMovimento[]
}

interface RigaMovimento {
  id: number
  conto: string
  descrizione: string
  dare: number
  avere: number
}

interface Conto {
  codice: string
  descrizione: string
}

interface Cliente {
  id: number
  nome: string
  partitaIva: string
  codiceFiscale: string
}

export default function PrimaNotaPage() {
  const [movimenti, setMovimenti] = useState<Movimento[]>([])
  const [conti, setConti] = useState<Conto[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [clienteSelezionato, setClienteSelezionato] = useState<string>('')

  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    numero: '',
    descrizione: '',
    righe: [
      { conto: '', descrizione: '', dare: 0, avere: 0 },
      { conto: '', descrizione: '', dare: 0, avere: 0 }
    ]
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
      console.error('Error loading customers:', error)
    }
  }

  const caricaDati = async (clienteId: string) => {
    try {
      setLoading(true)
      
      // TODO: Implementare questi endpoint nel backend
      console.log('Loading data for customer:', clienteId)
      
      // Dati mock per ora
      setMovimenti([])
      setConti([
        { codice: '1100', descrizione: 'Cash' },
        { codice: '1200', descrizione: 'Bank' },
        { codice: '2100', descrizione: 'Suppliers' },
        { codice: '3100', descrizione: 'Customers' },
        { codice: '5100', descrizione: 'Revenues' },
        { codice: '6100', descrizione: 'Costs' }
      ])
      
      // Chiamate API commentate fino all'implementazione backend
      // const movimentiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contabilita/movimenti/${clienteId}`, {
      //   headers: getAuthHeaders()
      // })
      // const movimentiData = await movimentiRes.json()

      // const contiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contabilita/piano-conti/${clienteId}`, {
      //   headers: getAuthHeaders()
      // })
      // const contiData = await contiRes.json()

      // setMovimenti(movimentiData || [])
      // setConti(contiData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const salvaMovimento = async () => {
    try {
      const totaleDare = formData.righe.reduce((sum, riga) => sum + (riga.dare || 0), 0)
      const totaleAvere = formData.righe.reduce((sum, riga) => sum + (riga.avere || 0), 0)

      if (Math.abs(totaleDare - totaleAvere) > 0.01) {
        alert('The Debit total must equal the Credit total')
        return
      }

      // TODO: Implementare endpoint nel backend
      console.log('Movement data to save:', formData)
      
      // Mock salvataggio per ora
      alert('Movement saved successfully (mock)')
      setShowForm(false)
      resetForm()
      
      // Chiamata API commentata fino all'implementazione backend
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contabilita/movimenti/${clienteSelezionato}`, {
      //   method: 'POST',
      //   headers: getAuthHeaders(),
      //   body: JSON.stringify(formData)
      // })

      // if (response.ok) {
      //   setShowForm(false)
      //   caricaDati(clienteSelezionato)
      //   resetForm()
      //   alert('Movimento salvato con successo')
      // } else {
      //   alert('Errore nel salvataggio')
      // }
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error saving')
    }
  }

  const resetForm = () => {
    setFormData({
      data: new Date().toISOString().split('T')[0],
      numero: '',
      descrizione: '',
      righe: [
        { conto: '', descrizione: '', dare: 0, avere: 0 },
        { conto: '', descrizione: '', dare: 0, avere: 0 }
      ]
    })
  }

  const aggiungiRiga = () => {
    setFormData(prev => ({
      ...prev,
      righe: [...prev.righe, { conto: '', descrizione: '', dare: 0, avere: 0 }]
    }))
  }

  const rimuoviRiga = (index: number) => {
    if (formData.righe.length > 2) {
      setFormData(prev => ({
        ...prev,
        righe: prev.righe.filter((_, i) => i !== index)
      }))
    }
  }

  const aggiornaRiga = (index: number, campo: string, valore: any) => {
    setFormData(prev => ({
      ...prev,
      righe: prev.righe.map((riga, i) => 
        i === index ? { ...riga, [campo]: valore } : riga
      )
    }))
  }

  const calcolaTotali = () => {
    const totaleDare = formData.righe.reduce((sum, riga) => sum + (riga.dare || 0), 0)
    const totaleAvere = formData.righe.reduce((sum, riga) => sum + (riga.avere || 0), 0)
    return { totaleDare, totaleAvere }
  }

  if (loading && clienteSelezionato) {
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
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">General Ledger</h1>
            <p className="text-gray-600">Accounting entries management</p>
          </div>
        </div>
        {clienteSelezionato && (
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        )}
      </div>

      {/* Selezione Cliente con select HTML nativo */}
      <div className="mb-6 max-w-md">
        <Label>Customer / Company</Label>
        <select 
          value={clienteSelezionato} 
          onChange={(e) => setClienteSelezionato(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a customer to start</option>
          {clienti.map(c => (
            <option key={c.id} value={c.id.toString()}>
              {c.partitaIva ? (c.company || c.name) : c.name}
            </option>
          ))}
        </select>
      </div>

      {!clienteSelezionato && (
        <div className="text-center py-12 text-gray-500">
          <FileText className="mx-auto h-16 w-16 mb-4" />
          <p>Select a customer to manage accounting entries</p>
        </div>
      )}

      {clienteSelezionato && showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data">Date</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="numero">Number</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                  placeholder="Progressive number"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="descrizione">Description</Label>
              <Textarea
                id="descrizione"
                value={formData.descrizione}
                onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                placeholder="Entry description"
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Entry Lines</h4>
              {formData.righe.map((riga, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 items-end p-4 border rounded">
                  <div>
                    <Label>Account</Label>
                    <select
                      value={riga.conto}
                      onChange={(e) => aggiornaRiga(index, 'conto', e.target.value)}
                      className="w-full px-3 py-2 border rounded bg-white"
                    >
                      <option value="">Select account</option>
                      {conti.map(conto => (
                        <option key={conto.codice} value={conto.codice}>
                          {conto.codice} - {conto.descrizione}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={riga.descrizione}
                      onChange={(e) => aggiornaRiga(index, 'descrizione', e.target.value)}
                      placeholder="Description"
                    />
                  </div>
                  <div>
                    <Label>Debit</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={riga.dare}
                      onChange={(e) => aggiornaRiga(index, 'dare', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Credit</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={riga.avere}
                      onChange={(e) => aggiornaRiga(index, 'avere', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => rimuoviRiga(index)}
                    disabled={formData.righe.length <= 2}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={aggiungiRiga}>
                  Add Row
                </Button>
                <div className="text-sm">
                  Total Debit: {calcolaTotali().totaleDare.toFixed(2)} | 
                  Total Credit: {calcolaTotali().totaleAvere.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={salvaMovimento} className="bg-green-600 hover:bg-green-700">
                Save Entry
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {clienteSelezionato && (
        <Card>
          <CardHeader>
            <CardTitle>Registered Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {movimenti.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto h-16 w-16 mb-4" />
                <p>No entries registered</p>
              </div>
            ) : (
              <div className="space-y-4">
                {movimenti.map((movimento) => (
                  <div key={movimento.id} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{movimento.descrizione}</h4>
                        <p className="text-sm text-gray-600">
                          Date: {movimento.data} | Number: {movimento.numero}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">€ {movimento.totale.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-sm">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left">Account</th>
                            <th className="text-left">Description</th>
                            <th className="text-right">Debit</th>
                            <th className="text-right">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movimento.righe?.map((riga, idx) => (
                            <tr key={idx}>
                              <td>{riga.conto}</td>
                              <td>{riga.descrizione}</td>
                              <td className="text-right">{riga.dare > 0 ? riga.dare.toFixed(2) : ''}</td>
                              <td className="text-right">{riga.avere > 0 ? riga.avere.toFixed(2) : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
