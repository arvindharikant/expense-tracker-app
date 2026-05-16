export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  createdAt: any; // Firestore Timestamp
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  createdAt?: any;
}

export interface Reminder {
  id: string;
  userId: string;
  personName: string;
  amount: number;
  note: string;
  dueDate: string; // YYYY-MM-DD
  type: 'lent' | 'borrowed';
  status: 'pending' | 'paid';
  createdAt?: any;
}
