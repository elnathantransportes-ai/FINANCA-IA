import React, { useState, useRef, useEffect } from 'react';
import { Transaction } from '../types';
import { askFinancialAdvisor } from '../services/geminiAnalysisService';

interface Props {
  transactions: Transaction[];
  onClose: () => void;
}

export const AIAdviser: React.FC<Props> = ({ transactions, onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'Olá! Sou seu consultor financeiro. Como posso ajudar?' }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);
    const response = await askFinancialAdvisor(transactions, userMsg);
    setMessages(prev => [...prev, { role: 'ai', text: response }]);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[600px]">
        <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
          <h3 className="font-display font-bold">Consultoria IA</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && <div className="text-gray-400 text-xs p-4">Digitando...</div>}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 bg-white border-t">
            <div className="flex gap-2">
                <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="flex-1 p-3 bg-gray-50 rounded-xl" placeholder="Pergunte..." />
                <button onClick={handleSend} disabled={loading} className="p-3 bg-indigo-600 text-white rounded-xl">→</button>
            </div>
        </div>
      </div>
    </div>
  );
};