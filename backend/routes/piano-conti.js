import express from 'express';
import { db } from '../db.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// GET /api/piano-conti/:clienteId
router.get('/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    const result = await db.execute({
      sql: `SELECT id, codice, descrizione, tipo, categoria, saldo, attivo
            FROM piano_conti 
            WHERE cliente_id = ? OR cliente_id IS NULL
            ORDER BY codice ASC`,
      args: [clienteId]
    });
    
    res.json({ 
      success: true, 
      conti: result.rows,
      cliente_id: clienteId,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error retrieving chart of accounts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error retrieving chart of accounts',
      details: error.message
    });
  }
});

// POST /api/piano-conti/:clienteId
router.post('/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { codice, descrizione, tipo, categoria } = req.body;
    
    if (!codice || !descrizione || !tipo || !categoria) {
      return res.status(400).json({
        success: false,
        error: 'Incomplete data: code, description, type and category required'
      });
    }
    
    const checkResult = await db.execute({
      sql: `SELECT COUNT(*) as count 
            FROM piano_conti 
            WHERE codice = ? AND (cliente_id = ? OR cliente_id IS NULL)`,
      args: [codice, clienteId]
    });
    
    if (checkResult.rows[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Account code already exists for this client'
      });
    }
    
    const insertResult = await db.execute({
      sql: `INSERT INTO piano_conti (codice, descrizione, tipo, categoria, cliente_id, saldo, attivo)
            VALUES (?, ?, ?, ?, ?, 0, 1)`,
      args: [codice, descrizione, tipo, categoria, clienteId]
    });
    
    const getResult = await db.execute({
      sql: `SELECT id, codice, descrizione, tipo, categoria, saldo, attivo
            FROM piano_conti 
            WHERE id = ?`,
      args: [insertResult.lastInsertRowid]
    });
    
    res.json({
      success: true,
      message: 'Account created successfully',
      conto: getResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating account',
      details: error.message
    });
  }
});

// PUT /api/piano-conti/:clienteId/:contoId
router.put('/:clienteId/:contoId', async (req, res) => {
  try {
    const { clienteId, contoId } = req.params;
    const { codice, descrizione, tipo, categoria } = req.body;
    
    if (!codice || !descrizione || !tipo || !categoria) {
      return res.status(400).json({
        success: false,
        error: 'Incomplete data required'
      });
    }
    
    const checkResult = await db.execute({
      sql: `SELECT COUNT(*) as count 
            FROM piano_conti 
            WHERE id = ? AND (cliente_id = ? OR cliente_id IS NULL)`,
      args: [contoId, clienteId]
    });
    
    if (checkResult.rows[0].count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    const checkDupResult = await db.execute({
      sql: `SELECT COUNT(*) as count 
            FROM piano_conti 
            WHERE codice = ? AND id != ? AND (cliente_id = ? OR cliente_id IS NULL)`,
      args: [codice, contoId, clienteId]
    });
    
    if (checkDupResult.rows[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Account code already exists'
      });
    }
    
    await db.execute({
      sql: `UPDATE piano_conti 
            SET codice = ?, descrizione = ?, tipo = ?, categoria = ?
            WHERE id = ? AND (cliente_id = ? OR cliente_id IS NULL)`,
      args: [codice, descrizione, tipo, categoria, contoId, clienteId]
    });
    
    const getResult = await db.execute({
      sql: `SELECT id, codice, descrizione, tipo, categoria, saldo, attivo
            FROM piano_conti 
            WHERE id = ?`,
      args: [contoId]
    });
    
    res.json({
      success: true,
      message: 'Account updated successfully',
      conto: getResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating account',
      details: error.message
    });
  }
});

// DELETE /api/piano-conti/:clienteId/:contoId
router.delete('/:clienteId/:contoId', async (req, res) => {
  try {
    const { clienteId, contoId } = req.params;
    
    const checkResult = await db.execute({
      sql: `SELECT COUNT(*) as count 
            FROM piano_conti 
            WHERE id = ? AND (cliente_id = ? OR cliente_id IS NULL)`,
      args: [contoId, clienteId]
    });
    
    if (checkResult.rows[0].count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    const deleteResult = await db.execute({
      sql: `DELETE FROM piano_conti 
            WHERE id = ? AND (cliente_id = ? OR cliente_id IS NULL)`,
      args: [contoId, clienteId]
    });
    
    if (deleteResult.rowsAffected === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found or cannot be deleted'
      });
    }
    
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting account',
      details: error.message
    });
  }
});

export default router;
