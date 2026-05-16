import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Reminder } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { PlusCircle, User, CreditCard, ArrowRight, CheckCircle2, Circle, Clock, Trash2, Calendar } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { motion, AnimatePresence } from 'motion/react';

export function DebtTracker() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatAmount } = useCurrency();

  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState<'lent' | 'borrowed'>('lent');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'reminders'), where('userId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Reminder[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Reminder));
      // Sort by due date ASC
      data.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setReminders(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reminders');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await addDoc(collection(db, 'reminders'), {
        userId: auth.currentUser.uid,
        personName,
        amount: parseFloat(amount),
        note: note || '',
        dueDate,
        type,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setPersonName('');
      setAmount('');
      setNote('');
      setDueDate('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reminders');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (reminder: Reminder) => {
    try {
      await updateDoc(doc(db, 'reminders', reminder.id), {
        status: reminder.status === 'pending' ? 'paid' : 'pending'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reminders/${reminder.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reminders', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reminders/${id}`);
    }
  };

  const { pending, paid, overdue } = useMemo(() => {
    const today = startOfDay(new Date());
    const pendingList: Reminder[] = [];
    const paidList: Reminder[] = [];
    const overdueList: Reminder[] = [];

    reminders.forEach(r => {
      if (r.status === 'paid') {
        paidList.push(r);
      } else {
        const dDate = startOfDay(parseISO(r.dueDate));
        if (isBefore(dDate, today)) {
          overdueList.push(r);
        } else {
          pendingList.push(r);
        }
      }
    });

    return { pending: pendingList, paid: paidList, overdue: overdueList };
  }, [reminders]);

  const renderReminderCard = (reminder: Reminder, isOverdue: boolean) => (
    <motion.div
      key={reminder.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`relative p-5 rounded-3xl border transition-all ${
        reminder.status === 'paid' 
          ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 opacity-60' 
          : isOverdue 
            ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50'
            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            reminder.type === 'lent' 
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
          }`}>
            <User size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
              {reminder.type === 'lent' ? 'Lent to' : 'Borrowed from'} {reminder.personName}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <Calendar size={12} />
              <span className={isOverdue && reminder.status === 'pending' ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
                Due: {format(parseISO(reminder.dueDate), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>
        <span className={`font-semibold text-lg ${
          reminder.status === 'paid' ? 'text-zinc-500 dark:text-zinc-400 line-through' :
          reminder.type === 'lent' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'
        }`}>
          {formatAmount(reminder.amount)}
        </span>
      </div>

      {reminder.note && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 px-1">{reminder.note}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => handleToggleStatus(reminder)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            reminder.status === 'paid' 
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
              : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {reminder.status === 'paid' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          {reminder.status === 'paid' ? 'Paid' : 'Mark as Paid'}
        </button>
        <button
          onClick={() => handleDelete(reminder.id)}
          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {/* Add Reminder Form */}
      <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">Add Reminder</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl md:col-span-2">
            <button
              type="button"
              onClick={() => setType('lent')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${
                type === 'lent' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <ArrowRight size={16} className="-rotate-45" /> I Lent Money
            </button>
            <button
              type="button"
              onClick={() => setType('borrowed')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${
                type === 'borrowed' ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <ArrowRight size={16} className="rotate-135" /> I Borrowed Money
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Person Name</label>
            <input
              type="text"
              required
              maxLength={100}
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g., John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Due Date</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Note (Optional)</label>
            <input
              type="text"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g., Dinner last night"
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-emerald-600 text-white py-3 px-4 rounded-xl hover:bg-zinc-800 dark:hover:bg-emerald-700 transition-colors font-medium disabled:opacity-70"
            >
              <PlusCircle size={18} />
              {isSubmitting ? 'Adding...' : 'Add Reminder'}
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl" />
          <div className="h-32 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl" />
        </div>
      ) : (
        <div className="space-y-8">
          {overdue.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4 text-red-600 dark:text-red-400 font-semibold px-2">
                <Clock size={20} />
                <h3>Overdue</h3>
                <span className="bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 py-0.5 px-2 rounded-full text-xs">
                  {overdue.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {overdue.map(r => renderReminderCard(r, true))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {pending.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4 text-zinc-800 dark:text-zinc-200 font-semibold px-2">
                <CreditCard size={20} />
                <h3>Pending</h3>
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 py-0.5 px-2 rounded-full text-xs">
                  {pending.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {pending.map(r => renderReminderCard(r, false))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {paid.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400 font-semibold px-2">
                <CheckCircle2 size={20} />
                <h3>Paid</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {paid.map(r => renderReminderCard(r, false))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {reminders.length === 0 && (
            <div className="text-center py-12 px-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
              <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="text-zinc-300 dark:text-zinc-600" size={24} />
              </div>
              <h3 className="text-zinc-900 dark:text-zinc-50 font-medium mb-1">No reminders yet</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Add a reminder to track people who owe you money or vice versa.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
