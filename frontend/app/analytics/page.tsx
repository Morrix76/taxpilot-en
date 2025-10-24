'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = 'http://localhost:3003';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('mese');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    documentsProcessed: 0,
    accuracy: 0,
    monthlyRevenue: 0,
    timeSaved: 0
  });
  const [topClienti, setTopClienti] = useState([]);
  const [attivita, setAttivita] = useState([]);
  const [trend, setTrend] = useState([]);
  const [report, setReport] = useState(null);
  const router = useRouter();

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('taxpilot_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch overview stats
      const overviewRes = await fetch(`${API_BASE_URL}/api/analytics/overview?periodo=${period}`, { headers });
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        if (overviewData.success) {
          setStats(overviewData.stats);
        }
      }

      // Fetch top clients
      const clientiRes = await fetch(`${API_BASE_URL}/api/analytics/clienti-top?limite=5`, { headers });
      if (clientiRes.ok) {
        const clientiData = await clientiRes.json();
        if (clientiData.success) {
          setTopClienti(clientiData.clienti);
        }
      }

      // Fetch recent activity
      const attivitaRes = await fetch(`${API_BASE_URL}/api/analytics/attivita?limite=10`, { headers });
      if (attivitaRes.ok) {
        const attivitaData = await attivitaRes.json();
        if (attivitaData.success) {
          setAttivita(attivitaData.attivita);
        }
      }

      // Fetch trend data
      const trendRes = await fetch(`${API_BASE_URL}/api/analytics/trend?periodo=${period}&tipo=documenti`, { headers });
      if (trendRes.ok) {
        const trendData = await trendRes.json();
        if (trendData.success) {
          setTrend(trendData.trend);
        }
      }

      // Fetch complete report
      const reportRes = await fetch(`${API_BASE_URL}/api/analytics/report?periodo=${period}`, { headers });
      if (reportRes.ok) {
        const reportData = await reportRes.json();
        if (reportData.success) {
          setReport(reportData.report);
        }
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  useEffect(() => {
    const token = localStorage.getItem('taxpilot_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAnalytics();
  }, [router]);

  const formatPeriod = (p) => {
    const map = {
      'settimana': 'Week',
      'mese': 'Month', 
      'trimestre': 'Quarter',
      'anno': 'Year'
    };
    return map[p] || p;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('en-US');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 dark:from-slate-200 dark:to-indigo-400 bg-clip-text text-transparent">
              📊 Analytics & Statistics
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-3 text-lg">Detailed performance analysis</p>
          </div>
          
          {/* Period Filters */}
          <div className="flex gap-2">
            {['settimana', 'mese', 'trimestre', 'anno'].map((periodOption) => (
              <button
                key={periodOption}
                onClick={() => setPeriod(periodOption)}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                  period === periodOption
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {formatPeriod(periodOption)}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wide">Documents Processed</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.documentsProcessed.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">Period: {formatPeriod(period)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 rounded-2xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wide">AI Accuracy</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.accuracy}%</p>
                <p className="text-xs text-slate-400 mt-1">Average processed documents</p>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-green-600 p-4 rounded-2xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wide">Estimated Revenue</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">€ {stats.monthlyRevenue.toFixed(1)}</p>
                <p className="text-xs text-slate-400 mt-1">€0.50 per document</p>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-4 rounded-2xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wide">Time Saved</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{stats.timeSaved}min</p>
                <p className="text-xs text-slate-400 mt-1">5 min per document</p>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-4 rounded-2xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Document Trend */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">📈 Document Trend</h3>
              <span className="text-sm text-slate-500">{trend.length} data points</span>
            </div>
            <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl flex items-end justify-center space-x-2 p-4">
              {trend.length > 0 ? (
                trend.slice(-7).map((item, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div 
                      className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg w-8 transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
                      style={{ height: `${Math.max(10, (item.valore / Math.max(...trend.map(t => t.valore))) * 80)}%` }}
                    ></div>
                    <span className="text-xs text-slate-500 mt-2">
                      {new Date(item.data).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-center">No data available</div>
              )}
            </div>
          </div>

          {/* AI Performance */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">🧠 AI Performance</h3>
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">Accuracy</div>
                <div className="text-5xl font-bold text-slate-800 dark:text-white mb-2">{stats.accuracy}%</div>
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {stats.accuracy >= 95 ? 'Excellent' : stats.accuracy >= 90 ? 'Good' : 'Needs improvement'}
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-green-800 dark:text-green-200">Documents Processed</span>
                  <span className="text-sm font-bold text-green-800 dark:text-green-200">{stats.documentsProcessed}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-green-800 dark:text-green-200">Average Time</span>
                  <span className="text-sm font-bold text-green-800 dark:text-green-200">~5min/doc</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-800 dark:text-green-200">AI Status</span>
                  <span className="text-sm font-bold text-green-800 dark:text-green-200">🤖 Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document Types */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">📊 Document Types</h3>
            <div className="space-y-4">
              {report?.distribuzionePerTipo?.length > 0 ? (
                report.distribuzionePerTipo.map((tipo, index) => {
                  const colors = ['blue', 'green', 'purple', 'orange', 'red'];
                  const color = colors[index % colors.length];
                  const percentage = ((tipo.count / report.overview.totaleDocumenti) * 100).toFixed(1);
                  
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 bg-${color}-500 rounded-full`}></div>
                          <span className="text-sm text-slate-600 dark:text-slate-400">{tipo.tipo_documento || 'Unspecified'}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                        <div className={`bg-${color}-500 h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 text-center">No data available</div>
              )}
            </div>
          </div>

          {/* Report Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">📋 Summary</h3>
            <div className="space-y-4">
              {report ? (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{report.overview.totaleDocumenti}</div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">Total Documents</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{report.overview.clientiAttivi}</div>
                    <div className="text-sm text-green-800 dark:text-green-200">Active Clients</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{report.overview.accuracyMedia}%</div>
                    <div className="text-sm text-purple-800 dark:text-purple-200">Average Accuracy</div>
                  </div>
                </>
              ) : (
                <div className="text-slate-500 text-center">Loading report...</div>
              )}
            </div>
          </div>

          {/* Top Clients */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">⭐ Top Clients</h3>
            <div className="space-y-4">
              {topClienti.length > 0 ? (
                topClienti.map((cliente, index) => (
                  <div key={cliente.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 dark:text-white">{cliente.cliente}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{cliente.documenti} documents</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-white">{cliente.accuracy}%</div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-center">No clients</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700 mt-8">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">📅 Recent Activity Timeline</h3>
          <div className="space-y-4">
            {attivita.length > 0 ? (
              attivita.map((item, index) => (
                <div key={item.id} className={`flex items-center space-x-4 p-4 rounded-lg ${
                  item.status === 'completed' ? 'bg-green-50 dark:bg-green-900/30' :
                  item.status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/30' :
                  'bg-yellow-50 dark:bg-yellow-900/30'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    item.status === 'completed' ? 'bg-green-500' :
                    item.status === 'processing' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}></div>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${
                      item.status === 'completed' ? 'text-green-800 dark:text-green-200' :
                      item.status === 'processing' ? 'text-blue-800 dark:text-blue-200' :
                      'text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {item.status === 'completed' ? 'Processing completed' :
                       item.status === 'processing' ? 'Processing in progress' :
                       'Document pending'}
                    </div>
                    <div className={`text-xs ${
                      item.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                      item.status === 'processing' ? 'text-blue-600 dark:text-blue-400' :
                      'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {item.documento} - {item.cliente} 
                      {item.confidence && ` (${item.confidence}% accuracy)`}
                    </div>
                  </div>
                  <div className={`text-xs ${
                    item.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                    item.status === 'processing' ? 'text-blue-600 dark:text-blue-400' :
                    'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {formatTimestamp(item.timestamp)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-center p-8">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
