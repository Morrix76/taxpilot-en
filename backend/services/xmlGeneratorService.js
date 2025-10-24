import React, { useState, useEffect } from 'react';

const EditableDocumentForm = ({ 
  documentData, 
  onSave, 
  onCancel, 
  onGenerateXML 
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [validationStatus, setValidationStatus] = useState('pending');
  const [isGenerating, setIsGenerating] = useState(false);

  // Inizializza form con dati estratti
  useEffect(() => {
    if (documentData?.extractedData) {
      setFormData(documentData.extractedData);
      validateForm(documentData.extractedData);
    }
  }, [documentData]);

  // Validazione in tempo reale
  const validateForm = (data) => {
    const newErrors = {};
    const newWarnings = {};

    if (documentData?.type === 'fattura') {
      validateInvoice(data, newErrors, newWarnings);
    } else if (documentData?.type === 'busta_paga') {
      validatePayslip(data, newErrors, newWarnings);
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    setValidationStatus(Object.keys(newErrors).length === 0 ? 'valid' : 'invalid');
  };

  // Validazione fattura
  const validateInvoice = (data, errors, warnings) => {
    // Campi obbligatori
    if (!data.numero) errors.numero = 'Numero fattura obbligatorio';
    if (!data.data) errors.data = 'Data fattura obbligatoria';
    if (!data.cedenteDenominazione) errors.cedenteDenominazione = 'Denominazione cedente obbligatoria';
    if (!data.cedentePartitaIva) errors.cedentePartitaIva = 'P.IVA cedente obbligatoria';

    // Validazione P.IVA
    if (data.cedentePartitaIva && !isValidVAT(data.cedentePartitaIva)) {
      errors.cedentePartitaIva = 'Partita IVA non valida (11 cifre)';
    }

    // Validazione Codice Fiscale
    if (data.cessionarioCodiceFiscale && !isValidCF(data.cessionarioCodiceFiscale)) {
      errors.cessionarioCodiceFiscale = 'Codice Fiscale non valido';
    }

    // Validazione calcoli IVA
    if (data.imponibile && data.aliquotaIva) {
      const ivaCalcolata = (data.imponibile * data.aliquotaIva) / 100;
      const diff = Math.abs(ivaCalcolata - (data.importoIva || 0));
      
      if (diff > 0.01) {
        warnings.importoIva = `IVA calcolata: €${ivaCalcolata.toFixed(2)}, inserita: €${(data.importoIva || 0).toFixed(2)}`;
      }
    }

    // Validazione totale
    if (data.imponibile && data.importoIva) {
      const totaleCalcolato = parseFloat(data.imponibile) + parseFloat(data.importoIva);
      const diff = Math.abs(totaleCalcolato - (data.totale || 0));
      
      if (diff > 0.01) {
        warnings.totale = `Totale calcolato: €${totaleCalcolato.toFixed(2)}, inserito: €${(data.totale || 0).toFixed(2)}`;
      }
    }
  };

  // Validazione busta paga
  const validatePayslip = (data, errors, warnings) => {
    // Campi obbligatori
    if (!data.nome) errors.nome = 'Nome dipendente obbligatorio';
    if (!data.codiceFiscale) errors.codiceFiscale = 'Codice Fiscale obbligatorio';
    if (!data.stipendioLordo) errors.stipendioLordo = 'Stipendio lordo obbligatorio';

    // Validazione Codice Fiscale
    if (data.codiceFiscale && !isValidCF(data.codiceFiscale)) {
      errors.codiceFiscale = 'Codice Fiscale non valido';
    }

    // Validazione INPS (9.19%)
    if (data.stipendioLordo && data.inps) {
      const inpsCalcolato = data.stipendioLordo * 0.0919;
      const diff = Math.abs(inpsCalcolato - data.inps);
      
      if (diff > 10) {
        warnings.inps = `INPS calcolato: €${inpsCalcolato.toFixed(2)}, inserito: €${data.inps.toFixed(2)}`;
      }
    }

    // Validazione IRPEF semplificata
    if (data.stipendioLordo && data.irpef) {
      const irpefStimato = calculateIRPEF(data.stipendioLordo * 12) / 12;
      const diff = Math.abs(irpefStimato - data.irpef);
      
      if (diff > 50) {
        warnings.irpef = `IRPEF stimato: €${irpefStimato.toFixed(2)}, inserito: €${data.irpef.toFixed(2)}`;
      }
    }
  };

  // Utility functions
  const isValidVAT = (vat) => {
    return /^\d{11}$/.test(vat);
  };

  const isValidCF = (cf) => {
    return /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cf.toUpperCase());
  };

  const calculateIRPEF = (annualIncome) => {
    if (annualIncome <= 28000) return annualIncome * 0.23;
    if (annualIncome <= 50000) return 28000 * 0.23 + (annualIncome - 28000) * 0.35;
    return 28000 * 0.23 + 22000 * 0.35 + (annualIncome - 50000) * 0.43;
  };

  // Handlers
  const handleInputChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    validateForm(updatedData);
  };

  const handleAutoCalculate = () => {
    if (documentData?.type === 'fattura') {
      const newData = { ...formData };
      
      // Calcola IVA automaticamente
      if (newData.imponibile && newData.aliquotaIva) {
        newData.importoIva = (newData.imponibile * newData.aliquotaIva / 100).toFixed(2);
        newData.totale = (parseFloat(newData.imponibile) + parseFloat(newData.importoIva)).toFixed(2);
      }
      
      setFormData(newData);
      validateForm(newData);
    }
  };

  const handleGenerateXML = async () => {
    setIsGenerating(true);
    try {
      await onGenerateXML(formData);
    } finally {
      setIsGenerating(false);
    }
  };

  // Render form fields based on document type
  const renderInvoiceFields = () => (
    <div className="space-y-6">
      {/* Dati Documento */}
      <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
        <h4 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-4">📄 Dati Documento</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Numero Fattura *</label>
            <input
              type="text"
              value={formData.numero || ''}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl ${errors.numero ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white`}
              placeholder="es: 001"
            />
            {errors.numero && <p className="text-red-500 text-xs mt-1">{errors.numero}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Data Fattura *</label>
            <input
              type="date"
              value={formData.data || ''}
              onChange={(e) => handleInputChange('data', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl ${errors.data ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white`}
            />
            {errors.data && <p className="text-red-500 text-xs mt-1">{errors.data}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Divisa</label>
            <select
              value={formData.divisa || 'EUR'}
              onChange={(e) => handleInputChange('divisa', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="EUR">EUR - Euro</option>
              <option value="USD">USD - Dollaro</option>
              <option value="GBP">GBP - Sterlina</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cedente */}
      <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-xl border border-green-200 dark:border-green-700">
        <h4 className="text-lg font-bold text-green-700 dark:text-green-300 mb-4">🏢 Dati Cedente</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Denominazione *</label>
            <input
              type="text"
              value={formData.cedenteDenominazione || ''}
              onChange={(e) => handleInputChange('cedenteDenominazione', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl ${errors.cedenteDenominazione ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white`}
              placeholder="es: Mario Rossi S.r.l."
            />
            {errors.cedenteDenominazione && <p className="text-red-500 text-xs mt-1">{errors.cedenteDenominazione}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Partita IVA *</label>
            <input
              type="text"
              value={formData.cedentePartitaIva || ''}
              onChange={(e) => handleInputChange('cedentePartitaIva', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl ${errors.cedentePartitaIva ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white`}
              placeholder="12345678901"
              maxLength="11"
            />
            {errors.cedentePartitaIva && <p className="text-red-500 text-xs mt-1">{errors.cedentePartitaIva}</p>}
          </div>
        </div>
      </div>

      {/* Cessionario */}
      <div className="bg-purple-50 dark:bg-purple-900/30 p-6 rounded-xl border border-purple-200 dark:border-purple-700">
        <h4 className="text-lg font-bold text-purple-700 dark:text-purple-300 mb-4">👤 Dati Cessionario</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Nome</label>
            <input
              type="text"
              value={formData.cessionarioNome || ''}
              onChange={(e) => handleInputChange('cessionarioNome', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="es: Giovanni"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Cognome</label>
            <input
              type="text"
              value={formData.cessionarioCognome || ''}
              onChange={(e) => handleInputChange('cessionarioCognome', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="es: Bianchi"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Codice Fiscale</label>
            <input
              type="text"
              value={formData.cessionarioCodiceFiscale || ''}
              onChange={(e) => handleInputChange('cessionarioCodiceFiscale', e.target.value.toUpperCase())}
              className={`w-full px-4 py-3 border rounded-xl ${errors.cessionarioCodiceFiscale ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white`}
              placeholder="RSSMRA80A01H501U"
              maxLength="16"
            />
            {errors.cessionarioCodiceFiscale && <p className="text-red-500 text-xs mt-1">{errors.cessionarioCodiceFiscale}</p>}
          </div>
        </div>
      </div>

      {/* Importi */}
      <div className="bg-orange-50 dark:bg-orange-900/30 p-6 rounded-xl border border-orange-200 dark:border-orange-700">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-bold text-orange-700 dark:text-orange-300">💰 Importi</h4>
          <button
            onClick={handleAutoCalculate}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-all duration-300 text-sm"
          >
            🧮 Calcola Auto
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Imponibile €</label>
            <input
              type="number"
              step="0.01"
              value={formData.imponibile || ''}
              onChange={(e) => handleInputChange('imponibile', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="1000.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Aliquota IVA %</label>
            <select
              value={formData.aliquotaIva || 22}
              onChange={(e) => handleInputChange('aliquotaIva', parseFloat(e.target.value))}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value={4}>4% - Beni di prima necessità</option>
              <option value={10}>10% - Alimentari, farmaci</option>
              <option value={22}>22% - Standard</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">IVA €</label>
            <input
              type="number"
              step="0.01"
              value={formData.importoIva || ''}
              onChange={(e) => handleInputChange('importoIva', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="220.00"
            />
            {warnings.importoIva && <p className="text-yellow-600 text-xs mt-1">{warnings.importoIva}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Totale €</label>
            <input
              type="number"
              step="0.01"
              value={formData.totale || ''}
              onChange={(e) => handleInputChange('totale', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="1220.00"
            />
            {warnings.totale && <p className="text-yellow-600 text-xs mt-1">{warnings.totale}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPayslipFields = () => (
    <div className="space-y-6">
      {/* Anagrafica */}
      <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
        <h4 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-4">👤 Dati Dipendente</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Nome *</label>
            <input
              type="text"
              value={formData.nome || ''}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl ${errors.nome ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white`}
              placeholder="Mario Rossi"
            />
            {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Codice Fiscale *</label>
            <input
              type="text"
              value={formData.codiceFiscale || ''}
              onChange={(e) => handleInputChange('codiceFiscale', e.target.value.toUpperCase())}
              className={`w-full px-4 py-3 border rounded-xl ${errors.codiceFiscale ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white`}
              placeholder="RSSMRA80A01H501U"
              maxLength="16"
            />
            {errors.codiceFiscale && <p className="text-red-500 text-xs mt-1">{errors.codiceFiscale}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Matricola</label>
            <input
              type="text"
              value={formData.matricola || ''}
              onChange={(e) => handleInputChange('matricola', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="12345"
            />
          </div>
        </div>
      </div>

      {/* Retribuzione */}
      <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-xl border border-green-200 dark:border-green-700">
        <h4 className="text-lg font-bold text-green-700 dark:text-green-300 mb-4">💰 Retribuzione</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Stipendio Base €</label>
            <input
              type="number"
              step="0.01"
              value={formData.stipendioBase || ''}
              onChange={(e) => handleInputChange('stipendioBase', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Super Minimo €</label>
            <input
              type="number"
              step="0.01"
              value={formData.superMinimo || ''}
              onChange={(e) => handleInputChange('superMinimo', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Straordinari €</label>
            <input
              type="number"
              step="0.01"
              value={formData.straordinari || ''}
              onChange={(e) => handleInputChange('straordinari', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Lordo Totale € *</label>
            <input
              type="number"
              step="0.01"
              value={formData.stipendioLordo || ''}
              onChange={(e) => handleInputChange('stipendioLordo', parseFloat(e.target.value) || 0)}
              className={`w-full px-4 py-3 border rounded-xl ${errors.stipendioLordo ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white`}
            />
            {errors.stipendioLordo && <p className="text-red-500 text-xs mt-1">{errors.stipendioLordo}</p>}
          </div>
        </div>
      </div>

      {/* Contributi e Imposte */}
      <div className="bg-orange-50 dark:bg-orange-900/30 p-6 rounded-xl border border-orange-200 dark:border-orange-700">
        <h4 className="text-lg font-bold text-orange-700 dark:text-orange-300 mb-4">🏛️ Contributi e Imposte</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">INPS €</label>
            <input
              type="number"
              step="0.01"
              value={formData.inps || ''}
              onChange={(e) => handleInputChange('inps', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
            {warnings.inps && <p className="text-yellow-600 text-xs mt-1">{warnings.inps}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">INAIL €</label>
            <input
              type="number"
              step="0.01"
              value={formData.inail || ''}
              onChange={(e) => handleInputChange('inail', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">IRPEF €</label>
            <input
              type="number"
              step="0.01"
              value={formData.irpef || ''}
              onChange={(e) => handleInputChange('irpef', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
            {warnings.irpef && <p className="text-yellow-600 text-xs mt-1">{warnings.irpef}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Netto €</label>
            <input
              type="number"
              step="0.01"
              value={formData.netto || ''}
              onChange={(e) => handleInputChange('netto', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-7xl mx-auto max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-600">
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 dark:from-slate-200 dark:to-indigo-400 bg-clip-text text-transparent">
              ✏️ Editor Documento - {documentData?.type === 'fattura' ? 'Fattura' : 'Busta Paga'}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Correggi manualmente i dati estratti dall'AI
            </p>
          </div>
          
          {/* Status Validazione */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold ${
              validationStatus === 'valid' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                : validationStatus === 'invalid'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
            }`}>
              <span className="text-lg">
                {validationStatus === 'valid' ? '✅' : validationStatus === 'invalid' ? '❌' : '⏳'}
              </span>
              <span>
                {validationStatus === 'valid' ? 'Valido' : validationStatus === 'invalid' ? 'Errori' : 'Validando...'}
              </span>
            </div>
            
            <button 
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 p-2 rounded-xl transition-all duration-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Errori e Warning Summary */}
          {(Object.keys(errors).length > 0 || Object.keys(warnings).length > 0) && (
            <div className="mb-6 space-y-4">
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 rounded-xl p-4">
                  <h4 className="text-lg font-bold text-red-700 dark:text-red-300 mb-2">❌ Errori da Correggere ({Object.keys(errors).length})</h4>
                  <ul className="space-y-1">
                    {Object.entries(errors).map(([field, error]) => (
                      <li key={field} className="text-red-600 dark:text-red-400 text-sm">
                        • <strong>{field}:</strong> {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {Object.keys(warnings).length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
                  <h4 className="text-lg font-bold text-yellow-700 dark:text-yellow-300 mb-2">⚠️ Avvisi ({Object.keys(warnings).length})</h4>
                  <ul className="space-y-1">
                    {Object.entries(warnings).map(([field, warning]) => (
                      <li key={field} className="text-yellow-600 dark:text-yellow-400 text-sm">
                        • <strong>{field}:</strong> {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Form Fields */}
          {documentData?.type === 'fattura' ? renderInvoiceFields() : renderPayslipFields()}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 dark:border-slate-600 p-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Confidence AI: {((documentData?.extractedData?.confidence || 0.5) * 100).toFixed(1)}% | 
              Tipo: {documentData?.type || 'Sconosciuto'}
            </div>
            
            <div className="flex space-x-4">
              <button 
                onClick={onCancel}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-500 font-bold transition-all duration-300"
              >
                ❌ Annulla
              </button>
              
              {documentData?.type === 'fattura' && (
                <button 
                  onClick={handleGenerateXML}
                  disabled={validationStatus === 'invalid' || isGenerating}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg disabled:transform-none disabled:shadow-none"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generando XML...
                    </>
                  ) : (
                    <>📄 Genera XML FatturaPA</>
                  )}
                </button>
              )}
              
              <button 
                onClick={() => onSave(formData)}
                disabled={validationStatus === 'invalid'}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg disabled:transform-none disabled:shadow-none"
              >
                ✅ Salva Documento
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Esempio di utilizzo
const ExampleUsage = () => {
  const [showEditor, setShowEditor] = useState(false);
  const [documentData, setDocumentData] = useState(null);

  // Simula dati estratti dall'AI
  const mockInvoiceData = {
    type: 'fattura',
    extractedData: {
      numero: '001',
      data: '2025-07-16',
      cedenteDenominazione: 'Mario Rossi S.r.l.',
      cedentePartitaIva: '12345678901',
      cessionarioNome: 'Giovanni',
      cessionarioCognome: 'Bianchi',
      cessionarioCodiceFiscale: 'BNCGNN80A01H501U',
      imponibile: 1000,
      aliquotaIva: 22,
      importoIva: 220,
      totale: 1220,
      confidence: 0.85,
      needsReview: false
    }
  };

  const mockPayslipData = {
    type: 'busta_paga',
    extractedData: {
      nome: 'Mario Rossi',
      codiceFiscale: 'RSSMRA80A01H501U',
      matricola: '12345',
      stipendioBase: 1500,
      superMinimo: 200,
      straordinari: 100,
      stipendioLordo: 1800,
      inps: 165.42,
      inail: 10.80,
      irpef: 414,
      addizionali: 54,
      netto: 1155.78,
      periodo: '07/2025',
      confidence: 0.78,
      needsReview: true
    }
  };

  const handleSave = async (formData) => {
    console.log('💾 Salvando documento:', formData);
    
    // Chiamata API backend per salvare
    try {
      const response = await fetch('/api/documents/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: documentData.type,
          data: formData,
          corrected: true
        })
      });
      
      if (response.ok) {
        alert('✅ Documento salvato con successo!');
        setShowEditor(false);
      }
    } catch (error) {
      alert('❌ Errore salvare: ' + error.message);
    }
  };

  const handleGenerateXML = async (formData) => {
    console.log('📄 Generando XML FatturaPA:', formData);
    
    // Chiamata API backend per generare XML
    try {
      const response = await fetch('/api/documents/generate-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      }
    } catch (error) {
      alert('❌ Errore generazione XML: ' + error.message);
    }
  };

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">Test Editor Documenti</h2>
      
      <div className="flex space-x-4">
        <button 
          onClick={() => {
            setDocumentData(mockInvoiceData);
            setShowEditor(true);
          }}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold"
        >
          🧾 Test Editor Fattura
        </button>
        
        <button 
          onClick={() => {
            setDocumentData(mockPayslipData);
            setShowEditor(true);
          }}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold"
        >
          💰 Test Editor Busta Paga
        </button>
      </div>

      {showEditor && (
        <EditableDocumentForm
          documentData={documentData}
          onSave={handleSave}
          onCancel={() => setShowEditor(false)}
          onGenerateXML={handleGenerateXML}
        />
      )}
    </div>
  );
};

export default ExampleUsage;