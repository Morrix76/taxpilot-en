'use client';

import { useRouter } from 'next/navigation';

export default function TrialExpiredPage() {
  const router = useRouter();

  const handleLogout = () => {
    // Pulisce il token dal localStorage e reindirizza al login
    localStorage.removeItem('taxpilot_token');
    router.push('/login');
  };

  const handleContactSales = () => {
    // Mostra un alert con le informazioni di contatto
    alert('Contact our sales team at: iltuobrand@outlook.it');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-blue-100 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow-2xl">
        
        {/* Icona */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Messaggio Principale */}
        <h1 className="mb-3 text-3xl font-bold text-slate-800">
          Your trial period has expired
        </h1>
        <p className="mb-6 text-gray-500">
          You have used 15/15 available documents during your 15-day trial.
        </p>

        {/* Benefici */}
        <div className="my-8 rounded-lg border border-gray-200 bg-gray-50 p-6 text-left">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">Upgrade to the full version to unlock:</h2>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-center">
              <svg className="mr-3 h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Unlimited document analysis
            </li>
            <li className="flex items-center">
              <svg className="mr-3 h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Advanced client management and billing
            </li>
            <li className="flex items-center">
              <svg className="mr-3 h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Priority support and dedicated consulting
            </li>
          </ul>
        </div>

        {/* Azioni */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            onClick={handleContactSales}
            className="w-full flex-1 justify-center rounded-lg border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Contact Sales
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex-1 justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
