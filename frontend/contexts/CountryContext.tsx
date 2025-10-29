// contexts/CountryContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type CountryCode = 'IT' | 'CH';

interface CountryContextType {
  currentCountry: CountryCode;
  setCountry: (country: CountryCode) => void;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

interface CountryProviderProps {
  children: ReactNode;
}

export const CountryProvider: React.FC<CountryProviderProps> = ({ children }) => {
  const [currentCountry, setCurrentCountry] = useState<CountryCode>('IT');

  // Inizializzazione da localStorage
  useEffect(() => {
    const saved = localStorage.getItem('countryCode') as CountryCode;
    if (saved === 'IT' || saved === 'CH') {
      setCurrentCountry(saved);
    }
  }, []);

  // Aggiorna attributo document e localStorage
  useEffect(() => {
    // ✅ CORREZIONE: Imposta data-country su <html>
    document.documentElement.setAttribute('data-country', currentCountry);
    localStorage.setItem('countryCode', currentCountry);
    
    console.log(`🌍 Paese cambiato: ${currentCountry}`);
    console.log('🔍 data-country impostato su:', document.documentElement.getAttribute('data-country'));
  }, [currentCountry]);

  const contextValue: CountryContextType = {
    currentCountry,
    setCountry: setCurrentCountry
  };

  return (
    <CountryContext.Provider value={contextValue}>
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = (): CountryContextType => {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error('useCountry deve essere usato all\'interno di un CountryProvider');
  }
  return context;
};
