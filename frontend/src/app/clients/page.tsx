// app/clients/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';

export default function Clients() {
  /* ────────────────────────────────────────────── */
  /*  Local state                                 */
  /* ────────────────────────────────────────────── */
  const [user, setUser] = useState<null | { name: string; email: string }>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const router = useRouter();

  /* ────────────────────────────────────────────── */
  /*  Mock auth check                              */
  /* ────────────────────────────────────────────── */
  useEffect(() => {
    const token = localStorage.getItem('taxpilot_token');
    if (token) {
      setUser({ name: 'User', email: 'user@example.com' });
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  /* ────────────────────────────────────────────── */
  /*  Mock data                                    */
  /* ────────────────────────────────────────────── */
  const clients = [
    {
      id: 1,
      name: 'Mario Rossi',
      email: 'mario.rossi@email.com',
      phone: '+39 339 123 4567',
      company: 'Rossi SRL',
      address: 'Via Roma 123, Milano',
      documents: 12,
      lastActivity: '2024-01-15',
      status: 'Attivo',
      avatar: 'MR',
    },
    {
      id: 2,
      name: 'Giulia Bianchi',
      email: 'giulia.bianchi@email.com',
      phone: '+39 347 987 6543',
      company: 'Freelance',
      address: 'Via Venezia 45, Roma',
      documents: 8,
      lastActivity: '2024-01-14',
      status: 'Attivo',
      avatar: 'GB',
    },
    {
      id: 3,
      name: 'Studio ABC',
      email: 'info@studioabc.it',
      phone: '+39 02 1234 5678',
      company: 'Studio ABC SNC',
      address: 'Corso Buenos Aires 78, Milano',
      documents: 25,
      lastActivity: '2024-01-13',
      status: 'Attivo',
      avatar: 'SA',
    },
    {
      id: 4,
      name: 'Marco Verdi',
      email: 'marco.verdi@email.com',
      phone: '+39 335 456 7890',
      company: 'Verdi Consulting',
      address: 'Via Garibaldi 12, Torino',
      documents: 5,
      lastActivity: '2024-01-10',
      status: 'Inattivo',
      avatar: 'MV',
    },
    {
      id: 5,
      name: 'Anna Neri',
      email: 'anna.neri@email.com',
      phone: '+39 348 234 5678',
      company: 'Neri & Partners',
      address: 'Via Dante 67, Napoli',
      documents: 18,
      lastActivity: '2024-01-12',
      status: 'Attivo',
      avatar: 'AN',
    },
  ];

  /* ────────────────────────────────────────────── */
  /*  Derived data                                 */
  /* ────────────────────────────────────────────── */
  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === 'Attivo').length;
  const totalDocuments = clients.reduce((sum, c) => sum + c.documents, 0);

  /* ────────────────────────────────────────────── */
  /*  UI                                           */
  /* ────────────────────────────────────────────── */
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Clienti
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestisci i tuoi clienti e le loro informazioni
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50">
            <Filter className="w-4 h-4" />
            Filtri
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            Nuovo Cliente
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: 'Totale Clienti',
            value: totalClients,
            iconBg: 'from-indigo-500 via-purple-500 to-pink-500',
          },
          {
            label: 'Clienti Attivi',
            value: activeClients,
            iconBg: 'from-green-500 to-emerald-500',
          },
          {
            label: 'Documenti Totali',
            value: totalDocuments,
            iconBg: 'from-indigo-500 via-purple-500 to-pink-500',
          },
        ].map(({ label, value, iconBg }, i) => (
          <div
            key={label}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {label}
                </p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {value}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-lg bg-gradient-to-br ${iconBg} flex items-center justify-center`}
              >
                {i === 2 ? (
                  <FileText className="w-6 h-6 text-white" />
                ) : (
                  <Users className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cerca clienti per nome, email o azienda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Client cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Top */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">{client.avatar}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    {client.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {client.company}
                  </p>
                </div>
              </div>
              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <MoreHorizontal className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Info */}
            <div className="space-y-3 mb-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2" /> {client.email}
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2" /> {client.phone}
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" /> {client.address}
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between mb-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-1" /> {client.documents} documenti
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" /> {client.lastActivity}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  client.status === 'Attivo'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-700/30 dark:text-slate-300'
                }`}
              >
                {client.status}
              </span>
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-lg transition">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                Nuovo Cliente
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {['Nome', 'Email', 'Telefono', 'Azienda'].map((label) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {label}
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder={label}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Indirizzo
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Indirizzo completo"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Annulla
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition"
              >
                Salva Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredClients.length === 0 && searchTerm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
            Nessun cliente trovato
          </h3>
          <p className="text-slate-500 dark:text-slate-400">Prova a modificare i termini di ricerca</p>
        </div>
      )}
    </
