'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validazioni frontend
    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      // 2. Chiamata POST all'API di registrazione
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 3. Gestione degli errori dal backend
        if (data.error && data.error.includes('Email già in uso')) {
          setError('Questo indirizzo email è già registrato. Prova ad accedere o usa un\'altra email.');
        } else {
          setError(data.error || 'Si è verificato un errore durante la registrazione.');
        }
        return;
      }

      // 4. Successo: mostra messaggio di verifica email (NON redirect)
      setRegistrationSuccess(true);
      setError('');

    } catch (err: any) {
      setError(err.message || 'Si è verificato un errore di connessione.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    setResendSuccess(false);
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

      if (!response.ok) {
        setError(data.error || 'Errore durante il reinvio dell\'email.');
        return;
      }

      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000); // Hide after 5 seconds

    } catch (err: any) {
      setError(err.message || 'Errore di connessione.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        {registrationSuccess ? (
          // Success Message
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mb-4 text-3xl font-bold text-gray-900">
              Account creato con successo!
            </h1>
            <p className="mb-6 text-gray-600">
              Ti abbiamo inviato un&apos;email all&apos;indirizzo <strong>{email}</strong>. 
              Clicca il link nell&apos;email per verificare il tuo account.
            </p>

            {resendSuccess && (
              <div className="mb-4 rounded-md bg-green-50 p-4 text-sm font-semibold text-green-700">
                Email di verifica inviata con successo!
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleResendEmail}
              disabled={resendLoading}
              className="w-full rounded-lg border border-indigo-600 bg-white px-4 py-3 text-base font-medium text-indigo-600 shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resendLoading ? 'Invio in corso...' : 'Non hai ricevuto l\'email? Reinvia'}
            </button>

            <p className="mt-6 text-center text-sm text-gray-600">
              <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Torna al login
              </Link>
            </p>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <Link href="/privacy" className="text-xs text-gray-500 hover:text-indigo-600">
                Privacy Policy
              </Link>
            </div>
          </div>
        ) : (
          // Registration Form
          <>
            <div className="text-center">
              <h1 className="mb-2 text-3xl font-bold text-indigo-600">
                Create your Account
              </h1>
              <p className="mb-8 text-gray-500">
                Start your 15-day free trial.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border-gray-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
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
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
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

          <div>
            <label
              htmlFor="confirm_password"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm Password
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

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
        </form>

            <p className="mt-8 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Log in
              </Link>
            </p>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <Link href="/privacy" className="text-xs text-gray-500 hover:text-indigo-600">
                Privacy Policy
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
