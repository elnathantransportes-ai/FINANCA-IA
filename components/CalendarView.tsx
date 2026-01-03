import React from 'react';
import { Transaction, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
  currentMonth: number;
  currentYear: number;
}

export const CalendarView: React.FC<Props> = ({ transactions, currentMonth, currentYear }) => {
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDayTransactions = (day: number) => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      const tDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      return tDate.getDate() === day && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
        {days.map(day => {
          const trans = getDayTransactions(day);
          const hasIncome = trans.some(t => t.type === TransactionType.INCOME);
          const hasExpense = trans.some(t => t.type === TransactionType.EXPENSE);
          
          return (
            <div key={day} className="h-16 border rounded-lg p-1 flex flex-col justify-between">
              <span className="text-xs font-bold text-gray-500">{day}</span>
              <div className="flex gap-1">
                {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};