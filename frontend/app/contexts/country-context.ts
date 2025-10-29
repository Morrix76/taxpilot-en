// frontend/app/contexts/CountryContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CountryConfig, COUNTRIES, getCountryByCode, getDefaultCountry } from '@/lib/countryConfig';

interface CountryContextType {
  currentCountry: CountryConfig;
  availableCountries: CountryConfig[];
  setCountry: (country: CountryConfig) => void;
  setCountryByCode: (code: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date) => string;
  isCountrySupported: (code: string) => boolean;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

interface CountryProviderProps {
  children: ReactNode;
  defaultCountryCode?: string;
}

export const CountryProvider: React.FC<CountryProviderProps> = ({ 
  children, 
  defaultCountryCode = 'IT' 
}) => {
  const [currentCountry, setCurrentCountry] = useState<CountryConfig>(() => {
    // Carica da localStorage se disponibile
    if (typeof window !== 'undefined') {
      const savedCountryCode = localStorage.getItem('selected-country');
      if (savedCountryCode) {
        const savedCountry = getCountryByCode(savedCountryCode);
        if (savedCountry) return savedCountry;
      }
    }
    return getCountryByCode(defaultCountryCode) || getDefaultCountry();
  });

  // Applica il tema CSS quando cambia il paese
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const colors = currentCountry.colors;
      
      // Imposta CSS custom properties
      root.style.setProperty('--primary-color', colors.primary);
      root.style.setProperty('--secondary-color', colors.secondary);
      root.style.setProperty('--accent-color', colors.accent);
      root.style.setProperty('--background-color', colors.background);
      root.style.setProperty('--surface-color', colors.surface);
      root.style.setProperty('--text-color', colors.text);
      root.style.setProperty('--text-secondary-color', colors.textSecondary);
      root.style.setProperty('--success-color', colors.success);
      root.style.setProperty('--warning-color', colors.warning);
      root.style.setProperty('--error-color', colors.error);
      root.style.setProperty('--flag-gradient', colors.gradientFlag);
      root.style.setProperty('--country-shadow', colors.shadow);
      
      // Imposta attributo data per CSS selectors specifici
      root.setAttribute('data-country', currentCountry.code);
      root.setAttribute('data-currency', currentCountry.currency);
      
      // Salva in localStorage
      localStorage.setItem('selected-country', currentCountry.code);
      
      // Dispatch event per componenti che non usano il context
      const event = new CustomEvent('countryChanged', { 
        detail: { country: currentCountry } 
      });
      window.dispatchEvent(event);
    }
  }, [currentCountry]);

  const setCountry = (country: CountryConfig) => {
    setCurrentCountry(country);
  };

  const setCountryByCode = (code: string) => {
    const country = getCountryByCode(code);
    if (country) {
      setCurrentCountry(country);
    } else {
      console.warn(`Country with code ${code} not supported`);
    }
  };

  const formatCurrency = (amount: number): string => {
    try {
      return new Intl.NumberFormat(currentCountry.locale, {
        style: 'currency',
        currency: currentCountry.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback se Intl non supportato
      return `${amount.toFixed(2)} ${currentCountry.currencySymbol}`;
    }
  };

  const formatDate = (date: Date): string => {
    try {
      return new Intl.DateTimeFormat(currentCountry.locale, {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      }).format(date);
    } catch (error) {
      // Fallback
      return date.toLocaleDateString();
    }
  };

  const isCountrySupported = (code: string): boolean => {
    return COUNTRIES.some(country => country.code === code);
  };

  const contextValue: CountryContextType = {
    currentCountry,
    availableCountries: COUNTRIES,
    setCountry,
    setCountryByCode,
    formatCurrency,
    formatDate,
    isCountrySupported
  };

  return (
    <CountryContext.Provider value={contextValue}>
      {children}
    </CountryContext.Provider>
  );
};

// Hook personalizzato
export const useCountry = (): CountryContextType => {
  const context = useContext(CountryContext);
  if (context === undefined) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
};

// Hook per solo lettura (performance)
export const useCurrentCountry = (): CountryConfig => {
  const { currentCountry } = useCountry();
  return currentCountry;
};

// Hook per utilities
export const useCountryUtils = () => {
  const { formatCurrency, formatDate, currentCountry } = useCountry();
  
  return {
    formatCurrency,
    formatDate,
    currency: currentCountry.currency,
    locale: currentCountry.locale,
    fiscalSystem: currentCountry.fiscalSystem
  };
};
