'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Key, Users, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { username, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.username);
        localStorage.setItem('displayName', res.data.displayName || res.data.username);
        localStorage.setItem('familyName', res.data.familyName || '');
        localStorage.setItem('familyCode', res.data.familyCode || '');
        router.push('/dashboard');
      } else {
        const res = await api.post('/auth/register', {
          username,
          password,
          displayName,
          familyName,
          secretCode,
        });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.username);
        localStorage.setItem('displayName', res.data.displayName || res.data.username);
        localStorage.setItem('familyName', res.data.familyName || '');
        localStorage.setItem('familyCode', res.data.familyCode || '');
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Hubo un error. Verificá los datos e intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4 text-t-primary">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-panel)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-glass)' }}
      >
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 text-center" style={{ borderBottom: '1px solid var(--border-glass)' }}>
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-t-primary">Nido</h1>
          <p className="text-t-muted mt-1 text-sm">Organiza el día a día de tu familia</p>

          {/* Tabs */}
          <div className="flex mt-6 rounded-xl p-1 bg-glass-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${isLogin ? 'bg-indigo-500 text-white shadow' : 'text-t-muted hover:text-t-primary'}`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${!isLogin ? 'bg-indigo-500 text-white shadow' : 'text-t-muted hover:text-t-primary'}`}
            >
              Registrarse
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-6 bg-glass-1">
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm text-center text-red-500 font-medium border border-red-500/40"
              style={{ background: 'rgba(239,68,68,0.15)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="block text-sm font-medium text-t-secondary mb-1">
                      Tu nombre <span className="text-t-muted font-normal">(como te verán los demás)</span>
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-glass-2 border-border-glass border"
                      placeholder="Ej. Papá, Mamá, Sofi..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-t-secondary mb-1">
                      Nombre de la familia <span className="text-t-muted font-normal">(solo si creás una nueva)</span>
                    </label>
                    <input
                      type="text"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-glass-2 border-border-glass border"
                      placeholder="Ej. Familia Rodríguez"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Usuario</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-glass-2 border-border-glass border"
                placeholder="tu_usuario"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-t-secondary mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-glass-2 border-border-glass border pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-t-muted hover:text-t-primary transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <label className="block text-sm font-medium text-t-secondary mb-1 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-indigo-500" />
                    Código Secreto Familiar
                  </label>
                  <input
                    type="text"
                    required={!isLogin}
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-glass-2 border-border-glass border"
                    placeholder="Ej. FAMILIA-2024"
                  />
                  <p className="text-xs text-t-muted mt-1.5">
                    Inventá un código para crear tu familia, o usá el de tu familia para unirte.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 mt-2 disabled:opacity-70 disabled:hover:-translate-y-0 disabled:hover:shadow-none"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {isLoading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

//