'use client';

import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';
import { formatCurrency, CATEGORY_ICONS } from '@/lib/utils';
import { Budget } from '@/types';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const CATEGORIES = ['Food', 'Rent', 'Utilities', 'Travel', 'Shopping', 'Subscriptions', 'EMI', 'Entertainment', 'Health', 'Other'];

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [category, setCategory] = useState('Food');
  const [limit, setLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLimit, setEditLimit] = useState('');

  const loadBudgets = () => {
    api.getBudgets()
      .then(setBudgets)
      .catch(() => toast.error('Failed to load budgets'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBudgets(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createBudget({ category, monthly_limit: parseFloat(limit) });
      toast.success('Budget saved!');
      setLimit('');
      setShowForm(false);
      loadBudgets();
    } catch {
      toast.error('Failed to save budget');
    } finally { setSubmitting(false); }
  };

  const handleEdit = (budget: Budget) => {
    setEditingId(budget.id);
    setEditLimit(budget.monthly_limit.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await api.updateBudget(editingId, { monthly_limit: parseFloat(editLimit) });
      toast.success('Budget updated!');
      setEditingId(null);
      loadBudgets();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this budget?')) return;
    try {
      await api.deleteBudget(id);
      toast.success('Budget deleted');
      loadBudgets();
    } catch {
      toast.error('Failed to delete');
    }
  };

  // Budget summary
  const totalBudget = budgets.reduce((sum, b) => sum + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.current_spend || 0), 0);
  const totalRemaining = totalBudget - totalSpent;
  const overBudgetCount = budgets.filter(b => (b.percent_used || 0) >= 100).length;
  const warningCount = budgets.filter(b => (b.percent_used || 0) >= 80 && (b.percent_used || 0) < 100).length;

  // Available categories (not yet budgeted)
  const budgetedCategories = budgets.map(b => b.category);
  const availableCategories = CATEGORIES.filter(c => !budgetedCategories.includes(c));

  return (
    <AppLayout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">🎯 Budgets</h1>
            <p className="text-slate-500 text-sm">Set monthly limits per category</p>
          </div>
          {availableCategories.length > 0 && (
            <button
              onClick={() => { setShowForm(!showForm); setCategory(availableCategories[0] || 'Food'); }}
              className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700 transition"
            >
              + Add Budget
            </button>
          )}
        </div>

        {/* Summary Cards */}
        {budgets.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">Total Budget</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">Total Spent</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(totalSpent)}</p>
            </div>
            <div className={`rounded-xl p-4 shadow-sm ${totalRemaining >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-xs text-slate-500">Remaining</p>
              <p className={`text-lg font-bold ${totalRemaining >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(totalRemaining))}
                {totalRemaining < 0 && ' over'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">Alerts</p>
              <div className="flex items-center gap-2 mt-1">
                {overBudgetCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{overBudgetCount} over</span>}
                {warningCount > 0 && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">{warningCount} warning</span>}
                {overBudgetCount === 0 && warningCount === 0 && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">All good ✓</span>}
              </div>
            </div>
          </div>
        )}

        {/* Overall Progress Bar */}
        {budgets.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">Overall Budget Usage</p>
              <p className="text-sm font-medium text-slate-700">
                {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(0)}%` : '0%'}
              </p>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  totalSpent > totalBudget ? 'bg-red-500' : totalSpent > totalBudget * 0.8 ? 'bg-amber-400' : 'bg-gradient-to-r from-mint-400 to-mint-600'
                }`}
                style={{ width: `${Math.min((totalSpent / (totalBudget || 1)) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {formatCurrency(totalSpent)} spent of {formatCurrency(totalBudget)} budgeted
            </p>
          </div>
        )}

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
                  {availableCategories.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
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
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-mint-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-mint-700 transition disabled:opacity-50"
                >
                  Save
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-lg border text-slate-600">
                  Cancel
                </button>
              </div>
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
            <p className="text-sm mt-2">Set budgets per category to get alerts when you&apos;re close to your limits.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {budgets.map((budget) => {
              const percentUsed = budget.percent_used || 0;
              const isWarning = percentUsed >= 80 && percentUsed < 100;
              const isOver = percentUsed >= 100;
              const icon = CATEGORY_ICONS[budget.category] || '📦';

              return (
                <div key={budget.id} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                  isOver ? 'border-l-red-500' : isWarning ? 'border-l-amber-400' : 'border-l-mint-500'
                }`}>
                  {editingId === budget.id ? (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800 mb-2">{budget.category}</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" value={editLimit} onChange={(e) => setEditLimit(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-32 focus:border-mint-500 outline-none"
                            placeholder="New limit"
                          />
                          <button onClick={handleSaveEdit} className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-2 rounded-lg border text-sm text-slate-500">Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{icon}</span>
                          <h3 className="font-semibold text-slate-800">{budget.category}</h3>
                          {isOver && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Over budget!</span>}
                          {isWarning && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">⚠️ Warning</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(budget)}
                            className="p-1 text-slate-300 hover:text-blue-500 transition text-sm"
                            title="Edit limit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(budget.id)}
                            className="p-1 text-slate-300 hover:text-red-500 transition text-sm"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-500">
                          {formatCurrency(budget.current_spend || 0)} / {formatCurrency(budget.monthly_limit)}
                        </span>
                        <span className={`font-medium ${isOver ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-mint-600'}`}>
                          {percentUsed.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOver ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-mint-500'
                          }`}
                          style={{ width: `${Math.min(percentUsed, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        {budget.remaining !== undefined && (
                          <p className={`text-xs ${budget.remaining < 0 ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                            {budget.remaining >= 0
                              ? `${formatCurrency(budget.remaining)} remaining`
                              : `${formatCurrency(Math.abs(budget.remaining))} over budget!`
                            }
                          </p>
                        )}
                        {budget.remaining !== undefined && budget.remaining > 0 && (
                          <p className="text-xs text-slate-400">
                            ~{formatCurrency(budget.remaining / Math.max(1, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()))}/day left
                          </p>
                        )}
                      </div>
                    </>
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
