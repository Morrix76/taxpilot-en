// backend/routes/piano-conti.js
import express from 'express';
import { db } from '../database/db.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware autenticazione
router.use(authMiddleware);

// GET /api/piano-conti/:clienteId - Ottieni piano conti per cliente
router.get('/:clienteId', (req, res) => {
  try {
    const { clienteId } = req.params;
    
    // Query per ottenere piano conti del cliente
    const stmt = db.prepare(`
      SELECT id, codice, descrizione, tipo, categoria, saldo, attivo
      FROM piano_conti 
      WHERE cliente_id = ? OR cliente_id IS NULL
      ORDER BY codice ASC
    `);
    
    const conti = stmt.all(clienteId);
    
    res.json({ 
      success: true, 
      conti,
      cliente_id: clienteId,
      count: conti.length
    });
    
  } catch (error) {
    console.error('Errore recupero piano conti:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore recupero piano conti',
      details: error.message
    });
  }
});

// POST /api/piano-conti/:clienteId - Crea nuovo conto per cliente  
router.post('/:clienteId', (req, res) => {
  try {
    const { clienteId } = req.params;
    const { codice, descrizione, tipo, categoria } = req.body;
    
    // Validazione dati
    if (!codice || !descrizione || !tipo || !categoria) {
      return res.status(400).json({
        success: false,
        error: 'Dati incompleti: codice, descrizione, tipo e categoria sono obbligatori'
      });
    }
    
    // Verifica codice univoco per cliente
    const checkStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM piano_conti 
      WHERE codice = ? AND (cliente_id = ? OR cliente_id IS NULL)
    `);
    
    const existing = checkStmt.get(codice, clienteId);
    if (existing.count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Codice conto già esistente per questo cliente'
      });
    }
    
    // Inserisci nuovo conto
    const insertStmt = db.prepare(`
      INSERT INTO piano_conti (codice, descrizione, tipo, categoria, cliente_id, saldo, attivo)
      VALUES (?, ?, ?, ?, ?, 0, 1)
    `);
    
    const result = insertStmt.run(codice, descrizione, tipo, categoria, clienteId);
    
    // Recupera conto creato
    const getStmt = db.prepare(`
      SELECT id, codice, descrizione, tipo, categoria, saldo, attivo
      FROM piano_conti 
      WHERE id = ?
    `);
    
    const nuovoConto = getStmt.get(result.lastInsertRowid);
    
    res.json({
      success: true,
      message: 'Conto creato con successo',
      conto: nuovoConto
    });
    
  } catch (error) {
    console.error('Errore creazione conto:', error);
    res.status(500).json({
      success: false,
      error: 'Errore creazione conto',
      details: error.message
    });
  }
});

// PUT /api/piano-conti/:clienteId/:contoId - Modifica conto
router.put('/:clienteId/:contoId', (req, res) => {
  try {
    const { clienteId, contoId } = req.params;
    const { codice, descrizione, tipo, categoria } = req.body;
    
    // Validazione dati
    if (!codice || !descrizione || !tipo || !categoria) {
      return res.status(400).json({
        success: false,
        error: 'Dati incompleti: codice, descrizione, tipo e categoria sono obbligatori'
      });
    }
    
    // Verifica esistenza conto
    const checkStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM piano_conti 
      WHERE id = ? AND (cliente_id = ? OR cliente_id IS NULL)
    `);
    
    const exists = checkStmt.get(contoId, clienteId);
    if (exists.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conto non trovato'
      });
    }
    
    // Verifica codice univoco (escludendo il conto corrente)
    const checkCodiceStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM piano_conti 
      WHERE codice = ? AND id != ? AND (cliente_id = ? OR cliente_id IS NULL)
    `);
    
    const duplicato = checkCodiceStmt.get(codice, contoId, clienteId);
    if (duplicato.count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Codice conto già esistente per questo cliente'
      });
    }
    
    // Aggiorna conto
    const updateStmt = db.prepare(`
      UPDATE piano_conti 
      SET codice = ?, descrizione = ?, tipo = ?, categoria = ?
      WHERE id = ? AND (cliente_id = ? OR cliente_id IS NULL)
    `);
    
    updateStmt.run(codice, descrizione, tipo, categoria, contoId, clienteId);
    
    // Recupera conto aggiornato
    const getStmt = db.prepare(`
      SELECT id, codice, descrizione, tipo, categoria, saldo, attivo
      FROM piano_conti 
      WHERE id = ?
    `);
    
    const contoAggiornato = getStmt.get(contoId);
    
    res.json({
      success: true,
      message: 'Conto modificato con successo',
      conto: contoAggiornato
    });
    
  } catch (error) {
    console.error('Errore modifica conto:', error);
    res.status(500).json({
      success: false,
      error: 'Errore modifica conto',
      details: error.message
    });
  }
});

// DELETE /api/piano-conti/:clienteId/:contoId - Elimina conto
router.delete('/:clienteId/:contoId', (req, res) => {
  try {
    const { clienteId, contoId } = req.params;
    
    // Verifica esistenza conto
    const checkStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM piano_conti 
      WHERE id = ? AND (cliente_id = ? OR cliente_id IS NULL)
    `);
    
    const exists = checkStmt.get(contoId, clienteId);
    if (exists.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conto non trovato'
      });
    }
    
    // Elimina conto
    const deleteStmt = db.prepare(`
      DELETE FROM piano_conti 
      WHERE id = ? AND (cliente_id = ? OR cliente_id IS NULL)
    `);
    
    const result = deleteStmt.run(contoId, clienteId);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conto non trovato o non eliminabile'
      });
    }
    
    res.json({
      success: true,
      message: 'Conto eliminato con successo'
    });
    
  } catch (error) {
    console.error('Errore eliminazione conto:', error);
    res.status(500).json({
      success: false,
      error: 'Errore eliminazione conto',
      details: error.message
    });
  }
});

export default router;