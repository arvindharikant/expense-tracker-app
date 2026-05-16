import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Transaction, Budget } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { format, isSameMonth, parseISO } from 'date-fns';
import { AlertCircle, AlertTriangle, Plus } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface Props {
  transactions: Transaction[];
}

export function BudgetManager({ transactions }: Props) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatAmount } = useCurrency();
  const [newCat, setNewCat] = useState('');
  const [newAmt, setNewAmt] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'budgets'), where('userId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Budget[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Budget));
      setBudgets(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'budgets');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newCat || !newAmt) return;
    try {
      const amount = parseFloat(newAmt);
      if (isNaN(amount) || amount <= 0) return;
      
      // Use category name directly as part of ID for simplicity and overwriting
      const budgetId = `${auth.currentUser.uid}_${newCat.replace(/\s+/g, '_').toLowerCase()}`;
      await setDoc(doc(db, 'budgets', budgetId), {
        userId: auth.currentUser.uid,
        category: newCat,
        amount,
        createdAt: serverTimestamp()
      });
      setNewCat('');
      setNewAmt('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'budgets');
    }
  };

  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => t.type === 'expense' && isSameMonth(parseISO(t.date), now));
  }, [transactions]);

  const budgetProgress = useMemo(() => {
    return budgets.map(budget => {
      const spent = currentMonthExpenses
        .filter(t => t.category.toLowerCase() === budget.category.toLowerCase())
        .reduce((sum, t) => sum + t.amount, 0);
      const percentage = Math.min((spent / budget.amount) * 100, 100);
      const isExceeded = spent > budget.amount;
      const isWarning = spent > budget.amount * 0.8 && !isExceeded;
      return { ...budget, spent, percentage, isExceeded, isWarning };
    });
  }, [budgets, currentMonthExpenses]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">Set Category Budget</h2>
        <form onSubmit={handleSetBudget} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            required
            placeholder="Category (e.g., Groceries)"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            className="flex-1 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <input
            type="number"
            required
            min="0"
            step="0.01"
            placeholder="Amount Limit"
            value={newAmt}
            onChange={e => setNewAmt(e.target.value)}
            className="flex-1 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus size={20} />
            Set Budget
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <p className="text-zinc-500 dark:text-zinc-400">Loading budgets...</p>
        ) : budgetProgress.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">No budgets set. Create one above!</p>
        ) : (
          budgetProgress.map(bp => (
            <div key={bp.id} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{bp.category}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {formatAmount(bp.spent)} of {formatAmount(bp.amount)}
                  </p>
                </div>
                {bp.isExceeded ? (
                  <div className="bg-red-50 dark:bg-red-500/10 text-red-500 p-2 rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span className="text-xs font-semibold">Exceeded</span>
                  </div>
                ) : bp.isWarning ? (
                  <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-500 p-2 rounded-lg flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span className="text-xs font-semibold">Warning ({'>'}80%)</span>
                  </div>
                ) : null}
              </div>

              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    bp.isExceeded ? 'bg-red-500' : bp.isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${bp.percentage}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
