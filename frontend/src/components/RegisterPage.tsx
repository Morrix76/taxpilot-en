"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, Building, User, Hash, ArrowRight, Loader, CheckCircle } from 'lucide-react';
import authService, { RegisterData } from '@/lib/authService';

const RegisterPage = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Form, 2: Success
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterData>();

  const onSubmit = async (data: RegisterData) => {
    setIsLoading(true);
    setError('');

    try {
      console.log('📝 Registrazione studio:', data);
      
      const result = await authService.register(data);
      
      if (result.success) {
        console.log('✅ Registrazione completata');
        setStep(2);
        
        // Reindirizza dopo 3 secondi
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setError(result.error || 'Errore durante la registrazione');
      }
    } catch (err: any) {
      setError('Errore di connessione al server');
      console.error('Errore registrazione:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center">
            <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={40} />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              🎉 Studio Registrato con Successo!
            </h1>
            
            <p className="text-gray-600 mb-6">
              Il tuo studio fiscale è stato configurato correttamente. 
              Sarai reindirizzato alla dashboard...
            </p>
            
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader className="animate-spin" size={20} />
              <span>Caricamento dashboard...</span>
            </div>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Vai subito alla dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Building className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Registra il tuo Studio</h1>
          <p className="text-blue-200">Crea il tuo account professionale</p>
        </div>

        {/* Register Form */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Nome Studio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Studio *
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  {...register('name', { 
                    required: 'Nome studio richiesto',
                    minLength: {
                      value: 2,
                      message: 'Nome deve avere almeno 2 caratteri'
                    }
                  })}
                  type="text"
                  placeholder="Studio Fiscale Rossi & Associati"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Email Studio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Studio *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  {...register('email', { 
                    required: 'Email richiesta',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email non valida'
                    }
                  })}
                  type="email"
                  placeholder="info@studiofiscale.it"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Partita IVA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Partita IVA *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  {...register('vat_number', { 
                    required: 'Partita IVA richiesta',
                    pattern: {
                      value: /^\d{11}$/,
                      message: 'Partita IVA deve essere di 11 cifre'
                    }
                  })}
                  type="text"
                  placeholder="12345678901"
                  maxLength={11}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              {errors.vat_number && (
                <p className="text-red-500 text-sm mt-1">{errors.vat_number.message}</p>
              )}
            </div>

            {/* Nome Amministratore */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Amministratore *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  {...register('admin_name', { 
                    required: 'Nome amministratore richiesto',
                    minLength: {
                      value: 2,
                      message: 'Nome deve avere almeno 2 caratteri'
                    }
                  })}
                  type="text"
                  placeholder="Mario Rossi"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              {errors.admin_name && (
                <p className="text-red-500 text-sm mt-1">{errors.admin_name.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  {...register('admin_password', { 
                    required: 'Password richiesta',
                    minLength: {
                      value: 6,
                      message: 'Password deve avere almeno 6 caratteri'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.admin_password && (
                <p className="text-red-500 text-sm mt-1">{errors.admin_password.message}</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Privacy Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-700 text-sm">
                🔒 I tuoi dati sono protetti secondo il GDPR. 
                Utilizziamo solo informazioni necessarie per il servizio.
              </p>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Registrazione in corso...
                </>
              ) : (
                <>
                  Crea Studio
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Hai già un account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Accedi al tuo studio
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-blue-200 text-sm">
            🚀 Unisciti a centinaia di studi fiscali che usano l'AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
