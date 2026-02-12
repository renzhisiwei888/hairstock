export interface Product {
  id: string;
  name: string;
  brand: string;
  variant: string;
  quantity: number;
  image: string;
  lowStock?: boolean;
}

export interface Transaction {
  id: string;
  type: 'in' | 'out';
  productName: string;
  brand: string;
  amount: number;
  time: string;
  dateCategory: 'Today' | 'Yesterday' | 'Older';
  notes?: string;
}

export enum AnalyticsPeriod {
  Weekly = 'Weekly',
  Monthly = 'Monthly',
}
