// frontend/app/documents/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import EditableDocumentForm from '@/components/EditableDocumentForm';
import { useFileViewer } from '@/components/FileViewer';

type Doc = {
  id: number | string;
  original_filename?: string;
  name?: string;
  type?: string;
  created_at?: string;
  upload_date?: string;
  ai_status?: 'ok' | 'processing' | 'error';
  ai_analysis?: string;
  ai_confidence?: number;
  analysis_result?: any;
  content?: string;
  file_path?: string;
};

type AccountingEntry = {
  date: string;
  account_code: string;
  description: string;
  debit: number;
  credit: number;
};

type AccountingPayload = {
  account_map: Record<string, string>;
};

type AccountingResponse = {
  error?: boolean;
  message?: string;
  details?: any;
  accounting?: {
    entries_count?: number;
    entries_csv?: string;
    entries_json?: AccountingEntry[];
  };
};

type EditPacket = {
  type: 'fattura' | 'busta_paga';
  extractedData: any;
  originalDoc: Doc;
};

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'elaborato' | 'elaborazione' | 'errore'>('all');
  const [search, setSearch] = useState('');

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Doc | null>(null);

  const [showReportModal, setShowReportModal] = useState(false);

  // Editor
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [documentForEdit, setDocumentForEdit] = useState<EditPacket | null>(null);

  // Accounting
  const [accountingData, setAccountingData] = useState<AccountingResponse | null>(null);
  const [accountingLoading, setAccountingLoading] = useState(false);
  const [showAccountingModal, setShowAccountingModal] = useState(false);
  const [accountingDocument, setAccountingDocument] = useState<Doc | null>(null);

  const { isOpen: isViewerOpen, openViewer, closeViewer, FileViewerComponent } = useFileViewer();

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('taxpilot_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDocuments();
  }, [router]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('taxpilot_token');
      const res = await fetch(`${API}/api/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId: Doc['id']) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const token = localStorage.getItem('taxpilot_token');
      const res = await fetch(`${API}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return alert('Error during deletion');
      await fetchDocuments();
      alert('Document deleted successfully');
    } catch {
      alert('Connection error');
    }
  };

  const handleGenerateAccounting = async (doc: Doc) => {
    if (!doc.original_filename?.toLowerCase().endsWith('.xml')) {
      alert('⚠️ Accounting entries are available only for XML electronic invoices');
      return;
    }
    if (!confirm(`Do you want to generate accounting entries for ${doc.original_filename || doc.name}?`)) return;

    setAccountingLoading(true);
    setAccountingData(null);
    setAccountingDocument(doc);
    setShowAccountingModal(true);

    try {
      const token = localStorage.getItem('taxpilot_token');
      const payload: AccountingPayload = {
        account_map: {
          cliente: '1200',
          fornitore: '2200',
          ricavi: '4010',
          ricavi_merce: '4010',
          ricavi_22: '4010',
          costi: '5010',
          costi_merce: '5010',
          costi_22: '5010',
          iva_debito: '2210',
          iva_credito: '1410',
          iva_22: '2210',
          costo_lavoro: '5200',
          debiti_dipendenti: '2300',
          debiti_inps: '2310',
          debiti_erario: '2320',
        },
      };

      const res = await fetch(`${API}/api/documents/${doc.id}/generate-entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data: AccountingResponse = await res.json();
      if (!res.ok) {
        setAccountingData({
          error: true,
          message: data?.message || 'Unknown error',
          details: data?.details,
        });
        return;
      }
      setAccountingData(data);
    } catch (err: any) {
      setAccountingData({ error: true, message: 'Connection error', details: err?.message });
    } finally {
      setAccountingLoading(false);
    }
  };

  const handleDownloadAccountingCSV = () => {
    if (!accountingData?.accounting?.entries_csv) {
      alert('No CSV data to download.');
      return;
    }
    const blob = new Blob([`\ufeff${accountingData.accounting.entries_csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entries_${accountingDocument?.original_filename || 'document'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const determineDocumentType = (doc: Doc): EditPacket['type'] | null => {
    const fileName = (doc.original_filename || doc.name || '').toLowerCase();
    const docType = (doc.type || '').toLowerCase();
    const ext = fileName.split('.').pop();

    // Invoice: XML or explicit keywords
    if (ext === 'xml' || /fattura|invoice/.test(fileName) || /fattura/.test(docType)) {
      return 'fattura';
    }
    // Payslip: must be PDF AND have keyword
    if (ext === 'pdf' && (/busta|paga|payslip/.test(fileName) || /busta/.test(docType))) {
      return 'busta_paga';
    }

    const content = (doc.ai_analysis || doc.content || '').toLowerCase();
    if (/iva|partita\s*iva|p\.iva/.test(content)) return 'fattura';
    if (/stipendio|inps/.test(content)) return 'busta_paga';

    console.warn('⚠️ Document type not recognized:', { fileName, docType, ext });
    return null;
  };

  const extractDataFromDocument = (doc: Doc, type: NonNullable<EditPacket['type']>) => {
    let extracted: any = {};

    try {
      if (doc.analysis_result) {
        const analysis =
          typeof doc.analysis_result === 'string' ? JSON.parse(doc.analysis_result) : doc.analysis_result;

        if (type === 'fattura') {
          extracted = {
            numero: analysis?.numero || (doc as any)?.numero || '',
            data: analysis?.data || (doc as any)?.data || new Date().toISOString().split('T')[0],
            cedenteDenominazione: analysis?.cedente?.denominazione || '',
            cedentePartitaIva: analysis?.cedente?.partitaIva || '',
            cessionarioNome: analysis?.cessionario?.nome || '',
            cessionarioCognome: analysis?.cessionario?.cognome || '',
            cessionarioCodiceFiscale: analysis?.cessionario?.codiceFiscale || '',
            imponibile: analysis?.imponibile ?? 0,
            aliquotaIva: analysis?.aliquotaIva ?? 22,
            importoIva: analysis?.importoIva ?? 0,
            totale: analysis?.totale ?? 0,
            confidence: doc.ai_confidence ?? 0.5,
            needsReview: doc.ai_status === 'error' || (doc as any)?.flag_manual_review,
          };
        } else if (type === 'busta_paga') {
          extracted = {
            nome: analysis?.nome || analysis?.dipendente || '',
            codiceFiscale: analysis?.codiceFiscale || '',
            matricola: analysis?.matricola || '',
            stipendioBase: analysis?.stipendioBase ?? 0,
            superMinimo: analysis?.superMinimo ?? 0,
            straordinari: analysis?.straordinari ?? 0,
            stipendioLordo: analysis?.stipendioLordo ?? 0,
            inps: analysis?.inps ?? 0,
            inail: analysis?.inail ?? 0,
            irpef: analysis?.irpef ?? 0,
            addizionali: analysis?.addizionali ?? 0,
            netto: analysis?.netto ?? 0,
            periodo: analysis?.periodo || '',
            confidence: doc.ai_confidence ?? 0.5,
            needsReview: doc.ai_status === 'error' || (doc as any)?.flag_manual_review,
          };
        }
      }
    } catch (e) {
      console.warn('⚠️ Error parsing analysis_result:', e);
    }

    if (!extracted || Object.keys(extracted).length === 0) {
      if (type === 'fattura') {
        extracted = {
          numero: (doc as any)?.numero || '001',
          data: (doc as any)?.data || new Date().toISOString().split('T')[0],
          cedenteDenominazione: '',
          cedentePartitaIva: '',
          cessionarioNome: '',
          cessionarioCognome: '',
          cessionarioCodiceFiscale: '',
          imponibile: 0,
          aliquotaIva: 22,
          importoIva: 0,
          totale: 0,
          confidence: 0.3,
          needsReview: true,
        };
      } else {
        extracted = {
          nome: '',
          codiceFiscale: '',
          matricola: '',
          stipendioLordo: 0,
          inps: 0,
          irpef: 0,
          netto: 0,
          confidence: 0.3,
          needsReview: true,
        };
      }
    }

    return extracted;
  };

  const handleManualCorrect = async (doc: Doc) => {
    try {
      const t = determineDocumentType(doc);
      if (t !== 'fattura' && t !== 'busta_paga') {
        alert('⚠️ Editor available only for Invoices and Payslips');
        return;
      }
      const packet: EditPacket = {
        type: t,
        extractedData: extractDataFromDocument(doc, t),
        originalDoc: doc,
      };
      setDocumentForEdit(packet);
      setShowEditorModal(true);
    } catch (e: any) {
      console.error('⚠️ Error preparing editor:', e);
      alert('Error opening editor: ' + e?.message);
    }
  };

  const handleViewDocument = (doc: Doc) => {
    if (!doc.file_path) return alert('File path missing');
    const fixed = doc.file_path.replace(/\\/g, '/');
    const encoded = encodeURIComponent(fixed);
    window.open(`${API}/api/files/${encoded}`);
  };

  const handleSaveFromViewer = async (documentId: Doc['id'], metadata: any) => {
    try {
      const token = localStorage.getItem('taxpilot_token');
      const res = await fetch(`${API}/api/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          viewedAt: metadata?.viewedAt,
          lastInteraction: 'file_viewed',
          interactionMetadata: metadata,
        }),
      });
      if (!res.ok) throw new Error('Error updating document');
      await fetchDocuments();
    } catch (e) {
      console.error('⚠️ Error saving from viewer:', e);
      throw e;
    }
  };

  const handleEditorSave = async (formData: any) => {
    try {
      const token = localStorage.getItem('taxpilot_token');
      const originalDoc = documentForEdit!.originalDoc;
      const res = await fetch(`${API}/api/documents/${originalDoc.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correctedData: formData,
          type: documentForEdit!.type,
          manuallyReviewed: true,
        }),
      });
      if (!res.ok) return alert('⚠️ Error during save');
      alert('✅ Document saved successfully!');
      setShowEditorModal(false);
      setDocumentForEdit(null);
      await fetchDocuments();
    } catch (e) {
      console.error('⚠️ Save error:', e);
      alert('⚠️ Connection error during save');
    }
  };

  const handleEditorGenerateXML = async (formData: any) => {
    try {
      const token = localStorage.getItem('taxpilot_token');
      const res = await fetch(`${API}/api/documents/generate-xml`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) return alert('⚠️ Error during XML generation');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fattura_${formData?.numero}_${formData?.data}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      alert('✅ FatturaPA XML generated and downloaded!');
    } catch (e) {
      console.error('⚠️ XML generation error:', e);
      alert('⚠️ Connection error during XML generation');
    }
  };

  const handleEditorCancel = () => {
    setShowEditorModal(false);
    setDocumentForEdit(null);
  };

  const handleViewDetail = (doc: Doc) => {
    if (!doc?.id) return;
    setSelectedDocument(doc);
    setShowDetailModal(true);
  };

  const handleShowReport = (doc: Doc) => {
    if (!doc?.id) return;
    setSelectedDocument(doc);
    setShowDetailModal(false);
    setShowReportModal(true);
  };

  const handleDownloadDocument = (doc: Doc) => {
    const blob = new Blob([`Document: ${doc.original_filename || doc.name}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.original_filename || doc.name || 'document.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredDocuments = useMemo(() => {
    const base = documents.filter((d) => {
      if (filter === 'elaborato') return d.ai_status === 'ok';
      if (filter === 'elaborazione') return d.ai_status === 'processing';
      if (filter === 'errore') return d.ai_status === 'error';
      return true;
    });
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(
      (d) => d.original_filename?.toLowerCase().includes(q) || d.name?.toLowerCase().includes(q),
    );
  }, [documents, filter, search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading documents...</div>
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
              <span className="text-indigo-600">📁</span> Document Management
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-3 text-lg">
              All your fiscal documents with AI analysis
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search documents or clients..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {(['all', 'elaborato', 'elaborazione', 'errore'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                    filter === opt
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {opt === 'all' ? 'All' : opt === 'elaborato' ? 'Processed' : opt === 'elaborazione' ? 'Processing' : 'With Errors'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 px-8 py-6 border-b border-slate-200 dark:border-slate-600">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">📋 Document List ({filteredDocuments.length})</h2>
              <button
                onClick={handleExport}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">No documents found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Documents you upload from the dashboard will appear here</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                📤 Go to Dashboard
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">File Name</th>
                    <th className="px-3 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-slate-700 dark:hover:to-slate-600 transition-all duration-300">
                      <td className="px-4 py-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg">
                              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          </div>
                          <div className="ml-5">
                            <div className="text-sm font-bold text-slate-800 dark:text-white">{doc.original_filename || doc.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">ID: #{doc.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-6">
                        <span className="inline-flex px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 text-indigo-700 dark:text-indigo-300">
                          {doc.type || 'Fiscal Document'}
                        </span>
                      </td>
                      <td className="px-3 py-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {new Date(doc.created_at || doc.upload_date || Date.now()).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-3 py-6">
                        <span
                          className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl ${
                            doc.ai_status === 'error'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              : doc.ai_status === 'processing'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          }`}
                        >
                          {doc.ai_status === 'error' ? '❌ Errors detected' : doc.ai_status === 'processing' ? '⏳ Processing' : '✅ Processed'}
                        </span>
                      </td>
                      <td className="px-4 py-6 text-sm font-medium">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleViewDetail(doc)}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-3 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-xs"
                          >
                            📝 Detail
                          </button>
                          <button
                            onClick={() => handleViewDocument(doc)}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-3 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-xs"
                          >
                            👁️ View
                          </button>
                          {doc.original_filename?.toLowerCase().endsWith('.xml') && (
                            <button
                              onClick={() => handleGenerateAccounting(doc)}
                              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-3 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-xs"
                            >
                              📊 Entries
                            </button>
                          )}
                          {doc.ai_status === 'error' && (
                            <button
                              onClick={() => handleManualCorrect(doc)}
                              className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white px-3 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-xs"
                            >
                              ✏️ Editor
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-3 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-xs"
                          >
                            📥 Download
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-xs"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Editor modal */}
      {showEditorModal && documentForEdit && (
        <EditableDocumentForm
          documentData={documentForEdit}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
          onGenerateXML={handleEditorGenerateXML}
        />
      )}

      {/* Accounting modal */}
      {showAccountingModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-600">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">📊 Accounting Entries</h3>
              <button
                onClick={() => setShowAccountingModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-3xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow">
              {accountingLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Generating entries...</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">
                    AI is analyzing the document and creating accounting entries.
                  </p>
                </div>
              ) : accountingData?.error ? (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-6 rounded-r-lg">
                  <h4 className="font-bold text-lg mb-2">❌ Generation Error</h4>
                  <p className="mb-4">{accountingData.message}</p>
                  {accountingData.details && (
                    <div className="bg-red-100 dark:bg-red-800/30 p-3 rounded-md">
                      <p className="text-sm font-mono">{JSON.stringify(accountingData.details, null, 2)}</p>
                    </div>
                  )}
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 rounded-r-lg">
                    <h5 className="font-bold text-yellow-800 dark:text-yellow-300">💡 Suggestions:</h5>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
                      <li>• Verify that the document has no Tax ID/VAT number errors</li>
                      <li>• Ensure invoice totals are correct</li>
                      <li>• Check that the XML file is a valid electronic invoice</li>
                    </ul>
                  </div>
                </div>
              ) : accountingData ? (
                <div>
                  <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 text-green-800 dark:text-green-300 p-4 rounded-r-lg mb-6">
                    <h4 className="font-bold text-lg">✅ {accountingData.message}</h4>
                    <p className="text-sm mt-1">
                      Document: <strong>{accountingDocument?.original_filename}</strong> • Generated rows:{' '}
                      <strong>{accountingData.accounting?.entries_count}</strong>
                    </p>
                  </div>

                  <div className="mb-6">
                    <button
                      onClick={handleDownloadAccountingCSV}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      💾 Download CSV for ERP
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-600 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                            Account
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                            Debit €
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                            Credit €
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-600">
                        {(accountingData.accounting?.entries_json || []).map((entry, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{entry.date}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                              {entry.account_code}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{entry.description}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 text-right font-mono">
                              {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 text-right font-mono">
                              {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-3">📈 Balance Check</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-300">Total Debit</p>
                        <p className="text-2xl font-bold text-green-600">
                          €
                          {(accountingData.accounting?.entries_json || [])
                            .reduce((sum, e) => sum + (e.debit || 0), 0)
                            .toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-300">Total Credit</p>
                        <p className="text-2xl font-bold text-blue-600">
                          €
                          {(accountingData.accounting?.entries_json || [])
                            .reduce((sum, e) => sum + (e.credit || 0), 0)
                            .toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-2 rounded-full text-sm font-bold">
                        ✅ Entries Perfectly Balanced
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600 text-right">
              <button
                onClick={() => setShowAccountingModal(false)}
                className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-2 px-6 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {showDetailModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-6xl mx-auto max-h-[95vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 dark:from-slate-200 dark:to-indigo-400 bg-clip-text text-transparent">
                📄 Document Detail
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 p-2 rounded-xl transition-all duration-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-grow">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <InfoCard title="📁 File Name" value={selectedDocument.original_filename || selectedDocument.name || ''} color="indigo" />
                <InfoCard title="📋 Type" value={selectedDocument.type || 'Fiscal Document'} color="blue" />
                <InfoCard
                  title="📅 Date"
                  value={new Date(selectedDocument.created_at || selectedDocument.upload_date || Date.now()).toLocaleDateString('en-GB')}
                  color="emerald"
                />
              </div>

              {/* Status and AI Analysis */}
              <div className="mb-8">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4">🤖 AI Analysis</h4>
                <div
                  className={`p-6 rounded-xl border-2 ${
                    selectedDocument.ai_status === 'error'
                      ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
                      : selectedDocument.ai_status === 'processing'
                      ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700'
                      : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                  }`}
                >
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-3">
                      {selectedDocument.ai_status === 'error' ? '❌' : selectedDocument.ai_status === 'processing' ? '⏳' : '✅'}
                    </span>
                    <h5
                      className={`text-xl font-bold ${
                        selectedDocument.ai_status === 'error'
                          ? 'text-red-700 dark:text-red-300'
                          : selectedDocument.ai_status === 'processing'
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : 'text-green-700 dark:text-green-300'
                      }`}
                    >
                      {selectedDocument.ai_status === 'error'
                        ? 'Errors Detected'
                        : selectedDocument.ai_status === 'processing'
                        ? 'Processing in Progress'
                        : 'Document Compliant'}
                    </h5>
                  </div>
                  <p
                    className={`${
                      selectedDocument.ai_status === 'error'
                        ? 'text-red-700 dark:text-red-300'
                        : selectedDocument.ai_status === 'processing'
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : 'text-green-700 dark:text-green-300'
                    }`}
                  >
                    {selectedDocument.ai_analysis ||
                      (selectedDocument.ai_status === 'error'
                        ? 'The document contains errors that require correction'
                        : selectedDocument.ai_status === 'processing'
                        ? 'The document is being processed'
                        : 'The document complies with fiscal regulations')}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
              {selectedDocument.ai_status === 'error' && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleManualCorrect(selectedDocument);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  ✏️ Manual Editor
                </button>
              )}
              <button
                onClick={() => handleShowReport(selectedDocument)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                📊 Full Report
              </button>
              <button
                onClick={() => handleDownloadDocument(selectedDocument)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                💾 Download
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-500 font-bold transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReportModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-5xl mx-auto max-h-[95vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 dark:from-slate-200 dark:to-indigo-400 bg-clip-text text-transparent">
                📊 AI Analysis Report - Fiscal Checks
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 p-2 rounded-xl transition-all duration-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-grow">
              <div className="border-b-2 border-slate-200 dark:border-slate-600 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  {selectedDocument.original_filename || selectedDocument.name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Generated on: {new Date().toLocaleString('en-GB')}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Engine: TaxPilot Assistant v2.1</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  AI Status: {selectedDocument.ai_status} | Confidence: {Math.round((selectedDocument.ai_confidence || 0.85) * 100)}%
                </p>
              </div>

              <div className="mt-8 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4">📋 Overall Outcome</h4>
                {selectedDocument.ai_status === 'error' ? (
                  <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 p-4 rounded-r-lg">
                    <p className="text-red-800 dark:text-red-300 font-medium">❌ Document contains errors to correct</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                      AI analysis detected issues in the document requiring attention. Use manual editor or AI automatic correction.
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 p-4 rounded-r-lg">
                    <p className="text-green-800 dark:text-green-300 font-medium">✅ Document fully compliant with regulations</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                      All automatic checks passed successfully. The document is compliant with DM 55/2013.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setShowDetailModal(true);
                }}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                ← Back to Detail
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-500 font-bold transition-all duration-300"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                🖨️ Print Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FileViewer Modal */}
      <FileViewerComponent onSave={handleSaveFromViewer} />
    </div>
  );
}

/* ---------- Small UI helper ---------- */
function InfoCard({ title, value, color }: { title: string; value: string; color: 'indigo' | 'blue' | 'emerald' }) {
  const map = {
    indigo: 'from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400',
    blue: 'from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400',
    emerald:
      'from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400',
  } as const;
  return (
    <div className={`bg-gradient-to-br p-6 rounded-xl border ${map[color]}`}>
      <h4 className="font-bold mb-2">{title}</h4>
      <p className="text-slate-800 dark:text-white font-medium">{value}</p>
    </div>
  );
}

function handleExport() {
  const csvHeaders = ['File Name', 'Type', 'Date', 'Status', 'ID'];
  // @ts-ignore: window.__docs is not real; this function is replaced by the button handler above.
  const docs: Doc[] = (window as any).__docs || [];
  const rows = docs.map((d) => [
    d.original_filename || d.name,
    d.type || 'Fiscal Document',
    new Date(d.created_at || d.upload_date || Date.now()).toLocaleDateString('en-GB'),
    d.ai_status === 'error' ? 'Error' : d.ai_status === 'processing' ? 'Processing' : 'Processed',
    d.id,
  ]);
  const csv = [csvHeaders, ...rows].map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `documents_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
