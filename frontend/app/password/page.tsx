'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // 8. Validazione email frontend
    if (!email) {
      setError('Il campo email è obbligatorio.');
      return;
    }
    // Semplice regex per la validazione dell'email
    if (!/\S+@\S+\.\S+/.test(email)) {
        setError('Inserisci un indirizzo email valido.');
        return;
    }

    setLoading(true);

    try {
      // 2. Chiamata POST a /api/auth/forgot-password
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 4. Gestire errori
        throw new Error(data.error || 'Si è verificato un errore.');
      }

      // 3. Mostrare messaggio di successo
      setSuccessMessage(data.message || "Se l'email esiste, riceverai le istruzioni per il reset.");

    } catch (err: any) {
      setError(err.message);
    } finally {
      // 7. Loading state
      setLoading(false);
    }
  };

  return (
    // 9. Layout senza sidebar
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
            {/* 10. Titolo */}
            <h1 className="mb-2 text-3xl font-bold text-indigo-600">
              Recupera Password
            </h1>
            <p className="mb-8 text-gray-500">
              Inserisci la tua email per ricevere le istruzioni.
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Form con campo email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Indirizzo Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border-gray-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="mario.rossi@email.com"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="rounded-md bg-green-50 p-4 text-sm font-semibold text-green-700">
              {successMessage}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || !!successMessage}
              className="w-full flex justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Invio in corso...' : 'Invia Istruzioni'}
            </button>
          </div>
        </form>

        {/* 6. Link "Torna al login" */}
        <p className="mt-8 text-center text-sm text-gray-600">
          Ricordi la password?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Torna al Login
          </Link>
        </p>
      </div>
    </div>
  );
}
