export enum TransactionType {
  INCOME = 'RECEITA',
  EXPENSE = 'DESPESA',
  RESERVE = 'RESERVA',
  INVESTMENT = 'INVESTIMENTO'
}

export interface Transaction {
  id: string;
  amount: number;
  date: string; // ISO string YYYY-MM-DD
  description: string;
  type: TransactionType;
  category: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}