// /backend/services/auth.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  constructor(databaseService) {
    this.database = databaseService;
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    this.jwtExpiry = process.env.JWT_EXPIRES_IN || '7d';
  }

  // ===== REGISTRAZIONE STUDIO FISCALE =====
  
  async registerStudio(studioData) {
    try {
      // Valida dati input
      const validation = this.validateStudioData(studioData);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      // Controlla se studio esiste già
      const existingStudio = await this.checkStudioExists(studioData.email, studioData.vat_number);
      if (existingStudio.exists) {
        return { success: false, error: 'Studio già registrato con questa email o P.IVA' };
      }

      // Hash password admin
      const hashedPassword = await bcrypt.hash(studioData.admin_password, 12);

      // Crea studio
      const studioId = uuidv4();
      const studio = {
        id: studioId,
        name: studioData.name,
        vat_number: studioData.vat_number,
        email: studioData.email,
        subscription_tier: 'free',
        subscription_status: 'active',
        documents_limit: 10,
        documents_used: 0
      };

      // Crea utente admin
      const adminUser = {
        id: uuidv4(),
        studio_id: studioId,
        email: studioData.email,
        password_hash: hashedPassword,
        name: studioData.admin_name,
        role: 'admin',
        is_active: true
      };

      // Salva nel database (mock o reale)
      const studioResult = await this.database.saveStudio(studio);
      const userResult = await this.database.saveUser(adminUser);

      if (!studioResult.success || !userResult.success) {
        return { 
          success: false, 
          error: 'Errore durante la registrazione dello studio' 
        };
      }

      // Genera JWT token
      const token = this.generateToken(adminUser, studio);

      console.log(`✅ Studio registrato: ${studio.name}`);

      return {
        success: true,
        data: {
          studio: {
            id: studio.id,
            name: studio.name,
            email: studio.email,
            subscription_tier: studio.subscription_tier
          },
          user: {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role
          },
          token
        }
      };

    } catch (error) {
      console.error('❌ Errore registrazione studio:', error.message);
      return { success: false, error: 'Errore interno durante la registrazione' };
    }
  }

  // ===== LOGIN =====
  
  async login(email, password) {
    try {
      // Trova utente nel database
      const userResult = await this.database.getUserByEmail(email);
      
      if (!userResult.success || !userResult.data) {
        return { success: false, error: 'Credenziali non valide' };
      }

      const user = userResult.data;

      // Verifica password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        return { success: false, error: 'Credenziali non valide' };
      }

      // Controlla se utente è attivo
      if (!user.is_active) {
        return { success: false, error: 'Account disattivato' };
      }

      // Recupera dati studio
      const studioResult = await this.database.getStudioById(user.studio_id);
      
      if (!studioResult.success) {
        return { success: false, error: 'Errore recupero dati studio' };
      }

      const studio = studioResult.data;

      // Genera token
      const token = this.generateToken(user, studio);

      // Log ultimo login
      await this.database.updateUserLastLogin(user.id);

      console.log(`✅ Login effettuato: ${user.email}`);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          studio: {
            id: studio.id,
            name: studio.name,
            subscription_tier: studio.subscription_tier,
            documents_limit: studio.documents_limit,
            documents_used: studio.documents_used
          },
          token
        }
      };

    } catch (error) {
      console.error('❌ Errore login:', error.message);
      return { success: false, error: 'Errore interno durante il login' };
    }
  }

  // ===== VERIFICA TOKEN =====
  
  async verifyToken(token) {
    try {
      // Decodifica JWT
      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Recupera utente aggiornato
      const userResult = await this.database.getUserById(decoded.userId);
      
      if (!userResult.success || !userResult.data) {
        return { success: false, error: 'Token non valido' };
      }

      const user = userResult.data;

      // Verifica se utente è ancora attivo
      if (!user.is_active) {
        return { success: false, error: 'Account disattivato' };
      }

      // Recupera studio
      const studioResult = await this.database.getStudioById(user.studio_id);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          studio: studioResult.success ? {
            id: studioResult.data.id,
            name: studioResult.data.name,
            subscription_tier: studioResult.data.subscription_tier
          } : null
        }
      };

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { success: false, error: 'Token scaduto' };
      }
      
      console.error('❌ Errore verifica token:', error.message);
      return { success: false, error: 'Token non valido' };
    }
  }

  // ===== GESTIONE UTENTI STUDIO =====
  
  async createStudioUser(adminUserId, userData) {
    try {
      // Verifica che l'utente admin esista e sia admin
      const adminResult = await this.database.getUserById(adminUserId);
      
      if (!adminResult.success || adminResult.data.role !== 'admin') {
        return { success: false, error: 'Non autorizzato a creare utenti' };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Crea nuovo utente
      const newUser = {
        id: uuidv4(),
        studio_id: adminResult.data.studio_id,
        email: userData.email,
        password_hash: hashedPassword,
        name: userData.name,
        role: userData.role || 'operator',
        is_active: true
      };

      const result = await this.database.saveUser(newUser);

      if (!result.success) {
        return { success: false, error: 'Errore creazione utente' };
      }

      return {
        success: true,
        data: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      };

    } catch (error) {
      console.error('❌ Errore creazione utente:', error.message);
      return { success: false, error: 'Errore interno' };
    }
  }

  // ===== UTILITY FUNCTIONS =====
  
  generateToken(user, studio) {
    const payload = {
      userId: user.id,
      studioId: studio.id,
      email: user.email,
      role: user.role,
      studioName: studio.name
    };

    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn: this.jwtExpiry,
      issuer: 'ai-tax-assistant-pro'
    });
  }

  validateStudioData(data) {
    const errors = [];

    if (!data.name || data.name.length < 2) {
      errors.push('Nome studio richiesto (min 2 caratteri)');
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Email valida richiesta');
    }

    if (!data.vat_number || !/^\d{11}$/.test(data.vat_number)) {
      errors.push('Partita IVA deve essere di 11 cifre');
    }

    if (!data.admin_name || data.admin_name.length < 2) {
      errors.push('Nome amministratore richiesto');
    }

    if (!data.admin_password || data.admin_password.length < 6) {
      errors.push('Password deve avere almeno 6 caratteri');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async checkStudioExists(email, vatNumber) {
    try {
      const emailCheck = await this.database.getUserByEmail(email);
      const vatCheck = await this.database.getStudioByVatNumber(vatNumber);

      return {
        exists: emailCheck.success || vatCheck.success
      };
    } catch (error) {
      console.error('Errore check studio exists:', error);
      return { exists: false };
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ===== MIDDLEWARE AUTHENTICATION =====
  
  authMiddleware() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Token di accesso richiesto' });
        }

        const token = authHeader.substring(7);
        const verifyResult = await this.verifyToken(token);

        if (!verifyResult.success) {
          return res.status(401).json({ error: verifyResult.error });
        }

        // Aggiungi dati utente alla request
        req.user = verifyResult.data.user;
        req.studio = verifyResult.data.studio;

        next();

      } catch (error) {
        console.error('❌ Errore middleware auth:', error.message);
        res.status(500).json({ error: 'Errore interno autenticazione' });
      }
    };
  }

  // Middleware per verificare ruolo admin
  adminOnlyMiddleware() {
    return (req, res, next) => {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accesso riservato agli amministratori' });
      }
      next();
    };
  }
}

module.exports = AuthService;