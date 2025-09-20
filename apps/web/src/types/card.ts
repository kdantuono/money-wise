export interface Card {
  id: string;
  name?: string;
  number?: string;
  cardNumber?: string;
  type?: 'credit' | 'debit';
  balance: number;
  limit?: number;
  color?: string;
  isActive?: boolean;
  cardHolder?: string;
  validThru?: string;
}
