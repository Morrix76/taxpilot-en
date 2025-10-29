'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError('Token di reset non trovato o non valido.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 4. Validazioni frontend
    if (!password || !confirmPassword) {
      setError('Entrambi i campi password sono obbligatori.');
      return;
    }
    if (password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Le password non corrispondono.');
      return;
    }
    if (!token) {
      setError('Impossibile procedere senza un token valido.');
      return;
    }

    setLoading(true);

    try {
      // 3. Chiamata POST a /api/auth/reset-password
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Si è verificato un errore.');
      }

      // 5. Gestione successo
      setSuccess('Password aggiornata con successo! Verrai reindirizzato al login...');
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err: any) {
      // 5. Gestione errore
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
            <h1 className="mb-2 text-3xl font-bold text-indigo-600">
              Imposta Nuova Password
            </h1>
            <p className="mb-8 text-gray-500">
              Scegli una nuova password sicura per il tuo account.
            </p>
        </div>
        
        {/* 6. Se il token è mancante, mostra un errore e nascondi il form */}
        {!token && error ? (
            <div className="rounded-md bg-red-50 p-4 text-center text-sm font-semibold text-red-700">
                <p>{error}</p>
                <Link href="/login" className="mt-4 inline-block font-medium text-indigo-600 hover:text-indigo-500">
                    Torna al Login
                </Link>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
                >
                Nuova Password
                </label>
                <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border-gray-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="••••••••"
                />
            </div>

            <div>
                <label
                htmlFor="confirm_password"
                className="block text-sm font-medium text-gray-700"
                >
                Conferma Nuova Password
                </label>
                <input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border-gray-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="••••••••"
                />
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error}
                </div>
            )}
            {success && (
                <div className="rounded-md bg-green-50 p-4 text-sm font-semibold text-green-700">
                {success}
                </div>
            )}

            <div>
                <button
                type="submit"
                disabled={loading || !!success}
                className="w-full flex justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                {loading ? 'Aggiornamento...' : 'Imposta Nuova Password'}
                </button>
            </div>
            </form>
        )}
      </div>
    </div>
  );
}


// Esporta la pagina avvolta in Suspense per garantire che useSearchParams funzioni correttamente
export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Caricamento...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
