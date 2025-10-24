// /backend/services/database.js

const { createClient } = require('@supabase/supabase-js');

class DatabaseService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase non configurato - usando dati simulati');
      this.supabase = null;
      this.mockMode = true;
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.mockMode = false;
      console.log('✅ Database Supabase connesso');
    }
  }

  // ===== GESTIONE DOCUMENTI =====
  
  async saveDocument(documentData) {
    if (this.mockMode) {
      console.log('📝 MOCK: Salvando documento:', documentData.original_filename);
      return { 
        success: true, 
        data: { id: `mock-${Date.now()}`, ...documentData } 
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('documents')
        .insert([{
          studio_id: documentData.studio_id,
          client_id: documentData.client_id,
          user_id: documentData.user_id,
          original_filename: documentData.original_filename,
          file_size: documentData.file_size,
          file_type: documentData.file_type,
          status: documentData.status || 'processing',
          parsed_data: documentData.parsed_data,
          validation_result: documentData.validation_result,
          ai_analysis: documentData.ai_analysis,
          ai_confidence_score: documentData.ai_confidence_score,
          ai_model: documentData.ai_model,
          ai_tokens_used: documentData.ai_tokens_used,
          processing_completed_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Documento salvato nel database:', data.id);
      return { success: true, data };

    } catch (error) {
      console.error('❌ Errore salvataggio documento:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getDocuments(studioId, filters = {}) {
    if (this.mockMode) {
      const mockDocuments = [
        {
          id: 'mock-1',
          original_filename: 'fattura_001.xml',
          file_type: 'fattura_elettronica',
          status: 'completed',
          client: { name: 'Rossi Mario SRL' },
          created_at: new Date().toISOString()
        },
        {
          id: 'mock-2', 
          original_filename: 'busta_paga_maggio.pdf',
          file_type: 'busta_paga',
          status: 'completed',
          client: { name: 'Bianchi Giuseppe' },
          created_at: new Date().toISOString()
        }
      ];
      
      return { success: true, data: mockDocuments, total: mockDocuments.length };
    }

    try {
      let query = this.supabase
        .from('documents')
        .select(`
          *,
          client:clients(name),
          user:users(name)
        `)
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false });

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return { success: true, data, total: count };

    } catch (error) {
      console.error('❌ Errore recupero documenti:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getDocumentById(documentId) {
    if (this.mockMode) {
      return {
        success: true,
        data: {
          id: documentId,
          original_filename: 'documento_mock.xml',
          ai_analysis: 'Analisi AI simulata per testing'
        }
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select(`
          *,
          client:clients(name, fiscal_code),
          user:users(name)
        `)
        .eq('id', documentId)
        .single();

      if (error) throw error;

      return { success: true, data };

    } catch (error) {
      console.error('❌ Errore recupero documento:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ===== GESTIONE CLIENTI =====

  async getClients(studioId) {
    if (this.mockMode) {
      const mockClients = [
        { id: 'mock-1', name: 'Rossi Mario SRL', fiscal_code: 'RSSMRA80A01H501Z' },
        { id: 'mock-2', name: 'Bianchi Giuseppe', fiscal_code: 'BNCGPP75B15F205W' },
        { id: 'mock-3', name: 'Verdi Spa', vat_number: '98765432109' }
      ];
      
      return { success: true, data: mockClients };
    }

    try {
      const { data, error } = await this.supabase
        .from('clients')
        .select('*')
        .eq('studio_id', studioId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return { success: true, data };

    } catch (error) {
      console.error('❌ Errore recupero clienti:', error.message);
      return { success: false, error: error.message };
    }
  }

  async createClient(clientData) {
    if (this.mockMode) {
      return {
        success: true,
        data: { id: `mock-${Date.now()}`, ...clientData }
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };

    } catch (error) {
      console.error('❌ Errore creazione cliente:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ===== GESTIONE STUDI =====

  async getStudioById(studioId) {
    if (this.mockMode) {
      return {
        success: true,
        data: {
          id: 'mock-studio-1',
          name: 'Studio Fiscale Demo',
          email: 'demo@studiofiscale.it',
          subscription_tier: 'pro',
          documents_limit: 100,
          documents_used: 15
        }
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('studios')
        .select('*')
        .eq('id', studioId)
        .single();

      if (error) throw error;

      return { success: true, data };

    } catch (error) {
      console.error('❌ Errore recupero studio:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ===== AUDIT TRAIL =====

  async logConversation(conversationData) {
    if (this.mockMode) {
      console.log('📝 MOCK: Log conversazione AI');
      return { success: true };
    }

    try {
      const { data, error } = await this.supabase
        .from('conversation_logs')
        .insert([conversationData]);

      if (error) throw error;

      return { success: true, data };

    } catch (error) {
      console.error('❌ Errore log conversazione:', error.message);
      return { success: false, error: error.message };
    }
  }

  async logAuditAction(auditData) {
    if (this.mockMode) {
      console.log('📝 MOCK: Audit log:', auditData.action);
      return { success: true };
    }

    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .insert([auditData]);

      if (error) throw error;

      return { success: true, data };

    } catch (error) {
      console.error('❌ Errore audit log:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ===== STATISTICHE =====

  async getDashboardStats(studioId) {
    if (this.mockMode) {
      return {
        success: true,
        data: {
          documenti_processati: 127,
          clienti_attivi: 15,
          documenti_questo_mese: 23,
          accuratezza_media: 0.98
        }
      };
    }

    try {
      // Query multiple per statistiche
      const [documentsCount, clientsCount, thisMonthDocs] = await Promise.all([
        this.supabase
          .from('documents')
          .select('id', { count: 'exact' })
          .eq('studio_id', studioId),
        
        this.supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .eq('studio_id', studioId)
          .eq('is_active', true),
        
        this.supabase
          .from('documents')
          .select('id', { count: 'exact' })
          .eq('studio_id', studioId)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ]);

      return {
        success: true,
        data: {
          documenti_processati: documentsCount.count || 0,
          clienti_attivi: clientsCount.count || 0,
          documenti_questo_mese: thisMonthDocs.count || 0,
          accuratezza_media: 0.95 // Calcolo da implementare
        }
      };

    } catch (error) {
      console.error('❌ Errore statistiche dashboard:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ===== GESTIONE AUTENTICAZIONE =====

  async saveStudio(studioData) {
    if (this.mockMode) {
      console.log('📝 MOCK: Salvando studio:', studioData.name);
      return { success: true, data: studioData };
    }

    try {
      const { data, error } = await this.supabase
        .from('studios')
        .insert([studioData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('❌ Errore salvataggio studio:', error.message);
      return { success: false, error: error.message };
    }
  }

  async saveUser(userData) {
    if (this.mockMode) {
      console.log('📝 MOCK: Salvando utente:', userData.email);
      return { success: true, data: userData };
    }

    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('❌ Errore salvataggio utente:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getUserByEmail(email) {
    if (this.mockMode) {
      const mockUser = {
        id: 'mock-user-1',
        studio_id: 'mock-studio-1',
        email: email,
        password_hash: '$2a$12$mockhashedpassword',
        name: 'Utente Demo',
        role: 'admin',
        is_active: true
      };
      
      return email === 'demo@studiofiscale.it' 
        ? { success: true, data: mockUser }
        : { success: false, data: null };
    }

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return { success: !!data, data };
    } catch (error) {
      console.error('❌ Errore recupero utente by email:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getUserById(userId) {
    if (this.mockMode) {
      const mockUser = {
        id: userId,
        studio_id: 'mock-studio-1',
        email: 'demo@studiofiscale.it',
        name: 'Utente Demo',
        role: 'admin',
        is_active: true
      };
      
      return { success: true, data: mockUser };
    }

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('❌ Errore recupero utente by id:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getStudioByVatNumber(vatNumber) {
    if (this.mockMode) {
      return { success: false, data: null };
    }

    try {
      const { data, error } = await this.supabase
        .from('studios')
        .select('*')
        .eq('vat_number', vatNumber)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return { success: !!data, data };
    } catch (error) {
      console.error('❌ Errore recupero studio by VAT:', error.message);
      return { success: false, error: error.message };
    }
  }

  async updateUserLastLogin(userId) {
    if (this.mockMode) {
      console.log('📝 MOCK: Aggiornamento ultimo login per:', userId);
      return { success: true };
    }

    try {
      const { error } = await this.supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('❌ Errore aggiornamento ultimo login:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    if (this.mockMode) {
      return { success: true, message: 'Mock database attivo' };
    }

    try {
      const { data, error } = await this.supabase
        .from('studios')
        .select('count', { count: 'exact' })
        .limit(1);

      if (error) throw error;

      return { success: true, message: 'Database connesso' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = DatabaseService;