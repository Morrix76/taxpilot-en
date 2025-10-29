// frontend/utils/countryConfig.ts

export interface TaxRate {
  type: string;
  rate: number;
  description: string;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
}

export interface CountryConfig {
  code: 'IT' | 'CH';
  name: string;
  displayName: string;
  flag: string;
  colors: ColorScheme;
  currency: 'EUR' | 'CHF';
  currencySymbol: string;
  locale: string;
  fiscalSystem: 'italian' | 'swiss';
  taxRates: TaxRate[];
}

const ITALIAN_COLORS: ColorScheme = {
  primary: '#009246',   // Verde bandiera italiana
  secondary: '#CE2B37', // Rosso bandiera italiana
  accent: '#FFFFFF',    // Bianco
};

const SWISS_COLORS: ColorScheme = {
  primary: '#DC143C',   // Rosso Canton Ticino 
  secondary: '#1E90FF', // Azzurro Canton Ticino
  accent: '#FFFFFF',    // Bianco
};

export const COUNTRIES: CountryConfig[] = [
  {
    code: 'IT',
    name: 'Italia',
    displayName: 'Italia',
    flag: '🇮🇹',
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
    ]
  },
  {
    code: 'CH',
    name: 'Svizzera',
    displayName: 'Svizzera (Ticino)',
    flag: '🇨🇭',
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
    ]
  }
];

export const getCountryByCode = (code: string): CountryConfig | undefined => {
  return COUNTRIES.find(country => country.code === code);
};

export const getDefaultCountry = (): CountryConfig => {
  return COUNTRIES[0]; // Italia come default
};
