import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { Wallet, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function AuthScreen() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Error signing in with Google', err);
      setError(err.message || 'An error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 text-center"
      >
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Wallet size={32} />
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Expense Tracker</h1>
        <p className="text-zinc-500 mb-8">
          Track your income and expenses easily. Sign in to get started.
        </p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-start gap-3 text-left">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <p>{error}</p>
          </div>
        )}
        
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 text-zinc-700 py-3 px-4 rounded-xl hover:bg-zinc-50 transition-colors font-medium disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </button>
      </motion.div>
    </div>
  );
}
