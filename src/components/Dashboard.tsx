import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Transaction, Reminder } from '../types';
import { SummaryCards } from './SummaryCards';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { MonthlyReport } from './MonthlyReport';
import { BudgetManager } from './BudgetManager';
import { AIInsights } from './AIInsights';
import { BankStatementImport } from './BankStatementImport';
import { DebtTracker } from './DebtTracker';
import { exportToPDF, exportToExcel } from '../utils/export';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { LogOut, Loader2, Moon, Sun, Download, FileText, LayoutDashboard, PieChart, Calendar, Target, Sparkles, FileUp, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCurrency, CURRENCIES } from '../contexts/CurrencyContext';
import { useTheme } from '../contexts/ThemeContext';
import { parseISO, isBefore, startOfDay } from 'date-fns';

type Tab = 'overview' | 'import' | 'analytics' | 'monthly' | 'budgets' | 'insights' | 'debt';

export function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [overdueRemindersCount, setOverdueRemindersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { currency, setCurrency } = useCurrency();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Transaction[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Transaction);
        });
        
        data.sort((a, b) => {
          if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
          }
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        
        setTransactions(data);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'transactions');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'reminders'), where('userId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      const today = startOfDay(new Date());
      snapshot.forEach(doc => {
        const r = doc.data() as Reminder;
        if (r.status === 'pending' && r.dueDate) {
          const dDate = startOfDay(parseISO(r.dueDate));
          if (isBefore(dDate, today)) {
            count++;
          }
        }
      });
      setOverdueRemindersCount(count);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reminders');
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = () => {
    auth.signOut();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'import', label: 'Import', icon: FileUp },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'monthly', label: 'Monthly Report', icon: Calendar },
    { id: 'budgets', label: 'Budgets', icon: Target },
    { id: 'debt', label: 'Debt Tracker', icon: CreditCard, badge: overdueRemindersCount },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
  ] as const;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-50 transition-colors duration-200">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            </div>
            <h1 className="text-xl font-semibold tracking-tight hidden sm:block">Expense Tracker</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Export Buttons */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 mr-2">
              <button onClick={() => exportToPDF(transactions, currency.symbol)} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-md hover:bg-white dark:hover:bg-zinc-700 transition" title="Export PDF">
                <FileText size={18} />
              </button>
              <button onClick={() => exportToExcel(transactions)} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-md hover:bg-white dark:hover:bg-zinc-700 transition" title="Export Excel">
                <Download size={18} />
              </button>
            </div>

            <select
              value={currency.code}
              onChange={(e) => {
                const selected = CURRENCIES.find(c => c.code === e.target.value);
                if (selected) setCurrency(selected);
              }}
              className="text-sm bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg py-1.5 px-3 text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
            
            <button
              onClick={toggleTheme}
              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors hidden sm:block"
              aria-label="Sign out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-zinc-100 dark:border-zinc-800 overflow-x-auto">
          <nav className="flex space-x-1 py-3" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`
                    flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors
                    ${activeTab === tab.id 
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800'
                    }
                  `}
                >
                  <Icon size={16} />
                  {tab.label}
                  {'badge' in tab && (tab as any).badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full ml-1">
                      {(tab as any).badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-zinc-400" size={32} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <SummaryCards transactions={transactions} />
                  <div className="flex flex-col xl:flex-row gap-8 items-start">
                    <div className="w-full xl:w-1/3 xl:sticky xl:top-36 shrink-0">
                      <TransactionForm />
                    </div>
                    <div className="w-full xl:w-2/3 max-w-full">
                      <TransactionList transactions={transactions} />
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'import' && <BankStatementImport />}
              {activeTab === 'analytics' && <AnalyticsDashboard transactions={transactions} />}
              {activeTab === 'monthly' && <MonthlyReport transactions={transactions} />}
              {activeTab === 'budgets' && <BudgetManager transactions={transactions} />}
              {activeTab === 'debt' && <DebtTracker />}
              {activeTab === 'insights' && <AIInsights transactions={transactions} />}
              
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
