'use client';

import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, CATEGORY_ICONS } from '@/lib/utils';
import { Expense, RecurringExpense } from '@/types';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const CATEGORIES = ['Food', 'Rent', 'Utilities', 'Travel', 'Shopping', 'Subscriptions', 'EMI', 'Entertainment', 'Health', 'Other'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [tab, setTab] = useState<'expenses' | 'recurring'>('expenses');

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Recurring form
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recAmount, setRecAmount] = useState('');
  const [recCategory, setRecCategory] = useState('Food');
  const [recDescription, setRecDescription] = useState('');
  const [recFrequency, setRecFrequency] = useState('monthly');
  const [recDay, setRecDay] = useState('1');

  const loadExpenses = () => {
    const params: Record<string, string | number | undefined> = {};
    if (filterCategory) params.category = filterCategory;
    if (searchQuery) params.search = searchQuery;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    api.getExpenses(params)
      .then(setExpenses)
      .catch(() => toast.error('Failed to load expenses'))
      .finally(() => setLoading(false));
  };

  const loadRecurring = () => {
    api.getRecurringExpenses()
      .then(setRecurringExpenses)
      .catch(() => {});
  };

  useEffect(() => { loadExpenses(); loadRecurring(); }, [filterCategory]);

  useEffect(() => {
    const timer = setTimeout(() => loadExpenses(), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createExpense({
        amount: parseFloat(amount),
        category,
        expense_type: 'personal',
        date,
        description: description || undefined,
      });
      toast.success('Expense added!');
      setAmount('');
      setDescription('');
      setShowForm(false);
      loadExpenses();
    } catch {
      toast.error('Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.category);
    setEditDate(expense.date);
    setEditDescription(expense.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await api.updateExpense(editingId, {
        amount: parseFloat(editAmount),
        category: editCategory,
        date: editDate,
        description: editDescription || undefined,
      });
      toast.success('Expense updated!');
      setEditingId(null);
      loadExpenses();
    } catch {
      toast.error('Failed to update expense');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.deleteExpense(id);
      toast.success('Expense deleted');
      loadExpenses();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportExpenses({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported successfully!');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRecurringExpense({
        amount: parseFloat(recAmount),
        category: recCategory,
        description: recDescription || undefined,
        frequency: recFrequency,
        day_of_month: parseInt(recDay),
      });
      toast.success('Recurring expense created!');
      setRecAmount('');
      setRecDescription('');
      setShowRecurringForm(false);
      loadRecurring();
    } catch {
      toast.error('Failed to create recurring expense');
    }
  };

  const handleDeleteRecurring = async (id: number) => {
    if (!confirm('Delete this recurring expense?')) return;
    try {
      await api.deleteRecurringExpense(id);
      toast.success('Deleted');
      loadRecurring();
    } catch {}
  };

  const handleToggleRecurring = async (id: number) => {
    try {
      await api.toggleRecurringExpense(id);
      loadRecurring();
    } catch {}
  };

  const totalThisMonth = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <AppLayout>
      <div className="space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
            <p className="text-slate-500 text-sm">Total: {formatCurrency(totalThisMonth)} · {expenses.length} entries</p>
          </div>
          <button
            onClick={handleExport}
            className="hidden md:flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
          >
            📥 Export CSV
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('expenses')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'expenses' ? 'bg-mint-600 text-white' : 'bg-white text-slate-600 border'}`}
          >
            💸 Expenses
          </button>
          <button
            onClick={() => setTab('recurring')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'recurring' ? 'bg-mint-600 text-white' : 'bg-white text-slate-600 border'}`}
          >
            🔄 Recurring ({recurringExpenses.length})
          </button>
        </div>

        {tab === 'expenses' && (
          <>
            {/* Search & Filters */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search expenses..."
                    className="w-full px-4 py-2.5 pl-10 rounded-lg border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-200 outline-none text-sm"
                  />
                  <span className="absolute left-3 top-3 text-slate-400">🔍</span>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition ${showFilters ? 'bg-mint-50 border-mint-300 text-mint-700' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  ⚙ Filters
                </button>
              </div>

              {showFilters && (
                <div className="bg-white rounded-xl p-4 shadow-sm animate-slide-up flex flex-wrap gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
                    <input
                      type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-mint-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
                    <input
                      type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-mint-500 outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => { setStartDate(''); setEndDate(''); setSearchQuery(''); setFilterCategory(''); }}
                      className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-500 transition"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex items-end md:hidden">
                    <button onClick={handleExport} className="px-3 py-2 rounded-lg text-sm text-mint-600 font-medium">
                      📥 Export
                    </button>
                  </div>
                </div>
              )}

              {/* Category Filters */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setFilterCategory('')}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                    !filterCategory ? 'bg-mint-600 text-white' : 'bg-white text-slate-600 border'
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                      filterCategory === cat ? 'bg-mint-600 text-white' : 'bg-white text-slate-600 border'
                    }`}
                  >
                    {CATEGORY_ICONS[cat]} {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Expense Form */}
            {showForm && (
              <div className="bg-white rounded-xl p-6 shadow-sm animate-slide-up">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Expense</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        min="1"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-200 outline-none"
                        placeholder="500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-200 outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-200 outline-none"
                        placeholder="Optional note"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-mint-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-mint-700 transition disabled:opacity-50"
                    >
                      {submitting ? 'Adding...' : 'Add Expense'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Expense List */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl h-20 animate-pulse" />
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-4xl mb-3">📭</p>
                <p>No expenses found. {searchQuery || startDate ? 'Try adjusting your filters.' : 'Tap + to add one!'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="bg-white rounded-xl px-4 py-3 shadow-sm animate-fade-in group"
                  >
                    {editingId === expense.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-mint-500 outline-none"
                            placeholder="Amount"
                          />
                          <select
                            value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-mint-500 outline-none"
                          >
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-mint-500 outline-none"
                          />
                          <input
                            type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-mint-500 outline-none"
                            placeholder="Description"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700">
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg border text-sm text-slate-500">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{CATEGORY_ICONS[expense.category] || '📦'}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-800">{expense.category}</p>
                              {expense.is_recurring && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">🔄 Recurring</span>}
                            </div>
                            <p className="text-xs text-slate-400">
                              {formatDate(expense.date)}
                              {expense.description && ` · ${expense.description}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{formatCurrency(expense.amount)}</span>
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition opacity-0 group-hover:opacity-100 md:opacity-100"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 md:opacity-100"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Floating Add Button */}
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="fixed bottom-20 md:bottom-8 right-6 bg-mint-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-mint-700 transition hover:scale-110 z-40"
              >
                +
              </button>
            )}
          </>
        )}

        {/* Recurring Tab */}
        {tab === 'recurring' && (
          <>
            <div className="flex justify-end">
              <button
                onClick={() => setShowRecurringForm(!showRecurringForm)}
                className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700 transition"
              >
                + Add Recurring
              </button>
            </div>

            {showRecurringForm && (
              <div className="bg-white rounded-xl p-6 shadow-sm animate-slide-up">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">New Recurring Expense</h3>
                <form onSubmit={handleCreateRecurring} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                      <input type="number" value={recAmount} onChange={(e) => setRecAmount(e.target.value)} required min="1"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none" placeholder="500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                      <select value={recCategory} onChange={(e) => setRecCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none">
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                      <select value={recFrequency} onChange={(e) => setRecFrequency(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none">
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Day of Month</label>
                      <select value={recDay} onChange={(e) => setRecDay(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none">
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <input type="text" value={recDescription} onChange={(e) => setRecDescription(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none" placeholder="e.g., Netflix" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="bg-mint-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-mint-700">Create</button>
                    <button type="button" onClick={() => setShowRecurringForm(false)} className="px-6 py-2.5 rounded-lg border text-slate-600">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {recurringExpenses.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-4xl mb-3">🔄</p>
                <p>No recurring expenses. Set up monthly bills like rent, subscriptions, etc.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recurringExpenses.map((rec) => (
                  <div key={rec.id} className={`bg-white rounded-xl p-4 shadow-sm ${!rec.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{CATEGORY_ICONS[rec.category] || '📦'}</span>
                        <div>
                          <p className="font-medium text-slate-800">{rec.category}</p>
                          <p className="text-xs text-slate-400">
                            {formatCurrency(rec.amount)} · {rec.frequency} on day {rec.day_of_month}
                            {rec.description && ` · ${rec.description}`}
                          </p>
                          {rec.next_date && (
                            <p className="text-xs text-mint-600">Next: {formatDate(rec.next_date)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleRecurring(rec.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${rec.is_active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {rec.is_active ? '● Active' : '○ Paused'}
                        </button>
                        <button
                          onClick={() => handleDeleteRecurring(rec.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
