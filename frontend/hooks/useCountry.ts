// frontend/hooks/useCountry.ts
'use client';

import { useContext } from 'react';
import { CountryConfig } from '@/utils/countryConfig';

// Re-export del context per backwards compatibility
import { useCountry as useCountryContext } from '@/contexts/CountryContext';

// Hook principale
export const useCountry = () => {
  return useCountryContext();
};

// Hook per controlli specifici del paese
export const useCountryFeatures = () => {
  const { currentCountry } = useCountry();
  
  return {
    isItaly: currentCountry.code === 'IT',
    isSwitzerland: currentCountry.code === 'CH',
    supportsQRBill: currentCountry.documentFormats.includes('QR-Bill'),
    supportsFatturaPA: currentCountry.documentFormats.includes('FatturaPA XML'),
    hasSwissVAT: currentCountry.fiscalSystem === 'swiss',
    hasItalianVAT: currentCountry.fiscalSystem === 'italian',
    mainTaxRate: currentCountry.taxRates.find(rate => rate.rate > 0)?.rate || 0
  };
};

// Hook per formattazione
export const useCountryFormat = () => {
  const { currentCountry, formatCurrency, formatDate } = useCountry();
  
  return {
    formatMoney: (amount: number) => formatCurrency(amount),
    formatLocalDate: (date: Date) => formatDate(date),
    getCurrencySymbol: () => currentCountry.currencySymbol,
    getLocale: () => currentCountry.locale,
    formatTaxRate: (rate: number) => `${rate.toFixed(1)}%`
  };
};

// Hook per validazioni
export const useCountryValidation = () => {
  const { currentCountry } = useCountry();
  
  const validateTaxNumber = (taxNumber: string): boolean => {
    if (currentCountry.code === 'IT') {
      // Validazione P.IVA italiana: 11 cifre
      const cleaned = taxNumber.replace(/\D/g, '');
      return /^\d{11}$/.test(cleaned);
    } else if (currentCountry.code === 'CH') {
      // Validazione numero IVA svizzero: CHE-xxx.xxx.xxx
      const pattern = /^CHE-\d{3}\.\d{3}\.\d{3}$/;
      return pattern.test(taxNumber);
    }
    return false;
  };

  const validatePostalCode = (postalCode: string): boolean => {
    if (currentCountry.code === 'IT') {
      // Codice postale italiano: 5 cifre
      return /^\d{5}$/.test(postalCode);
    } else if (currentCountry.code === 'CH') {
      // Codice postale svizzero: 4 cifre
      const code = parseInt(postalCode);
      return /^\d{4}$/.test(postalCode) && code >= 1000 && code <= 9999;
    }
    return false;
  };

  return {
    validateTaxNumber,
    validatePostalCode,
    getTaxNumberFormat: () => {
      return currentCountry.code === 'IT' 
        ? '12345678901' 
        : 'CHE-123.456.789';
    },
    getPostalCodeFormat: () => {
      return currentCountry.code === 'IT' 
        ? '12345' 
        : '1234';
    }
  };
};

// Hook per colori tema
export const useCountryTheme = () => {
  const { currentCountry } = useCountry();
  
  return {
    colors: currentCountry.colors,
    getPrimaryColor: () => currentCountry.colors.primary,
    getSecondaryColor: () => currentCountry.colors.secondary,
    getAccentColor: () => currentCountry.colors.accent,
    getGradient: () => currentCountry.colors.gradient,
    getThemeClass: () => `theme-${currentCountry.code.toLowerCase()}`,
    applyTheme: (element: HTMLElement) => {
      element.style.setProperty('--primary-color', currentCountry.colors.primary);
      element.style.setProperty('--secondary-color', currentCountry.colors.secondary);
      element.style.setProperty('--accent-color', currentCountry.colors.accent);
    }
  };
};

export default useCountry;