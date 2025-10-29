import React, { useState, useEffect } from 'react';

const FileViewer = ({ filename, isOpen, onClose, documentTitle = "Documento", documentId = null, onSave = null }) => {
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [xmlContent, setXmlContent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Carica informazioni file quando si apre il modal
  useEffect(() => {
    if (isOpen && filename) {
      loadFileInfo();
    }
  }, [isOpen, filename]);

  const loadFileInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📂 Caricando info per file: ${filename}`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/files/${encodeURIComponent(filename)}/info`);
      const info = await response.json();
      
      if (!response.ok) {
        throw new Error(info.error || 'Errore caricamento file');
      }
      
      setFileInfo(info);
      
      // Se è un XML, carica anche il contenuto per mostrarlo formattato
      if (info.exists && info.extension === '.xml') {
        await loadXmlContent();
      }
      
    } catch (err) {
      console.error('❌ Errore caricamento file info:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadXmlContent = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/files/${encodeURIComponent(filename)}`);
      
      if (!response.ok) {
        throw new Error('Errore caricamento contenuto XML');
      }
      
      const xmlText = await response.text();
      setXmlContent(formatXML(xmlText));
      
    } catch (err) {
      console.error('❌ Errore caricamento XML:', err);
      setXmlContent('Errore nel caricamento del contenuto XML');
    }
  };

  // Formatta XML per visualizzazione leggibile
  const formatXML = (xmlString) => {
    try {
      // Rimuove spazi extra e formatta
      let formatted = xmlString
        .replace(/></g, '>\n<')
        .replace(/^\s*\n/gm, '');
      
      // Aggiunge indentazione
      let indent = 0;
      const lines = formatted.split('\n');
      
      return lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        
        // Diminuisci indent per tag di chiusura
        if (trimmed.startsWith('</')) {
          indent = Math.max(0, indent - 1);
        }
        
        const indentedLine = '  '.repeat(indent) + trimmed;
        
        // Aumenta indent per tag di apertura (ma non per tag self-closing o di chiusura)
        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
          indent++;
        }
        
        return indentedLine;
      }).join('\n');
      
    } catch (error) {
      console.warn('⚠️ Errore formattazione XML:', error);
      return xmlString; // Ritorna XML originale se formattazione fallisce
    }
  };

  const handleSave = async () => {
    if (!documentId || !onSave) {
      alert('❌ Funzione salvataggio non disponibile');
      return;
    }

    setIsSaving(true);
    
    try {
      console.log(`💾 Salvando documento ID: ${documentId}`);
      
      // Chiama la funzione onSave passata dal parent
      await onSave(documentId, {
        filename: fileInfo.filename,
        type: fileInfo.extension,
        lastModified: new Date().toISOString(),
        viewedAt: new Date().toISOString()
      });
      
      alert('✅ Documento salvato con successo!');
      
    } catch (error) {
      console.error('❌ Errore salvataggio:', error);
      alert('❌ Errore durante il salvataggio: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!filename) return;
    
    const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/files/${encodeURIComponent(filename)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileUrl = () => {
    return `${process.env.NEXT_PUBLIC_API_URL}/api/files/${encodeURIComponent(filename)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-[95vw] mx-auto max-h-[98vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 dark:from-slate-200 dark:to-indigo-400 bg-clip-text text-transparent">
              👁️ Visualizzatore File
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {documentTitle} • {filename}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {fileInfo?.exists && (
              <>
                <button 
                  onClick={handleSave}
                  disabled={isSaving || !documentId || !onSave}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-lg disabled:transform-none disabled:shadow-none flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>💾 Salva</span>
                    </>
                  )}
                </button>
                
                <button 
                  onClick={handleDownload}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>📥 Scarica</span>
                </button>
              </>
            )}
            
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 p-2 rounded-xl transition-all duration-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-3">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-300">Caricamento file...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">❌</div>
                <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Errore Caricamento File</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">{error}</p>
                <button 
                  onClick={loadFileInfo}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-bold transition-all duration-300"
                >
                  🔄 Riprova
                </button>
              </div>
            </div>
          )}

          {!loading && !error && fileInfo && !fileInfo.exists && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">File Non Trovato</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  Il file "{filename}" non è disponibile sul server
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    💡 <strong>Possibili cause:</strong> Il file potrebbe essere stato eliminato o spostato dal server.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && fileInfo?.exists && (
            <div className="h-full">
              
              {/* Info File - Versione compatta */}
              <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{fileInfo.filename}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {fileInfo.sizeFormatted} • {fileInfo.extension?.toUpperCase()} • 
                      {new Date(fileInfo.modified).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    fileInfo.extension === '.pdf' 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : fileInfo.extension === '.xml'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                  }`}>
                    {fileInfo.extension?.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Visualizzatore Contenuto - Massimizzato */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden" style={{ height: 'calc(98vh - 200px)' }}>
                
                {/* PDF Viewer - Ottimizzato */}
                {fileInfo.extension === '.pdf' && (
                  <div className="h-full w-full">
                    <iframe
                      src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(getFileUrl())}`}
                      className="w-full h-full rounded-xl border-0"
                      title={`PDF Viewer - ${filename}`}
                      style={{ 
                        minHeight: 'calc(98vh - 200px)',
                        border: 'none',
                        outline: 'none'
                      }}
                      allowFullScreen
                    />
                  </div>
                )}

                {/* XML Viewer */}
                {fileInfo.extension === '.xml' && (
                  <div className="h-full p-6 overflow-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-bold text-slate-800 dark:text-white">📄 Contenuto XML</h4>
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-bold">
                        FatturaPA
                      </span>
                    </div>
                    
                    {xmlContent ? (
                      <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-[500px]">
                        <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                          {xmlContent}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        <span className="ml-3 text-slate-600 dark:text-slate-300">Caricamento XML...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Viewer non supportato */}
                {!fileInfo.isViewable && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-4xl mb-4">📄</div>
                      <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300 mb-2">Anteprima Non Disponibile</h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-4">
                        Il tipo di file {fileInfo.extension?.toUpperCase()} non può essere visualizzato direttamente
                      </p>
                      <button 
                        onClick={handleDownload}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
                      >
                        📥 Scarica File
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

        {/* Footer - Compatto */}
        <div className="border-t border-slate-200 dark:border-slate-600 p-3 bg-slate-50 dark:bg-slate-700 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {fileInfo?.exists && (
                <>
                  {fileInfo.filename} • {fileInfo.sizeFormatted} • {fileInfo.mimeType}
                </>
              )}
            </div>
            
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 font-bold transition-all duration-300 text-sm"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook personalizzato per usare il FileViewer
export const useFileViewer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentId, setDocumentId] = useState(null);

  const openViewer = (filename, title = 'Documento', docId = null) => {
    setCurrentFile(filename);
    setDocumentTitle(title);
    setDocumentId(docId);
    setIsOpen(true);
  };

  const closeViewer = () => {
    setIsOpen(false);
    setCurrentFile(null);
    setDocumentTitle('');
    setDocumentId(null);
  };

  return {
    isOpen,
    currentFile,
    documentTitle,
    documentId,
    openViewer,
    closeViewer,
    FileViewerComponent: ({ onSave, ...props }) => (
      <FileViewer 
        filename={currentFile}
        isOpen={isOpen}
        onClose={closeViewer}
        documentTitle={documentTitle}
        documentId={documentId}
        onSave={onSave}
        {...props}
      />
    )
  };
};

export default FileViewer;