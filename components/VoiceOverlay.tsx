import React, { useEffect, useState } from 'react';

interface Props {
  isActive: boolean;
  status: string;
  onDisconnect: () => void;
  audioLevel: number;
  audioSource: 'user' | 'ai';
  errorMessage?: string | null;
}

export const VoiceOverlay: React.FC<Props> = ({ isActive, status, onDisconnect, audioLevel, audioSource, errorMessage }) => {
  const [bars, setBars] = useState<number[]>(new Array(21).fill(4)); 

  useEffect(() => {
    if (!isActive) {
        setBars(new Array(21).fill(4));
        return;
    }

    const updateBars = () => {
        const normalizedLevel = Math.min(Math.max(audioLevel * 1.8, 0), 1.0);
        const isSpeaking = normalizedLevel > 0.05;

        setBars(prevBars => prevBars.map((prevHeight, i) => {
            const distanceFromCenter = Math.abs(i - 10);
            const centerBias = Math.exp(-Math.pow(distanceFromCenter / 5, 2)); 
            const wave = Math.sin((Date.now() / 150) + (i * 0.5)); 
            const minHeight = 6;
            const maxHeight = 100;
            let targetHeight;

            if (isSpeaking) {
                targetHeight = minHeight + (maxHeight * normalizedLevel * centerBias) + (wave * 5);
            } else {
                targetHeight = minHeight + (Math.sin((Date.now() / 800) + i) * 2);
            }
            return prevHeight + (targetHeight - prevHeight) * 0.3;
        }));
    };

    const animationFrame = setInterval(updateBars, 16);
    return () => clearInterval(animationFrame);
  }, [audioLevel, isActive]);

  if (!isActive) return null;

  let mainColor = 'bg-slate-400';
  let statusText = 'Conectando...';

  if (status === 'error') {
      mainColor = 'bg-rose-500';
      statusText = 'Erro de Conexão';
  } else if (status === 'connected') {
      if (audioSource === 'user' && audioLevel > 0.02) {
          mainColor = 'bg-emerald-400';
          statusText = 'Ouvindo você...';
      } else if (audioSource === 'ai' && audioLevel > 0.02) {
          mainColor = 'bg-indigo-400';
          statusText = 'Falando...';
      } else {
          mainColor = 'bg-indigo-300';
          statusText = 'Aguardando...';
      }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#020617]/95 backdrop-blur-xl flex flex-col items-center justify-between p-8 transition-opacity duration-500 animate-fade-in overflow-hidden">
      <div className="w-full flex justify-between items-center z-10">
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
            <span className={`w-2 h-2 rounded-full animate-pulse ${mainColor}`}></span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-300">Ao Vivo</span>
        </div>
        <button onClick={onDisconnect} className="p-4 -mr-2 text-white/50 hover:text-white transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="relative flex flex-col items-center justify-center w-full flex-1 z-10 gap-8">
        <div className="flex items-center justify-center gap-[4px] h-40 w-full max-w-md">
            {bars.map((height, i) => (
                <div key={i} className={`w-2.5 rounded-full transition-colors duration-200 shadow-[0_0_15px_rgba(255,255,255,0.15)] ${mainColor}`} style={{ height: `${height}px`, opacity: 0.6 + (height / 100) * 0.4 }} ></div>
            ))}
        </div>
        <div className="text-center space-y-4 max-w-sm">
            <h2 className="text-2xl font-display font-bold text-white tracking-tight">{statusText}</h2>
            {status === 'error' && errorMessage && (
                 <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl animate-fade-in-up">
                    <p className="text-rose-200 text-sm font-medium leading-relaxed">{errorMessage}</p>
                 </div>
            )}
        </div>
      </div>
      <div className="z-10 mb-8">
          <button onClick={onDisconnect} className="w-20 h-20 rounded-full bg-red-500/20 text-red-100 border border-red-500/50 flex items-center justify-center hover:bg-red-600 hover:text-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)]">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </button>
      </div>
    </div>
  );
};