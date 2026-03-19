import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { CurrencyProvider } from './contexts/CurrencyContext';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <CurrencyProvider>
        {user ? <Dashboard /> : <AuthScreen />}
      </CurrencyProvider>
    </ErrorBoundary>
  );
}
