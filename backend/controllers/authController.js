import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const authController = {
  register: async (req, res) => {
    try {
      const { email, password, name, company } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e password obbligatori' });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email già registrata' });
      }

      const user = await User.create({ email, password, name, company });
      const token = generateToken(user.id);

      res.status(201).json({
        message: 'Registrazione completata',
        token,
        user: { id: user.id, email: user.email, name: user.name, company: user.company }
      });

    } catch (error) {
      console.error('Errore registrazione:', error);
      res.status(500).json({ error: 'Errore server durante registrazione' });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e password obbligatori' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Credenziali non valide' });
      }

      const isValidPassword = await User.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Credenziali non valide' });
      }

      const token = generateToken(user.id);

      res.json({
        message: 'Login effettuato',
        token,
        user: { id: user.id, email: user.email, name: user.name, company: user.company }
      });

    } catch (error) {
      console.error('Errore login:', error);
      res.status(500).json({ error: 'Errore server durante login' });
    }
  },

  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Errore profilo:', error);
      res.status(500).json({ error: 'Errore server' });
    }
  }
};

export default authController;