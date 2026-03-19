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
