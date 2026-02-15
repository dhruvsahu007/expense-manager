'use client';

import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Budget } from '@/types';
import { useEffect, useState } from 'react';

const CATEGORIES = ['Food', 'Rent', 'Utilities', 'Travel', 'Shopping', 'Subscriptions', 'EMI', 'Entertainment', 'Health', 'Other'];

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [category, setCategory] = useState('Food');
  const [limit, setLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadBudgets = () => {
    api.getBudgets()
      .then(setBudgets)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBudgets(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createBudget({ category, monthly_limit: parseFloat(limit) });
      setLimit('');
      setShowForm(false);
      loadBudgets();
    } catch {} finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this budget?')) return;
    try { await api.deleteBudget(id); loadBudgets(); } catch {}
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">🎯 Budgets</h1>
            <p className="text-slate-500 text-sm">Set monthly limits per category</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700 transition"
          >
            + Add Budget
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm animate-slide-up">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Limit (₹)</label>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  required
                  min="1"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                  placeholder="5000"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-mint-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-mint-700 transition disabled:opacity-50"
              >
                Save
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />)}
          </div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-4xl mb-3">🎯</p>
            <p>No budgets set. Add one to track your spending limits.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {budgets.map((budget) => {
              const percentUsed = budget.percent_used || 0;
              const isWarning = percentUsed >= 80;
              const isOver = percentUsed >= 100;

              return (
                <div key={budget.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-800">{budget.category}</h3>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="text-slate-300 hover:text-red-500 transition text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500">
                      {formatCurrency(budget.current_spend || 0)} / {formatCurrency(budget.monthly_limit)}
                    </span>
                    <span className={`font-medium ${isOver ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-mint-600'}`}>
                      {percentUsed.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-mint-500'
                      }`}
                      style={{ width: `${Math.min(percentUsed, 100)}%` }}
                    />
                  </div>
                  {budget.remaining !== undefined && (
                    <p className={`text-xs mt-1 ${budget.remaining < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      {budget.remaining >= 0
                        ? `${formatCurrency(budget.remaining)} remaining`
                        : `${formatCurrency(Math.abs(budget.remaining))} over budget!`
                      }
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
