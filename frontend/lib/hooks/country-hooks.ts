// frontend/lib/hooks/useCountry.ts
'use client';

import { useContext, useEffect, useState, useCallback } from 'react';
import { CountryConfig } from '@/lib/countryConfig';

// Re-export del hook principale
export { useCountry, useCurrentCountry, useCountryUtils } from '@/app/contexts/CountryContext';

// Hook per gestire transizioni tra paesi
export const useCountryTransition = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDuration] = useState(300);

  const startTransition = useCallback(async (callback?: () => void) => {
    setIsTransitioning(true);
    
    // Attendi la transizione CSS
    await new Promise(resolve => setTimeout(resolve, transitionDuration / 2));
    
    if (callback) callback();
    
    await new Promise(resolve => setTimeout(resolve, transitionDuration / 2));
    
    setIsTransitioning(false);
  }, [transitionDuration]);

  return {
    isTransitioning,
    startTransition,
    transitionDuration
  };
};

// Hook per validazioni fiscali in base al paese
export const useFiscalValidation = () => {
  const { currentCountry } = useCountry();

  const validateVATNumber = useCallback((vatNumber: string): boolean => {
    if (!vatNumber) return false;

    switch (currentCountry.code) {
      case 'IT':
        // Partita IVA italiana: 11 cifre
        const italianPattern = /^\d{11}$/;
        if (!italianPattern.test(vatNumber)) return false;
        
        // Algoritmo checksum italiano
        let sum = 0;
        for (let i = 0; i < 10; i++) {
          let digit = parseInt(vatNumber[i]);
          if (i % 2 === 1) {
            digit *= 2;
            if (digit > 9) digit -= 9;
          }
          sum += digit;
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(vatNumber[10]);

      case 'CH':
        // Numero IVA svizzero: CHE-xxx.xxx.xxx
        const swissPattern = /^CHE-\d{3}\.\d{3}\.\d{3}$/;
        return swissPattern.test(vatNumber);

      default:
        return false;
    }
  }, [currentCountry.code]);

  const validateTaxCode = useCallback((taxCode: string): boolean => {
    if (!taxCode) return false;

    switch (currentCountry.code) {
      case 'IT':
        // Codice fiscale italiano
        const cfPattern = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
        return cfPattern.test(taxCode.toUpperCase());

      case 'CH':
        // Numero AVS svizzero: 756.xxxx.xxxx.xx
        const avsPattern = /^756\.\d{4}\.\d{4}\.\d{2}$/;
        return avsPattern.test(taxCode);

      default:
        return false;
    }
  }, [currentCountry.code]);

  return {
    validateVATNumber,
    validateTaxCode,
    fiscalSystem: currentCountry.fiscalSystem
  };
};

// Hook per formattazione valori fiscali
export const useFiscalFormatter = () => {
  const { currentCountry, formatCurrency } = useCountry();

  const formatVATRate = useCallback((rate: number): string => {
    return `${rate.toFixed(1)}%`;
  }, []);

  const formatVATAmount = useCallback((netAmount: number, vatRate: number) => {
    const vatAmount = (netAmount * vatRate) / 100;
    const grossAmount = netAmount + vatAmount;

    // Arrotondamento svizzero se necessario
    if (currentCountry.code === 'CH') {
      const roundedVAT = Math.round(vatAmount * 20) / 20;
      const roundedGross = Math.round(grossAmount * 20) / 20;
      
      return {
        net: formatCurrency(netAmount),
        vat: formatCurrency(roundedVAT),
        gross: formatCurrency(roundedGross),
        vatRate: formatVATRate(vatRate)
      };
    }

    return {
      net: formatCurrency(netAmount),
      vat: formatCurrency(vatAmount),
      gross: formatCurrency(grossAmount),
      vatRate: formatVATRate(vatRate)
    };
  }, [currentCountry.code, formatCurrency, formatVATRate]);

  const getVATRatesByType = useCallback(() => {
    return currentCountry.taxRates.reduce((acc, rate) => {
      if (!acc[rate.type]) acc[rate.type] = [];
      acc[rate.type].push({
        rate: rate.rate,
        description: rate.description,
        formatted: formatVATRate(rate.rate)
      });
      return acc;
    }, {} as Record<string, Array<{rate: number, description: string, formatted: string}>>);
  }, [currentCountry.taxRates, formatVATRate]);

  return {
    formatVATRate,
    formatVATAmount,
    getVATRatesByType,
    standardVATRate: currentCountry.taxRates[0]?.rate || 0
  };
};

// Hook per persistenza stato
export const useCountryPersistence = () => {
  const { currentCountry, setCountryByCode } = useCountry();

  // Salva preferenze aggiuntive
  const saveUserPreference = useCallback((key: string, value: any) => {
    if (typeof window !== 'undefined') {
      const prefs = JSON.parse(localStorage.getItem('country-preferences') || '{}');
      prefs[currentCountry.code] = {
        ...prefs[currentCountry.code],
        [key]: value
      };
      localStorage.setItem('country-preferences', JSON.stringify(prefs));
    }
  }, [currentCountry.code]);

  // Carica preferenze
  const loadUserPreference = useCallback((key: string, defaultValue: any = null) => {
    if (typeof window !== 'undefined') {
      const prefs = JSON.parse(localStorage.getItem('country-preferences') || '{}');
      return prefs[currentCountry.code]?.[key] ?? defaultValue;
    }
    return defaultValue;
  }, [currentCountry.code]);

  // Reset preferenze
  const clearPreferences = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('country-preferences');
      localStorage.removeItem('selected-country');
    }
  }, []);

  // Sync tra tab
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selected-country' && e.newValue) {
        setCountryByCode(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setCountryByCode]);

  return {
    saveUserPreference,
    loadUserPreference,
    clearPreferences
  };
};

// Hook per detectare cambio paese
export const useCountryChange = (callback: (country: CountryConfig) => void) => {
  const { currentCountry } = useCountry();
  const [previousCountry, setPreviousCountry] = useState<CountryConfig>(currentCountry);

  useEffect(() => {
    if (currentCountry.code !== previousCountry.code) {
      callback(currentCountry);
      setPreviousCountry(currentCountry);
    }
  }, [currentCountry, previousCountry, callback]);
};

// Hook per theme-aware components
export const useCountryTheme = () => {
  const { currentCountry } = useCountry();

  const getThemeClass = useCallback((baseClass: string) => {
    return `${baseClass} ${baseClass}--${currentCountry.code.toLowerCase()}`;
  }, [currentCountry.code]);

  const getCountrySpecificStyle = useCallback((property: string) => {
    return currentCountry.colors[property as keyof typeof currentCountry.colors];
  }, [currentCountry.colors]);

  const isCurrentCountry = useCallback((countryCode: string) => {
    return currentCountry.code === countryCode;
  }, [currentCountry.code]);

  return {
    currentCountry,
    colors: currentCountry.colors,
    getThemeClass,
    getCountrySpecificStyle,
    isCurrentCountry,
    isItaly: currentCountry.code === 'IT',
    isSwitzerland: currentCountry.code === 'CH'
  };
};
