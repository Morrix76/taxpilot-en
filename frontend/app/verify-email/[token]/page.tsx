'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function VerifyEmailPage() {
  const params = useParams();
  const token = params?.token as string;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Token di verifica mancante');
      return;
    }

    // Chiama l'endpoint di verifica - il backend farà redirect automatico
    const verifyEmail = async () => {
      try {
        // Costruisci l'URL completo per la verifica
        const verifyUrl = `/api/auth/verify-email/${token}`;
        
        // Effettua la richiesta - il backend farà un redirect HTTP
        window.location.href = verifyUrl;
        
      } catch (err) {
        console.error('Errore durante la verifica:', err);
        setError('Si è verificato un errore durante la verifica dell\'email');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg text-center">
        {error ? (
          // Messaggio di errore
          <div>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="mb-4 text-2xl font-bold text-gray-900">
              Errore di verifica
            </h1>
            <p className="mb-6 text-gray-600">
              {error}
            </p>
            <a
              href="/login"
              className="inline-block rounded-lg bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Torna al login
            </a>
          </div>
        ) : (
          // Loader/Spinner
          <div>
            <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600"></div>
            <h1 className="mb-4 text-2xl font-bold text-gray-900">
              Verifica in corso...
            </h1>
            <p className="text-gray-600">
              Stiamo verificando il tuo indirizzo email. Attendi un momento...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

