// backend/routes/accounting.js
import express from 'express';
import contabilityService from '../services/contabilityService.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware autenticazione per tutte le route
router.use(authMiddleware);

// Inizializza tabelle contabilità
router.post('/initialize', async (req, res) => {
  try {
    await contabilityService.initializeTables();
    await contabilityService.createDefaultChartOfAccounts();
    res.json({ success: true, message: 'Contabilità inizializzata' });
  } catch (error) {
    console.error('Errore inizializzazione contabilità:', error);
    res.status(500).json({ error: 'Errore inizializzazione contabilità' });
  }
});

// GET piano dei conti
router.get('/chart-of-accounts', async (req, res) => {
  try {
    const accounts = await contabilityService.getChartOfAccounts();
    res.json(accounts);
  } catch (error) {
    console.error('Errore recupero piano conti:', error);
    res.status(500).json({ error: 'Errore recupero piano conti' });
  }
});

// GET movimenti prima nota
router.get('/journal-entries', async (req, res) => {
  try {
    const filters = {
      clientId: req.query.client_id,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to
    };
    
    const entries = await contabilityService.getJournalEntries(filters);
    res.json(entries);
  } catch (error) {
    console.error('Errore recupero prima nota:', error);
    res.status(500).json({ error: 'Errore recupero prima nota' });
  }
});

// GET dettaglio movimento
router.get('/journal-entries/:id', async (req, res) => {
  try {
    const entryId = req.params.id;
    const details = await contabilityService.getJournalEntryDetails(entryId);
    res.json(details);
  } catch (error) {
    console.error('Errore recupero dettaglio movimento:', error);
    res.status(500).json({ error: 'Errore recupero dettaglio movimento' });
  }
});

// POST nuovo movimento prima nota
router.post('/journal-entries', async (req, res) => {
  try {
    const entryData = {
      date: req.body.date,
      reference: req.body.reference,
      description: req.body.description,
      clientId: req.body.client_id,
      documentId: req.body.document_id,
      totalAmount: req.body.total_amount,
      createdBy: req.user.id,
      lines: req.body.lines
    };

    // Validazione base
    if (!entryData.date || !entryData.description || !entryData.lines || entryData.lines.length === 0) {
      return res.status(400).json({ error: 'Dati movimento incompleti' });
    }

    // Verifica quadratura dare/avere
    let totalDebit = 0;
    let totalCredit = 0;
    
    entryData.lines.forEach(line => {
      totalDebit += parseFloat(line.debit || 0);
      totalCredit += parseFloat(line.credit || 0);
    });

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ error: 'Movimento non quadrato: dare e avere devono essere uguali' });
    }

    const entryId = await contabilityService.addJournalEntry(entryData);
    res.json({ success: true, entry_id: entryId });
  } catch (error) {
    console.error('Errore inserimento movimento:', error);
    res.status(500).json({ error: 'Errore inserimento movimento' });
  }
});

// GET registro IVA acquisti
router.get('/vat-register/purchases', async (req, res) => {
  try {
    const filters = {
      clientId: req.query.client_id,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to
    };
    
    const register = await contabilityService.getVatRegister('acquisti', filters);
    res.json(register);
  } catch (error) {
    console.error('Errore recupero registro IVA acquisti:', error);
    res.status(500).json({ error: 'Errore recupero registro IVA acquisti' });
  }
});

// GET registro IVA vendite
router.get('/vat-register/sales', async (req, res) => {
  try {
    const filters = {
      clientId: req.query.client_id,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to
    };
    
    const register = await contabilityService.getVatRegister('vendite', filters);
    res.json(register);
  } catch (error) {
    console.error('Errore recupero registro IVA vendite:', error);
    res.status(500).json({ error: 'Errore recupero registro IVA vendite' });
  }
});

// POST movimento registro IVA
router.post('/vat-register', async (req, res) => {
  try {
    const vatData = {
      type: req.body.type, // acquisti o vendite
      date: req.body.date,
      documentType: req.body.document_type,
      documentNumber: req.body.document_number,
      supplierCustomer: req.body.supplier_customer,
      vatNumber: req.body.vat_number,
      taxableAmount: req.body.taxable_amount,
      vatRate: req.body.vat_rate,
      vatAmount: req.body.vat_amount,
      totalAmount: req.body.total_amount,
      documentId: req.body.document_id,
      journalEntryId: req.body.journal_entry_id,
      clientId: req.body.client_id
    };

    // Validazione base
    if (!vatData.type || !vatData.date || !vatData.documentNumber || !vatData.supplierCustomer) {
      return res.status(400).json({ error: 'Dati registro IVA incompleti' });
    }

    if (!['acquisti', 'vendite'].includes(vatData.type)) {
      return res.status(400).json({ error: 'Tipo registro IVA non valido' });
    }

    const registerId = await contabilityService.addVatRegisterEntry(vatData);
    res.json({ success: true, register_id: registerId });
  } catch (error) {
    console.error('Errore inserimento registro IVA:', error);
    res.status(500).json({ error: 'Errore inserimento registro IVA' });
  }
});

// POST movimento automatico da documento
router.post('/auto-entry-from-document', async (req, res) => {
  try {
    const { documentId, clientId } = req.body;
    
    if (!documentId || !clientId) {
      return res.status(400).json({ error: 'ID documento e cliente richiesti' });
    }

    // Qui implementeremo la logica per creare automaticamente
    // movimenti contabili da fatture elettroniche
    // Per ora ritorniamo un placeholder
    
    res.json({ 
      success: true, 
      message: 'Funzione di creazione automatica movimenti in sviluppo',
      document_id: documentId,
      client_id: clientId 
    });
  } catch (error) {
    console.error('Errore creazione movimento automatico:', error);
    res.status(500).json({ error: 'Errore creazione movimento automatico' });
  }
});

// GET saldi conti
router.get('/account-balances', async (req, res) => {
  try {
    const { clientId, dateFrom, dateTo } = req.query;
    
    // Query per calcolare saldi conti
    // Per ora ritorniamo placeholder
    res.json({
      message: 'Calcolo saldi conti in sviluppo',
      filters: { clientId, dateFrom, dateTo }
    });
  } catch (error) {
    console.error('Errore calcolo saldi:', error);
    res.status(500).json({ error: 'Errore calcolo saldi' });
  }
});

export default router;