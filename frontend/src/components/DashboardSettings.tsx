import React, { useState } from 'react';
import { IconDashboard, IconFileText, IconUsers, IconSettings } from 'lucide-react';
import DashboardSettings from '../components/DashboardSettings'; // IMPORT DEL COMPONENTE SETTINGS

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 p-6 bg-gray-100 border-r">
        <nav className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-2 p-2 rounded hover:bg-gray-200"> 
            <IconDashboard /> Dashboard 
          </button>
          <button onClick={() => setActiveTab('documents')} className="flex items-center gap-2 p-2 rounded hover:bg-gray-200"> 
            <IconFileText /> Documenti 
          </button>
          <button onClick={() => setActiveTab('clients')} className="flex items-center gap-2 p-2 rounded hover:bg-gray-200"> 
            <IconUsers /> Clienti 
          </button>
          <button onClick={() => setActiveTab('settings')} className="flex items-center gap-2 p-2 rounded hover:bg-gray-200"> 
            <IconSettings /> Impostazioni 
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-8 bg-white">
        {activeTab === 'dashboard' && (<div>Qui il contenuto dashboard</div>)}
        {activeTab === 'documents' && (<div>Qui i documenti</div>)}
        {activeTab === 'clients' && (<div>Qui i clienti</div>)}
        {activeTab === 'settings' && (<DashboardSettings />)}
      </main>
    </div>
  );
}
