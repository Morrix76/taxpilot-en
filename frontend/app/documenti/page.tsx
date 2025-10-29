'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DocumentiCompleta() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('ai_tax_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDocuments(token);
  }, [router]);

  const fetchDocuments = async (token) => {
    try {
      const response = await fetch('${process.env.NEXT_PUBLIC_API_URL}/api/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        setDocuments(Array.isArray(result) ? result : []);
      } else {
         router.push('/login');
      }
    } catch (error) {
      console.error('Loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents
    .filter(doc => {
      if (filter === 'errors') return doc.ai_status !== 'ok';
      if (filter === 'ok') return doc.ai_status === 'ok';
      return true;
    })
    .filter(doc => doc.original_filename?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'name') return a.original_filename.localeCompare(b.original_filename);
      return 0;
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">📁 All Documents</h1>
            <button 
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filtri e Ricerca */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">🔍 Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by file name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">📊 Status Filter</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All documents</option>
                <option value="ok">Compliant only</option>
                <option value="errors">With errors only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">🔄 Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date (newest)</option>
                <option value="name">File name</option>
              </select>
            </div>
          </div>
        </div>
        {/* Risultati */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-lg font-bold text-gray-800">
              📋 {filteredDocuments.length} documents found
            </h3>
          </div>
          
          {filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-gray-600 mb-2">No documents found</h3>
              <p className="text-gray-500">Try changing the search filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-600 uppercase">File Name</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-600 uppercase">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mr-4">
                            <span className="text-blue-600 font-bold">📄</span>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{doc.original_filename}</div>
                            <div className="text-xs text-gray-500">ID: #{doc.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                          {doc.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(doc.created_at).toLocaleDateString('en-US')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          doc.ai_status === 'error' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {doc.ai_status === 'error' ? '❌ Errors' : '✅ Compliant'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/dettaglio/${doc.id}`)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                        >
                          👁️ View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
