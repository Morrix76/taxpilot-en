import express from 'express';
import { db } from '../db.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/clients
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.execute({
      sql: `SELECT 
              id, 
              nome_azienda as name,
              nome_azienda as company,
              partita_iva,
              codice_fiscale,
              created_at,
              'attivo' as status,
              'standard' as plan
            FROM clients 
            WHERE user_id = ?
            ORDER BY created_at DESC`,
      args: [userId]
    });

    res.json(result.rows);
    
  } catch (error) {
    console.error('Error retrieving clients:', error);
    res.status(500).json({ error: 'Error retrieving clients' });
  }
});

// POST /api/clients
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, company, email, phone, status = 'attivo' } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Client name is required' });
    }
    
    const insertResult = await db.execute({
      sql: `INSERT INTO clients (user_id, nome_azienda, partita_iva, codice_fiscale)
            VALUES (?, ?, ?, ?)`,
      args: [userId, name.trim(), phone?.trim() || null, email?.trim() || null]
    });

    const getResult = await db.execute({
      sql: `SELECT 
              id,
              nome_azienda as name,
              nome_azienda as company,
              partita_iva as phone,
              codice_fiscale as email,
              created_at,
              'attivo' as status,
              'standard' as plan
            FROM clients 
            WHERE id = ?`,
      args: [insertResult.lastInsertRowid]
    });
    
    res.status(201).json(getResult.rows[0]);
    
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Error creating client' });
  }
});

// GET /api/clients/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const userId = req.user.id;
    
    const result = await db.execute({
      sql: `SELECT 
              id,
              nome_azienda as name,
              nome_azienda as company,
              partita_iva,
              codice_fiscale,
              created_at,
              'attivo' as status,
              'standard' as plan
            FROM clients 
            WHERE id = ? AND user_id = ?`,
      args: [clientId, userId]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found or unauthorized' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error retrieving client:', error);
    res.status(500).json({ error: 'Error retrieving client' });
  }
});

// PUT /api/clients/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const userId = req.user.id;
    const { name, company, partita_iva, codice_fiscale } = req.body;

    const checkResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM clients WHERE id = ? AND user_id = ?`,
      args: [clientId, userId]
    });

    if (checkResult.rows[0].count === 0) {
      return res.status(404).json({ error: 'Client not found or unauthorized' });
    }

    await db.execute({
      sql: `UPDATE clients 
            SET nome_azienda = ?,
                partita_iva = ?,
                codice_fiscale = ?
            WHERE id = ? AND user_id = ?`,
      args: [
        name || company,
        partita_iva || null,
        codice_fiscale || null,
        clientId,
        userId
      ]
    });

    const getResult = await db.execute({
      sql: `SELECT 
              id,
              nome_azienda as name,
              nome_azienda as company,
              partita_iva,
              codice_fiscale,
              created_at,
              'attivo' as status,
              'standard' as plan
            FROM clients 
            WHERE id = ?`,
      args: [clientId]
    });

    res.json(getResult.rows[0]);

  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Error updating client' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const userId = req.user.id;

    const checkResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM clients WHERE id = ? AND user_id = ?`,
      args: [clientId, userId]
    });

    if (checkResult.rows[0].count === 0) {
      return res.status(404).json({ error: 'Client not found or unauthorized' });
    }

    await db.execute({
      sql: `DELETE FROM clients WHERE id = ? AND user_id = ?`,
      args: [clientId, userId]
    });

    res.status(200).json({ message: 'Client deleted successfully' });

  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Error deleting client' });
  }
});

export default router;
