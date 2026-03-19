import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '../contexts/CurrencyContext';

export function TransactionForm() {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currency } = useCurrency();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser.uid,
        type,
        amount: parsedAmount,
        category: category.trim() || 'Uncategorized',
        description: description.trim(),
        date,
        createdAt: serverTimestamp(),
      });

      // Reset form
      setAmount('');
      setCategory('');
      setDescription('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
      <h2 className="text-lg font-semibold text-zinc-900 mb-6">Add Transaction</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4 p-1 bg-zinc-100 rounded-xl">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              type === 'expense' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              type === 'income' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Income
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">{currency.symbol}</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Category</label>
          <input
            type="text"
            required
            maxLength={50}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            placeholder="e.g., Groceries, Salary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Description (Optional)</label>
          <input
            type="text"
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            placeholder="Brief description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white py-3 px-4 rounded-xl hover:bg-zinc-800 transition-colors font-medium disabled:opacity-70"
        >
          <PlusCircle size={18} />
          {isSubmitting ? 'Adding...' : 'Add Transaction'}
        </button>
      </form>
    </div>
  );
}
