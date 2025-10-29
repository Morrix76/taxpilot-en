'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Pagine che non richiedono autenticazione
  const publicPages = ['/login', '/register', '/']

  useEffect(() => {
    checkAuth()
  }, [pathname])

  const checkAuth = async () => {
    // Se è una pagina pubblica, non serve controllo
    if (publicPages.includes(pathname)) {
      setIsAuthenticated(true)
      setIsLoading(false)
      return
    }

    const token = localStorage.getItem('token')
    
    if (!token) {
      console.log('❌ Token non trovato, redirect a login')
      router.push('/login')
      setIsLoading(false)
      return
    }

    try {
      // Verifica se il token è valido
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        console.log('✅ Token valido')
        setIsAuthenticated(true)
      } else {
        console.log('❌ Token non valido, redirect a login')
        localStorage.removeItem('token')
        router.push('/login')
      }
    } catch (error) {
      console.error('Errore verifica token:', error)
      localStorage.removeItem('token')
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }

  // Mostra loading durante verifica
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifica autenticazione...</p>
        </div>
      </div>
    )
  }

  // Se non autenticato e non in pagina pubblica, non mostrare nulla 
  // (il redirect è già in corso)
  if (!isAuthenticated && !publicPages.includes(pathname)) {
    return null
  }

  return <>{children}</>
}

// Hook per usare l'autenticazione
export function useAuth() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    setToken(savedToken)
  }, [])

  const login = (newToken: string, userData: any) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('clienteSelezionato')
    setToken(null)
    setUser(null)
    window.location.href = '/login'
  }

  const getAuthHeaders = () => {
    const currentToken = localStorage.getItem('token')
    return {
      'Authorization': `Bearer ${currentToken}`,
      'Content-Type': 'application/json'
    }
  }

  return {
    token,
    user,
    login,
    logout,
    getAuthHeaders,
    isAuthenticated: !!token
  }
}
