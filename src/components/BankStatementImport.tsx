import { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import * as XLSX from 'xlsx';
import { Upload, CheckCircle2, XCircle, Loader2, AlertCircle, FileText, FileSpreadsheet, Save } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { motion } from 'motion/react';

interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

export function BankStatementImport() {
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [previewTransactions, setPreviewTransactions] = useState<ExtractedTransaction[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!process.env.GEMINI_API_KEY) {
      setError('Gemini API key is not configured.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);
    setPreviewTransactions([]);

    try {
      let promptContent: any[] = [
        `Extract the transactions from the provided bank statement.
        Identify the date, description (merchant), amount, and whether it is a credit (income) or debit (expense).
        For each transaction, assign an appropriate category (e.g., Groceries, Rent, Salary, Entertainment, Utilities, Transport, Dining, Healthcare, Shopping, etc.).
        Ensure dates are formatted strictly as YYYY-MM-DD. Ensure amounts are positive numbers.
        Return the result strictly as a JSON array of objects with the following keys:
        - date: string (YYYY-MM-DD)
        - description: string
        - amount: number
        - type: string ('income' or 'expense')
        - category: string
        
        Return ONLY the raw JSON array. DO NOT wrap it in markdown blockquotes.`
      ];

      if (file.type === 'application/pdf') {
        const base64 = await fileToBase64(file);
        promptContent.push({
          inlineData: {
            data: base64.split(',')[1],
            mimeType: 'application/pdf'
          }
        });
      } else if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        const text = await file.text();
        promptContent.push(`\n\nBank Statement CSV:\n${text}`);
      } else if (file.name.match(/\.xlsx?$/)) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(firstSheet);
        promptContent.push(`\n\nBank Statement Data:\n${csv}`);
      } else {
        throw new Error('Unsupported file format. Please upload PDF, CSV, or Excel.');
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptContent,
      });

      const text = response.text?.replace(/```json/gi, '').replace(/```/g, '').trim() || '[]';
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        setPreviewTransactions(parsed);
      } else {
        throw new Error('Could not parse transactions from the file.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process the bank statement.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser || previewTransactions.length === 0) return;
    setSaving(true);
    try {
      for (const t of previewTransactions) {
        await addDoc(collection(db, 'transactions'), {
          userId: auth.currentUser.uid,
          amount: t.amount,
          category: t.category,
          date: t.date,
          description: t.description,
          type: t.type,
          createdAt: serverTimestamp()
        });
      }
      setPreviewTransactions([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
      setError('Failed to save some transactions.');
    } finally {
      setSaving(false);
    }
  };

  const removePreviewTransaction = (index: number) => {
    setPreviewTransactions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col items-center justify-center text-center max-w-xl mx-auto">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
            <Upload size={32} />
          </div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Import Bank Statement</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">
            Upload your bank statement in PDF, CSV, or Excel format. Our AI will automatically extract and categorize your transactions.
          </p>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.csv,.xlsx,.xls"
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || saving}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
            {loading ? 'Analyzing Document...' : 'Select File to Upload'}
          </button>
          
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-zinc-400">
           <span className="flex items-center gap-1"><FileText size={16}/> PDF</span>
           <span className="flex items-center gap-1"><FileSpreadsheet size={16}/> Excel / CSV</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="shrink-0" size={18} />
          <p className="text-sm font-medium">Successfully imported transactions!</p>
        </div>
      )}

      {previewTransactions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Preview Transactions</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Review and save {previewTransactions.length} extracted transactions.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPreviewTransactions([])}
                disabled={saving}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save All
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Merchant/Description</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium text-right">Amount</th>
                  <th className="px-6 py-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {previewTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{tx.date}</td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-900 dark:text-zinc-100 font-medium overflow-hidden text-ellipsis max-w-[200px]">{tx.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-semibold ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-50'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => removePreviewTransaction(idx)}
                        disabled={saving}
                        className="text-zinc-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        title="Remove from import"
                      >
                        <XCircle size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
