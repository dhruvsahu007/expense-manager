// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  monthly_income: number;
  salary_date: number;
  monthly_budget: number;
  is_active: boolean;
  created_at: string;
}

export interface UserCreate {
  name: string;
  email: string;
  password: string;
  monthly_income?: number;
  salary_date?: number;
}

export interface UserUpdate {
  name?: string;
  monthly_income?: number;
  salary_date?: number;
  monthly_budget?: number;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// ─── Expense ─────────────────────────────────────────────────────────────────

export interface Expense {
  id: number;
  user_id: number;
  amount: number;
  category: string;
  expense_type: string;
  date: string;
  description: string | null;
  created_at: string;
}

export interface ExpenseCreate {
  amount: number;
  category: string;
  expense_type: string;
  date: string;
  description?: string;
}

// ─── Couple ──────────────────────────────────────────────────────────────────

export interface Couple {
  id: number;
  user_1_id: number;
  user_2_id: number;
  status: string;
  created_at: string;
  partner_name?: string;
  partner_email?: string;
}

export interface SharedExpense {
  id: number;
  couple_id: number;
  paid_by_user_id: number;
  paid_by_name?: string;
  amount: number;
  category: string;
  description: string | null;
  split_type: string;
  split_ratio: string;
  date: string;
  created_at: string;
}

export interface SharedExpenseCreate {
  amount: number;
  category: string;
  description?: string;
  split_type: string;
  split_ratio: string;
  date: string;
}

export interface BalanceSummary {
  total_shared: number;
  user_1_paid: number;
  user_2_paid: number;
  user_1_owes: number;
  user_2_owes: number;
  net_balance: number;
}

// ─── Savings ─────────────────────────────────────────────────────────────────

export interface SavingsGoal {
  id: number;
  couple_id: number;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  is_completed: number;
  percent_complete?: number;
  monthly_contribution_needed?: number;
  created_at: string;
}

export interface SavingsGoalCreate {
  title: string;
  target_amount: number;
  deadline?: string;
}

export interface SavingsContribution {
  id: number;
  goal_id: number;
  user_id: number;
  user_name?: string;
  amount: number;
  created_at: string;
}

// ─── Budget ──────────────────────────────────────────────────────────────────

export interface Budget {
  id: number;
  user_id: number;
  category: string;
  monthly_limit: number;
  current_spend?: number;
  remaining?: number;
  percent_used?: number;
  created_at: string;
}

export interface BudgetCreate {
  category: string;
  monthly_limit: number;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface CategoryBreakdown {
  category: string;
  total: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  total: number;
}

export interface IndividualDashboard {
  total_income: number;
  total_expenses: number;
  savings_amount: number;
  savings_rate: number;
  burn_rate: number;
  category_breakdown: CategoryBreakdown[];
  monthly_trend: MonthlyTrend[];
}

export interface CoupleDashboard {
  shared_expenses_total: number;
  user_1_paid: number;
  user_2_paid: number;
  net_balance: number;
  category_breakdown: CategoryBreakdown[];
  goal_progress: {
    id: number;
    title: string;
    target: number;
    current: number;
    percent: number;
  }[];
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: number;
  created_at: string;
}
