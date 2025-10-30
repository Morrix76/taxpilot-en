'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  User, 
  Mail, 
  Phone
} from 'lucide-react'

interface Cliente {
  id: number
  name: string
  email: string
  phone: string
  codiceFiscale: string
  partitaIva: string
  company?: string
}

export default function ClientsPage() {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Cliente | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Stati separati per il form (risolve il bug del cursore)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [codiceFiscale, setCodiceFiscale] = useState('')
  const [partitaIva, setPartitaIva] = useState('')
  const [azienda, setAzienda] = useState('')

  useEffect(() => {
    loadClients()
  }, [])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('taxpilot_token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  const loadClients = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients`, {
        headers: getAuthHeaders()
      })

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

      if (response.ok) {
        const data = await response.json();
        setClienti(data.clients || data);
      }
        
      
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setNome('')
    setEmail('')
    setTelefono('')
    setCodiceFiscale('')
    setPartitaIva('')
    setAzienda('')
    setEditingClient(null)
  }

  const openForm = (client?: Cliente) => {
    if (client) {
      setEditingClient(client)
      setNome(client.name)
      setEmail(client.email)
      setTelefono(client.phone)
      setCodiceFiscale(client.codiceFiscale)
      setPartitaIva(client.partitaIva)
      setAzienda(client.company || '')
    } else {
      resetForm()
    }
    setShowForm(true)
  }

  const saveClient = async () => {
    try {
      const clientData = {
        name: nome,
        email: email,
        phone: telefono,
        codiceFiscale: codiceFiscale,
        partitaIva: partitaIva,
        company: azienda
      }

      const url = editingClient 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/clients/${editingClient.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/clients`
      
      const method = editingClient ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(clientData)
      })

      if (response.ok) {
        setShowForm(false)
        resetForm()
        loadClients()
        alert(editingClient ? 'Client updated' : 'Client created')
      } else {
        alert('Error saving client')
      }
    } catch (error) {
      console.error('Error saving client:', error)
      alert('Error saving client')
    }
  }

  const deleteClient = async (id: number) => {
    if (!confirm('Are you sure you want to delete this client?')) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        loadClients()
        alert('Client deleted')
      } else {
        alert('Error deleting client')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Error deleting client')
    }
  }

  const filteredClients = clienti.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.partitaIva.includes(searchTerm) ||
    client.codiceFiscale.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading clients...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-gray-600">Client record management</p>
        </div>
        <Button onClick={() => openForm()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          New Client
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingClient ? 'Edit Client' : 'New Client'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Name / Company Name *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Client name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefono">Phone *</Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="123-456-7890"
                  required
                />
              </div>
              <div>
                <Label htmlFor="azienda">Company</Label>
                <Input
                  id="azienda"
                  value={azienda}
                  onChange={(e) => setAzienda(e.target.value)}
                  placeholder="Company name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partitaIva">VAT Number *</Label>
                <Input
                  id="partitaIva"
                  value={partitaIva}
                  onChange={(e) => setPartitaIva(e.target.value)}
                  placeholder="12345678901"
                  maxLength={11}
                  required
                />
              </div>
              <div>
                <Label htmlFor="codiceFiscale">Tax Code *</Label>
                <Input
                  id="codiceFiscale"
                  value={codiceFiscale}
                  onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase())}
                  placeholder="RSSMRA80A01H501Z"
                  maxLength={16}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={saveClient}
                className="bg-green-600 hover:bg-green-700"
                disabled={!nome || !email || !telefono || !partitaIva || !codiceFiscale}
              >
                {editingClient ? 'Update' : 'Save'} Client
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Client List ({filteredClients.length})</span>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search clients..."
                className="w-64"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'No clients found' : 'No clients registered'}
              </p>
              {!searchTerm && (
                <Button onClick={() => openForm()} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create the first client
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Client</th>
                    <th className="text-left py-3 px-4">Contacts</th>
                    <th className="text-left py-3 px-4">Tax Data</th>
                    <th className="text-center py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{client.name}</div>
                            {client.company && (
                              <div className="text-sm text-gray-600">{client.company}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {client.email}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {client.phone}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1 text-sm font-mono">
                          <div>VAT: {client.partitaIva}</div>
                          <div className="text-gray-600">Tax Code: {client.codiceFiscale}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openForm(client)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteClient(client.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  )
}