import { Transaction } from '../types';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useCurrency } from '../contexts/CurrencyContext';

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  const { formatAmount } = useCurrency();

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 text-center">
        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ArrowUpRight className="text-zinc-300" size={24} />
        </div>
        <h3 className="text-zinc-900 font-medium mb-1">No transactions yet</h3>
        <p className="text-zinc-500 text-sm">Add your first income or expense to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
      <div className="p-6 border-b border-zinc-100">
        <h2 className="text-lg font-semibold text-zinc-900">Recent Transactions</h2>
      </div>
      <div className="divide-y divide-zinc-100">
        <AnimatePresence initial={false}>
          {transactions.map((transaction) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 sm:p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  transaction.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'
                }`}>
                  {transaction.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                </div>
                <div>
                  <h3 className="text-zinc-900 font-medium">{transaction.category}</h3>
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <span>{format(parseISO(transaction.date), 'MMM d, yyyy')}</span>
                    {transaction.description && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[120px] sm:max-w-[200px]">{transaction.description}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`font-semibold ${
                  transaction.type === 'income' ? 'text-emerald-600' : 'text-zinc-900'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                </span>
                <button
                  onClick={() => handleDelete(transaction.id)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label="Delete transaction"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
