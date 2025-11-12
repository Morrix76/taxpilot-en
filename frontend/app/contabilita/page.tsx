'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Calculator, 
  FileText, 
  Receipt, 
  FolderTree, 
  TrendingUp, 
  Building, 
  User,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface StatsContabilita {
  movimentiMese: number
  fattureAcquisti: number
  fattureVendite: number
  ivaCredito: number
  ivaDebito: number
  saldoCassa: number
}

export default function ContabilitaDashboard() {
  const [stats, setStats] = useState<StatsContabilita | null>(null)
  const [loading, setLoading] = useState(true)
  const [contabilitaInizializzata, setContabilitaInizializzata] = useState(false)

  useEffect(() => {
    verificaInizializzazione()
  }, [])

  const verificaInizializzazione = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contabilita/status`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      
      const data = await response.json()
      setContabilitaInizializzata(data.initialized || false)
    } catch (error) {
      console.error('Error checking initialization:', error)
    } finally {
      setLoading(false)
    }
  }

  const inizializzaContabilita = async () => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        alert('Please login first')
        return
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contabilita/initialize`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        setContabilitaInizializzata(true)
        alert('Accounting initialized successfully!')
      } else {
        const error = await response.text()
        alert('Error: ' + error)
      }
    } catch (error) {
      console.error('Error initializing:', error)
      alert('Error during initialization')
    }
  }

  const navigaA = (sezione: string) => {
    window.location.href = `/contabilita/${sezione}`
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!contabilitaInizializzata) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Accounting not initialized</h2>
          <p className="text-gray-600 mb-6">
            Before using the accounting module, you must initialize the database tables.
          </p>
          <Button onClick={inizializzaContabilita} className="bg-blue-600 hover:bg-blue-700">
            <CheckCircle className="mr-2 h-4 w-4" />
            Initialize Accounting
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Accounting</h1>
        <p className="text-gray-600">Business accounting and tax management</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="mx-auto h-8 w-8 text-blue-500 mb-2" />
              <div className="text-2xl font-bold">{stats.movimentiMese}</div>
              <div className="text-xs text-gray-600">Monthly Transactions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Receipt className="mx-auto h-8 w-8 text-green-500 mb-2" />
              <div className="text-2xl font-bold">{stats.fattureVendite}</div>
              <div className="text-xs text-gray-600">Sales Invoices</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Building className="mx-auto h-8 w-8 text-orange-500 mb-2" />
              <div className="text-2xl font-bold">{stats.fattureAcquisti}</div>
              <div className="text-xs text-gray-600">Purchase Invoices</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="mx-auto h-8 w-8 text-green-600 mb-2" />
              <div className="text-2xl font-bold">€{stats.ivaCredito.toFixed(0)}</div>
              <div className="text-xs text-gray-600">VAT Credit</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="mx-auto h-8 w-8 text-red-500 mb-2" />
              <div className="text-2xl font-bold">€{stats.ivaDebito.toFixed(0)}</div>
              <div className="text-xs text-gray-600">VAT Debit</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calculator className="mx-auto h-8 w-8 text-purple-500 mb-2" />
              <div className="text-2xl font-bold">€{stats.saldoCassa.toFixed(0)}</div>
              <div className="text-xs text-gray-600">Cash Balance</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="cursor-pointer transition-all hover:shadow-lg"
          onClick={() => navigaA('prima-nota')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              General Ledger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Record accounting transactions and double-entry bookkeeping entries
            </p>
            <Button className="w-full">
              New General Ledger Entry
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-lg"
          onClick={() => navigaA('registri')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-500" />
              VAT Registers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Manage purchase and sales VAT registers with automatic invoice analysis
            </p>
            <Button variant="outline" className="w-full">
              View VAT Registers
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-lg"
          onClick={() => navigaA('piano-conti')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-purple-500" />
              Chart of Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Configure and manage the chart of accounts structure
            </p>
            <Button variant="outline" className="w-full">
              Chart of Accounts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}