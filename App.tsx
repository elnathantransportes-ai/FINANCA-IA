import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { ConnectionStatus, Transaction, TransactionType, Goal } from './types';
import { connectLiveSession, disconnectLiveSession } from './services/geminiLiveService';
import { getFinancialAdvice } from './services/geminiAnalysisService';
import { storageService } from './services/storageService';
import { analyzeReceipt } from './services/receiptService';
import { exportToCSV } from './utils/formatters';
import { vibrate } from './utils/haptics';
import { TransactionList } from './components/TransactionList';
import { AuthScreen } from './components/AuthScreen';
import { WisdomCard } from './components/WisdomCard';
import { AIAdviser } from './components/AIAdviser';
import { Confetti } from './components/Confetti';
import { GoalWidget } from './components/GoalWidget';
import { AddTransactionModal } from './components/AddTransactionModal';
import { DashboardSkeleton } from './components/Skeleton';
import { VoiceOverlay } from './components/VoiceOverlay';

const FinancialCharts = React.lazy(() => import('./components/FinancialCharts').then(module => ({ default: module.FinancialCharts })));
const CalendarView = React.lazy(() => import('./components/CalendarView').then(module => ({ default: module.CalendarView })));

type ViewState = 'HOME' | 'EXTRACT' | 'CALENDAR' | 'CHARTS';

