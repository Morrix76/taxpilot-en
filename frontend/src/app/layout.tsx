'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import clsx from 'clsx';

// --- Componenti di supporto ---

const TrialBanner = ({ trialInfo }) => {
  if (!trialInfo || !trialInfo.is_active) return null;

  return (
    <div className="mb-8 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-center text-sm text-white shadow-lg">
      <span className="font-bold">✨ Trial Premium Attivo</span>
      <span className="mx-2 opacity-70">•</span>
      <span>{trialInfo.days_remaining} giorni rimasti</span>
      <span className="mx-2 opacity-70">•</span>
      <span>{trialInfo.documents_used}/{trialInfo.documents_limit} documenti utilizzati</span>
    </div>
  );
};

const LoadingScreen = () => (
    <html lang="it">
        <body className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
            <div className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 animate-spin rounded-full border-b-2 border-indigo-500"></div>
                <p className="text-slate-600 dark:text-slate-400">Caricamento...</p>
            </div>
        </body>
    </html>
);

/* ───── link sidebar ───── */
const links = [
  { name: '🏠 Dashboard',    href: '/dashboard'  },
  { name: '📁 Documenti',    href: '/documents'  },
  { name: '👥 Clienti',      href: '/clients'    },
  { name: '📋 Contabilità',  href: '/contabilita' },
  { name: '📊 Statistiche',  href: '/analytics'  },
  { name: '💳 Fatturazione', href: '/billing'    },
  { name: '⚙️ Impostazioni', href: '/settings'   },
];
console.log('LAYOUT LINKS:', links.length); 
// DEBUG LOGS
console.log('LINKS ARRAY:', links);
console.log('LINKS LENGTH:', links.length);

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname            = usePathname();
  const router              = useRouter();
  const [theme, setTheme]   = useState<'light' | 'dark'>('light');
  const [open, setOpen]     = useState(false);
  
  // State per il trial e l'autenticazione
  const [trialInfo, setTrialInfo] = useState(null);
  const [authStatus, setAuthStatus] = useState('checking');

  /* ── tema (localStorage) ── */
  useEffect(() => {
    const saved = (localStorage.getItem('taxpilot_theme') as 'light' | 'dark') ?? 'light';
    setTheme(saved);
    document.documentElement.classList.toggle('dark', saved === 'dark');
  }, []);

  /* ── Controllo Autenticazione ── */
  useEffect(() => {
    const publicPages = ['/', '/login', '/register', '/trial-expired'];
    if (publicPages.includes(pathname)) {
        setAuthStatus('unauthenticated');
        return;
    }

    const verifyAuth = async () => {
      const token = localStorage.getItem('taxpilot_token');
      if (!token) {
        router.push('/login');
        setAuthStatus('unauthenticated');
        return;
      }

      try {
        const response = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Token non valido');

        const data = await response.json();
        if (!data.trial_info.is_active) {
          router.push('/trial-expired');
          setAuthStatus('unauthenticated');
        } else {
          setTrialInfo(data.trial_info);
          setAuthStatus('authenticated');
        }
      } catch (error) {
        console.error("Errore di autenticazione:", error);
        localStorage.removeItem('taxpilot_token');
        router.push('/login');
        setAuthStatus('unauthenticated');
      }
    };

    verifyAuth();
  }, [pathname, router]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('taxpilot_theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const logout = () => {
    localStorage.removeItem('taxpilot_token');
    localStorage.removeItem('taxpilot_theme');
    router.push('/login');
  };

  // --- Rendering Logico ---

  if (authStatus === 'checking') {
    return <LoadingScreen />;
  }

  const isPublicPage = ['/', '/login', '/register', '/trial-expired'].includes(pathname);
  if (isPublicPage) {
    return (
      <html lang="it">
        <body className="bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
          {children}
        </body>
      </html>
    );
  }

  if (authStatus !== 'authenticated') {
      return <LoadingScreen />;
  }

  /* ── layout con sidebar per utenti autenticati ── */
  return (
    <html lang="it">
      <body className="flex h-screen bg-gray-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
        <aside className="w-64 shrink-0 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col">
          {/* Logo + toggle tema */}
          <div className="flex items-center justify-between h-24 px-4">
            <div className="flex items-center gap-3 select-none">
              <div className="h-11 w-11 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-xl animate-[spin_10s_linear_infinite] flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="leading-tight">
                <span className="block text-lg font-extrabold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight">
                  <span>TaxPilot</span>
                </span>
                <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Assistant&nbsp;<span className="text-amber-500">PRO</span>
                </span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition"
              title="Tema chiaro/scuro"
            >
              {theme === 'light' ? '🌞' : '🌜'}
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <Link href="/dashboard" className={clsx('block rounded-lg px-4 py-3 text-base font-medium transition-colors', pathname.startsWith('/dashboard') ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700')}>
              🏠 Dashboard
            </Link>
            <Link href="/documents" className={clsx('block rounded-lg px-4 py-3 text-base font-medium transition-colors', pathname.startsWith('/documents') ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700')}>
              📁 Documenti
            </Link>
            <Link href="/clients" className={clsx('block rounded-lg px-4 py-3 text-base font-medium transition-colors', pathname.startsWith('/clients') ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700')}>
              👥 Clienti
            </Link>
            <Link href="/contabilita" className={clsx('block rounded-lg px-4 py-3 text-base font-medium transition-colors', pathname.startsWith('/contabilita') ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700')}>
              📋 Contabilità
            </Link>
            <Link href="/analytics" className={clsx('block rounded-lg px-4 py-3 text-base font-medium transition-colors', pathname.startsWith('/analytics') ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700')}>
              📊 Statistiche
            </Link>
            <Link href="/billing" className={clsx('block rounded-lg px-4 py-3 text-base font-medium transition-colors', pathname.startsWith('/billing') ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700')}>
              💳 Fatturazione
            </Link>
            <Link href="/settings" className={clsx('block rounded-lg px-4 py-3 text-base font-medium transition-colors', pathname.startsWith('/settings') ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700')}>
              ⚙️ Impostazioni
            </Link>
          </nav>

          <div className="px-4 py-4 border-t border-gray-200 dark:border-slate-700 relative">
            <button
              onClick={() => setOpen(!open)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600"
            >
              <span>Studio Demo</span>
              <svg
                className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {open && (
              <div className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg">
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <TrialBanner trialInfo={trialInfo} />
          {children}
        </main>
      </body>
    </html>
  );
}
