import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import xmlGeneratorService from '../services/xmlGeneratorService.js';

const router = express.Router();

// POST /api/fattura/genera-xml
router.post('/genera-xml', authMiddleware, async (req, res) => {
  try {
    const {
      // Dati cedente (chi emette)
      cedente_piva,
      cedente_cf,
      cedente_ragione_sociale,
      cedente_indirizzo,
      cedente_cap,
      cedente_comune,
      cedente_provincia,
      cedente_nazione = 'IT',
      
      // Dati cessionario (cliente)
      cliente_piva,
      cliente_cf,
      cliente_ragione_sociale,
      cliente_indirizzo,
      cliente_cap,
      cliente_comune,
      cliente_provincia,
      cliente_nazione = 'IT',
      cliente_codice_destinatario = '0000000',
      cliente_pec,
      
      // Dati fattura
      numero_fattura,
      data_fattura,
      tipo_documento = 'TD01', // Fattura
      divisa = 'EUR',
      
      // Righe fattura
      righe, // Array di oggetti: [{descrizione, quantita, prezzo_unitario, aliquota_iva}]
      
      // Codici speciali PA
      cig,
      cup,
      codice_commessa,
      
      // Note
      causale,
      note
      
    } = req.body;

    // Validazione dati obbligatori
    const validationError = xmlGeneratorService.validateRequiredFields({
      cedente_piva,
      cedente_ragione_sociale,
      cliente_cf: cliente_cf || cliente_piva,
      cliente_ragione_sociale,
      numero_fattura,
      data_fattura,
      righe
    });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Genera XML e JSON strutturato
    const result = await xmlGeneratorService.generaFatturaXML({
      cedente: {
        piva: cedente_piva,
        cf: cedente_cf,
        ragione_sociale: cedente_ragione_sociale,
        indirizzo: cedente_indirizzo,
        cap: cedente_cap,
        comune: cedente_comune,
        provincia: cedente_provincia,
        nazione: cedente_nazione
      },
      cliente: {
        piva: cliente_piva,
        cf: cliente_cf,
        ragione_sociale: cliente_ragione_sociale,
        indirizzo: cliente_indirizzo,
        cap: cliente_cap,
        comune: cliente_comune,
        provincia: cliente_provincia,
        nazione: cliente_nazione,
        codice_destinatario: cliente_codice_destinatario,
        pec: cliente_pec
      },
      fattura: {
        numero: numero_fattura,
        data: data_fattura,
        tipo_documento,
        divisa,
        righe,
        cig,
        cup,
        codice_commessa,
        causale,
        note
      },
      user_id: req.user.id
    });

    res.json({
      success: true,
      xml_generato: true,
      file_path: result.xml_path,
      json_strutturato: result.json_data,
      totali: result.totali,
      validazione: result.validazione,
      download_url: `/api/files/${result.filename}`,
      message: `Fattura XML ${numero_fattura} generata correttamente`
    });

  } catch (error) {
    console.error('Errore generazione XML:', error);
    res.status(500).json({ 
      error: error.message,
      xml_generato: false 
    });
  }
});

// GET /api/fattura/template - Template vuoto per frontend
router.get('/template', authMiddleware, (req, res) => {
  res.json({
    template: {
      cedente: {
        piva: "12345678901",
        cf: "",
        ragione_sociale: "La Mia Azienda S.r.l.",
        indirizzo: "Via Roma 123",
        cap: "00100",
        comune: "Roma",
        provincia: "RM",
        nazione: "IT"
      },
      cliente: {
        piva: "",
        cf: "RSSMRA80A01H501Z",
        ragione_sociale: "Mario Rossi",
        indirizzo: "Via Milano 456",
        cap: "20100",
        comune: "Milano", 
        provincia: "MI",
        nazione: "IT",
        codice_destinatario: "0000000",
        pec: "mario.rossi@pec.it"
      },
      fattura: {
        numero: "2025/001",
        data: new Date().toISOString().split('T')[0],
        tipo_documento: "TD01",
        divisa: "EUR",
        righe: [
          {
            numero_riga: 1,
            descrizione: "Consulenza informatica",
            quantita: 1,
            prezzo_unitario: 1000.00,
            aliquota_iva: 22,
            natura_iva: ""
          }
        ],
        cig: "",
        cup: "",
        codice_commessa: "",
        causale: "Prestazione professionale",
        note: ""
      }
    }
  });
});

// GET /api/fattura/tipi-documento - Lista tipi documento
router.get('/tipi-documento', authMiddleware, (req, res) => {
  res.json({
    tipi_documento: [
      { codice: 'TD01', descrizione: 'Fattura' },
      { codice: 'TD02', descrizione: 'Acconto/Anticipo su fattura' },
      { codice: 'TD03', descrizione: 'Acconto/Anticipo su parcella' },
      { codice: 'TD04', descrizione: 'Nota di credito' },
      { codice: 'TD05', descrizione: 'Nota di debito' },
      { codice: 'TD06', descrizione: 'Parcella' },
      { codice: 'TD16', descrizione: 'Integrazione fattura reverse charge interno' },
      { codice: 'TD17', descrizione: 'Integrazione/autofattura per acquisto servizi dall\'estero' },
      { codice: 'TD18', descrizione: 'Integrazione per acquisto di beni intracomunitari' },
      { codice: 'TD19', descrizione: 'Integrazione/autofattura per acquisto di beni ex art.17 c.2 DPR 633/72' },
      { codice: 'TD20', descrizione: 'Autofattura per regolarizzazione e integrazione delle fatture' },
      { codice: 'TD21', descrizione: 'Autofattura per splafonamento' },
      { codice: 'TD22', descrizione: 'Estrazione beni da deposito IVA' },
      { codice: 'TD23', descrizione: 'Estrazione beni da deposito IVA con versamento dell\'IVA' },
      { codice: 'TD24', descrizione: 'Fattura differita di cui all\'art.21, comma 4, lett. a)' },
      { codice: 'TD25', descrizione: 'Fattura differita di cui all\'art.21, comma 4, lett. b)' },
      { codice: 'TD26', descrizione: 'Cessione di beni ammortizzabili e per passaggi interni' },
      { codice: 'TD27', descrizione: 'Fattura per autoconsumo o per cessioni gratuite senza rivalsa' }
    ]
  });
});

export default router;