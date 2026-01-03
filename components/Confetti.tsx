import React, { useEffect, useState } from 'react';

export const Confetti: React.FC = () => {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const colors = ['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];
    const newParticles = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, 
      y: -10 - Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 5 + Math.random() * 10,
      duration: 1 + Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[110] overflow-hidden">
      <style>{`@keyframes fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }`}</style>
      {particles.map((p) => (
        <div key={p.id} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: `${p.size}px`, height: `${p.size}px`, backgroundColor: p.color, animation: `fall ${p.duration}s linear forwards` }} />
      ))}
    </div>
  );
};