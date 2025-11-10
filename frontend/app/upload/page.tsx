'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const router = useRouter();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.toLowerCase();
      if (ext.endsWith('.xml') || ext.endsWith('.pdf')) {
        setFile(selectedFile);
        setResult(null);
      } else {
        alert('Select a valid XML or PDF file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('client_id', '3'); // Add client_id for limits check

    try {
      const token = localStorage.getItem('ai_tax_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data);
      } else {
        alert(data.error || 'Upload error');
      }
    } catch (error) {
      alert('Connection error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">TaxPilot Assistant</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="text-blue-600 hover:text-blue-500"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Upload Tax Document
          </h2>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xml,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label 
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-lg text-gray-600">
                Click to select file
              </p>
              <p className="text-sm text-gray-500 mt-2">
                XML (E-Invoice) or PDF (Payslip)
              </p>
            </label>
          </div>

          {file && (
            <div className="mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Selected file:</strong> {file.name}
                </p>
                <p className="text-sm text-blue-600">
                  Type: {file.name.toLowerCase().endsWith('.xml') ? 'Electronic Invoice' : 'Payslip'}
                </p>
                <p className="text-sm text-blue-600">
                  Size: {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="mt-4 w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Processing...' : 'Validate with AI'}
              </button>
            </div>
          )}

          {result && (
            <div className="mt-6">
              <div className={`border rounded-lg p-4 ${
                result.documento?.technicalIssues > 0 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <h3 className={`text-lg font-medium mb-2 ${
                  result.documento?.technicalIssues > 0 
                    ? 'text-red-800' 
                    : 'text-green-800'
                }`}>
                  {result.documento?.technicalIssues > 0 ? '❌ Validation Failed' : '✅ Validation Completed'}
                </h3>
                <p className={`text-sm ${
                  result.documento?.technicalIssues > 0 
                    ? 'text-red-700' 
                    : 'text-green-700'
                }`}>
                  Technical Issues: {result.documento?.technicalIssues || 0}
                </p>
                {result.documento?.validationErrors && result.documento.validationErrors.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {result.documento.validationErrors.slice(0, 3).map((error, idx) => (
                      <p key={idx} className="text-sm text-red-600">
                        • {error.message}
                      </p>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => router.push(`/documents/${result.documento.id}`)}
                  className={`mt-3 px-4 py-2 rounded-md text-sm text-white ${
                    result.documento?.technicalIssues > 0 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  View Details
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
