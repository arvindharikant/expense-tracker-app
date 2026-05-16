import { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { format, parseISO, isSameMonth } from 'date-fns';

interface Props {
  transactions: Transaction[];
}

export function MonthlyReport({ transactions }: Props) {
  const { formatAmount } = useCurrency();
  const [selectedMonth, setSelectedMonth] = useState<string>(() => format(new Date(), 'yyyy-MM'));

  // Get unique months for the selector
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      months.add(t.date.substring(0, 7)); // YYYY-MM
    });
    // Always include current month
    months.add(format(new Date(), 'yyyy-MM'));
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const reportData = useMemo(() => {
    const filtered = transactions.filter(t => t.date.startsWith(selectedMonth));
    
    let income = 0;
    let expense = 0;
    const catMap = new Map<string, number>();

    filtered.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
        catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
      }
    });

    const highestCategory = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      income,
      expense,
      balance: income - expense,
      highestCategory: highestCategory ? { name: highestCategory[0], amount: highestCategory[1] } : null
    };
  }, [transactions, selectedMonth]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Monthly Report</h2>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          {availableMonths.map(m => (
            <option key={m} value={m}>
              {format(parseISO(`${m}-01`), 'MMMM yyyy')}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Total Income</h3>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-500">{formatAmount(reportData.income)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Total Expenses</h3>
          <p className="text-2xl font-semibold text-red-600 dark:text-red-500">{formatAmount(reportData.expense)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Net Balance</h3>
          <p className={`text-2xl font-semibold ${reportData.balance >= 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-red-600 dark:text-red-500'}`}>
            {formatAmount(reportData.balance)}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Highest Category</h3>
          {reportData.highestCategory ? (
            <div>
              <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 truncate">{reportData.highestCategory.name}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatAmount(reportData.highestCategory.amount)}</p>
            </div>
          ) : (
            <p className="text-lg font-medium text-zinc-400">N/A</p>
          )}
        </div>
      </div>
    </div>
  );
}
