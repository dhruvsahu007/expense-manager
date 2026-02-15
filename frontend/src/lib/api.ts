const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL ? `${API_URL}/api` : '/api';
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // ─── Auth ────────────────────────────────────────────────────────────────

  async signup(data: { name: string; email: string; password: string; monthly_income?: number; salary_date?: number }) {
    return this.request<import('@/types').User>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string) {
    return this.request<import('@/types').Token>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<import('@/types').User>('/auth/me');
  }

  async updateMe(data: import('@/types').UserUpdate) {
    return this.request<import('@/types').User>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Expenses ────────────────────────────────────────────────────────────

  async getCategories() {
    return this.request<string[]>('/expenses/categories');
  }

  async createExpense(data: import('@/types').ExpenseCreate) {
    return this.request<import('@/types').Expense>('/expenses/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getExpenses(params?: {
    category?: string;
    expense_type?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    min_amount?: number;
    max_amount?: number;
    skip?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request<import('@/types').Expense[]>(`/expenses/${query ? `?${query}` : ''}`);
  }

  async updateExpense(id: number, data: import('@/types').ExpenseUpdate) {
    return this.request<import('@/types').Expense>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: number) {
    return this.request<null>(`/expenses/${id}`, { method: 'DELETE' });
  }

  async exportExpenses(params?: { start_date?: string; end_date?: string }) {
    const token = this.getToken();
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, String(value));
      });
    }
    const query = searchParams.toString();
    const response = await fetch(`${this.baseUrl}/expenses/export${query ? `?${query}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.blob();
  }

  // ─── Recurring Expenses ──────────────────────────────────────────────────

  async createRecurringExpense(data: import('@/types').RecurringExpenseCreate) {
    return this.request<import('@/types').RecurringExpense>('/expenses/recurring', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRecurringExpenses() {
    return this.request<import('@/types').RecurringExpense[]>('/expenses/recurring/list');
  }

  async deleteRecurringExpense(id: number) {
    return this.request<null>(`/expenses/recurring/${id}`, { method: 'DELETE' });
  }

  async toggleRecurringExpense(id: number) {
    return this.request<import('@/types').RecurringExpense>(`/expenses/recurring/${id}/toggle`, {
      method: 'POST',
    });
  }

  // ─── Couple ──────────────────────────────────────────────────────────────

  async invitePartner(email: string) {
    return this.request<import('@/types').Couple>('/couple/invite', {
      method: 'POST',
      body: JSON.stringify({ partner_email: email }),
    });
  }

  async acceptInvite(coupleId: number) {
    return this.request<import('@/types').Couple>(`/couple/accept/${coupleId}`, {
      method: 'POST',
    });
  }

  async declineInvite(coupleId: number) {
    return this.request<{ detail: string }>(`/couple/decline/${coupleId}`, {
      method: 'POST',
    });
  }

  async getCoupleStatus() {
    return this.request<import('@/types').Couple>('/couple/status');
  }

  async getPendingInvites() {
    return this.request<import('@/types').Couple[]>('/couple/pending-invites');
  }

  async createSharedExpense(data: import('@/types').SharedExpenseCreate) {
    return this.request<import('@/types').SharedExpense>('/couple/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSharedExpenses() {
    return this.request<import('@/types').SharedExpense[]>('/couple/expenses');
  }

  async deleteSharedExpense(id: number) {
    return this.request<null>(`/couple/expenses/${id}`, { method: 'DELETE' });
  }

  async getBalance() {
    return this.request<import('@/types').BalanceSummary>('/couple/balance');
  }

  // ─── Settlements ─────────────────────────────────────────────────────────

  async createSettlement(data: import('@/types').SettlementCreate) {
    return this.request<import('@/types').Settlement>('/couple/settle', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSettlements() {
    return this.request<import('@/types').Settlement[]>('/couple/settlements');
  }

  // ─── Savings Goals ───────────────────────────────────────────────────────

  async createSavingsGoal(data: import('@/types').SavingsGoalCreate) {
    return this.request<import('@/types').SavingsGoal>('/couple/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSavingsGoals() {
    return this.request<import('@/types').SavingsGoal[]>('/couple/goals');
  }

  async contributeToGoal(goalId: number, amount: number) {
    return this.request<import('@/types').SavingsContribution>(
      `/couple/goals/${goalId}/contribute`,
      {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }
    );
  }

  async getContributions(goalId: number) {
    return this.request<import('@/types').SavingsContribution[]>(
      `/couple/goals/${goalId}/contributions`
    );
  }

  // ─── Budgets ─────────────────────────────────────────────────────────────

  async createBudget(data: import('@/types').BudgetCreate) {
    return this.request<import('@/types').Budget>('/budgets/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBudgets() {
    return this.request<import('@/types').Budget[]>('/budgets/');
  }

  async updateBudget(id: number, data: { monthly_limit: number }) {
    return this.request<import('@/types').Budget>(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBudget(id: number) {
    return this.request<null>(`/budgets/${id}`, { method: 'DELETE' });
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────

  async getIndividualDashboard() {
    return this.request<import('@/types').IndividualDashboard>('/dashboard/individual');
  }

  async getCoupleDashboard() {
    return this.request<import('@/types').CoupleDashboard>('/dashboard/couple');
  }

  // ─── Notifications ───────────────────────────────────────────────────────

  async getNotifications() {
    return this.request<import('@/types').Notification[]>('/dashboard/notifications');
  }

  async markNotificationRead(id: number) {
    return this.request<{ status: string }>(`/dashboard/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async markAllNotificationsRead() {
    return this.request<{ status: string }>('/dashboard/notifications/mark-all-read', {
      method: 'POST',
    });
  }

  async getUnreadCount() {
    return this.request<{ unread_count: number }>('/dashboard/notifications/unread-count');
  }
}

export const api = new ApiClient();
