import { useState } from 'react';
import { Transaction } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Props {
  transactions: Transaction[];
}

export function AIInsights({ transactions }: Props) {
  const { formatAmount } = useCurrency();

  const [insights, setInsights] = useState<{
    summary: string;
    improvements: string[];
    overspending: string[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateInsights = async () => {
       if (transactions.length === 0) {
      setError('Not enough transaction data to analyze.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log(import.meta.env.VITE_GEMINI_API_KEY)
      const ai = new GoogleGenAI({
        apiKey: import.meta.env.VITE_GEMINI_API_KEY
      });

      const prompt = `
        Analyze the following user transaction data and provide financial insights.

        Return ONLY valid JSON in this format:
        {
          "summary": "Short financial summary",
          "overspending": ["category1", "category2"],
          "improvements": ["tip1", "tip2"]
        }

        Transactions:
        ${JSON.stringify(
          transactions.map((t) => ({
            type: t.type,
            amount: t.amount,
            category: t.category,
            date: format(parseISO(t.date), 'yyyy-MM-dd')
          }))
        )}
     `;

const response = await ai.models.generateContent({
model: "gemini-2.0-flash",
  contents: prompt
});

      const text =
        response.text
          ?.replace(/```json/g, '')
          .replace(/```/g, '')
          .trim() || '{}';

let parsed;

try {
  parsed = JSON.parse(text);
} catch (error) {
  console.error("Invalid JSON response:", text);

  parsed = {
    summary: "AI generated insights successfully.",
    overspending: [],
    improvements: [text]
  };
}
      setInsights(parsed);

    } catch (err) {
      console.error(err);
      setError('Failed to generate insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles size={28} className="text-purple-200" />
            <h2 className="text-2xl font-bold">
              AI Financial Insights
            </h2>
          </div>

          <p className="text-purple-100 mb-8 max-w-xl">
            Get personalized financial insights powered by Gemini AI.
          </p>

          <button
            onClick={generateInsights}
            disabled={loading}
            className="bg-white text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              'Generate Insights'
            )}
          </button>
        </div>

        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-500 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="md:col-span-3 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
              Overall Summary
            </h3>

            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {insights.summary}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              High Spending Areas
            </h3>

            <ul className="space-y-3">
              {insights.overspending?.map((item, i) => (
                <li
                  key={i}
                  className="text-zinc-600 dark:text-zinc-400 text-sm flex items-start gap-2"
                >
                  <span className="text-red-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Actionable Improvements
            </h3>

            <div className="space-y-4">
              {insights.improvements?.map((item, i) => (
                <div
                  key={i}
                  className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl"
                >
                  <p className="text-emerald-800 dark:text-emerald-300 text-sm">
                    {item}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}