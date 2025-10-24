// /frontend/src/lib/authService.ts

import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator';
}

export interface Studio {
  id: string;
  name: string;
  subscription_tier: string;
  documents_limit: number;
  documents_used: number;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    studio: Studio;
    token: string;
  };
  error?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  vat_number: string;
  admin_name: string;
  admin_password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Interceptor per aggiungere token automaticamente
    this.api.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Interceptor per gestire errori auth
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ===== GESTIONE TOKEN =====
  
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token') || Cookies.get('auth_token') || null;
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
    Cookies.set('auth_token', token, { expires: 7 }); // 7 giorni
  }

  private removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    Cookies.remove('auth_token');
  }

  // ===== REGISTRAZIONE =====
  
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      console.log('📝 Registrazione studio:', data.name);
      
      const response = await this.api.post('/api/auth/register', data);
      
      if (response.data.success && response.data.data.token) {
        this.setToken(response.data.data.token);
        console.log('✅ Registrazione completata');
      }

      return response.data;

    } catch (error: any) {
      console.error('❌ Errore registrazione:', error.response?.data?.error || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || 'Errore durante la registrazione'
      };
    }
  }

  // ===== LOGIN =====
  
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      console.log('🔐 Login:', data.email);
      
      const response = await this.api.post('/api/auth/login', data);
      
      if (response.data.success && response.data.data.token) {
        this.setToken(response.data.data.token);
        console.log('✅ Login completato');
      }

      return response.data;

    } catch (error: any) {
      console.error('❌ Errore login:', error.response?.data?.error || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || 'Errore durante il login'
      };
    }
  }

  // ===== DEMO LOGIN =====
  
  async demoLogin(): Promise<AuthResponse> {
    try {
      console.log('🎮 Demo login...');
      
      const response = await this.api.post('/api/auth/demo-login');
      
      if (response.data.success && response.data.data.token) {
        this.setToken(response.data.data.token);
        console.log('✅ Demo login completato');
      }

      return response.data;

    } catch (error: any) {
      console.error('❌ Errore demo login:', error.message);
      
      return {
        success: false,
        error: 'Errore demo login'
      };
    }
  }

  // ===== VERIFICA TOKEN =====
  
  async verifyToken(): Promise<AuthResponse> {
    try {
      const token = this.getToken();
      
      if (!token) {
        return { success: false, error: 'Nessun token trovato' };
      }

      const response = await this.api.get('/api/auth/verify');
      
      return response.data;

    } catch (error: any) {
      console.error('❌ Token non valido:', error.message);
      this.removeToken();
      
      return {
        success: false,
        error: 'Token non valido'
      };
    }
  }

  // ===== LOGOUT =====
  
  async logout(): Promise<void> {
    try {
      await this.api.post('/api/auth/logout');
    } catch (error) {
      console.error('Errore logout API:', error);
    } finally {
      this.removeToken();
      console.log('👋 Logout completato');
    }
  }

  // ===== PROFILO UTENTE =====
  
  async getProfile(): Promise<AuthResponse> {
    try {
      const response = await this.api.get('/api/auth/profile');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Errore recupero profilo'
      };
    }
  }

  // ===== UTILITY =====
  
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentToken(): string | null {
    return this.getToken();
  }

  // ===== GESTIONE ERRORI =====
  
  handleAuthError(error: any): string {
    if (error.response?.data?.details) {
      return error.response.data.details.map((d: any) => d.msg).join(', ');
    }
    
    return error.response?.data?.error || error.message || 'Errore sconosciuto';
  }
}

// Esporta singleton
export const authService = new AuthService();
export default authService;