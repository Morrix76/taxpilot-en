'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import clsx from 'clsx';

// --- Support Components ---

const TrialBanner = ({ pianoInfo }) => {
  if (!pianoInfo || !pianoInfo.active) return null;

  return (
    <div className="mb-8 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-center text-sm text-white shadow-lg">
      <span className="font-bold">✨ {pianoInfo.piano_nome} Active</span>
      <span className="mx-2 opacity-70">•</span>
      <span>{pianoInfo.days_remaining} days remaining</span>
      <span className="mx-2 opacity-70">•</span>
      <span>{pianoInfo.documenti_utilizzati}/{pianoInfo.documenti_limite} documents used</span>
    </div>
  );
};

const LoadingScreen = () => (
    <html lang="en">
        <body className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
            <div className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 animate-spin rounded-full border-b-2 border-indigo-500"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading...</p>
            </div>
        </body>
    </html>
);

/* ───── sidebar links ───── */
const links = [
  { name: '🏠 Dashboard',    href: '/dashboard'  },
  { name: '📁 Documents',    href: '/documents'  },
  { name: '👥 Clients',      href: '/clients'    },
  { name: '📋 Accounting',   href: '/contabilita' },
  { name: '📊 Analytics',    href: '/analytics'  },
  { name: '💳 Billing',      href: '/billing'    },
  { name: '⚙️ Settings',     href: '/settings'   },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname            = usePathname();
  const router              = useRouter();
  const [theme, setTheme]   = useState<'light' | 'dark'>('light');
  const [open, setOpen]     = useState(false);
  
  // State for plan and authentication
  const [pianoInfo, setPianoInfo] = useState(null);
  const [authStatus, setAuthStatus] = useState('checking');

  /* ── theme (localStorage) ── */
  useEffect(() => {
    const saved = (localStorage.getItem('taxpilot_theme') as 'light' | 'dark') ?? 'light';
    setTheme(saved);
    document.documentElement.classList.toggle('dark', saved === 'dark');
  }, []);

  /* ── Authentication Check ── */
  useEffect(() => {
    const publicPages = ['/', '/login', '/register', '/trial-expired', '/privacy'];
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
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Invalid token');

        const data = await response.json();
        console.log('🔍 Plan data received:', data.piano);
        
        if (!data.piano?.active || data.piano?.scaduto) {
          router.push('/trial-expired');
          setAuthStatus('unauthenticated');
        } else {
          setPianoInfo(data.piano);
          setAuthStatus('authenticated');
        }
      } catch (error) {
        console.error("Authentication error:", error);
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

  // --- Rendering Logic ---

  if (authStatus === 'checking') {
    return <LoadingScreen />;
  }

  const isPublicPage = ['/', '/login', '/register', '/trial-expired', '/privacy'].includes(pathname);
  if (isPublicPage) {
    return (
      <html lang="en">
        <body className="bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
          {children}
        </body>
      </html>
    );
  }

  if (authStatus !== 'authenticated') {
      return <LoadingScreen />;
  }

  /* ── layout with sidebar for authenticated users ── */
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
        <aside className="w-64 shrink-0 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col">
          {/* Logo + theme toggle */}
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
                  TaxPilot
                </span>
                <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Assistant&nbsp;<span className="text-amber-500">PRO</span>
                </span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition"
              title="Light/Dark theme"
            >
              {theme === 'light' ? '🌞' : '🌜'}
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {links.map(link => (
              <Link
                key={link.href}
                prefetch
                href={link.href}
                className={clsx(
                  'block rounded-lg px-4 py-3 text-base font-medium transition-colors',
                  pathname.startsWith(link.href)
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-gray-200 dark:border-slate-700 relative">
            <button
              onClick={() => setOpen(!open)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600"
            >
              <span>Demo Studio</span>
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
          <TrialBanner pianoInfo={pianoInfo} />
          {children}
        </main>
      </body>
    </html>
  );
}
