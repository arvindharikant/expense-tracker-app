import { Transaction } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from 'recharts';
import { format, parseISO, startOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from 'date-fns';

interface Props {
  transactions: Transaction[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function AnalyticsDashboard({ transactions }: Props) {
  const { formatAmount } = useCurrency();

  const { categoryData, monthlyData, weeklyData, topCategory } = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    
    // Category Data for Pie Chart
    const catMap = new Map<string, number>();
    expenses.forEach(t => {
      catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
    });
    const categoryData = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const topCategory = categoryData.length > 0 ? categoryData[0] : null;

    // Monthly Data for Bar Chart
    const monthMap = new Map<string, { month: string, income: number, expense: number }>();
    transactions.forEach(t => {
      const monthLabel = format(parseISO(t.date), 'MMM yyyy');
      if (!monthMap.has(monthLabel)) {
        monthMap.set(monthLabel, { month: monthLabel, income: 0, expense: 0 });
      }
      const data = monthMap.get(monthLabel)!;
      if (t.type === 'income') data.income += t.amount;
      if (t.type === 'expense') data.expense += t.amount;
    });
    // Sort by actual date
    const monthlyData = Array.from(monthMap.values()).sort((a, b) => {
      return new Date(a.month).getTime() - new Date(b.month).getTime();
    });

    // Weekly Data for Line Chart (Current Month)
    const now = new Date();
    const currentMonthExpenses = expenses.filter(t => isSameMonth(parseISO(t.date), now));
    const weekMap = new Map<string, number>();
    
    currentMonthExpenses.forEach(t => {
      const d = parseISO(t.date);
      const weekStart = format(startOfWeek(d), 'MMM d');
      weekMap.set(weekStart, (weekMap.get(weekStart) || 0) + t.amount);
    });
    
    const weeklyData = Array.from(weekMap.entries())
      .map(([week, amount]) => ({ week, amount }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

    return { categoryData, monthlyData, weeklyData, topCategory };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {topCategory && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Top Spending Category</h3>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{topCategory.name}</p>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">{formatAmount(topCategory.value)} total</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6">Expenses by Category</h3>
          <div className="h-72">
            {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatAmount(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400">No expense data</div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 justify-center">
             {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                   <span className="text-zinc-600 dark:text-zinc-400">{entry.name}</span>
                </div>
             ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6">Income vs Expenses</h3>
          <div className="h-72">
            {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => Math.abs(val) > 1000 ? `${(val/1000).toFixed(1)}k` : val} />
                <Tooltip 
                  formatter={(value: number) => formatAmount(value)}
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400">No data</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6">Weekly Spending (Current Month)</h3>
        <div className="h-72">
          {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => Math.abs(val) > 1000 ? `${(val/1000).toFixed(1)}k` : val} />
              <Tooltip 
                formatter={(value: number) => formatAmount(value)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="amount" name="Amount" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-400">No data for this month</div>
          )}
        </div>
      </div>
    </div>
  );
}
