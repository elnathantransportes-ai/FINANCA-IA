import React from 'react';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Transaction, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
}

const COLORS_MAP = {
    [TransactionType.INCOME]: '#10B981', // Emerald
    [TransactionType.EXPENSE]: '#F43F5E', // Rose
    [TransactionType.RESERVE]: '#3B82F6', // Blue
    [TransactionType.INVESTMENT]: '#8B5CF6' // Violet
};

const PIE_COLORS = ['#F43F5E', '#FB7185', '#FDA4AF', '#FECDD3', '#FFE4E6', '#E11D48'];

export const FinancialCharts: React.FC<Props> = ({ transactions }) => {
  const dailyDataMap = new Map();
  transactions.forEach(t => {
    const existing = dailyDataMap.get(t.date) || { date: t.date, RECEITA: 0, DESPESA: 0 };
    existing[t.type] += t.amount;
    dailyDataMap.set(t.date, existing);
  });
  
  const barData = Array.from(dailyDataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
  const categoryMap = new Map();
  expenses.forEach(t => {
      const cat = t.category || 'Geral';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.amount);
  });

  const pieData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a: any, b: any) => b.value - a.value);

  return (
    <div className="grid grid-cols-1 gap-6 mb-24 animate-fade-in-up">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-card border border-slate-50 h-96">
        <h3 className="text-slate-900 font-display font-bold mb-6 text-xl">Fluxo Diário</h3>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={barData} barGap={6}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="date" stroke="#94A3B8" tick={{fontSize: 10, fontWeight: 500}} tickLine={false} axisLine={false} tickFormatter={(val) => new Date(val).getDate().toString()} />
            <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontFamily: 'Outfit' }} />
            <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '20px', fontWeight: 600}}/>
            <Bar dataKey="RECEITA" fill={COLORS_MAP[TransactionType.INCOME]} name="Entrada" radius={[6, 6, 6, 6]} barSize={12} />
            <Bar dataKey="DESPESA" fill={COLORS_MAP[TransactionType.EXPENSE]} name="Saída" radius={[6, 6, 6, 6]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-card border border-slate-50 h-[28rem]">
        <h3 className="text-slate-900 font-display font-bold mb-6 text-xl">Gastos por Categoria</h3>
        {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="90%">
            <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={8}>
                {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontFamily: 'Outfit' }} formatter={(val: number) => `R$ ${val.toFixed(2)}`} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 600, color: '#64748B'}} />
            </PieChart>
            </ResponsiveContainer>
        ) : <div className="h-full flex items-center justify-center text-slate-300 font-medium">Sem dados de despesa</div>}
      </div>
    </div>
  );
};