import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { vibrate } from '../utils/haptics';

interface Props {
  onLogin: (username: string) => void;
}

export const AuthScreen: React.FC<Props> = ({ onLogin }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    vibrate('light');

    if (name.length < 2 || pin.length < 4) {
      setError('Verifique seus dados de acesso.');
      vibrate('error');
      return;
    }

    setLoading(true);
    try {
      const result = mode === 'LOGIN' 
        ? await storageService.login(name, pin) 
        : await storageService.register(name, pin);
      
      if (result.success) {
        vibrate('success');
        onLogin(name);
      } else {
        setError(result.message || 'Erro de autenticação.');
        vibrate('error');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
      vibrate('error');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
      vibrate('medium');
      setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
      setError(null);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Aurora Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/20 rounded-full blur-[120px] animate-blob"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-violet-600/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
          {/* Subtle Grid Texture */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <div className="relative z-10 w-full max-w-[22rem] flex flex-col items-center">
        
        {/* Animated Logo */}
        <div className="mb-10 relative group">
            <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-700 animate-pulse-slow"></div>
            <div className="relative w-28 h-28 bg-slate-900/80 backdrop-blur-xl rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/10 ring-1 ring-white/5 group-hover:scale-105 transition-transform duration-500">
                {/* Abstract Finance Brain Icon */}
                <svg className="w-14 h-14 text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Z" className="opacity-20" />
                    <path d="M12 6v12" strokeWidth="2" strokeLinecap="round" />
                    <path d="M16 10l-4-4-4 4" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="3" className="animate-pulse" strokeWidth="2" />
                    <path d="M7 16h10" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </div>
            {/* Status Dot */}
            <div className="absolute -bottom-1 -right-1 flex items-center justify-center">
                <span className="relative flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 border-4 border-[#020617]"></span>
                </span>
            </div>
        </div>

        <div className="text-center mb-8 space-y-2">
            <h1 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-white tracking-tight drop-shadow-sm">
                Finança AI
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-wider uppercase opacity-80">
                Cofre Inteligente
            </p>
        </div>

        {/* Glass Card Form */}
        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-1 shadow-2xl animate-fade-in-up">
            <div className="bg-slate-900/40 rounded-[1.8rem] p-6 border border-white/5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Name Input */}
                  <div className="group relative">
                     <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                     </div>
                     <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-950/50 border border-white/10 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all font-medium"
                        placeholder="Seu Nome"
                        disabled={loading}
                        autoCapitalize="words"
                     />
                  </div>

                  {/* PIN Input */}
                  <div className="group relative">
                     <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                     </div>
                     <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-950/50 border border-white/10 text-white text-xl tracking-[0.5em] placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all font-bold placeholder:tracking-normal font-mono"
                        placeholder="PIN"
                        disabled={loading}
                     />
                  </div>

                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-center gap-2 animate-pulse">
                        <svg className="w-4 h-4 text-rose-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span className="text-rose-200 text-xs font-medium">{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    {loading ? (
                       <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <>
                            <span>{mode === 'LOGIN' ? 'Desbloquear Cofre' : 'Criar Acesso'}</span>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                        </>
                    )}
                  </button>
                </form>
            </div>
        </div>

        {/* Toggle Mode */}
        <button 
            onClick={toggleMode} 
            className="mt-8 text-xs font-medium text-slate-500 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2 group"
            disabled={loading}
        >
            {mode === 'LOGIN' ? (
                <>
                    <span>Primeiro Acesso?</span>
                    <span className="text-indigo-400 group-hover:underline decoration-2 underline-offset-4">Configurar</span>
                </>
            ) : (
                <>
                    <span>Já possui conta?</span>
                    <span className="text-indigo-400 group-hover:underline decoration-2 underline-offset-4">Entrar</span>
                </>
            )}
        </button>
        
        <p className="fixed bottom-6 text-[10px] text-slate-600 font-mono">
            SECURED BY GEMINI • ENCRYPTED STORAGE
        </p>
      </div>
    </div>
  );
};