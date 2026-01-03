import { Transaction } from '../types';

export const getCategoryIcon = (category: string): string => {
  const normalized = category.toLowerCase().trim();
  
  if (normalized.includes('comida') || normalized.includes('alimentação') || normalized.includes('restaurante') || normalized.includes('ifood') || normalized.includes('mercado')) return '🍔';
  if (normalized.includes('transporte') || normalized.includes('uber') || normalized.includes('gasolina') || normalized.includes('carro')) return '🚗';
  if (normalized.includes('casa') || normalized.includes('aluguel') || normalized.includes('luz') || normalized.includes('água') || normalized.includes('internet')) return '🏠';
  if (normalized.includes('saúde') || normalized.includes('farmácia') || normalized.includes('médico')) return '💊';
  if (normalized.includes('lazer') || normalized.includes('cinema') || normalized.includes('viagem')) return '🍿';
  if (normalized.includes('salário') || normalized.includes('pagamento') || normalized.includes('venda')) return '💰';
  if (normalized.includes('educação') || normalized.includes('curso') || normalized.includes('faculdade')) return '📚';
  if (normalized.includes('roupa') || normalized.includes('loja') || normalized.includes('shopping')) return '🛍️';
  if (normalized.includes('reserva') || normalized.includes('poupança')) return '🛡️';
  if (normalized.includes('investimento') || normalized.includes('ação') || normalized.includes('bitcoin') || normalized.includes('cdb')) return '📈';
  if (normalized.includes('academia') || normalized.includes('esporte')) return '💪';
  if (normalized.includes('pet') || normalized.includes('cachorro') || normalized.includes('gato')) return '🐾';
  
  return '🏷️';
};

export const exportToCSV = (transactions: Transaction[], filename: string) => {
  const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor'];
  const rows = transactions.map(t => [
    t.date,
    t.type,
    t.category,
    `"${t.description.replace(/"/g, '""')}"`,
    t.amount.toFixed(2)
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};