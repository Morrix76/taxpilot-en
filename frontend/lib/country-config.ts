// frontend/lib/countryConfig.ts
export interface TaxRate {
  type: string;
  rate: number;
  description: string;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
  gradientFlag: string;
  shadow: string;
}

export interface CountryConfig {
  code: 'IT' | 'CH';
  name: string;
  displayName: string;
  flag: string;
  flagEmoji: string;
  colors: ColorScheme;
  currency: 'EUR' | 'CHF';
  currencySymbol: string;
  locale: string;
  fiscalSystem: 'italian' | 'swiss';
  taxRates: TaxRate[];
  documentFormats: string[];
  regulations: string[];
}

// Colori Italia - Tricolore
const ITALIAN_COLORS: ColorScheme = {
  primary: '#009246',      // Verde bandiera
  secondary: '#CE2B37',    // Rosso bandiera  
  accent: '#FFFFFF',       // Bianco
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#212529',
  textSecondary: '#6C757D',
  success: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  gradientFlag: 'linear-gradient(90deg, #009246 0% 33%, #FFFFFF 33% 66%, #CE2B37 66% 100%)',
  shadow: '0 2px 8px rgba(0, 146, 70, 0.15)'
};

// Colori Svizzera - Rosso Pantone
const SWISS_COLORS: ColorScheme = {
  primary: '#DA291C',      // Rosso Pantone 485 C
  secondary: '#FFFFFF',    // Bianco puro
  accent: '#E85A52',       // Rosso chiaro
  background: '#FAFAFA', 
  surface: '#FFFFFF',
  text: '#212529',
  textSecondary: '#6C757D',
  success: '#28A745',
  warning: '#FFC107', 
  error: '#DC3545',
  gradientFlag: '#DA291C',
  shadow: '0 2px 8px rgba(218, 41, 28, 0.15)'
};

export const COUNTRIES: CountryConfig[] = [
  {
    code: 'IT',
    name: 'Italia',
    displayName: 'Italia',
    flag: '/flags/italy.svg',
    flagEmoji: '🇮🇹',
    colors: ITALIAN_COLORS,
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'it-IT',
    fiscalSystem: 'italian',
    taxRates: [
      { type: 'IVA', rate: 22, description: 'Aliquota ordinaria' },
      { type: 'IVA', rate: 10, description: 'Aliquota ridotta' },
      { type: 'IVA', rate: 4, description: 'Aliquota super ridotta' },
      { type: 'IVA', rate: 0, description: 'Esente/Non imponibile' }
    ],
    documentFormats: ['FatturaPA XML', 'PDF', 'JSON'],
    regulations: ['DPR 633/72', 'AGID 2020', 'Codice Civile']
  },
  {
    code: 'CH',
    name: 'Svizzera',
    displayName: 'Svizzera (Ticino)',
    flag: '/flags/switzerland.svg',
    flagEmoji: '🇨🇭',
    colors: SWISS_COLORS,
    currency: 'CHF',
    currencySymbol: 'CHF',
    locale: 'it-CH',
    fiscalSystem: 'swiss',
    taxRates: [
      { type: 'IVA', rate: 7.7, description: 'Aliquota normale' },
      { type: 'IVA', rate: 3.7, description: 'Aliquota ridotta (alloggio)' },
      { type: 'IVA', rate: 2.5, description: 'Aliquota speciale (beni quotidiani)' },
      { type: 'IVA', rate: 0, description: 'Esente' }
    ],
    documentFormats: ['ZUGFeRD', 'Factur-X', 'QR-Bill', 'PDF'],
    regulations: ['LIVA', 'OR (Codice Obbligazioni)', 'LSC']
  }
];

export const getCountryByCode = (code: string): CountryConfig | undefined => {
  return COUNTRIES.find(country => country.code === code);
};

export const getDefaultCountry = (): CountryConfig => {
  return COUNTRIES[0]; // Italia di default
};