const PaymentSuccessAnimation = ({ onFinish }: { onFinish: () => void }) => {
    useEffect(() => {
        vibrate('success');
        const timer = setTimeout(onFinish, 2200);
        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-[3rem] p-10 shadow-2xl flex flex-col items-center relative overflow-hidden max-w-xs w-full mx-6 animate-fade-in-up">
                <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mb-6 relative z-10 shadow-glow shadow-emerald-500/50">
                     <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
                <h3 className="font-display font-bold text-3xl text-slate-900 z-10">Sucesso!</h3>
            </div>
        </div>
    );
};

function App() {
  const [user, setUser] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [isAdviserOpen, setIsAdviserOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioSource, setAudioSource] = useState<'user' | 'ai'>('user');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeView, setActiveView] = useState<ViewState>('HOME');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedSession = storageService.getSession();
    if (savedSession) setUser(savedSession);
  }, []);

  useEffect(() => {
    if (user) {
        setIsLoadingData(true);
        const unsubTrans = storageService.subscribeTransactions((data) => {
             setTransactions(data);
             setIsLoadingData(false);
        });
        const unsubGoal = storageService.subscribeGoal((data) => {
            setGoal(data);
        });
        return () => { unsubTrans(); unsubGoal(); };
    } else {
        setTransactions([]); setGoal(null); disconnectLiveSession(); setStatus(ConnectionStatus.DISCONNECTED); setHasStarted(false);
    }
  }, [user]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
        const d = new Date(t.date);
        const tDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        return tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const monthlySummary = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.income += t.amount;
      if (t.type === TransactionType.EXPENSE) acc.expense += t.amount;
      if (t.type === TransactionType.RESERVE) acc.reserve += t.amount;
      if (t.type === TransactionType.INVESTMENT) acc.investment += t.amount;
      return acc;
    }, { income: 0, expense: 0, reserve: 0, investment: 0 });
  }, [filteredTransactions]);

  const monthlyBalance = monthlySummary.income - monthlySummary.expense - monthlySummary.reserve - monthlySummary.investment;

  const totalReservesAllTime = useMemo(() => transactions.filter(t => t.type === TransactionType.RESERVE || t.type === TransactionType.INVESTMENT).reduce((sum, t) => sum + t.amount, 0), [transactions]);

  const handleLogin = (username: string) => { vibrate('success'); setUser(username); };
  const handleLogout = () => { vibrate('medium'); disconnectLiveSession(); storageService.clearSession(); setUser(null); setHasStarted(false); };
  
  const handleSaveGoal = async (title: string, targetAmount: number) => {
      const newGoal: Goal = { id: 'main', title, targetAmount, currentAmount: totalReservesAllTime };
      await storageService.saveGoal(newGoal);
      vibrate('success');
      setNotification("Meta salva com sucesso!");
  };

  const handleAddTransaction = async (type: TransactionType, amount: number, date: string, description: string, category: string) => {
     if (!user) return;
     const newTransaction: Transaction = { id: '', type, amount, date, description, category };
      try {
          await storageService.saveTransaction(newTransaction);
          setShowSuccessAnim(true);
          if (type === TransactionType.INCOME) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000); }
      } catch (e) { vibrate('error'); setNotification("Erro ao salvar."); }
  };

  const connectVoice = async () => {
    if (!user) return;
    setError(null);
    
    // Verificação de ambiente para facilitar deploy
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        setNotification("⚠️ Configure API_KEY!");
        setError("Falta a chave de API no servidor.");
        setStatus(ConnectionStatus.ERROR);
        return;
    }

    vibrate('medium');
    await connectLiveSession(user, transactions, goal, {
      onStatusChange: (s) => setStatus(s as ConnectionStatus),
      onError: (err) => { vibrate('error'); setError(err); setStatus(ConnectionStatus.ERROR); },
      onTransactionAdd: handleAddTransaction,
      onNavigate: (view) => { vibrate('light'); setActiveView(view); setNotification(`Navegando: ${view}`); },
      onLogout: handleLogout,
      onAudioLevel: (src, level) => { setAudioSource(src); setAudioLevel(level); }
    });
  }

  const toggleConnection = async () => {
    if (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING) {
      vibrate('medium'); disconnectLiveSession(); setStatus(ConnectionStatus.DISCONNECTED); setAudioLevel(0);
    } else { await connectVoice(); }
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    vibrate('light');
    const reader = new FileReader();
    reader.onloadend = async () => {
        try {
            setNotification("IA analisando comprovante...");
            const data = await analyzeReceipt(reader.result as string);
            await handleAddTransaction(data.type, data.amount, data.date, data.description, data.category);
        } catch (err) { vibrate('error'); setError("Não consegui ler o recibo."); } 
        finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsDataURL(file);
  };

  const handleGetAdvice = async () => { vibrate('light'); setLoadingAdvice(true); const result = await getFinancialAdvice(filteredTransactions); vibrate('success'); setAdvice(result); setLoadingAdvice(false); };
  const handleDelete = async (id: string) => { if (!user) return; try { vibrate('medium'); await storageService.deleteTransaction(id); setNotification("Deletado."); setTimeout(() => setNotification(null), 2000); } catch(e) { vibrate('error'); setNotification("Erro."); } };
  const handleViewChange = (view: ViewState) => { vibrate('light'); setActiveView(view); };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  if (!hasStarted && !isLoadingData) {
      return (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-center overflow-hidden">
             <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-slate-950 to-slate-950"></div>
            <div className="relative z-10 flex flex-col items-center animate-fade-in-up text-center px-6">
                <div className="w-24 h-24 mb-6 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-glow shadow-indigo-500/50">
                     <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20" /></svg>
                </div>
                <h1 className="text-5xl font-display font-bold mb-2 tracking-tight">Finança AI</h1>
                <p className="text-indigo-200 text-lg mb-12 font-medium">Seu dinheiro, mais inteligente.</p>
                <button onClick={() => { vibrate('medium'); setHasStarted(true); connectVoice(); }} className="w-full max-w-xs bg-white text-slate-950 py-4 rounded-2xl font-bold shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-transform flex items-center justify-center gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div> Conversar Agora
                </button>
                <button onClick={() => { vibrate('light'); setHasStarted(true); }} className="mt-6 text-slate-500 text-sm font-semibold hover:text-white transition-colors">Entrar no Painel</button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen pb-32">
      <VoiceOverlay isActive={status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING || status === ConnectionStatus.ERROR} status={status} audioLevel={audioLevel} audioSource={audioSource} errorMessage={error} onDisconnect={() => { vibrate('medium'); disconnectLiveSession(); setStatus(ConnectionStatus.DISCONNECTED); setError(null); }} />
      {showSuccessAnim && <PaymentSuccessAnimation onFinish={() => setShowSuccessAnim(false)} />}
      {showConfetti && <Confetti />}
      {isAdviserOpen && <AIAdviser transactions={filteredTransactions} onClose={() => { vibrate('light'); setIsAdviserOpen(false); }} />}
      {isManualAddOpen && <AddTransactionModal onClose={() => { vibrate('light'); setIsManualAddOpen(false); }} onSave={handleAddTransaction} />}
      
      {loadingAdvice && (
          <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4"></div>
                  <h3 className="font-display font-bold text-xl text-white">Processando dados...</h3>
              </div>
          </div>
      )}

      {notification && !error && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[40] animate-fade-in-up w-auto max-w-[90%]">
            <div className="glass-dark text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                <span className="text-sm font-semibold tracking-wide truncate">{notification}</span>
            </div>
        </div>
      )}

      {/* Modern Header */}
      <header className="fixed top-0 w-full z-20 px-6 pt-safe-area-top pb-4 bg-transparent">
         <div className="glass mt-2 rounded-full px-5 h-16 flex items-center justify-between shadow-sm">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs">AI</div>
                 <h1 className="font-display text-lg font-bold text-slate-800 tracking-tight">Finança</h1>
             </div>
             <div className="flex items-center gap-1">
                 <button onClick={() => { vibrate('light'); setIsPrivacyMode(!isPrivacyMode); }} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                    {isPrivacyMode ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8-11-8-11-8-11-8-11-8-11-8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                 </button>
                 <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer hover:text-indigo-600 transition-colors">
                    {[ "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez" ].map((m, i) => <option key={i} value={i}>{m}</option>)}
                 </select>
                 <button onClick={handleLogout} className="w-10 h-10 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors ml-1">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                 </button>
             </div>
         </div>
      </header>
      
      <main className="pt-28 px-5 max-w-lg mx-auto w-full">
        {isLoadingData ? <DashboardSkeleton /> : (
            <>
                {activeView === 'HOME' && (
                    <div className="space-y-8 animate-fade-in-up">
                        <WisdomCard />
                        
                        {/* Premium Balance Card */}
                        <div className="relative group perspective">
                            <div className="absolute inset-0 bg-indigo-600 rounded-[2.5rem] blur-xl opacity-30 group-hover:opacity-40 transition-opacity duration-500"></div>
                            <div className="relative bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden border border-white/10 min-h-[300px] flex flex-col justify-between">
                                {/* Abstract Shapes */}
                                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-[80px] opacity-40 -translate-y-1/2 translate-x-1/3"></div>
                                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-emerald-500 rounded-full blur-[60px] opacity-20 translate-y-1/3 -translate-x-1/3"></div>
                                
                                <div className="relative z-10 flex justify-between items-start">
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/5 backdrop-blur-md">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                        <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-100">Ao Vivo</span>
                                    </div>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" className="opacity-50"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                                </div>

                                <div className="relative z-10 text-center my-4">
                                    <span className="text-indigo-200 text-sm font-medium tracking-wide">Saldo Total</span>
                                    <h2 className="font-display text-5xl font-bold tracking-tight mt-2 text-white drop-shadow-lg">
                                        {isPrivacyMode ? '****' : <><span className="text-3xl opacity-50 align-top mr-1">R$</span>{monthlyBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>}
                                    </h2>
                                </div>

                                <div className="relative z-10 grid grid-cols-2 gap-4 mt-auto">
                                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 backdrop-blur-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3"><polyline points="18 15 12 9 6 15" /></svg></div>
                                            <span className="text-[10px] font-bold uppercase text-emerald-200">Entrada</span>
                                        </div>
                                        <p className="font-display font-semibold text-lg">{isPrivacyMode ? '****' : `+${monthlySummary.income.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 backdrop-blur-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-4 h-4 rounded-full bg-rose-500/20 flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg></div>
                                            <span className="text-[10px] font-bold uppercase text-rose-200">Saída</span>
                                        </div>
                                        <p className="font-display font-semibold text-lg">{isPrivacyMode ? '****' : `-${monthlySummary.expense.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <GoalWidget goal={goal} totalReserve={totalReservesAllTime} onSaveGoal={handleSaveGoal} isHidden={isPrivacyMode} />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => { vibrate('light'); setIsAdviserOpen(true); }} className="bg-white p-5 rounded-[2rem] shadow-card hover:shadow-lg transition-all border border-slate-100 group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">💬</div>
                                    <span className="font-display font-bold text-slate-800 text-lg">Chat</span>
                                    <p className="text-xs text-slate-400 font-medium mt-1">Tire dúvidas</p>
                                </div>
                            </button>
                            <button onClick={handleGetAdvice} disabled={loadingAdvice} className="bg-slate-900 p-5 rounded-[2rem] shadow-card hover:shadow-lg transition-all group relative overflow-hidden text-white">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-2xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">🤖</div>
                                    <span className="font-display font-bold text-lg">Coach IA</span>
                                    <p className="text-xs text-indigo-200 font-medium mt-1">Análise completa</p>
                                </div>
                            </button>
                        </div>

                        {advice && (
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-indigo-100 relative animate-fade-in">
                                <button onClick={() => { vibrate('light'); setAdvice(''); }} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                                <div className="prose prose-sm text-slate-600 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: advice.replace(/\n/g, '<br />').replace(/### (.*?)(<br \/>|$)/g, '<strong class="text-indigo-600 font-display text-lg block mt-6 mb-2">$1</strong>') }} />
                            </div>
                        )}

                        <div>
                             <div className="flex justify-between items-end mb-6 px-2">
                                <h3 className="font-display font-bold text-xl text-slate-900">Histórico</h3>
                                <button onClick={() => handleViewChange('EXTRACT')} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">VER TUDO</button>
                             </div>
                             <TransactionList transactions={filteredTransactions.slice(0, 5)} onDelete={handleDelete} />
                        </div>
                    </div>
                )}
                {activeView === 'EXTRACT' && (
                     <div className="space-y-8 animate-fade-in-up">
                         <h2 className="font-display text-3xl font-bold text-slate-900 px-2">Extrato</h2>
                         <TransactionList transactions={filteredTransactions} onDelete={handleDelete} />
                     </div>
                )}
                {activeView === 'CALENDAR' && (
                     <Suspense fallback={<DashboardSkeleton />}>
                        <div className="animate-fade-in-up space-y-6">
                             <h2 className="font-display text-3xl font-bold text-slate-900 px-2">Calendário</h2>
                             <CalendarView transactions={filteredTransactions} currentMonth={selectedMonth} currentYear={selectedYear} />
                        </div>
                     </Suspense>
                )}
                {activeView === 'CHARTS' && (
                    <Suspense fallback={<DashboardSkeleton />}>
                        <div className="space-y-6 animate-fade-in-up">
                            <h2 className="font-display text-3xl font-bold text-slate-900 px-2">Gráficos</h2>
                            <FinancialCharts transactions={filteredTransactions} />
                        </div>
                    </Suspense>
                )}
            </>
        )}
      </main>

      {/* Floating Island Navigation */}
      <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-auto max-w-[95%] glass rounded-full p-2 z-30 flex items-center shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] border border-white/60">
          <button onClick={() => handleViewChange('HOME')} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${activeView === 'HOME' ? 'bg-slate-900 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </button>
          <button onClick={() => handleViewChange('EXTRACT')} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${activeView === 'EXTRACT' ? 'bg-slate-900 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          
          <div className="mx-2 relative group">
             <div className="absolute inset-0 bg-indigo-500 rounded-full blur-lg opacity-40 animate-pulse group-hover:opacity-70 transition-opacity"></div>
             <button 
                onClick={toggleConnection} 
                className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xl hover:scale-110 active:scale-90"
             >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
             </button>
          </div>

          <button onClick={() => handleViewChange('CALENDAR')} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${activeView === 'CALENDAR' ? 'bg-slate-900 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </button>
          <button onClick={() => handleViewChange('CHARTS')} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${activeView === 'CHARTS' ? 'bg-slate-900 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
          </button>
      </nav>

      {/* Quick Actions (Camera/Manual) */}
      {activeView === 'HOME' && (
          <div className="fixed bottom-32 right-6 flex flex-col gap-4 z-20">
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleReceiptUpload} />
             <button 
                onClick={() => { vibrate('light'); setIsManualAddOpen(true); }}
                className="w-14 h-14 rounded-full bg-slate-900 text-white shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform border border-slate-700"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button 
                onClick={() => { vibrate('light'); fileInputRef.current?.click(); }}
                className="w-14 h-14 rounded-full bg-white text-indigo-600 shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          </div>
      )}
    </div>
  );
}

export default App;