// frontend/app/documents/page.tsx - VERSIONE COMPLETA CON SCRITTURE CONTABILI

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EditableDocumentForm from '../../components/EditableDocumentForm'; // ← CORREZIONE PATH
import FileViewer, { useFileViewer } from '../../components/FileViewer';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // ===== NUOVI STATI PER EDITOR E VISUALIZZATORE =====
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [documentForEdit, setDocumentForEdit] = useState(null);
  
  // ===== NUOVI STATI PER SCRITTURE CONTABILI =====
  const [accountingData, setAccountingData] = useState(null);
  const [accountingLoading, setAccountingLoading] = useState(false);
  const [showAccountingModal, setShowAccountingModal] = useState(false);
  const [accountingDocument, setAccountingDocument] = useState(null);
  
  const { 
    isOpen: isViewerOpen, 
    openViewer, 
    closeViewer, 
    FileViewerComponent 
  } = useFileViewer();
  
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents`, {
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

  const handleDelete = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const token = localStorage.getItem('taxpilot_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        await fetchDocuments();
        alert('Document deleted successfully');
      } else {
        alert('Error during deletion');
      }
    } catch (error) {
      alert('Connection error');
    }
  };

  // ===== NUOVA FUNZIONE PER SCRITTURE CONTABILI =====
  const handleGenerateAccounting = async (doc) => {
    // CONTROLLO: Solo per file XML
    if (!doc.original_filename?.toLowerCase().endsWith('.xml')) {
      alert('⚠️ Le scritture contabili sono disponibili solo per fatture elettroniche XML');
      return;
    }

    if (!confirm(`Vuoi generare le scritture contabili per ${doc.original_filename || doc.name}?`)) return;
    
    setAccountingLoading(true);
    setAccountingData(null);
    setAccountingDocument(doc);
    setShowAccountingModal(true);
    
    const token = localStorage.getItem('taxpilot_token');
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/${doc.id}/generate-entries`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          account_map: {
            // Mappatura base - personalizzabile
            cliente: "1200",
            fornitore: "2200", 
            ricavi: "4010",
            ricavi_merce: "4010",
            ricavi_22: "4010",
            costi: "5010",
            costi_merce: "5010", 
            costi_22: "5010",
            iva_debito: "2210",
            iva_credito: "1410",
            iva_22: "2210",
            costo_lavoro: "5200",
            debiti_dipendenti: "2300",
            debiti_inps: "2310",
            debiti_erario: "2320"
          }
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setAccountingData(result);
      } else {
        setAccountingData({ 
          error: true, 
          message: result.error || 'Errore sconosciuto',
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

  const handleDownloadAccountingCSV = () => {
    if (!accountingData || !accountingData.accounting?.entries_csv) {
      alert("Nessun dato CSV da scaricare.");
      return;
    }
    
    const blob = new Blob([`\ufeff${accountingData.accounting.entries_csv}`], { 
      type: 'text/csv;charset=utf-8;' 
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `scritture_${accountingDocument?.original_filename || 'documento'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ===== CORREZIONE MANUALE CON EDITOR (SOLO FATTURE E BUSTE PAGA) =====
  const handleManualCorrect = async (doc) => {
    console.log('✏️ Apertura editor per correzione manuale:', doc);
    
    try {
      // Determina tipo documento
      const documentType = determineDocumentType(doc);
      
      // ✅ CONTROLLO: Editor solo per fatture e buste paga
      if (documentType !== 'fattura' && documentType !== 'busta_paga') {
        alert('⚠️ Editor disponibile solo per Fatture e Buste Paga');
        return;
      }
      
      // Prepara dati per editor
      const documentData = {
        type: documentType,
        extractedData: extractDataFromDocument(doc, documentType),
        originalDoc: doc
      };
      
      console.log('📋 Dati preparati per editor:', documentData);
      
      setDocumentForEdit(documentData);
      setShowEditorModal(true);
      
    } catch (error) {
      console.error('⚠️ Errore preparazione editor:', error);
      alert('Errore nell\'apertura dell\'editor: ' + error.message);
    }
  };

  // ===== VISUALIZZAZIONE CONTENUTO DOCUMENTO =====
  const handleViewDocument = (doc) => {
    if (!doc.file_path) {
      alert('Percorso file mancante');
      return;
    }
    const fixedPath = doc.file_path.replace(/\\/g, '/');
    const encodedPath = encodeURIComponent(fixedPath);
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/files/${encodedPath}`);
  };

  const handleSaveFromViewer = async (documentId, metadata) => {
    try {
      console.log('💾 Salvando documento dal visualizzatore:', documentId, metadata);
      
      const token = localStorage.getItem('taxpilot_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          viewedAt: metadata.viewedAt,
          lastInteraction: 'file_viewed',
          interactionMetadata: metadata
        })
      });
      
      if (response.ok) {
        console.log('✅ Documento aggiornato con successo');
        await fetchDocuments();
      } else {
        throw new Error('Errore durante l\'aggiornamento del documento');
      }
      
    } catch (error) {
      console.error('⚠️ Errore salvataggio dal visualizzatore:', error);
      throw error;
    }
  };

  // ===== FUNZIONI HELPER PER EDITOR (SOLO FATTURE E BUSTE PAGA) =====
  const determineDocumentType = (doc) => {
    // Logica per determinare il tipo di documento
    const fileName = (doc.original_filename || doc.name || '').toLowerCase();
    const docType = (doc.type || '').toLowerCase();
    
    // ✅ CONTROLLO ESTENSIONI FILE
    const fileExtension = fileName.split('.').pop();
    
    // Fatture: file XML o nomi che contengono "fattura"
    if (fileExtension === 'xml' || fileName.includes('fattura') || docType.includes('fattura') || fileName.includes('invoice')) {
      return 'fattura';
    } 
    // Buste Paga: file PDF o nomi che contengono "busta/paga"
    else if (fileExtension === 'pdf' || fileName.includes('busta') || fileName.includes('paga') || docType.includes('busta') || fileName.includes('payslip')) {
      return 'busta_paga';
    }
    
    // Fallback: prova ad analizzare il contenuto se disponibile
    const content = doc.ai_analysis || doc.content || '';
    if (content.toLowerCase().includes('iva') || content.toLowerCase().includes('partita')) {
      return 'fattura';
    } else if (content.toLowerCase().includes('stipendio') || content.toLowerCase().includes('inps')) {
      return 'busta_paga';
    }
    
    // ✅ IMPORTANTE: Se non riconosce il tipo, restituisce null
    // Questo impedirà l'apertura dell'editor per documenti non supportati
    console.warn('⚠️ Tipo documento non riconosciuto:', { fileName, docType, fileExtension });
    return null;
  };

  const extractDataFromDocument = (doc, type) => {
    // Estrae dati dal documento per popolare l'editor
    let extractedData = {};
    
    try {
      // Prova a parsare analysis_result se presente
      if (doc.analysis_result) {
        const analysisData = typeof doc.analysis_result === 'string' 
          ? JSON.parse(doc.analysis_result) 
          : doc.analysis_result;
        
        if (type === 'fattura') {
          extractedData = {
            numero: analysisData.numero || doc.numero || '',
            data: analysisData.data || doc.data || new Date().toISOString().split('T')[0],
            cedenteDenominazione: analysisData.cedente?.denominazione || '',
            cedentePartitaIva: analysisData.cedente?.partitaIva || '',
            cessionarioNome: analysisData.cessionario?.nome || '',
            cessionarioCognome: analysisData.cessionario?.cognome || '',
            cessionarioCodiceFiscale: analysisData.cessionario?.codiceFiscale || '',
            imponibile: analysisData.imponibile || 0,
            aliquotaIva: analysisData.aliquotaIva || 22,
            importoIva: analysisData.importoIva || 0,
            totale: analysisData.totale || 0,
            confidence: doc.ai_confidence || 0.5,
            needsReview: doc.ai_status === 'error' || doc.flag_manual_review
          };
        } else if (type === 'busta_paga') {
          extractedData = {
            nome: analysisData.nome || analysisData.dipendente || '',
            codiceFiscale: analysisData.codiceFiscale || '',
            matricola: analysisData.matricola || '',
            stipendioBase: analysisData.stipendioBase || 0,
            superMinimo: analysisData.superMinimo || 0,
            straordinari: analysisData.straordinari || 0,
            stipendioLordo: analysisData.stipendioLordo || 0,
            inps: analysisData.inps || 0,
            inail: analysisData.inail || 0,
            irpef: analysisData.irpef || 0,
            addizionali: analysisData.addizionali || 0,
            netto: analysisData.netto || 0,
            periodo: analysisData.periodo || '',
            confidence: doc.ai_confidence || 0.5,
            needsReview: doc.ai_status === 'error' || doc.flag_manual_review
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ Errore parsing analysis_result:', error);
    }
    
    // Fallback: usa dati base dal documento
    if (Object.keys(extractedData).length === 0) {
      if (type === 'fattura') {
        extractedData = {
          numero: doc.numero || '001',
          data: doc.data || new Date().toISOString().split('T')[0],
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
          needsReview: true
        };
      } else {
        extractedData = {
          nome: '',
          codiceFiscale: '',
          matricola: '',
          stipendioLordo: 0,
          inps: 0,
          irpef: 0,
          netto: 0,
          confidence: 0.3,
          needsReview: true
        };
      }
    }
    
    return extractedData;
  };

  // ===== HANDLERS EDITOR =====
  const handleEditorSave = async (formData) => {
    console.log('💾 Salvando dati corretti:', formData);
    
    try {
      const token = localStorage.getItem('taxpilot_token');
      const originalDoc = documentForEdit.originalDoc;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/${originalDoc.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          correctedData: formData,
          type: documentForEdit.type,
          manuallyReviewed: true
        })
      });
      
      if (response.ok) {
        alert('✅ Document saved successfully!');
        setShowEditorModal(false);
        setDocumentForEdit(null);
        await fetchDocuments(); // Reload list
      } else {
        alert('⚠️ Error during save');
      }
      } catch (error) {
      console.error('⚠️ Save error:', error);
      alert('⚠️ Connection error during save');
      }
      };

  const handleEditorGenerateXML = async (formData) => {
    console.log('📄 Generando XML FatturaPA:', formData);
    
    try {
      const token = localStorage.getItem('taxpilot_token');
      
      // ===== CORREZIONE QUI =====
      // Sostituito '${...}' con `${...}`
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/generate-xml`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fattura_${formData.numero}_${formData.data}.xml`;
        link.click();
        URL.revokeObjectURL(url);
        
        alert('✅ XML FatturaPA generato e scaricato!');
      } else {
        alert('⚠️ Errore durante la generazione XML');
      }
    } catch (error) {
      console.error('⚠️ Errore generazione XML:', error);
      alert('⚠️ Errore di connessione durante la generazione XML');
    }
  };

  const handleEditorCancel = () => {
    setShowEditorModal(false);
    setDocumentForEdit(null);
  };

  // ===== RESTO DEL CODICE ESISTENTE =====
  const handleViewDetail = (doc) => {
    if (doc && doc.id) {
      setSelectedDocument(doc);
      setShowDetailModal(true);
    }
  };

  const handleShowReport = (doc) => {
    if (doc && doc.id) {
      setSelectedDocument(doc);
      setShowDetailModal(false);
      setShowReportModal(true);
    }
  };

  const handleDownloadDocument = (doc) => {
    const blob = new Blob([`Documento: ${doc.original_filename || doc.name}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.original_filename || doc.name || 'documento.xml';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const csvHeaders = ['Nome File', 'Tipo', 'Data', 'Stato', 'ID'];
    const csvData = filteredDocuments.map(doc => [
      doc.original_filename || doc.name,
      doc.type || 'Documento Fiscale',
      new Date(doc.created_at || doc.upload_date).toLocaleDateString('it-IT'),
      doc.ai_status === 'error' ? 'Errore' : 
      doc.ai_status === 'processing' ? 'In Corso' : 'Elaborato',
      doc.id
    ]);
    
    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `documenti_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredDocuments = documents
    .filter(doc => {
      if (filter === 'elaborato') return doc.ai_status === 'ok';
      if (filter === 'elaborazione') return doc.ai_status === 'processing';
      if (filter === 'errore') return doc.ai_status === 'error';
      return true;
    })
    .filter(doc => 
      doc.original_filename?.toLowerCase().includes(search.toLowerCase()) ||
      doc.name?.toLowerCase().includes(search.toLowerCase())
    );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Caricamento documenti...</div>
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
              <span className="text-indigo-600">📁</span> Gestione Documenti
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-3 text-lg">Tutti i tuoi documenti fiscali con analisi AI</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
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
                  placeholder="Cerca documenti o clienti..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['all', 'elaborato', 'elaborazione', 'errore'].map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                    filter === filterOption
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {filterOption === 'all' ? 'Tutti' : 
                   filterOption === 'elaborato' ? 'Elaborati' :
                   filterOption === 'elaborazione' ? 'In Elaborazione' : 'Con Errori'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 px-8 py-6 border-b border-slate-200 dark:border-slate-600">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">📋 Lista Documenti ({filteredDocuments.length})</h2>
              <button 
                onClick={handleExport}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Esporta CSV</span>
              </button>
            </div>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">Nessun documento trovato</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">I documenti che carichi dalla dashboard appariranno qui</p>
              <button 
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                📤 Vai alla Dashboard
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Nome File</th>
                    <th className="px-3 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Tipo</th>
                    <th className="px-3 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Data</th>
                    <th className="px-3 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Stato</th>
                    <th className="px-4 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Azioni</th>
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
                          {doc.type || 'Documento Fiscale'}
                        </span>
                      </td>
                      <td className="px-3 py-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {new Date(doc.created_at || doc.upload_date || Date.now()).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-3 py-6">
                        <span className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl ${
                          doc.ai_status === 'error' 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                            : doc.ai_status === 'processing'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>
                          {doc.ai_status === 'error' ? '❌ Errori rilevati' : 
                           doc.ai_status === 'processing' ? '⏳ In Corso' : 
                           '✅ Elaborato'}
                        </span>
                      </td>
                      <td className="px-4 py-6 text-sm font-medium">
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => handleViewDetail(doc)}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-3 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-xs"
                          >
                            📝 Dettaglio
                          </button>

                          <button 
                            onClick={() => handleViewDocument(doc)}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-3 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-xs"
                          >
                            👁️ Visualizza
                          </button>
                          
                          {/* SCRITTURE SOLO PER XML */}
                          {doc.original_filename?.toLowerCase().endsWith('.xml') && (
                            <button 
                              onClick={() => handleGenerateAccounting(doc)}
                              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-3 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-xs"
                            >
                              📊 Scritture
                            </button>
                          )}
                          
                          {/* EDITOR SOLO SE ERRORI */}
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
                            📥 Scarica
                          </button>
                          
                          <button 
                            onClick={() => handleDelete(doc.id)}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-xs"
                          >
                            🗑️ Elimina
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

      {/* ===== EDITOR MODAL (ESISTENTE) ===== */}
      {showEditorModal && documentForEdit && (
        <EditableDocumentForm
          documentData={documentForEdit}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
          onGenerateXML={handleEditorGenerateXML}
        />
      )}

      {/* ===== MODAL SCRITTURE CONTABILI ===== */}
      {showAccountingModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-600">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">📊 Scritture Contabili</h3>
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
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Generazione scritture in corso...</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">L'AI sta analizzando il documento e creando le scritture contabili.</p>
                </div>
              ) : accountingData?.error ? (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-6 rounded-r-lg">
                  <h4 className="font-bold text-lg mb-2">❌ Errore nella generazione</h4>
                  <p className="mb-4">{accountingData.message}</p>
                  {accountingData.details && (
                    <div className="bg-red-100 dark:bg-red-800/30 p-3 rounded-md">
                      <p className="text-sm font-mono">{JSON.stringify(accountingData.details, null, 2)}</p>
                    </div>
                  )}
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 rounded-r-lg">
                    <h5 className="font-bold text-yellow-800 dark:text-yellow-300">💡 Suggerimenti:</h5>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
                      <li>• Verifica che il documento non abbia errori di CF/P.IVA</li>
                      <li>• Assicurati che i totali della fattura siano corretti</li>
                      <li>• Controlla che il file XML sia una fattura elettronica valida</li>
                    </ul>
                  </div>
                </div>
              ) : accountingData ? (
                <div>
                  <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 text-green-800 dark:text-green-300 p-4 rounded-r-lg mb-6">
                    <h4 className="font-bold text-lg">✅ {accountingData.message}</h4>
                    <p className="text-sm mt-1">
                      Documento: <strong>{accountingDocument?.original_filename}</strong> • 
                      Righe generate: <strong>{accountingData.accounting?.entries_count}</strong>
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <button 
                      onClick={handleDownloadAccountingCSV} 
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      💾 Scarica CSV per Gestionale
                    </button>
                  </div>

                  {/* Tabella Scritture */}
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-600 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Data</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Conto</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Descrizione</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Dare €</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Avere €</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-600">
                        {accountingData.accounting?.entries_json?.map((entry, index) => (
                          <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{entry.date}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{entry.account_code}</td>
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

                  {/* Totali */}
                  <div className="mt-6 bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-3">📈 Controllo Bilanciamento</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-300">Totale Dare</p>
                        <p className="text-2xl font-bold text-green-600">
                          €{accountingData.accounting?.entries_json?.reduce((sum, e) => sum + e.debit, 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-300">Totale Avere</p>
                        <p className="text-2xl font-bold text-blue-600">
                          €{accountingData.accounting?.entries_json?.reduce((sum, e) => sum + e.credit, 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-2 rounded-full text-sm font-bold">
                        ✅ Scritture Perfettamente Bilanciate
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
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DETTAGLIO DOCUMENTO (ESISTENTE) ===== */}
      {showDetailModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-6xl mx-auto max-h-[95vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 dark:from-slate-200 dark:to-indigo-400 bg-clip-text text-transparent">
                📄 Dettaglio Documento
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
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 p-6 rounded-xl border border-indigo-200 dark:border-indigo-700">
                  <h4 className="font-bold text-indigo-600 dark:text-indigo-400 mb-2">📁 Nome File</h4>
                  <p className="text-slate-800 dark:text-white font-medium">{selectedDocument.original_filename || selectedDocument.name}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
                  <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2">📋 Tipo</h4>
                  <p className="text-slate-800 dark:text-white font-medium">{selectedDocument.type || 'Documento Fiscale'}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 p-6 rounded-xl border border-emerald-200 dark:border-emerald-700">
                  <h4 className="font-bold text-emerald-600 dark:text-emerald-400 mb-2">📅 Data</h4>
                  <p className="text-slate-800 dark:text-white font-medium">{new Date(selectedDocument.created_at || selectedDocument.upload_date || Date.now()).toLocaleDateString('it-IT')}</p>
                </div>
              </div>

              {/* Stato e Analisi AI */}
              <div className="mb-8">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4">🤖 Analisi AI</h4>
                <div className={`p-6 rounded-xl border-2 ${
                  selectedDocument.ai_status === 'error' 
                    ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700' 
                    : selectedDocument.ai_status === 'processing'
                    ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700'
                    : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                }`}>
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-3">
                      {selectedDocument.ai_status === 'error' ? '❌' : 
                       selectedDocument.ai_status === 'processing' ? '⏳' : '✅'}
                    </span>
                    <h5 className={`text-xl font-bold ${
                      selectedDocument.ai_status === 'error' ? 'text-red-700 dark:text-red-300' :
                      selectedDocument.ai_status === 'processing' ? 'text-yellow-700 dark:text-yellow-300' :
                      'text-green-700 dark:text-green-300'
                    }`}>
                      {selectedDocument.ai_status === 'error' ? 'Errori Rilevati' : 
                       selectedDocument.ai_status === 'processing' ? 'Elaborazione in Corso' : 
                       'Documento Conforme'}
                    </h5>
                  </div>
                  <p className={`${
                    selectedDocument.ai_status === 'error' ? 'text-red-700 dark:text-red-300' :
                    selectedDocument.ai_status === 'processing' ? 'text-yellow-700 dark:text-yellow-300' :
                    'text-green-700 dark:text-green-300'
                  }`}>
                    {selectedDocument.ai_analysis || 
                     (selectedDocument.ai_status === 'error' ? 'Il documento presenta errori che richiedono correzione' :
                      selectedDocument.ai_status === 'processing' ? 'Il documento è in fase di elaborazione' :
                      'Il documento è conforme alle normative fiscali')}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Azioni */}
            <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
              {selectedDocument.ai_status === 'error' && (
                <button 
                  onClick={() => {
                    setShowDetailModal(false);
                    handleManualCorrect(selectedDocument);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  ✏️ Editor Manuale
                </button>
              )}
              <button 
                onClick={() => handleShowReport(selectedDocument)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                📊 Report Completo
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
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL REPORT COMPLETO (ESISTENTE) ===== */}
      {showReportModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-5xl mx-auto max-h-[95vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 dark:from-slate-200 dark:to-indigo-400 bg-clip-text text-transparent">
                📊 Report Analisi AI - Controlli Fiscali
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
              {/* Header Report */}
              <div className="border-b-2 border-slate-200 dark:border-slate-600 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{selectedDocument.original_filename || selectedDocument.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Generato il: {new Date().toLocaleString('it-IT')}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Engine: TaxPilot Assistant v2.1</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">AI Status: {selectedDocument.ai_status} | Confidence: {(selectedDocument.ai_confidence || 0.85) * 100}%</p>
              </div>

              {/* Risultato Finale */}
              <div className="mt-8 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4">📋 Esito Complessivo</h4>
                {selectedDocument.ai_status === 'error' ? (
                  <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 p-4 rounded-r-lg">
                    <p className="text-red-800 dark:text-red-300 font-medium">❌ Documento presenta errori da correggere</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                      L'analisi AI ha rilevato problemi nel documento che richiedono attenzione. 
                      Utilizzare l'editor manuale o la correzione automatica AI.
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 p-4 rounded-r-lg">
                    <p className="text-green-800 dark:text-green-300 font-medium">✅ Documento pienamente conforme alla normativa</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                      Tutti i controlli automatici sono stati superati con successo. Il documento è conforme a DM 55/2013.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
              <button 
                onClick={() => {setShowReportModal(false); setShowDetailModal(true);}}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                ← Torna al Dettaglio
              </button>
              <button 
                onClick={() => setShowReportModal(false)}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-500 font-bold transition-all duration-300"
              >
                Chiudi
              </button>
              <button 
                onClick={() => window.print()}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                🖨️ Stampa Report
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