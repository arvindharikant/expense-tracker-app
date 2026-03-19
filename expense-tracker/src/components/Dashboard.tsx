import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Transaction } from '../types';
import { SummaryCards } from './SummaryCards';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { LogOut, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useCurrency, CURRENCIES } from '../contexts/CurrencyContext';

export function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { currency, setCurrency } = useCurrency();

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
        
        // Sort in memory: first by date (desc), then by createdAt (desc)
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

  const handleSignOut = () => {
    auth.signOut();
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Expense Tracker</h1>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={currency.code}
              onChange={(e) => {
                const selected = CURRENCIES.find(c => c.code === e.target.value);
                if (selected) setCurrency(selected);
              }}
              className="text-sm bg-zinc-100 border-none rounded-lg py-1.5 px-3 text-zinc-700 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
            <span className="text-sm text-zinc-500 hidden sm:inline-block">
              {auth.currentUser?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-zinc-400" size={32} />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <SummaryCards transactions={transactions} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-1 sticky top-24">
                <TransactionForm />
              </div>
              <div className="lg:col-span-2">
                <TransactionList transactions={transactions} />
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
