'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface ThemeContextType {
  theme: string
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState('light')
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('theme') || 'light'
    setTheme(saved)
    document.documentElement.classList.toggle('dark', saved === 'dark')
  }, [])
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }
  
  if (!mounted) {
    return <>{children}</>
  }
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}