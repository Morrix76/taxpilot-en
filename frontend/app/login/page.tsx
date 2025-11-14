'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check query params for verification status
  useEffect(() => {
    const verified = searchParams?.get('verified');
    const errorParam = searchParams?.get('error');

    if (verified === 'true') {
      setSuccessMessage('Email verificata con successo! Ora puoi accedere.');
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } else if (verified === 'false') {
      if (errorParam === 'expired') {
        setError('Il link di verifica è scaduto. Richiedi un nuovo link.');
      } else if (errorParam === 'invalid') {
        setError('Link di verifica non valido.');
      } else {
        setError('Link non valido o scaduto.');
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setShowResendButton(false);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('taxpilot_token', data.token);
        router.push('/dashboard');
      } else {
        // Check for EMAIL_NOT_VERIFIED error
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setError('Devi verificare la tua email prima di accedere.');
          setShowResendButton(true);
        } else {
          setError(data.error || 'Errore di login');
        }
      }
    } catch (error) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Inserisci la tua email per reinviare la verifica.');
      return;
    }

    setResendLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Email di verifica inviata! Controlla la tua casella di posta.');
        setShowResendButton(false);
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(data.error || 'Errore durante il reinvio dell\'email.');
      }
    } catch (error) {
      setError('Errore di connessione');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-indigo-600">Login</h1>
          <p className="mb-8 text-gray-500">Welcome to TaxPilot</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border-gray-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="john.doe@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
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

          {successMessage && (
            <div className="rounded-md bg-green-50 p-4 text-sm font-semibold text-green-700">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {showResendButton && (
            <div>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="w-full rounded-lg border border-indigo-600 bg-white px-4 py-3 text-base font-medium text-indigo-600 shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendLoading ? 'Invio in corso...' : 'Reinvia email di verifica'}
              </button>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center rounded-lg bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/password" className="text-indigo-600 hover:text-indigo-500">
            Forgot password?
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign up
          </Link>
        </p>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <Link href="/privacy" className="text-xs text-gray-500 hover:text-indigo-600">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
