import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { getCategoryIcon } from '../utils/formatters';

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export const TransactionList: React.FC<Props> = ({ transactions, onDelete }) => {
  const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.INCOME);
  
  const filtered = useMemo(() => {
      return transactions
        .filter(t => t.type === activeTab)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, activeTab]);

  const formatDateSafe = (dateStr: string) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getTabColor = (type: TransactionType) => {
     switch(type) {
         case TransactionType.INCOME: return 'data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-200';
         case TransactionType.EXPENSE: return 'data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-rose-200';
         case TransactionType.RESERVE: return 'data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-200';
         case TransactionType.INVESTMENT: return 'data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-200';
     }
  };

  return (
    <div className="bg-transparent">
      {/* Modern Tabs */}
      <div className="flex bg-white p-2 rounded-[1.5rem] mb-8 shadow-sm border border-slate-100 overflow-x-auto no-scrollbar gap-2">
        {(Object.values(TransactionType) as TransactionType[]).map((type) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            data-state={activeTab === type ? 'active' : 'inactive'}
            className={`flex-1 min-w-[90px] py-3 rounded-2xl text-xs font-bold transition-all duration-300 uppercase tracking-wide ${getTabColor(type)} text-slate-400 hover:text-slate-600`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="space-y-4 min-h-[200px]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-3xl opacity-50">🍃</div>
            <span className="text-sm font-bold text-slate-400">Tudo limpo por aqui</span>
          </div>
        ) : (
          <div className="space-y-4 pb-20">
            {filtered.map((t) => (
                <div key={t.id} className="group bg-white p-5 rounded-[2rem] border border-slate-50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex items-center justify-between transition-all hover:scale-[1.02] hover:shadow-lg relative overflow-hidden">
                  <div className="flex items-center gap-5 relative z-10">
                     <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-2xl shadow-sm ${
                         t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' :
                         t.type === TransactionType.EXPENSE ? 'bg-rose-50 text-rose-600' :
                         t.type === TransactionType.RESERVE ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'
                     }`}>
                         {getCategoryIcon(t.category)}
                     </div>
                     <div>
                          <p className="font-display font-bold text-base text-slate-800 leading-tight mb-1">{t.description}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{t.category || 'Geral'}</span>
                            <span className="text-xs text-slate-400 font-medium">{formatDateSafe(t.date)}</span>
                          </div>
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 relative z-10">
                    <span className={`font-display font-bold text-lg ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-slate-800'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'}R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="text-slate-300 hover:text-rose-500 p-2 -mr-2 transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};