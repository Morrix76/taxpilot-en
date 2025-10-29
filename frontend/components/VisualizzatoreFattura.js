import React, { useState, useEffect } from 'react';

const VisualizzatoreFattura = ({ documentId }) => {
    const [fattura, setFattura] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getElementText = (element, tagName) => {
        const node = element.getElementsByTagName(tagName)[0];
        return node ? node.textContent : 'N/A';
    };

    const getAnagrafica = (element, anagraficaTagName, denominazioneTagName) => {
        const anagrafica = element.getElementsByTagName(anagraficaTagName)[0];
        if (!anagrafica) return 'N/A';
        return getElementText(anagrafica, denominazioneTagName) || `${getElementText(anagrafica, 'Nome')} ${getElementText(anagrafica, 'Cognome')}`;
    };

    const getIndirizzo = (element) => {
        const sede = element.getElementsByTagName('Sede')[0];
        if (!sede) return 'Indirizzo non disponibile';
        return `${getElementText(sede, 'Indirizzo')} ${getElementText(sede, 'NumeroCivico') || ''}, ${getElementText(sede, 'CAP')} ${getElementText(sede, 'Comune')} (${getElementText(sede, 'Provincia')})`;
    };

    const getIdFiscale = (element) => {
        const idFiscaleIVA = element.getElementsByTagName('IdFiscaleIVA')[0];
        if (idFiscaleIVA) {
            return `P.IVA: ${getElementText(idFiscaleIVA, 'IdPaese')}${getElementText(idFiscaleIVA, 'IdCodice')}`;
        }
        const codiceFiscale = getElementText(element, 'CodiceFiscale');
        return codiceFiscale ? `C.F.: ${codiceFiscale}` : 'N/A';
    };


    useEffect(() => {
        const fetchAndParseDocument = async () => {
            if (!documentId) {
                setFattura(null);
                return;
            }

            setLoading(true);
            setError(null);
            setFattura(null);

            try {
                const response = await fetch(`/api/documents/${documentId}/content`);

                if (!response.ok) {
                    throw new Error(`Errore HTTP: ${response.status} - ${response.statusText}`);
                }

                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "application/xml");
                
                const errorNode = xmlDoc.querySelector('parsererror');
                if (errorNode) {
                    throw new Error("Errore durante il parsing del file XML.");
                }

                const header = xmlDoc.getElementsByTagName('FatturaElettronicaHeader')[0];
                const body = xmlDoc.getElementsByTagName('FatturaElettronicaBody')[0];

                if (!header || !body) {
                    throw new Error("Struttura XML della fattura non valida.");
                }
                
                // Cedente (Supplier)
                const cedente = header.getElementsByTagName('CedentePrestatore')[0];
                const datiAnagraficiCedente = cedente.getElementsByTagName('DatiAnagrafici')[0];
                
                // Cessionario (Customer)
                const cessionario = header.getElementsByTagName('CessionarioCommittente')[0];

                // Dati Generali
                const datiGeneraliDocumento = body.getElementsByTagName('DatiGeneraliDocumento')[0];
                
                // Linee di Dettaglio
                const dettaglioLineeNodes = body.getElementsByTagName('DettaglioLinee');
                const linee = Array.from(dettaglioLineeNodes).map(linea => ({
                    numero: getElementText(linea, 'NumeroLinea'),
                    descrizione: getElementText(linea, 'Descrizione'),
                    quantita: parseFloat(getElementText(linea, 'Quantita') || '0').toFixed(2),
                    prezzoUnitario: parseFloat(getElementText(linea, 'PrezzoUnitario') || '0').toFixed(2),
                    prezzoTotale: parseFloat(getElementText(linea, 'PrezzoTotale') || '0').toFixed(2),
                    aliquotaIVA: parseFloat(getElementText(linea, 'AliquotaIVA') || '0').toFixed(2),
                }));

                // Dati di Riepilogo
                const datiRiepilogoNodes = body.getElementsByTagName('DatiRiepilogo');
                const riepilogo = Array.from(datiRiepilogoNodes).map(dato => ({
                    aliquotaIVA: parseFloat(getElementText(dato, 'AliquotaIVA') || '0').toFixed(2),
                    imponibile: parseFloat(getElementText(dato, 'ImponibileImporto') || '0').toFixed(2),
                    imposta: parseFloat(getElementText(dato, 'Imposta') || '0').toFixed(2),
                    esigibilita: getElementText(dato, 'EsigibilitaIVA'),
                }));
                
                const datiPagamentoNodes = body.getElementsByTagName('DatiPagamento');
                const totale = Array.from(datiPagamentoNodes).map(dato => ({
                    importo: parseFloat(getElementText(dato.getElementsByTagName('DettaglioPagamento')[0], 'ImportoPagamento') || '0').toFixed(2)
                }));


                setFattura({
                    cedente: {
                        denominazione: getAnagrafica(datiAnagraficiCedente, 'Anagrafica', 'Denominazione'),
                        idFiscale: getIdFiscale(datiAnagraficiCedente),
                        regimeFiscale: getElementText(datiAnagraficiCedente, 'RegimeFiscale'),
                        indirizzo: getIndirizzo(cedente),
                    },
                    cessionario: {
                        denominazione: getElementText(cessionario.getElementsByTagName('DatiAnagrafici')[0], 'CodiceFiscale') 
                                      ? `${getElementText(cessionario.getElementsByTagName('Anagrafica')[0], 'Nome')} ${getElementText(cessionario.getElementsByTagName('Anagrafica')[0], 'Cognome')}`
                                      : getElementText(cessionario.getElementsByTagName('Anagrafica')[0], 'Denominazione'),
                        idFiscale: getIdFiscale(cessionario.getElementsByTagName('DatiAnagrafici')[0]),
                        indirizzo: getIndirizzo(cessionario),
                    },
                    datiGenerali: {
                        tipoDocumento: getElementText(datiGeneraliDocumento, 'TipoDocumento'),
                        divisa: getElementText(datiGeneraliDocumento, 'Divisa'),
                        data: getElementText(datiGeneraliDocumento, 'Data'),
                        numero: getElementText(datiGeneraliDocumento, 'Numero'),
                    },
                    linee,
                    riepilogo,
                    totale: totale.length > 0 ? totale[0].importo : '0.00'
                });

            } catch (err) {
                setError(err.message);
                console.error("Errore nel recupero o parsing della fattura:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAndParseDocument();
    }, [documentId]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Caricamento dati fattura...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500 bg-red-100 border border-red-400 rounded-lg">Errore: {error}</div>;
    }

    if (!fattura) {
        return <div className="p-8 text-center text-gray-400">Seleziona un documento per visualizzare i dettagli.</div>;
    }

    return (
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-4xl mx-auto my-8 font-sans">
            {/* Header */}
            <header className="flex justify-between items-start pb-6 border-b-2 border-gray-200 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Fattura</h1>
                    <p className="text-gray-500">{fattura.datiGenerali.tipoDocumento}</p>
                </div>
                <div className="text-right">
                    <p className="text-xl font-semibold text-gray-700">Numero: {fattura.datiGenerali.numero}</p>
                    <p className="text-gray-500">Data: {new Date(fattura.datiGenerali.data).toLocaleDateString('it-IT')}</p>
                </div>
            </header>

            {/* Mittente e Destinatario */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Da:</h2>
                    <p className="font-bold text-gray-800">{fattura.cedente.denominazione}</p>
                    <p className="text-gray-600">{fattura.cedente.indirizzo}</p>
                    <p className="text-gray-600">{fattura.cedente.idFiscale}</p>
                    <p className="text-gray-600 text-sm mt-1">{fattura.cedente.regimeFiscale.replace(/_/g, ' ')}</p>
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">A:</h2>
                    <p className="font-bold text-gray-800">{fattura.cessionario.denominazione}</p>
                    <p className="text-gray-600">{fattura.cessionario.indirizzo}</p>
                    <p className="text-gray-600">{fattura.cessionario.idFiscale}</p>
                </div>
            </section>

            {/* Linee di Dettaglio */}
            <section className="mb-8">
                <table className="w-full text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-sm font-semibold text-gray-600">Descrizione</th>
                            <th className="p-3 text-sm font-semibold text-gray-600 text-right">Q.tà</th>
                            <th className="p-3 text-sm font-semibold text-gray-600 text-right">Prezzo Unit.</th>
                            <th className="p-3 text-sm font-semibold text-gray-600 text-right">IVA %</th>
                            <th className="p-3 text-sm font-semibold text-gray-600 text-right">Totale</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fattura.linee.map((linea, index) => (
                            <tr key={index} className="border-b border-gray-100">
                                <td className="p-3 text-gray-700">{linea.descrizione}</td>
                                <td className="p-3 text-gray-700 text-right">{linea.quantita}</td>
                                <td className="p-3 text-gray-700 text-right">€ {linea.prezzoUnitario}</td>
                                <td className="p-3 text-gray-700 text-right">{linea.aliquotaIVA}%</td>
                                <td className="p-3 text-gray-800 font-medium text-right">€ {linea.prezzoTotale}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* Riepilogo e Totale */}
            <section className="flex justify-end">
                <div className="w-full md:w-1/2 lg:w-2/5">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Riepilogo IVA</h3>
                    <div className="space-y-2">
                        {fattura.riepilogo.map((item, index) => (
                            <div key={index} className="flex justify-between text-gray-600">
                                <span>Imponibile {item.aliquotaIVA}%</span>
                                <span>€ {item.imponibile}</span>
                            </div>
                        ))}
                        {fattura.riepilogo.map((item, index) => (
                             <div key={index} className="flex justify-between text-gray-600">
                                <span>IVA {item.aliquotaIVA}%</span>
                                <span>€ {item.imposta}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t-2 border-gray-200">
                        <div className="flex justify-between items-center text-xl font-bold text-gray-800">
                            <span>Totale da Pagare</span>
                            <span>€ {fattura.totale}</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default VisualizzatoreFattura;
