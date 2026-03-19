import { Transaction } from '../types';
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { useCurrency } from '../contexts/CurrencyContext';

interface SummaryCardsProps {
  transactions: Transaction[];
}

export function SummaryCards({ transactions }: SummaryCardsProps) {
  const { formatAmount } = useCurrency();

  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = income - expense;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-900 text-white p-6 rounded-3xl shadow-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <Wallet className="text-white" size={20} />
          </div>
          <h3 className="text-zinc-400 font-medium">Total Balance</h3>
        </div>
        <p className="text-3xl font-semibold tracking-tight">
          {formatAmount(balance)}
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
            <ArrowUpCircle className="text-emerald-500" size={20} />
          </div>
          <h3 className="text-zinc-500 font-medium">Total Income</h3>
        </div>
        <p className="text-3xl font-semibold tracking-tight text-zinc-900">
          {formatAmount(income)}
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
            <ArrowDownCircle className="text-red-500" size={20} />
          </div>
          <h3 className="text-zinc-500 font-medium">Total Expense</h3>
        </div>
        <p className="text-3xl font-semibold tracking-tight text-zinc-900">
          {formatAmount(expense)}
        </p>
      </motion.div>
    </div>
  );
}
