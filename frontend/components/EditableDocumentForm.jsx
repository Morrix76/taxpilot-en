// frontend/components/EditableDocumentForm.jsx

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

  // Initialize form with extracted data
  useEffect(() => {
    if (documentData?.extractedData) {
      setFormData(documentData.extractedData);
      validateForm(documentData.extractedData);
    }
  }, [documentData]);

  // Real-time validation
  const validateForm = (data) => {
    const newErrors = {};
    const newWarnings = {};

    if (documentData?.type === 'fattura') { // Keep internal type name
      validateInvoice(data, newErrors, newWarnings);
    } else if (documentData?.type === 'busta_paga') { // Keep internal type name
      validatePayslip(data, newErrors, newWarnings);
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    setValidationStatus(Object.keys(newErrors).length === 0 ? 'valid' : 'invalid');
  };

  // Invoice validation
  const validateInvoice = (data, errors, warnings) => {
    // Required fields
    if (!data.numero) errors.numero = 'Invoice number required';
    if (!data.data) errors.data = 'Invoice date required';
    if (!data.cedenteDenominazione) errors.cedenteDenominazione = 'Supplier name required';
    if (!data.cedentePartitaIva) errors.cedentePartitaIva = 'Supplier VAT required';

    // VAT number validation
    if (data.cedentePartitaIva && !isValidVAT(data.cedentePartitaIva)) {
      errors.cedentePartitaIva = 'Invalid VAT number (11 digits)';
    }

    // Tax Code validation
    if (data.cessionarioCodiceFiscale && !isValidCF(data.cessionarioCodiceFiscale)) {
      errors.cessionarioCodiceFiscale = 'Invalid Tax Code';
    }

    // VAT calculation validation
    if (data.imponibile && data.aliquotaIva) {
      const ivaCalcolata = (data.imponibile * data.aliquotaIva) / 100;
      const diff = Math.abs(ivaCalcolata - (data.importoIva || 0));

      if (diff > 0.01) { // Allow for small rounding differences
        warnings.importoIva = `Calculated VAT: €${ivaCalcolata.toFixed(2)}, entered: €${(data.importoIva || 0).toFixed(2)}`;
      }
    }

    // Total validation
    if (data.imponibile && data.importoIva) {
      const totaleCalcolato = parseFloat(data.imponibile || 0) + parseFloat(data.importoIva || 0); // Ensure numbers
      const diff = Math.abs(totaleCalcolato - (data.totale || 0));

      if (diff > 0.01) {
        warnings.totale = `Calculated Total: €${totaleCalcolato.toFixed(2)}, entered: €${(data.totale || 0).toFixed(2)}`;
      }
    }
  };

  // Payslip validation
  const validatePayslip = (data, errors, warnings) => {
    // Required fields
    if (!data.nome) errors.nome = 'Employee name required';
    if (!data.codiceFiscale) errors.codiceFiscale = 'Tax Code required';
    if (!data.stipendioLordo) errors.stipendioLordo = 'Gross salary required';

    // Tax Code validation
    if (data.codiceFiscale && !isValidCF(data.codiceFiscale)) {
      errors.codiceFiscale = 'Invalid Tax Code';
    }

    // INPS validation (9.19%) - Approximate check
    if (data.stipendioLordo && data.inps) {
      const inpsCalcolato = data.stipendioLordo * 0.0919;
      const diff = Math.abs(inpsCalcolato - data.inps);

      if (diff > 10) { // Allow some tolerance
        warnings.inps = `Calculated INPS: €${inpsCalcolato.toFixed(2)}, entered: €${(data.inps || 0).toFixed(2)}`;
      }
    }

    // Simplified IRPEF validation - Approximate check
    if (data.stipendioLordo && data.irpef) {
      const irpefStimato = calculateIRPEF(data.stipendioLordo * 12) / 12; // Simple annual estimate
      const diff = Math.abs(irpefStimato - data.irpef);

      if (diff > 50) { // Allow significant tolerance
        warnings.irpef = `Estimated IRPEF: €${irpefStimato.toFixed(2)}, entered: €${(data.irpef || 0).toFixed(2)}`;
      }
    }
  };

  // Utility functions
  const isValidVAT = (vat) => {
    // Basic Italian VAT format check
    return /^\d{11}$/.test(vat);
  };

  const isValidCF = (cf) => {
    // Basic Italian Tax Code format check
    return /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(cf); // Case-insensitive
  };

  const calculateIRPEF = (annualIncome) => {
    // Simplified 2025 IRPEF calculation for estimation
    if (annualIncome <= 28000) return annualIncome * 0.23;
    if (annualIncome <= 50000) return 28000 * 0.23 + (annualIncome - 28000) * 0.35;
    return 28000 * 0.23 + (50000 - 28000) * 0.35 + (annualIncome - 50000) * 0.43;
  };

  // Handlers
  const handleInputChange = (field, value) => {
    let processedValue = value;
    // Handle numeric fields, ensuring they are stored as numbers if possible
    if (['imponibile', 'aliquotaIva', 'importoIva', 'totale', 'stipendioBase', 'superMinimo', 'straordinari', 'stipendioLordo', 'inps', 'inail', 'irpef', 'netto'].includes(field)) {
      processedValue = value === '' ? null : parseFloat(value); // Store as null if empty, else parse float
      if (isNaN(processedValue)) processedValue = 0; // Default to 0 if parsing fails
    }
     if (field === 'cessionarioCodiceFiscale' || field === 'codiceFiscale') {
       processedValue = value.toUpperCase(); // Ensure Tax Codes are uppercase
     }

    const updatedData = { ...formData, [field]: processedValue };
    setFormData(updatedData);
    validateForm(updatedData); // Validate after state update
  };


  const handleAutoCalculate = () => {
    if (documentData?.type === 'fattura') {
      let newData = { ...formData };

      // Ensure imponibile and aliquotaIva are numbers before calculation
      const taxable = parseFloat(newData.imponibile || 0);
      const rate = parseFloat(newData.aliquotaIva || 0);

      // Calculate VAT automatically
      if (!isNaN(taxable) && !isNaN(rate)) {
        const calculatedVAT = (taxable * rate) / 100;
        newData.importoIva = parseFloat(calculatedVAT.toFixed(2)); // Store as number
        newData.totale = parseFloat((taxable + calculatedVAT).toFixed(2)); // Store as number
      } else {
        newData.importoIva = 0;
        newData.totale = taxable; // If rate is invalid, total is just taxable
      }

      setFormData(newData);
      validateForm(newData);
    }
     // Add auto-calculation for payslip if needed
     // else if (documentData?.type === 'busta_paga') { ... }
  };

  const handleGenerateXML = async () => {
    setIsGenerating(true);
    try {
      // Ensure numeric fields are numbers before sending
      const dataToSend = { ...formData };
      Object.keys(dataToSend).forEach(key => {
          if (['imponibile', 'aliquotaIva', 'importoIva', 'totale'].includes(key)) {
              dataToSend[key] = parseFloat(dataToSend[key] || 0);
          }
      });
      await onGenerateXML(dataToSend);
    } catch (error) {
       console.error("Error during XML Generation call:", error);
       alert("An error occurred while generating the XML file."); // User feedback
    } finally {
      setIsGenerating(false);
    }
  };


  // Render form fields based on document type
  const renderInvoiceFields = () => (
    <div className="space-y-6">
      {/* Document Data */}
      <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
        <h4 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-4">📄 Document Data</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Invoice Number *</label>
            <input
              type="text"
              value={formData.numero || ''}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl ${errors.numero ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white`}
              placeholder="e.g., 001"
            />
            {errors.numero && <p className="text-red-500 text-xs mt-1">{errors.numero}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Invoice Date *</label>
            <input
              type="date"
              value={formData.data || ''}
              onChange={(e) => handleInputChange('data', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl ${errors.data ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white`}
            />
            {errors.data && <p className="text-red-500 text-xs mt-1">{errors.data}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Currency</label>
            <select
              value={formData.divisa || 'EUR'}
              onChange={(e) => handleInputChange('divisa', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="EUR">EUR - Euro</option>
              <option value="USD">USD - Dollar</option>
              <option value="GBP">GBP - Pound</option>
            </select>
          </div>
        </div>
      </div>

      {/* Supplier */}
      <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-xl border border-green-200 dark:border-green-700">
        <h4 className="text-lg font-bold text-green-700 dark:text-green-300 mb-4">🏢 Supplier Data</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Company Name *</label>
            <input
              type="text"
              value={formData.cedenteDenominazione || ''}
              onChange={(e) => handleInputChange('cedenteDenominazione', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl ${errors.cedenteDenominazione ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white`}
              placeholder="e.g., Mario Rossi S.r.l."
            />
            {errors.cedenteDenominazione && <p className="text-red-500 text-xs mt-1">{errors.cedenteDenominazione}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">VAT Number *</label>
            <input
              type="text"
              value={formData.cedentePartitaIva || ''}
              onChange={(e) => handleInputChange('cedentePartitaIva', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl ${errors.cedentePartitaIva ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white`}
              placeholder="12345678901"
              maxLength={11}
            />
            {errors.cedentePartitaIva && <p className="text-red-500 text-xs mt-1">{errors.cedentePartitaIva}</p>}
          </div>
        </div>
      </div>

      {/* Customer */}
      <div className="bg-purple-50 dark:bg-purple-900/30 p-6 rounded-xl border border-purple-200 dark:border-purple-700">
        <h4 className="text-lg font-bold text-purple-700 dark:text-purple-300 mb-4">👤 Customer Data</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">First Name</label>
            <input
              type="text"
              value={formData.cessionarioNome || ''}
              onChange={(e) => handleInputChange('cessionarioNome', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="e.g., Giovanni"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Last Name</label>
            <input
              type="text"
              value={formData.cessionarioCognome || ''}
              onChange={(e) => handleInputChange('cessionarioCognome', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="e.g., Bianchi"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Tax Code</label>
            <input
              type="text"
              value={formData.cessionarioCodiceFiscale || ''}
              onChange={(e) => handleInputChange('cessionarioCodiceFiscale', e.target.value)} // Uppercase handled in handler
              className={`w-full px-4 py-3 border rounded-xl ${errors.cessionarioCodiceFiscale ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white uppercase`} // Added uppercase class for visual cue
              placeholder="RSSMRA80A01H501U"
              maxLength={16}
            />
            {errors.cessionarioCodiceFiscale && <p className="text-red-500 text-xs mt-1">{errors.cessionarioCodiceFiscale}</p>}
          </div>
        </div>
      </div>

      {/* Amounts */}
      <div className="bg-orange-50 dark:bg-orange-900/30 p-6 rounded-xl border border-orange-200 dark:border-orange-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2"> {/* Responsive layout */}
          <h4 className="text-lg font-bold text-orange-700 dark:text-orange-300">💰 Amounts</h4>
          <button
            onClick={handleAutoCalculate}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-colors duration-200 text-sm"
          >
            🧮 Auto Calculate
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Taxable Amount €</label>
            <input
              type="number"
              step="0.01"
              value={formData.imponibile ?? ''} // Handle null/undefined for controlled input
              onChange={(e) => handleInputChange('imponibile', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="1000.00"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">VAT Rate %</label>
            <select
              value={formData.aliquotaIva ?? 22} // Default to 22 if undefined
              onChange={(e) => handleInputChange('aliquotaIva', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value={4}>4% - Essential goods</option>
              <option value={5}>5% - Specific services</option> {/* Added 5% rate */}
              <option value={10}>10% - Food, medicine</option>
              <option value={22}>22% - Standard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">VAT €</label>
            <input
              type="number"
              step="0.01"
              value={formData.importoIva ?? ''}
              onChange={(e) => handleInputChange('importoIva', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="220.00"
            />
            {warnings.importoIva && <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">{warnings.importoIva}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Total €</label>
            <input
              type="number"
              step="0.01"
              value={formData.totale ?? ''}
              onChange={(e) => handleInputChange('totale', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="1220.00"
            />
            {warnings.totale && <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">{warnings.totale}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPayslipFields = () => (
    <div className="space-y-6">
      {/* Employee Data */}
      <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
        <h4 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-4">👤 Employee Data</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Name *</label>
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
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Tax Code *</label>
            <input
              type="text"
              value={formData.codiceFiscale || ''}
              onChange={(e) => handleInputChange('codiceFiscale', e.target.value)} // Uppercase handled in handler
              className={`w-full px-4 py-3 border rounded-xl ${errors.codiceFiscale ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white uppercase`} // Uppercase class
              placeholder="RSSMRA80A01H501U"
              maxLength={16}
            />
            {errors.codiceFiscale && <p className="text-red-500 text-xs mt-1">{errors.codiceFiscale}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Employee ID</label>
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

      {/* Salary Details */}
      <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-xl border border-green-200 dark:border-green-700">
        <h4 className="text-lg font-bold text-green-700 dark:text-green-300 mb-4">💰 Salary Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Base Salary €</label>
            <input
              type="number"
              step="0.01"
              value={formData.stipendioBase ?? ''}
              onChange={(e) => handleInputChange('stipendioBase', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Super Minimo €</label>
            <input
              type="number"
              step="0.01"
              value={formData.superMinimo ?? ''}
              onChange={(e) => handleInputChange('superMinimo', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Overtime €</label>
            <input
              type="number"
              step="0.01"
              value={formData.straordinari ?? ''}
              onChange={(e) => handleInputChange('straordinari', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Total Gross € *</label>
            <input
              type="number"
              step="0.01"
              value={formData.stipendioLordo ?? ''}
              onChange={(e) => handleInputChange('stipendioLordo', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl ${errors.stipendioLordo ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white`}
            />
            {errors.stipendioLordo && <p className="text-red-500 text-xs mt-1">{errors.stipendioLordo}</p>}
          </div>
        </div>
      </div>

      {/* Contributions and Taxes */}
      <div className="bg-orange-50 dark:bg-orange-900/30 p-6 rounded-xl border border-orange-200 dark:border-orange-700">
        <h4 className="text-lg font-bold text-orange-700 dark:text-orange-300 mb-4">🏛️ Contributions and Taxes</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">INPS €</label>
            <input
              type="number"
              step="0.01"
              value={formData.inps ?? ''}
              onChange={(e) => handleInputChange('inps', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
            {warnings.inps && <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">{warnings.inps}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">INAIL €</label>
            <input
              type="number"
              step="0.01"
              value={formData.inail ?? ''}
              onChange={(e) => handleInputChange('inail', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">IRPEF €</label>
            <input
              type="number"
              step="0.01"
              value={formData.irpef ?? ''}
              onChange={(e) => handleInputChange('irpef', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
            {warnings.irpef && <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">{warnings.irpef}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Net Pay €</label>
            <input
              type="number"
              step="0.01"
              value={formData.netto ?? ''}
              onChange={(e) => handleInputChange('netto', e.target.value)}
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 border-b border-slate-200 dark:border-slate-600 gap-4"> {/* Responsive padding and gap */}
          <div>
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-indigo-600 dark:from-slate-200 dark:to-indigo-400 bg-clip-text text-transparent">
              {/* Conditional title based on document type */}
              ✏️ Document Editor - {documentData?.type === 'fattura' ? 'Invoice' : documentData?.type === 'busta_paga' ? 'Payslip' : 'Document'}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm sm:text-base">
              Manually correct the data extracted by AI
            </p>
          </div>

          {/* Validation Status and Close Button */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold text-xs sm:text-sm ${ // Responsive sizing
              validationStatus === 'valid'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : validationStatus === 'invalid'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 animate-pulse' // Pulse for pending
            }`}>
              <span className="text-lg">
                {validationStatus === 'valid' ? '✅' : validationStatus === 'invalid' ? '❌' : '⏳'}
              </span>
              <span>
                {validationStatus === 'valid' ? 'Valid' : validationStatus === 'invalid' ? 'Errors' : 'Validating...'}
              </span>
            </div>

            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 p-1.5 sm:p-2 rounded-lg transition-colors duration-200" // Adjusted padding and transition
              aria-label="Close editor" // Accessibility
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Error and Warning Summary */}
          {(Object.keys(errors).length > 0 || Object.keys(warnings).length > 0) && (
            <div className="mb-6 space-y-4">
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 rounded-xl p-4">
                  <h4 className="text-base sm:text-lg font-bold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2"> {/* Responsive text size and icon */}
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 102 0V5zm-1 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                     Errors to Fix ({Object.keys(errors).length})
                  </h4>
                  <ul className="space-y-1 pl-5 list-disc"> {/* List styling */}
                    {Object.entries(errors).map(([field, error]) => (
                      <li key={field} className="text-red-600 dark:text-red-400 text-xs sm:text-sm">
                        <strong className="capitalize">{field.replace(/([A-Z])/g, ' $1')}:</strong> {error} {/* Format field name */}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Object.keys(warnings).length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
                  <h4 className="text-base sm:text-lg font-bold text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-2"> {/* Responsive text size and icon */}
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 100-2 1 1 0 000 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                     Warnings ({Object.keys(warnings).length})
                  </h4>
                  <ul className="space-y-1 pl-5 list-disc"> {/* List styling */}
                    {Object.entries(warnings).map(([field, warning]) => (
                      <li key={field} className="text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm">
                        <strong className="capitalize">{field.replace(/([A-Z])/g, ' $1')}:</strong> {warning} {/* Format field name */}
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
        <div className="border-t border-slate-200 dark:border-slate-600 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Left Side: Meta Info */}
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center sm:text-left">
              <span>AI Confidence: {((formData?.confidence || 0) * 100).toFixed(0)}%</span> {/* Use formData for current confidence */}
              <span className="mx-2">|</span>
              <span>Type: {documentData?.type === 'fattura' ? 'Invoice' : documentData?.type === 'busta_paga' ? 'Payslip' : 'Unknown'}</span>
            </div>

            {/* Right Side: Action Buttons */}
            <div className="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-3"> {/* Responsive gap and wrapping */}
              <button
                onClick={onCancel}
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-500 font-bold transition-colors duration-200 text-xs sm:text-sm"
              >
                ❌ Cancel
              </button>

              {/* Generate XML Button (Conditional) */}
              {documentData?.type === 'fattura' && (
                <button
                  onClick={handleGenerateXML}
                  disabled={validationStatus === 'invalid' || isGenerating}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-bold transition-colors duration-200 shadow-md hover:shadow-lg disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-xs sm:text-sm" // Added flex items-center
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating XML...
                    </>
                  ) : (
                    <>📄 Generate FatturaPA XML</>
                  )}
                </button>
              )}

              {/* Save Button */}
              <button
                onClick={() => onSave(formData)}
                disabled={validationStatus === 'invalid'}
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-bold transition-colors duration-200 shadow-md hover:shadow-lg disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                ✅ Save Document
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditableDocumentForm;
