import React, { useState } from 'react';
import { Goal } from '../types';

interface Props {
  goal: Goal | null;
  totalReserve: number;
  onSaveGoal: (title: string, amount: number) => void;
  isHidden: boolean;
}

export const GoalWidget: React.FC<Props> = ({ goal, totalReserve, onSaveGoal, isHidden }) => {
  const [isEditing, setIsEditing] = useState(!goal);
  const [title, setTitle] = useState(goal?.title || '');
  const [amount, setAmount] = useState(goal?.targetAmount?.toString() || '');

  const handleSave = () => {
    if (title && amount) {
        onSaveGoal(title, parseFloat(amount));
        setIsEditing(false);
    }
  };

  if (isEditing) {
      return (
          <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-indigo-50 border border-white/50 mb-6 animate-fade-in relative overflow-hidden">
              <h3 className="relative font-display font-bold text-slate-800 mb-4">Definir Objetivo</h3>
              <div className="space-y-3 relative z-10">
                <input type="text" placeholder="Sonho" className="w-full p-3 bg-gray-50 rounded-xl" value={title} onChange={e => setTitle(e.target.value)} />
                <div className="flex gap-2">
                    <input type="number" placeholder="Valor" className="flex-1 p-3 bg-gray-50 rounded-xl" value={amount} onChange={e => setAmount(e.target.value)} />
                    <button onClick={handleSave} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">Salvar</button>
                </div>
              </div>
          </div>
      );
  }

  const percentage = Math.min(100, Math.max(0, (totalReserve / (goal?.targetAmount || 1)) * 100));

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 mb-6 relative overflow-hidden group">
      <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1">Próxima Conquista</p>
              <h3 className="font-display text-xl font-bold text-slate-800 tracking-tight">{goal?.title}</h3>
          </div>
          <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-indigo-600">✏️</button>
      </div>

      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
      </div>
      
      <div className="flex justify-between items-end relative z-10">
          <div>
            <p className="text-xs text-gray-400 font-medium mb-0.5">Acumulado</p>
            <p className="font-display font-bold text-slate-700 text-lg">
                {isHidden ? 'R$ ****' : `R$ ${totalReserve.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
            </p>
          </div>
          <div className="text-right">
             <span className="text-3xl font-display font-black text-indigo-600">{isHidden ? '--' : percentage.toFixed(0)}%</span>
          </div>
      </div>
    </div>
  );
};