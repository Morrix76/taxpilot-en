'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Loader2, AlertCircle, FileText, ServerCrash } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '${process.env.NEXT_PUBLIC_API_URL}/api';

// Funzione helper per formattare i bytes
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// ==========================================================================
// COMPONENTE PRINCIPALE - ANALYTICS
// ==========================================================================
export default function Analytics() {
  const [timeRange, setTimeRange] = useState('6months');
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [docsResponse, statsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/documents`),
          fetch(`${API_BASE_URL}/documents/stats/overview`)
        ]);

        if (!docsResponse.ok || !statsResponse.ok) {
          throw new Error('Errore nel recupero dei dati dal server.');
        }

        const docsData = await docsResponse.json();
        const statsData = await statsResponse.json();
        
        setDocuments(Array.isArray(docsData) ? docsData : []);
        setStats(statsData.stats || {});

      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calcolo delle metriche reali
  const realMetrics = useMemo(() => {
    if (!documents || documents.length === 0 || !stats) {
      return {
        totalDocs: 0,
        accuracy: 0,
        totalStorage: 0,
        timeSavedHours: 0,
        growthPercentage: 0,
        errorsDetected: 0,
      };
    }

    const totalDocs = stats.totali?.documenti || 0;
    
    const totalConfidence = documents.reduce((acc, doc) => acc + (doc.ai_confidence || 0), 0);
    const accuracy = totalDocs > 0 ? (totalConfidence / totalDocs) * 100 : 0;
    
    const totalStorage = stats.totali?.dimensione_totale || 0;
    
    const timeSavedHours = (totalDocs * 5) / 60; // 5 minuti a documento

    const thisMonthDocs = stats.temporali?.questo_mese || 0;
    const lastMonthDocs = stats.temporali?.mese_precedente || 0; // Assumendo che il backend lo fornisca
    const growthPercentage = lastMonthDocs > 0 ? ((thisMonthDocs - lastMonthDocs) / lastMonthDocs) * 100 : thisMonthDocs > 0 ? 100 : 0;
    
    const errorsDetected = stats.per_status?.con_errori || 0;

    return { totalDocs, accuracy, totalStorage, timeSavedHours, growthPercentage, errorsDetected };
  }, [documents, stats]);


  // Preparazione dati per i grafici
  const chartData = useMemo(() => {
    if (!documents || documents.length === 0) return { byMonth: [], byType: [], bySize: [] };

    // Documenti per Mese (ultimi 6 mesi)
    const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
    const monthlyData = Array(6).fill(null).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return { 
        name: monthNames[d.getMonth()],
        documenti: 0,
        errori: 0
      };
    }).reverse();
    
    documents.forEach(doc => {
      const docDate = new Date(doc.created_at);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      if (docDate >= sixMonthsAgo) {
        const monthName = monthNames[docDate.getMonth()];
        const monthEntry = monthlyData.find(m => m.name === monthName);
        if (monthEntry) {
          monthEntry.documenti++;
          if (doc.ai_status === 'error') {
            monthEntry.errori++;
          }
        }
      }
    });

    // Tipologie Documenti
    const typeCounts = stats?.per_tipo || {};
    const total = realMetrics.totalDocs;
    const documentTypes = Object.entries(typeCounts).map(([name, value], index) => {
        const colors = [
            'from-blue-400 to-blue-600',
            'from-green-400 to-green-600',
            'from-purple-400 to-purple-600',
            'from-orange-400 to-orange-600'
        ];
        return {
            name,
            value: total > 0 ? parseFloat(((value / total) * 100).toFixed(1)) : 0,
            count: value,
            color: colors[index % colors.length]
        };
    });

    // Analisi Storage
    const sizeBuckets = { '<10KB': 0, '10-50KB': 0, '50-200KB': 0, '>200KB': 0 };
    documents.forEach(doc => {
        const sizeKB = (doc.file_size || 0) / 1024;
        if (sizeKB < 10) sizeBuckets['<10KB']++;
        else if (sizeKB <= 50) sizeBuckets['10-50KB']++;
        else if (sizeKB <= 200) sizeBuckets['50-200KB']++;
        else sizeBuckets['>200KB']++;
    });
    const storageDistribution = Object.entries(sizeBuckets).map(([name, value]) => ({ name, documenti: value }));

    return { byMonth: monthlyData, byType: documentTypes, bySize: storageDistribution };
  }, [documents, stats, realMetrics.totalDocs]);
  
  // Gestione UI stati
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <ServerCrash className="h-16 w-16 text-red-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-800">Errore di Connessione</h2>
        <p className="mt-2 text-slate-600">{error}</p>
      </div>
    );
  }
  
  if (documents.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen text-center">
            <FileText className="h-16 w-16 text-slate-400" />
            <h2 className="mt-4 text-xl font-bold text-slate-800">Nessun Dato da Analizzare</h2>
            <p className="mt-2 text-slate-600">Non ci sono ancora documenti nel database per generare le statistiche.</p>
          </div>
      );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 bg-clip-text text-transparent">
                📊 Analytics & Statistiche Reali
              </h1>
              <p className="text-slate-600 mt-2 text-lg">Analisi dettagliate delle performance del sistema</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-slate-600 font-medium">Periodo:</span>
              <button
                onClick={() => setTimeRange('6months')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  timeRange === '6months'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm'
                }`}
              >
                Ultimi 6 Mesi
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300">
              <p className="text-slate-500 text-sm font-medium uppercase">Documenti Elaborati</p>
              <p className="text-3xl font-bold text-slate-800">{realMetrics.totalDocs.toLocaleString('it-IT')}</p>
              <p className={`text-sm font-semibold mt-1 ${realMetrics.growthPercentage >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {realMetrics.growthPercentage >= 0 ? '↗️' : '↘️'} {realMetrics.growthPercentage.toFixed(1)}% vs mese scorso
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300">
              <p className="text-slate-500 text-sm font-medium uppercase">Accuratezza Media AI</p>
              <p className="text-3xl font-bold text-slate-800">{realMetrics.accuracy.toFixed(1)}%</p>
              <p className="text-emerald-500 text-sm font-semibold mt-1">🎯 Alta confidenza</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300">
              <p className="text-slate-500 text-sm font-medium uppercase">Storage Utilizzato</p>
              <p className="text-3xl font-bold text-slate-800">{formatBytes(realMetrics.totalStorage)}</p>
              <p className="text-purple-500 text-sm font-semibold mt-1">💾 Dati totali</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300">
              <p className="text-slate-500 text-sm font-medium uppercase">Tempo Risparmiato</p>
              <p className="text-3xl font-bold text-slate-800">{realMetrics.timeSavedHours.toFixed(0)}h</p>
              <p className="text-orange-500 text-sm font-semibold mt-1">⚡ Basato su 5min/doc</p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6">📈 Documenti Elaborati per Mese</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.byMonth}>
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}/>
                <Legend />
                <Bar dataKey="documenti" fill="#4f46e5" name="Documenti" radius={[4, 4, 0, 0]}/>
                <Bar dataKey="errori" fill="#e11d48" name="Errori" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6">💾 Analisi Storage per Dimensione</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.bySize} layout="vertical">
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" width={80} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}/>
                    <Legend />
                    <Bar dataKey="documenti" fill="#8b5cf6" name="Numero di Documenti" radius={[0, 4, 4, 0]}/>
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6">🥧 Tipologie Documenti</h3>
            <div className="space-y-4">
              {chartData.byType.map((type, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${type.color}`}></div>
                    <span className="text-sm font-medium text-slate-700">{type.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-600 w-16 text-right">{type.count} doc</span>
                    <span className="text-sm font-bold text-slate-800 w-12 text-right">{type.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6">🤖 Performance AI</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-700">Accuratezza Media</span>
                  <span className="text-sm font-bold text-emerald-600">{realMetrics.accuracy.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3"><div className="h-3 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: `${realMetrics.accuracy}%` }}></div></div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-700">Errori Rilevati (Totali)</span>
                  <span className="text-sm font-bold text-orange-600">{realMetrics.errorsDetected}</span>
                </div>
                 <div className="w-full bg-slate-200 rounded-full h-3"><div className="h-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full" style={{ width: `${Math.min(100, (realMetrics.errorsDetected / realMetrics.totalDocs) * 100)}%` }}></div></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6">📄 Documenti Recenti</h3>
            <div className="space-y-4">
              {documents.slice(0, 5).map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        doc.ai_status === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>{doc.ai_status === 'error' ? 'Errore' : 'OK'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <h3 className="text-xl font-bold text-slate-800 mb-6">📅 Timeline Attività Recenti</h3>
          <div className="space-y-6">
            {documents.slice(0, 5).map((doc, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-3 h-3 rounded-full mt-2 bg-blue-500"></div>
                <div className="flex-grow">
                  <h4 className="text-sm font-medium text-slate-800">Documento Caricato</h4>
                  <p className="text-sm text-slate-600 mt-1">{doc.name}</p>
                  <span className="text-xs text-slate-500">{new Date(doc.created_at).toLocaleString('it-IT')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
