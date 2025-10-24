import React from 'react';

// Mock delle dipendenze per la demo
const COUNTRIES = [
  {
    code: 'IT',
    name: 'Italia',
    displayName: 'Italia',
    flag: '/flags/italy.svg',
    flagEmoji: '🇮🇹',
    colors: {
      primary: '#009246',
      secondary: '#CE2B37',
      accent: '#FFFFFF',
      background: '#FAFAFA',
      surface: '#FFFFFF',
      text: '#212529',
      textSecondary: '#6C757D',
      success: '#28A745',
      warning: '#FFC107',
      error: '#DC3545',
      gradientFlag: 'linear-gradient(90deg, #009246 0% 33%, #FFFFFF 33% 66%, #CE2B37 66% 100%)',
      shadow: '0 2px 8px rgba(0, 146, 70, 0.15)'
    },
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'it-IT',
    fiscalSystem: 'italian',
    taxRates: [
      { type: 'IVA', rate: 22, description: 'Aliquota ordinaria' },
      { type: 'IVA', rate: 10, description: 'Aliquota ridotta' }
    ],
    documentFormats: ['FatturaPA XML', 'PDF'],
    regulations: ['DPR 633/72']
  },
  {
    code: 'CH',
    name: 'Svizzera',
    displayName: 'Svizzera (Ticino)',
    flag: '/flags/switzerland.svg',
    flagEmoji: '🇨🇭',
    colors: {
      primary: '#DA291C',
      secondary: '#FFFFFF',
      accent: '#E85A52',
      background: '#FAFAFA',
      surface: '#FFFFFF',
      text: '#212529',
      textSecondary: '#6C757D',
      success: '#28A745',
      warning: '#FFC107',
      error: '#DC3545',
      gradientFlag: '#DA291C',
      shadow: '0 2px 8px rgba(218, 41, 28, 0.15)'
    },
    currency: 'CHF',
    currencySymbol: 'CHF',
    locale: 'it-CH',
    fiscalSystem: 'swiss',
    taxRates: [
      { type: 'IVA', rate: 7.7, description: 'Aliquota normale' },
      { type: 'IVA', rate: 3.7, description: 'Aliquota ridotta' }
    ],
    documentFormats: ['QR-Bill', 'PDF'],
    regulations: ['LIVA', 'OR']
  }
];

