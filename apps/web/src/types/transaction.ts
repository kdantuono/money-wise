export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  subcategory?: string;
  description: string;
  date: Date;
  merchantName?: string;
  isRecurring: boolean;
  tags: string[];
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}