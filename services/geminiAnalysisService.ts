import { GoogleGenAI } from '@google/genai';
import { Transaction, TransactionType } from '../types';

const formatTransactions = (transactions: Transaction[]) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const past = transactions.filter(t => new Date(t.date) <= today);
  const future = transactions.filter(t => new Date(t.date) > today);

  const monthlyTrans = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const income = monthlyTrans.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
  const realizedExpense = monthlyTrans.filter(t => t.type === TransactionType.EXPENSE && new Date(t.date) <= today).reduce((sum, t) => sum + t.amount, 0);
  const realizedReserve = monthlyTrans.filter(t => t.type === TransactionType.RESERVE && new Date(t.date) <= today).reduce((sum, t) => sum + t.amount, 0);
  
  const currentBalance = income - realizedExpense - realizedReserve;
  
  const pendingExpenses = monthlyTrans.filter(t => t.type === TransactionType.EXPENSE && new Date(t.date) > today);
  const totalPending = pendingExpenses.reduce((sum, t) => sum + t.amount, 0);

  const runway = currentBalance - totalPending;

  const formatList = (list: Transaction[]) => list.map(t => 
    `- [${t.date}] ${t.type} (${t.category}): R$ ${t.amount.toFixed(2)} - ${t.description}`
  ).join('\n');

  return `
  --- ANÁLISE DE SAÚDE DO MÊS ---
  Saldo Disponível AGORA: R$ ${currentBalance.toFixed(2)}
  Total de Contas que AINDA VÃO VENCER este mês: R$ ${totalPending.toFixed(2)}
  
  VEREDITO MATEMÁTICO:
  ${runway >= 0 ? `✅ SOBRA PREVISTA: R$ ${runway.toFixed(2)}` : `❌ FALTA PREVISTA: R$ ${Math.abs(runway).toFixed(2)}`}

  --- TRANSAÇÕES JÁ REALIZADAS ---
  ${formatList(past.slice(0, 20))}

  --- PRÓXIMAS CONTAS (A VENCER) ---
  ${formatList(future)}
  `;
};

export const getFinancialAdvice = async (transactions: Transaction[]): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      throw new Error("Erro: API Key não encontrada.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const summary = formatTransactions(transactions);
    const today = new Date().toLocaleDateString('pt-BR');

    const prompt = `
        Você é um Estrategista Financeiro de Elite e Coach de Riqueza.
        Hoje é: ${today}.
        
        DADOS DO USUÁRIO:
        ${summary}

        SUA MISSÃO (Gere um relatório MarkDown estritamente com estas 3 seções):

        ### 1. 🔮 Visão de Raio-X (Real vs. Previsão)
        - Comente explicitamente sobre o "VEREDITO MATEMÁTICO" acima.
        - Se estiver sobrando, parabenize. Se estiver faltando, dê o alerta.

        ### 2. 🛡️ Plano de Reserva de Guerra (Prioridade Máxima)
        - O usuário PRECISA poupar.
        - Sugira um valor de "Micro-Reserva" para guardar HOJE.

        ### 3. 🚀 Plano de Ataque
        - Dê 2 dicas ultra-práticas baseadas no padrão de gastos.
        - Frase motivacional curta.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 },
        temperature: 0.7
      }
    });
    return response.text || "Não foi possível gerar o plano de ação no momento.";

  } catch (error: any) {
    console.error("Error generating advice:", error);
    if (error.message && (error.message.includes("API Key") || error.message.includes("key"))) {
        return `⚠️ ${error.message}`;
    }
    return "Erro ao analisar dados financeiros.";
  }
};

export const askFinancialAdvisor = async (transactions: Transaction[], question: string): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      throw new Error("Erro: API Key não encontrada.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const summary = formatTransactions(transactions.slice(0, 100));

    const prompt = `
        Você é um Consultor Financeiro Pessoal Sábio e AMIGO.
        
        DADOS FINANCEIROS REAIS:
        ${summary}

        PERGUNTA DO USUÁRIO:
        "${question}"

        DIRETRIZES:
        1. Se perguntarem "como estamos", "o que falta pagar" ou "vai dar para pagar?", OLHE O "VEREDITO MATEMÁTICO".
        2. Seja honesto: Se o saldo atual for menor que o total pendente, avise.
        3. Liste as contas futuras se solicitado.
        4. Use tom coloquial e parceiro.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });
    return response.text || "Desculpe, não consegui analisar isso agora.";

  } catch (error: any) {
    console.error("Error asking advisor:", error);
    if (error.message && (error.message.includes("API Key") || error.message.includes("key"))) {
        return `⚠️ ${error.message}`;
    }
    return "Tive um problema técnico ao consultar seus dados.";
  }
};