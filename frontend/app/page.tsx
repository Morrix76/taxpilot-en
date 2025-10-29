'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('taxpilot_token');
    
    if (token) {
      // Se è autenticato, va alla dashboard
      router.replace('/dashboard');
    } else {
      // Se non è autenticato, va al login
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-4xl mb-4">🔄</div>
        <p className="text-gray-600">Controllo autenticazione...</p>
      </div>
    </div>
  );
}
