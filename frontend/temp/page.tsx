'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tutti');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'attivo'
  });
  const router = useRouter();

  useEffect(() => {
    console.log('useEffect CLIENTS partito');
    fetchClients();
  }, []); // Dipendenza rimossa perché router non è più usato qui

  const fetchClients = async () => {
    try {
      // Rimosso recupero token e header Authorization
      const response = await fetch('/api/clients');
      
      if (response.ok) {
        const result = await response.json();
        setClients(Array.isArray(result) ? result : []);
      } else {
        // Rimosso redirect al login
        console.error('Errore dal server durante il caricamento dei clienti:', response.status);
      }
    } catch (error) {
      console.error('Errore di rete o caricamento clienti:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientForm.name.trim()) {
      alert('Il nome del cliente è obbligatorio');
      return;
    }

    setSaving(true);
    
    try {
      // Rimosso recupero token e header Authorization
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm)
      });

      if (response.ok) {
        await fetchClients(); // Aggiorna lista
        setShowModal(false); // Chiudi modal
        setClientForm({ // Reset form
          name: '',
          company: '',
          email: '',
          phone: '',
          status: 'attivo'
        });
        alert('Cliente creato con successo!');
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error || 'Impossibile creare il cliente'}`);
      }
    } catch (error) {
      console.error('Errore creazione cliente:', error);
      alert('Errore di connessione');
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients
    .filter(client => {
      if (filter === 'attivo') return client.status === 'attivo';
      if (filter === 'sospeso') return client.status === 'sospeso';
      if (filter === 'inattivo') return client.status === 'inattivo';
      return true;
    })
    .filter(client => 
      client.name?.toLowerCase().includes(search.toLowerCase()) ||
      client.company?.toLowerCase().includes(search.toLowerCase()) ||
      client.email?.toLowerCase().includes(search.toLowerCase())
    );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-lg">Caricamento clienti...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 bg-clip-text text-transparent">
              👥 Gestione Clienti
            </h1>
            <p className="text-slate-600 mt-3 text-lg">Anagrafica completa dei tuoi clienti</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold flex items-center space-x-3 transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>➕ Nuovo Cliente</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Totali</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{clients.length}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Attivi</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{clients.filter(c => c.status === 'attivo').length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-green-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Enterprise</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{clients.filter(c => c.plan === 'enterprise').length}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-slate-200 transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Fatturato</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">€ {clients.length * 850}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-pink-500 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca clienti..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['tutti', 'attivo', 'sospeso', 'inattivo'].map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                    filter === filterOption
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-8 py-6 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800">👥 Lista Clienti ({filteredClients.length})</h2>
          </div>

          {filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-slate-600 mb-2">Nessun cliente presente</h3>
            </div>
          ) : (
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client) => (
                  <div key={client.id} className="bg-slate-50 p-6 rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{client.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        client.status === 'attivo' ? 'bg-green-100 text-green-700' :
                        client.status === 'sospeso' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {client.status?.charAt(0)?.toUpperCase() + client.status?.slice(1)}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-slate-800 text-lg mb-1">{client.name}</h3>
                    {client.company && (
                      <p className="text-slate-600 text-sm mb-3">{client.company}</p>

                    )}
                    
                    <div className="space-y-2 text-sm">
                      {client.email && (
                        <div className="flex items-center text-slate-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {client.email}
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center text-slate-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {client.phone}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Piano: {client.plan || 'Standard'}</span>
                        <span>ID: #{client.id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuovo Cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800">➕ Nuovo Cliente</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition-all duration-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitClient} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">
                  Nome Cliente *
                </label>
                <input
                  type="text"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                  placeholder="Es. Mario Rossi"
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">
                  Azienda
                </label>
                <input
                  type="text"
                  value={clientForm.company}
                  onChange={(e) => setClientForm({...clientForm, company: e.target.value})}
                  placeholder="Es. Rossi S.r.l."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                  placeholder="mario.rossi@email.com"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                  placeholder="+39 333 1234567"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">
                  Stato
                </label>
                <select
                  value={clientForm.status}
                  onChange={(e) => setClientForm({...clientForm, status: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900"
                >
                  <option value="attivo">Attivo</option>
                  <option value="sospeso">Sospeso</option>
                  <option value="inattivo">Inattivo</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all duration-300"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {saving ? 'Salvando...' : 'Crea Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
