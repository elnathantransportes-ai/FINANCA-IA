import React, { useEffect, useState } from 'react';
import { WisdomQuote, getDailyWisdom } from '../services/wisdomService';

export const WisdomCard: React.FC = () => {
  const [quote, setQuote] = useState<WisdomQuote | null>(null);

  useEffect(() => { setQuote(getDailyWisdom()); }, []);

  if (!quote) return null;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl mb-6 flex gap-4 animate-fade-in">
      <div className="text-amber-600">💡</div>
      <div>
        <p className="text-gray-800 font-medium italic text-sm">"{quote.text}"</p>
        <p className="text-amber-700 text-xs font-bold mt-1">— {quote.source}</p>
      </div>
    </div>
  );
};