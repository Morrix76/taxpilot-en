import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Dati mock che simulano un database.
// In un'applicazione reale, questi verrebbero da query SQL filtrate per user_id.
const mockClientsStore = [
    { id: 1, userId: 1, name: 'Mario Rossi (Demo)', company: 'Rossi S.r.l.', email: 'mario.rossi@email.com', phone: '+39 333 1234567', status: 'attivo', plan: 'standard' },
    { id: 2, userId: 1, name: 'Anna Verdi (Demo)', company: 'Verdi & Partners', email: 'anna.verdi@email.com', phone: '+39 347 7654321', status: 'attivo', plan: 'premium' },
    { id: 3, userId: 2, name: 'Luigi Bianchi (Altro Utente)', company: 'Bianchi Studio', email: 'luigi.bianchi@email.com', phone: '+39 339 9876543', status: 'sospeso', plan: 'standard' }
];

// NUOVO: Endpoint per aprire cartelle Windows
router.post('/open-folder', (req, res) => {
  const { path: folderPath } = req.body;
  
  if (!folderPath) {
    return res.status(400).json({ error: 'Percorso cartella richiesto' });
  }
  
  console.log(`📁 Richiesta apertura cartella: ${folderPath}`);
  
  // Comando Windows per aprire Esplora File
  exec(`explorer "${folderPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Errore apertura cartella:', error);
      return res.status(500).json({ 
        error: 'Impossibile aprire cartella', 
        details: error.message 
      });
    }
    
    console.log('✅ Cartella aperta con successo');
    res.json({ success: true, message: 'Cartella aperta' });
  });
});

// GET /api/clients - Lista clienti (PROTETTA)
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log(`👥 GET /api/clients chiamato da user: ${req.user.id}`);
    
    // Simula il recupero dei clienti solo per l'utente loggato
    const userClients = mockClientsStore.filter(client => client.userId === req.user.id);
    
    console.log(`👥 Restituendo ${userClients.length} clienti per l'utente ${req.user.id}`);
    res.json(userClients);
    
  } catch (error) {
    console.error(`❌ Errore nel recuperare i clienti per l'utente ${req.user.id}:`, error);
    res.status(500).json({ error: 'Errore nel recupero dei clienti' });
  }
});

// POST /api/clients - Crea nuovo cliente (PROTETTA)
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log(`👥 POST /api/clients chiamato da user: ${req.user.id}`);
    
    const { name, company, email, phone, status = 'attivo' } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Il nome del cliente è obbligatorio' });
    }
    
    // Simula creazione cliente associato all'utente
    const newClient = {
      id: Date.now(),
      userId: req.user.id, // Associa all'utente loggato
      name: name.trim(),
      company: company?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      status: status,
      plan: 'standard',
      created_at: new Date().toISOString()
    };

    mockClientsStore.push(newClient);
    
    console.log('✅ Cliente creato:', newClient);
    res.status(201).json(newClient);
    
  } catch (error) {
    console.error(`❌ Errore creazione cliente per l'utente ${req.user.id}:`, error);
    res.status(500).json({ error: 'Errore durante la creazione del cliente' });
  }
});

// GET /api/clients/:id - Dettaglio cliente (PROTETTA)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    console.log(`👥 GET /api/clients/${clientId} da user: ${req.user.id}`);
    
    const client = mockClientsStore.find(c => c.id === clientId && c.userId === req.user.id);

    if (!client) {
        return res.status(404).json({ error: 'Cliente non trovato o non autorizzato.' });
    }
    
    res.json(client);
    
  } catch (error) {
    console.error(`❌ Errore nel recuperare il cliente ${req.params.id} per l'utente ${req.user.id}:`, error);
    res.status(500).json({ error: 'Errore nel recupero del cliente' });
  }
});

// PUT /api/clients/:id - Modifica cliente (PROTETTA)  
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const clientId = parseInt(req.params.id);
        console.log(`👥 PUT /api/clients/${clientId} da user: ${req.user.id}`);
        
        const clientIndex = mockClientsStore.findIndex(c => c.id === clientId && c.userId === req.user.id);

        if (clientIndex === -1) {
            return res.status(404).json({ error: 'Cliente non trovato o non autorizzato.' });
        }

        const updatedClient = {
            ...mockClientsStore[clientIndex],
            ...req.body,
            id: clientId, // Assicura che l'ID non venga sovrascritto
            userId: req.user.id, // Assicura che l'userId non venga sovrascritto
            updated_at: new Date().toISOString()
        };
        
        mockClientsStore[clientIndex] = updatedClient;

        console.log('✅ Cliente aggiornato:', updatedClient);
        res.json(updatedClient);

    } catch (error) {
        console.error(`❌ Errore modifica cliente ${req.params.id} per l'utente ${req.user.id}:`, error);
        res.status(500).json({ error: 'Errore durante la modifica del cliente' });
    }
});

// DELETE /api/clients/:id - Elimina cliente (PROTETTA)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const clientId = parseInt(req.params.id);
        console.log(`👥 DELETE /api/clients/${clientId} da user: ${req.user.id}`);

        const clientIndex = mockClientsStore.findIndex(c => c.id === clientId && c.userId === req.user.id);

        if (clientIndex === -1) {
            return res.status(404).json({ error: 'Cliente non trovato o non autorizzato.' });
        }

        mockClientsStore.splice(clientIndex, 1);

        console.log(`✅ Cliente ${clientId} eliminato per l'utente ${req.user.id}`);
        res.status(200).json({ message: 'Cliente eliminato con successo' });

    } catch (error) {
        console.error(`❌ Errore eliminazione cliente ${req.params.id} per l'utente ${req.user.id}:`, error);
        res.status(500).json({ error: 'Errore durante l\'eliminazione del cliente' });
    }
});

// GET /api/clients/folders - Mapping clienti-cartelle
router.get('/folders', authMiddleware, async (req, res) => {
  try {
    console.log('📁 Richiesta mapping clienti-cartelle');
    
    const userClients = mockClientsStore.filter(client => client.userId === req.user.id);
    const uploadsPath = path.join(process.cwd(), 'uploads', 'clienti');
    const mapping = [];
    
    for (const client of userClients) {
      const clientFolderPath = path.join(uploadsPath, client.id.toString());
      let folderExists = false;
      let documentsCount = 0;
      let categories = {};
      
      try {
        await fs.access(clientFolderPath);
        folderExists = true;
        
        // Conta documenti nelle cartelle
        const categoriesList = ['fatture', 'buste-paga', 'altri'];
        for (const category of categoriesList) {
          try {
            const files = await fs.readdir(path.join(clientFolderPath, category));
            categories[category] = files.length;
            documentsCount += files.length;
          } catch {
            categories[category] = 0;
          }
        }
      } catch {
        folderExists = false;
        categories = { fatture: 0, 'buste-paga': 0, altri: 0 };
      }
      
      mapping.push({
        id: client.id,
        nome: client.name,
        company: client.company,
        cartella_path: `uploads/clienti/${client.id}`,
        cartella_exists: folderExists,
        documenti_totali: documentsCount,
        documenti_per_categoria: categories
      });
    }
    
    res.json({ 
      success: true, 
      mapping,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Errore mapping:', error);
    res.status(500).json({ 
      error: 'Errore mapping clienti-cartelle', 
      details: error.message 
    });
  }
});

export default router;