// Demo Component
export default function CountrySelectorDemo() {
  const [currentCountry, setCurrentCountry] = React.useState(COUNTRIES[0]);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  
  // Applica i CSS custom properties
  React.useEffect(() => {
    const root = document.documentElement;
    const colors = currentCountry.colors;
    
    root.style.setProperty('--primary-color', colors.primary);
    root.style.setProperty('--secondary-color', colors.secondary);
    root.style.setProperty('--accent-color', colors.accent);
    root.style.setProperty('--country-shadow', colors.shadow);
    root.style.setProperty('--flag-gradient', colors.gradientFlag);
    root.setAttribute('data-country', currentCountry.code);
  }, [currentCountry]);

  const formatCurrency = (amount) => {
    return `${amount.toFixed(2)} ${currentCountry.currencySymbol}`;
  };

  const selectCountry = (country) => {
    setCurrentCountry(country);
    setIsDropdownOpen(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background-color, #FAFAFA)' }}>
      {/* Header con bandiera */}
      <header className="bg-white shadow-sm border-b-4" style={{ borderBottomColor: 'var(--primary-color)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold" style={{ color: 'var(--primary-color)' }}>
                TaxPilot Assistant
              </h1>
            </div>
            
            {/* Country Selector */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 bg-white border-2 rounded-lg transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ 
                  borderColor: isDropdownOpen ? 'var(--primary-color)' : 'transparent',
                  boxShadow: isDropdownOpen ? 'var(--country-shadow)' : 'none' 
                }}
              >
                <span className="text-xl" role="img" aria-label={currentCountry.name}>
                  {currentCountry.flagEmoji}
                </span>
                <span className="font-medium text-gray-700">
                  {currentCountry.displayName}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 min-w-full overflow-hidden z-50">
                  <div className="py-1">
                    {COUNTRIES.map((country) => (
                      <button
                        key={country.code}
                        onClick={() => selectCountry(country)}
                        className="w-full px-4 py-3 text-left flex items-center space-x-3 transition-all duration-200 hover:bg-gray-50"
                        style={{
                          backgroundColor: country.code === currentCountry.code ? `${country.colors.primary}10` : undefined,
                          color: country.code === currentCountry.code ? country.colors.primary : '#374151'
                        }}
                      >
                        <span className="text-xl" role="img" aria-label={country.name}>
                          {country.flagEmoji}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium">{country.displayName}</div>
                          <div className="text-xs text-gray-500 flex items-center space-x-2">
                            <span>{country.currency}</span>
                            <span>•</span>
                            <span>IVA {country.taxRates[0]?.rate}%</span>
                          </div>
                        </div>
                        {country.code === currentCountry.code && (
                          <svg className="w-4 h-4 text-current" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  <div className="border-t border-gray-100 px-4 py-2 bg-gray-50">
                    <div className="text-xs text-gray-500">
                      Sistema fiscale: <span className="font-medium">{currentCountry.fiscalSystem}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Gradiente bandiera */}
      <div className="h-1" style={{ background: 'var(--flag-gradient)' }}></div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card Informazioni Paese */}
          <div className="bg-white p-6 rounded-lg border transition-all duration-300 hover:shadow-lg" style={{ borderColor: `${currentCountry.colors.primary}20` }}>
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-3xl">{currentCountry.flagEmoji}</span>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--primary-color)' }}>
                {currentCountry.displayName}
              </h2>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Valuta:</span>
                <span className="ml-2 font-medium">{currentCountry.currency}</span>
              </div>
              <div>
                <span className="text-gray-500">Sistema:</span>
                <span className="ml-2 font-medium">{currentCountry.fiscalSystem}</span>
              </div>
              <div>
                <span className="text-gray-500">IVA Standard:</span>
                <span className="ml-2 font-medium">{currentCountry.taxRates[0]?.rate}%</span>
              </div>
            </div>
          </div>

          {/* Card Aliquote IVA */}
          <div className="bg-white p-6 rounded-lg border transition-all duration-300 hover:shadow-lg" style={{ borderColor: `${currentCountry.colors.primary}20` }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>
              Aliquote IVA
            </h3>
            <div className="space-y-2">
              {currentCountry.taxRates.map((rate, index) => (
                <div key={index} className="flex justify-between items-center py-2 px-3 rounded" style={{ backgroundColor: `${currentCountry.colors.primary}05` }}>
                  <span className="text-sm">{rate.description}</span>
                  <span className="font-semibold" style={{ color: 'var(--primary-color)' }}>
                    {rate.rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card Calcolo Esempio */}
          <div className="bg-white p-6 rounded-lg border transition-all duration-300 hover:shadow-lg" style={{ borderColor: `${currentCountry.colors.primary}20` }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>
              Esempio Calcolo
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Imponibile:</span>
                <span>{formatCurrency(1000.00)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA ({currentCountry.taxRates[0]?.rate}%):</span>
                <span>{formatCurrency(1000 * currentCountry.taxRates[0]?.rate / 100)}</span>
              </div>
              <hr />
              <div className="flex justify-between font-semibold" style={{ color: 'var(--primary-color)' }}>
                <span>Totale:</span>
                <span>{formatCurrency(1000 + (1000 * currentCountry.taxRates[0]?.rate / 100))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sezione Pulsanti Tematici */}
        <div className="mt-8 flex flex-wrap gap-4">
          <button
            className="px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:transform hover:-translate-y-1"
            style={{
              backgroundColor: 'var(--primary-color)',
              color: 'var(--accent-color)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = 'var(--country-shadow)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            Pulsante Primario
          </button>
          
          <button
            className="px-6 py-3 rounded-lg font-medium border-2 transition-all duration-300 hover:transform hover:-translate-y-1"
            style={{
              borderColor: 'var(--primary-color)',
              color: 'var(--primary-color)',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'var(--primary-color)';
              e.target.style.color = 'var(--accent-color)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'var(--primary-color)';
            }}
          >
            Pulsante Secondario
          </button>
        </div>
      </main>
    </div>
  );
}