// components/CountrySelector.tsx
'use client';

import React from 'react';
import { useCountry } from '@/contexts/CountryContext';

const CountrySelector: React.FC = () => {
  const { currentCountry, setCountry } = useCountry();

  return (
    <div className="flex space-x-2">
      {/* Italia */}
      <button
        onClick={() => setCountry('IT')}
        className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
          currentCountry === 'IT' 
            ? 'bg-gray-200 dark:bg-slate-600 font-semibold text-gray-800 dark:text-white' 
            : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300'
        }`}
      >
        <span>🇮🇹</span>
        <span>Italia</span>
      </button>

      {/* Svizzera */}
      <button
        onClick={() => setCountry('CH')}
        className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
          currentCountry === 'CH' 
            ? 'bg-gray-200 dark:bg-slate-600 font-semibold text-gray-800 dark:text-white' 
            : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300'
        }`}
      >
        <span>🇨🇭</span>
        <span>Svizzera</span>
      </button>
    </div>
  );
};

export default CountrySelector;
