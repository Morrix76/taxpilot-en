'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function DocumentDetail() {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [accountingData, setAccountingData] = useState(null);
  const [accountingLoading, setAccountingLoading] = useState(false);
  const [showAccountingModal, setShowAccountingModal] = useState(false);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const token = localStorage.getItem('ai_tax_token');
    if (!token) {
        router.push('/login');
        return;
    }
    if (params.id) {
      fetchDocument(params.id, token);
    }
  }, [params.id, router]);

  const fetchDocument = async (id, token) => {
    try {
      const response = await fetch(`http://localhost:3003/api/documents/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDocument(data);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.location.href = `http://localhost:3003/api/documents/download/${document.id}`;
  };

  const handleGenerateAccounting = async () => {
    setAccountingLoading(true);
    setAccountingData(null);
    setShowAccountingModal(true);
    const token = localStorage.getItem('ai_tax_token');

    try {
      const response = await fetch(`http://localhost:3003/api/documents/${document.id}/generate-entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setAccountingData(result);
      } else {
        setAccountingData({ 
          error: true, 
          message: result.error || 'Unknown error',
          details: result.details 
        });
      }
    } catch (error) {
      setAccountingData({ 
        error: true, 
        message: 'Connection error',
        details: error.message
      });
    } finally {
      setAccountingLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!accountingData || !accountingData.accounting?.entries_csv) {
      alert("No CSV data to download.");
      return;
    }
    const blob = new Blob([`\ufeff${accountingData.accounting.entries_csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `entries_${document.original_filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading document...</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Document not found</div>
      </div>
    );
  }

  const hasErrors = document.ai_status === 'error' || document.flag_manual_review;
  const isInvoiceXML = document.original_filename?.toLowerCase().endsWith('.xml');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Document Details</h1>
            <button 
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Document Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {document.original_filename}
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase">Type</p>
                  <p className="text-lg text-gray-800">{document.type}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase">Upload Date</p>
                  <p className="text-lg text-gray-800">{new Date(document.created_at).toLocaleDateString('en-US')}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase">Size</p>
                  <p className="text-lg text-gray-800">{(document.file_size / 1024).toFixed(1)} KB</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase">Document ID</p>
                  <p className="text-lg text-gray-800">#{document.id}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-flex px-6 py-3 text-lg font-bold rounded-xl ${
                hasErrors
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {hasErrors ? 'Errors Detected' : 'Compliant'}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Confidence: {Math.round((document.ai_confidence || 0) * 100)}%
              </p>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">AI Analysis</h3>
          
          <div className={`p-6 rounded-xl border-2 mb-6 ${
            hasErrors 
              ? 'bg-red-50 border-red-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <p className={`text-lg font-medium ${
              hasErrors ? 'text-red-800' : 'text-green-800'
            }`}>
              {document.ai_analysis || 'Analysis completed'}
            </p>
          </div>

          {/* Timeline */}
          <div className="border-t pt-6">
            <h4 className="text-lg font-bold text-gray-900 mb-4">Timeline</h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <div>
                  <p className="font-bold text-gray-900">Document Uploaded</p>
                  <p className="text-sm text-gray-500">{new Date(document.created_at).toLocaleString('en-US')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                <div>
                  <p className="font-bold text-gray-900">AI Analysis Completed</p>
                  <p className="text-sm text-gray-500">Status: {document.ai_status}</p>
                </div>
              </div>
              {document.updated_at && document.updated_at !== document.created_at && (
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <div>
                    <p className="font-bold text-gray-900">Last Modified</p>
                    <p className="text-sm text-gray-500">{new Date(document.updated_at).toLocaleString('en-US')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">AI Suggestions</h3>
          
          {hasErrors ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-blue-800 mb-2">Manual Check</h4>
                <p className="text-blue-700">Manually verify supplier, customer data and VAT calculations before proceeding.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-bold text-green-800 mb-2">Compliant Document</h4>
                <p className="text-green-700">The document meets all tax checks and can be transmitted to the Exchange System.</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-blue-800 mb-2">Storage</h4>
                <p className="text-blue-700">Remember to store the document for 10 years as required by tax regulations.</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Available Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <button onClick={handleDownload} className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center space-x-2">
              <span>Download</span>
            </button>
            <button onClick={() => setShowContent(!showContent)} className="bg-purple-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-purple-700 flex items-center justify-center space-x-2">
              <span>{showContent ? 'Hide' : 'View'}</span>
            </button>
            {isInvoiceXML && (
              <button onClick={handleGenerateAccounting} className="bg-orange-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-orange-700 flex items-center justify-center space-x-2">
                <span>Entries</span>
              </button>
            )}
            <a href={`http://localhost:3003/api/documents/${document.id}/report?format=txt`} className="bg-green-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center space-x-2 text-center">
              <span>Report</span>
            </a>
            <button onClick={() => router.push('/dashboard')} className="bg-gray-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-gray-700 flex items-center justify-center space-x-2">
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {/* File Viewer */}
        {showContent && (
          <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">File Viewer</h3>
            <div className="border rounded-lg p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  {document.original_filename} • {document.file_path?.replace(/\\/g, '/')}
                </p>
              </div>
              
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-4">
                  {document.original_filename?.toLowerCase().endsWith('.pdf') ? '📄' : '📋'}
                </div>
                <p className="text-gray-600 mb-4">Direct view not available</p>
                <p className="text-sm text-gray-500 mb-4">
                  File saved in: uploads/{document.file_path?.replace(/\\/g, '/')}
                </p>
                <button 
                  onClick={handleDownload}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold"
                >
                  Download to view
                </button>
              </div>
            </div>
          </div>
        )}

        {/* JSON Content View */}
        {showContent && (
          <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Analysis Content</h3>
            <div className="bg-gray-800 text-white rounded-lg p-6 max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(document.analysis_result, null, 2) || 'Content not available for viewing'}
              </pre>
            </div>
          </div>
        )}

        {/* Accounting Entries Modal */}
        {showAccountingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-2xl font-bold text-gray-800">Generated Accounting Entries</h3>
                <button onClick={() => setShowAccountingModal(false)} className="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
              </div>

              <div className="p-8 overflow-y-auto">
                {accountingLoading ? (
                  <div className="text-center py-12">
                    <p className="text-lg font-semibold text-gray-700">Generating...</p>
                    <p className="text-gray-500 mt-2">AI is preparing the accounting entries.</p>
                  </div>
                ) : accountingData?.error ? (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-r-lg">
                    <h4 className="font-bold text-lg">Error</h4>
                    <p className="mt-2">{accountingData.message}</p>
                    {accountingData.details && <pre className="mt-4 text-sm bg-red-100 p-3 rounded-md overflow-x-auto">{JSON.stringify(accountingData.details, null, 2)}</pre>}
                  </div>
                ) : accountingData ? (
                  <div>
                    <div className="bg-green-50 border-l-4 border-green-500 text-green-800 p-4 rounded-r-lg mb-6">
                      <p className="font-bold">{accountingData.message}</p>
                    </div>
                    
                    <div className="mb-6">
                      <button onClick={handleDownloadCSV} className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors">
                        Download CSV
                      </button>
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {accountingData.accounting?.entries_json?.map((entry, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{entry.date}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.account_code}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{entry.description}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-mono">{entry.debit.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-mono">{entry.credit.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
              
              <div className="p-4 bg-gray-50 border-t text-right">
                  <button onClick={() => setShowAccountingModal(false)} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">
                    Close
                  </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}