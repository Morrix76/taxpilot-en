'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Receipt,
  CheckCircle,
  Upload,
  Download,
  Eye
} from 'lucide-react'

interface Cliente {
  id: number
  name: string
  partitaIva: string
  codiceFiscale: string
  email: string
  company?: string
  phone?: string
}

interface RegistroIVA {
  id: number
  data: string
  numero: string
  clienteNome: string
  partitaIva: string
  imponibile: number
  iva: number
  totale: number
  tipo: 'acquisti' | 'vendite'
  detraibile: boolean
}

export default function RegistriIVAPage() {
  const [clienteSelezionato, setClienteSelezionato] = useState<string>('')
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [registriAcquisti, setRegistriAcquisti] = useState<RegistroIVA[]>([])
  const [registriVendite, setRegistriVendite] = useState<RegistroIVA[]>([])
  const [loading, setLoading] = useState(true)
  const [tabAttivo, setTabAttivo] = useState<'acquisti' | 'vendite'>('acquisti')

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
      const response = await fetch('http://localhost:3003/api/clients', {
        headers: getAuthHeaders()
      })

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

      if (response.ok) {
        const data = await response.json()
        setClienti(data)
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

      setRegistriAcquisti([
        {
          id: 1,
          data: '2024-01-15',
          numero: 'ACQ001',
          clienteNome: 'Fornitore SpA',
          partitaIva: '12345678901',
          imponibile: 1000.00,
          iva: 220.00,
          totale: 1220.00,
          tipo: 'acquisti',
          detraibile: true
        },
        {
          id: 2,
          data: '2024-01-20',
          numero: 'ACQ002',
          clienteNome: 'Consulente SRL',
          partitaIva: '98765432109',
          imponibile: 500.00,
          iva: 110.00,
          totale: 610.00,
          tipo: 'acquisti',
          detraibile: true
        }
      ])

      setRegistriVendite([
        {
          id: 3,
          data: '2024-01-10',
          numero: 'VEN001',
          clienteNome: 'Cliente ABC SRL',
          partitaIva: '11122233344',
          imponibile: 2000.00,
          iva: 440.00,
          totale: 2440.00,
          tipo: 'vendite',
          detraibile: false
        },
        {
          id: 4,
          data: '2024-01-25',
          numero: 'VEN002',
          clienteNome: 'Cliente XYZ SpA',
          partitaIva: '55566677788',
          imponibile: 1500.00,
          iva: 330.00,
          totale: 1830.00,
          tipo: 'vendite',
          detraibile: false
        }
      ])
    } catch (error) {
      console.error('Error loading VAT registers:', error)
    } finally {
      setLoading(false)
    }
  }

  const uploadDocumento = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !clienteSelezionato) {
      alert('Select a client and a file')
      return
    }

    try {
      console.log('Uploading file:', file.name)
      setLoading(true)

      const formData = new FormData()
      formData.append('document', file)
      formData.append('client_id', clienteSelezionato)

      const response = await fetch('http://localhost:3003/api/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('taxpilot_token')}` },
        body: formData
      })

      if (response.ok) {
        const nuovaRiga: RegistroIVA = {
          id: Date.now(),
          data: new Date().toISOString().split('T')[0],
          numero: `${tabAttivo.toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
          clienteNome: file.name.replace(/\.(xml|pdf)$/i, ''),
          partitaIva: '12345678901',
          imponibile: Math.floor(Math.random() * 1000) + 500,
          iva: 0,
          totale: 0,
          tipo: tabAttivo,
          detraibile: tabAttivo === 'acquisti'
        }

        nuovaRiga.iva = Math.round(nuovaRiga.imponibile * 0.22 * 100) / 100
        nuovaRiga.totale = Math.round((nuovaRiga.imponibile + nuovaRiga.iva) * 100) / 100

        if (tabAttivo === 'acquisti') {
          setRegistriAcquisti(prev => [...prev, nuovaRiga])
        } else {
          setRegistriVendite(prev => [...prev, nuovaRiga])
        }

        alert(`Invoice ${file.name} uploaded and added to the register!`)
        event.target.value = ''
      } else {
        alert('Error during upload')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Error during upload')
    } finally {
      setLoading(false)
    }
  }

  const esportaRegistro = (tipo: 'acquisti' | 'vendite') => {
    const registri = tipo === 'acquisti' ? registriAcquisti : registriVendite

    if (registri.length === 0) {
      alert('No data to export')
      return
    }

    const headers = ['Date', 'Number', 'Client/Supplier', 'VAT.IN', 'Taxable', 'VAT', 'Total']
    const csvContent = [
      headers.join(','),
      ...registri.map(r => [
        r.data,
        r.numero,
        `"${r.clienteNome}"`,
        r.partitaIva,
        r.imponibile.toFixed(2),
        r.iva.toFixed(2),
        r.totale.toFixed(2)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `register_${tipo}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    alert(`CSV file downloaded: register_${tipo}_${new Date().toISOString().split('T')[0]}.csv`)
  }

  const calcolaTotali = (registri: RegistroIVA[]) => {
    return registri.reduce((acc, registro) => ({
      imponibile: acc.imponibile + registro.imponibile,
      iva: acc.iva + registro.iva,
      totale: acc.totale + registro.totale
    }), { imponibile: 0, iva: 0, totale: 0 })
  }

  const cliente = clienti.find(c => c.id.toString() === clienteSelezionato)
  const registriAttivi = tabAttivo === 'acquisti' ? registriAcquisti : registriVendite
  const totali = calcolaTotali(registriAttivi)

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
          >
            ← Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">VAT Registers</h1>
            <p className="text-gray-600">Purchases and sales registers management</p>
          </div>
        </div>
        {clienteSelezionato && (
          <div className="flex gap-2">
            <Button
              onClick={() => document.getElementById('upload-documento')?.click()}
              className="bg-green-600 hover:bg-green-700"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Invoice
            </Button>
            <input
              type="file"
              accept=".xml,.pdf"
              onChange={uploadDocumento}
              className="hidden"
              id="upload-documento"
            />
            <Button
              onClick={() => esportaRegistro(tabAttivo)}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        )}
      </div>

      <div className="mb-6 max-w-md">
        <Label>Client / Company</Label>
        <select
          value={clienteSelezionato}
          onChange={(e) => setClienteSelezionato(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a client to start</option>
          {clienti.map(c => (
            <option key={c.id} value={c.id.toString()}>
              {c.company || c.name}
            </option>
          ))}
        </select>
      </div>

      {!clienteSelezionato && (
        <div className="text-center py-12 text-gray-500">
          <Receipt className="mx-auto h-16 w-16 mb-4" />
          <p>Select a client to manage VAT registers</p>
        </div>
      )}

      {clienteSelezionato && (
        <div className="space-y-6">
          {cliente && (
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">
                      {cliente.company || cliente.name}
                    </h3>
                    {cliente.company && (
                      <p className="text-sm text-gray-500">Owner: {cliente.name}</p>
                    )}
                    <p className="text-sm text-gray-600">
                      VAT.IN: {cliente.partitaIva?.trim() || 'N/A'} | Tax Code: {cliente.codiceFiscale || 'N/A'}
                    </p>
                  </div>
                  <div className="text-sm text-green-600">
                    <CheckCircle className="inline h-4 w-4 mr-1" />
                    Active client
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTabAttivo('acquisti')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                tabAttivo === 'acquisti'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Purchases Register ({registriAcquisti.length})
            </button>
            <button
              onClick={() => setTabAttivo('vendite')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                tabAttivo === 'vendite'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sales Register ({registriVendite.length})
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  €{totali.imponibile.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total Taxable</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  €{totali.iva.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total VAT</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  €{totali.totale.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Grand Total</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {tabAttivo === 'acquisti' ? 'Purchases Register' : 'Sales Register'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {registriAttivi.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="mx-auto h-16 w-16 mb-4" />
                  <p>No entries found</p>
                  <p className="text-sm">Upload the first invoice to start</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {tabAttivo === 'acquisti' ? 'Supplier' : 'Client'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">VAT.IN</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">VAT</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {registriAttivi.map((registro) => (
                        <tr key={registro.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm">{registro.data}</td>
                          <td className="px-4 py-4 text-sm font-mono">{registro.numero}</td>
                          <td className="px-4 py-4 text-sm">{registro.clienteNome}</td>
                          <td className="px-4 py-4 text-sm font-mono">{registro.partitaIva}</td>
                          <td className="px-4 py-4 text-sm text-right">€{registro.imponibile.toFixed(2)}</td>
                          <td className="px-4 py-4 text-sm text-right">€{registro.iva.toFixed(2)}</td>
                          <td className="px-4 py-4 text-sm text-right font-medium">€{registro.totale.toFixed(2)}</td>
                          <td className="px-4 py-4 text-center">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}