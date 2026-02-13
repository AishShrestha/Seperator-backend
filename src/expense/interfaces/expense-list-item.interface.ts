export interface PaidByItem {
  user_id: string;
  user_name: string;
  amount_paid: number;
}

export interface SplitBetweenItem {
  user_id: string;
  user_name: string;
  split_price: number;
}

export interface ExpenseListItem {
  expense_id: string;
  expense_name: string;
  total_amount: number;
  paid_by: PaidByItem[];
  category_name: string | null;
  created_at: Date;
  split_between: SplitBetweenItem[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedExpenseList {
  data: ExpenseListItem[];
  pagination: PaginationMeta;
}
