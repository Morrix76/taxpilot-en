'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface Country {
  code: 'IT' | 'CH'
  name: string
  colors: {
    primary: string
    secondary: string
  }
}

const COUNTRIES: Country[] = [
  {
    code: 'IT',
    name: 'Italia',
    colors: { primary: '#009246', secondary: '#CE2B37' }
  },
  {
    code: 'CH',
    name: 'Svizzera',
    colors: { primary: '#DA291C', secondary: '#FFFFFF' }
  }
]

interface CountryContextType {
  currentCountry: Country
  setCountry: (country: Country) => void
  countries: Country[]
}

const CountryContext = createContext<CountryContextType | undefined>(undefined)

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [currentCountry, setCurrentCountry] = useState<Country>(COUNTRIES[0])

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem('selectedCountry')
    if (saved) {
      const country = COUNTRIES.find(c => c.code === saved)
      if (country) setCurrentCountry(country)
    }
  }, [])

  const setCountry = (country: Country) => {
    setCurrentCountry(country)
    localStorage.setItem('selectedCountry', country.code)
    
    // Apply theme to document
    document.documentElement.setAttribute('data-country', country.code)
    document.documentElement.style.setProperty('--primary-color', country.colors.primary)
    document.documentElement.style.setProperty('--secondary-color', country.colors.secondary)
  }

  // Apply initial theme
  useEffect(() => {
    document.documentElement.setAttribute('data-country', currentCountry.code)
    document.documentElement.style.setProperty('--primary-color', currentCountry.colors.primary)
    document.documentElement.style.setProperty('--secondary-color', currentCountry.colors.secondary)
  }, [currentCountry])

  return (
    <CountryContext.Provider value={{
      currentCountry,
      setCountry,
      countries: COUNTRIES
    }}>
      {children}
    </CountryContext.Provider>
  )
}

export function useCountry() {
  const context = useContext(CountryContext)
  if (context === undefined) {
    throw new Error('useCountry must be used within a CountryProvider')
  }
  return context
}