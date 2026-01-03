import React, { useState } from 'react';
import { TransactionType } from '../types';

interface Props {
  onClose: () => void;
  onSave: (type: TransactionType, amount: number, date: string, description: string, category: string) => void;
}

export const AddTransactionModal: React.FC<Props> = ({ onClose, onSave }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    onSave(type, parseFloat(amount), date, description, category || 'Geral');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose}></div>
      <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl pointer-events-auto animate-fade-in-up">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <h3 className="font-display font-bold text-lg text-slate-800">Novo Lançamento</h3>
            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-2 rounded-xl">
                {[TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.RESERVE, TransactionType.INVESTMENT].map(t => (
                    <button key={t} type="button" onClick={() => setType(t)} className={`py-2.5 rounded-lg text-xs font-bold transition-all ${type === t ? 'bg-white shadow-sm' : 'text-gray-400'}`}>{t}</button>
                ))}
            </div>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full text-4xl font-display font-bold text-slate-800 outline-none" placeholder="0.00" autoFocus required />
            <input type="text" placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl" required />
            <div className="grid grid-cols-2 gap-3">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl" />
                <input type="text" placeholder="Categoria" value={category} onChange={e => setCategory(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl" />
            </div>
            <button type="submit" className="w-full py-4 rounded-xl font-bold text-white bg-slate-900">Confirmar</button>
        </form>
      </div>
    </div>
  );
};