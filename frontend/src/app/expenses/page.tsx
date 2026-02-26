'use client';

import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, CATEGORY_ICONS } from '@/lib/utils';
import { PencilIcon, TrashIcon, FunnelIcon, ArrowsUpDownIcon, MagnifyingGlassIcon, XMarkIcon, PlusIcon, CheckIcon, ArrowDownTrayIcon, ArrowPathIcon, PauseIcon, PlayIcon } from '@/lib/icons';
import { Expense, RecurringExpense } from '@/types';
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';

const CATEGORIES = ['Food', 'Rent', 'Utilities', 'Travel', 'Shopping', 'Subscriptions', 'EMI', 'Entertainment', 'Health', 'Other'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type SortOption = 'recent' | 'oldest' | 'high' | 'low';
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'high', label: 'Amount: High to Low' },
  { value: 'low', label: 'Amount: Low to High' },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'expenses' | 'recurring'>('expenses');

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recAmount, setRecAmount] = useState('');
  const [recCategory, setRecCategory] = useState('Food');
  const [recDescription, setRecDescription] = useState('');
  const [recFrequency, setRecFrequency] = useState('monthly');
  const [recDay, setRecDay] = useState('1');
  const [recDayOfWeek, setRecDayOfWeek] = useState('0');
  const [recEndDate, setRecEndDate] = useState('');

  const [editRecId, setEditRecId] = useState<number | null>(null);
  const [editRecAmount, setEditRecAmount] = useState('');
  const [editRecCategory, setEditRecCategory] = useState('');
  const [editRecDescription, setEditRecDescription] = useState('');
  const [editRecFrequency, setEditRecFrequency] = useState('monthly');
  const [editRecDay, setEditRecDay] = useState('1');
  const [editRecDayOfWeek, setEditRecDayOfWeek] = useState('0');
  const [editRecEndDate, setEditRecEndDate] = useState('');

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false);
      if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCategoryFilter(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadExpenses = () => {
    const params: Record<string, string | number | undefined> = {};
    if (selectedCategories.length === 1) params.category = selectedCategories[0];
    if (searchQuery) params.search = searchQuery;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (minAmount) params.min_amount = parseFloat(minAmount);
    if (maxAmount) params.max_amount = parseFloat(maxAmount);
    api.getExpenses(params)
      .then((data) => {
        let filtered = data;
        if (selectedCategories.length > 1) {
          filtered = data.filter(e => selectedCategories.includes(e.category));
        }
        setExpenses(filtered);
      })
      .catch(() => toast.error('Failed to load expenses'))
      .finally(() => setLoading(false));
  };

  const loadRecurring = () => {
    api.getRecurringExpenses().then(setRecurringExpenses).catch(() => {});
  };

  useEffect(() => {
    api.processRecurringExpenses()
      .then((r) => { if (r.processed > 0) toast.success(r.processed + ' recurring expense(s) auto-created'); })
      .catch(() => {})
      .finally(() => { loadExpenses(); loadRecurring(); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => loadExpenses(), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, startDate, endDate, minAmount, maxAmount, selectedCategories.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedExpenses = [...expenses].sort((a, b) => {
    switch (sortBy) {
      case 'recent': return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'oldest': return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'high': return b.amount - a.amount;
      case 'low': return a.amount - b.amount;
      default: return 0;
    }
  });

  const toggleCategoryFilter = (cat: string) => {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const clearAllFilters = () => {
    setStartDate(''); setEndDate(''); setMinAmount(''); setMaxAmount('');
    setSearchQuery(''); setSelectedCategories([]); setSortBy('recent');
  };

  const hasActiveFilters = searchQuery || startDate || endDate || minAmount || maxAmount || selectedCategories.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createExpense({ amount: parseFloat(amount), category, expense_type: 'personal', date, description: description || undefined });
      toast.success('Expense added!');
      setAmount(''); setDescription(''); setShowForm(false); loadExpenses();
    } catch { toast.error('Failed to add expense'); }
    finally { setSubmitting(false); }
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id); setEditAmount(expense.amount.toString());
    setEditCategory(expense.category); setEditDate(expense.date); setEditDescription(expense.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await api.updateExpense(editingId, { amount: parseFloat(editAmount), category: editCategory, date: editDate, description: editDescription || undefined });
      toast.success('Expense updated!'); setEditingId(null); loadExpenses();
    } catch { toast.error('Failed to update expense'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    try { await api.deleteExpense(id); toast.success('Expense deleted'); loadExpenses(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportExpenses({ start_date: startDate || undefined, end_date: endDate || undefined });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = 'expenses_' + new Date().toISOString().split('T')[0] + '.csv';
      a.click(); URL.revokeObjectURL(url); toast.success('Exported successfully!');
    } catch { toast.error('Export failed'); }
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRecurringExpense({
        amount: parseFloat(recAmount), category: recCategory, description: recDescription || undefined,
        frequency: recFrequency, day_of_month: parseInt(recDay),
        day_of_week: recFrequency === 'weekly' ? parseInt(recDayOfWeek) : undefined,
        end_date: recEndDate || undefined,
      });
      toast.success('Recurring expense created!');
      setRecAmount(''); setRecDescription(''); setRecEndDate(''); setShowRecurringForm(false); loadRecurring();
    } catch { toast.error('Failed to create recurring expense'); }
  };

  const handleEditRecurring = (rec: RecurringExpense) => {
    setEditRecId(rec.id); setEditRecAmount(rec.amount.toString()); setEditRecCategory(rec.category);
    setEditRecDescription(rec.description || ''); setEditRecFrequency(rec.frequency);
    setEditRecDay(rec.day_of_month.toString()); setEditRecDayOfWeek(rec.day_of_week?.toString() || '0');
    setEditRecEndDate(rec.end_date || '');
  };

  const handleSaveRecurringEdit = async () => {
    if (!editRecId) return;
    try {
      await api.updateRecurringExpense(editRecId, {
        amount: parseFloat(editRecAmount), category: editRecCategory, description: editRecDescription || undefined,
        frequency: editRecFrequency, day_of_month: parseInt(editRecDay),
        day_of_week: editRecFrequency === 'weekly' ? parseInt(editRecDayOfWeek) : undefined,
        end_date: editRecEndDate || undefined,
      });
      toast.success('Recurring expense updated!'); setEditRecId(null); loadRecurring();
    } catch { toast.error('Failed to update'); }
  };

  const handleDeleteRecurring = async (id: number) => {
    if (!confirm('Delete this recurring expense?')) return;
    try { await api.deleteRecurringExpense(id); toast.success('Deleted'); loadRecurring(); } catch {}
  };

  const handleToggleRecurring = async (id: number) => {
    try { await api.toggleRecurringExpense(id); loadRecurring(); } catch {}
  };

  const totalThisMonth = expenses.reduce((sum, e) => sum + e.amount, 0);

  const scheduleLabel = (rec: RecurringExpense) => {
    if (rec.frequency === 'weekly') return 'Every ' + DAY_NAMES[rec.day_of_week ?? 0];
    if (rec.frequency === 'yearly') return 'Yearly';
    return 'Monthly on the ' + rec.day_of_month + (rec.day_of_month === 1 ? 'st' : rec.day_of_month === 2 ? 'nd' : rec.day_of_month === 3 ? 'rd' : 'th');
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-24 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Expenses</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Total: {formatCurrency(totalThisMonth)} &middot; {expenses.length} entries</p>
          </div>
          <button onClick={handleExport}
            className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            <ArrowDownTrayIcon size={16} /> Export CSV
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setTab('expenses')}
            className={'px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ' + (tab === 'expenses' ? 'bg-mint-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border dark:border-slate-700')}>
            💸 Expenses
          </button>
          <button onClick={() => setTab('recurring')}
            className={'px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ' + (tab === 'recurring' ? 'bg-mint-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border dark:border-slate-700')}>
            <ArrowPathIcon size={14} /> Recurring ({recurringExpenses.length})
          </button>
        </div>

        {tab === 'expenses' && (
          <>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search expenses..."
                    className="w-full px-4 py-2.5 pl-10 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-mint-500 focus:ring-2 focus:ring-mint-200 outline-none text-sm" />
                  <span className="absolute left-3 top-3 text-slate-400"><MagnifyingGlassIcon size={16} /></span>
                </div>
                <div className="relative" ref={catRef}>
                  <button onClick={() => { setShowCategoryFilter(!showCategoryFilter); setShowSortMenu(false); }}
                    className={'flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition ' + (selectedCategories.length > 0 ? 'bg-mint-50 dark:bg-mint-900/30 border-mint-300 dark:border-mint-700 text-mint-700 dark:text-mint-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300')}>
                    <FunnelIcon size={14} />
                    <span className="hidden sm:inline">Category</span>
                    {selectedCategories.length > 0 && <span className="bg-mint-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{selectedCategories.length}</span>}
                  </button>
                  {showCategoryFilter && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-2 animate-slide-up">
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Filter by Category</span>
                        {selectedCategories.length > 0 && <button onClick={() => setSelectedCategories([])} className="text-xs text-red-500 hover:text-red-600">Clear</button>}
                      </div>
                      {CATEGORIES.map((cat) => (
                        <button key={cat} onClick={() => toggleCategoryFilter(cat)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition text-left">
                          <span className={'w-4 h-4 rounded border flex items-center justify-center text-white ' + (selectedCategories.includes(cat) ? 'bg-mint-600 border-mint-600' : 'border-slate-300 dark:border-slate-600')}>
                            {selectedCategories.includes(cat) && <CheckIcon size={10} />}
                          </span>
                          <span>{CATEGORY_ICONS[cat]}</span>
                          <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative" ref={sortRef}>
                  <button onClick={() => { setShowSortMenu(!showSortMenu); setShowCategoryFilter(false); }}
                    className={'flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition ' + (sortBy !== 'recent' ? 'bg-mint-50 dark:bg-mint-900/30 border-mint-300 dark:border-mint-700 text-mint-700 dark:text-mint-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300')}>
                    <ArrowsUpDownIcon size={14} />
                    <span className="hidden sm:inline">Sort</span>
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-2 animate-slide-up">
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sort By</span>
                      </div>
                      {SORT_OPTIONS.map((opt) => (
                        <button key={opt.value} onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                          className={'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition text-left ' + (sortBy === opt.value ? 'text-mint-600 dark:text-mint-400 font-medium' : 'text-slate-700 dark:text-slate-300')}>
                          {sortBy === opt.value ? <CheckIcon size={14} className="text-mint-600" /> : <span className="w-3.5" />}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setShowFilters(!showFilters)}
                  className={'flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition ' + ((showFilters || startDate || endDate || minAmount || maxAmount) ? 'bg-mint-50 dark:bg-mint-900/30 border-mint-300 dark:border-mint-700 text-mint-700 dark:text-mint-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300')}>
                  ⚙ <span className="hidden sm:inline">More</span>
                </button>
              </div>

              {showFilters && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm animate-slide-up space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">From</label>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:border-mint-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">To</label>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:border-mint-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Min Amount</label>
                      <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" min="0"
                        className="w-28 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:border-mint-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Max Amount</label>
                      <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="No limit" min="0"
                        className="w-28 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:border-mint-500 outline-none" />
                    </div>
                    <div className="flex items-end gap-2">
                      <button onClick={clearAllFilters} className="px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium flex items-center gap-1">
                        <XMarkIcon size={14} /> Clear all
                      </button>
                      <button onClick={handleExport} className="md:hidden px-3 py-2 rounded-lg text-sm text-mint-600 font-medium flex items-center gap-1">
                        <ArrowDownTrayIcon size={14} /> Export
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400 dark:text-slate-500">Active:</span>
                  {selectedCategories.map(cat => (
                    <span key={cat} className="inline-flex items-center gap-1 bg-mint-50 dark:bg-mint-900/30 text-mint-700 dark:text-mint-400 text-xs px-2 py-1 rounded-full">
                      {CATEGORY_ICONS[cat]} {cat}
                      <button onClick={() => toggleCategoryFilter(cat)} className="hover:text-red-500"><XMarkIcon size={10} /></button>
                    </span>
                  ))}
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs px-2 py-1 rounded-full">
                      &quot;{searchQuery}&quot;
                      <button onClick={() => setSearchQuery('')} className="hover:text-red-500"><XMarkIcon size={10} /></button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {showForm && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm animate-slide-up">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Add Expense</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-mint-500 outline-none" placeholder="500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-mint-500 outline-none">
                        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-mint-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                      <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-mint-500 outline-none" placeholder="Optional note" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={submitting}
                      className="bg-mint-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-mint-700 transition disabled:opacity-50 flex items-center gap-2">
                      {submitting ? 'Adding...' : <><PlusIcon size={16} /> Add Expense</>}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)}
                      className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="bg-white dark:bg-slate-800 rounded-xl h-20 animate-pulse" />)}</div>
            ) : sortedExpenses.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-4xl mb-3">📭</p>
                <p>No expenses found. {hasActiveFilters ? 'Try adjusting your filters.' : 'Tap + to add one!'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedExpenses.map((expense) => (
                  <div key={expense.id} className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-sm animate-fade-in">
                    {editingId === expense.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm" placeholder="Amount" />
                          <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm">
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm" />
                          <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm" placeholder="Description" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700 flex items-center gap-1.5">
                            <CheckIcon size={14} /> Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg border dark:border-slate-700 text-sm text-slate-500 flex items-center gap-1.5">
                            <XMarkIcon size={14} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{CATEGORY_ICONS[expense.category] || '📦'}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-800 dark:text-white">{expense.category}</p>
                              {expense.is_recurring && (
                                <span className="inline-flex items-center gap-0.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                                  <ArrowPathIcon size={10} /> Auto
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">{formatDate(expense.date)}{expense.description ? ' · ' + expense.description : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 dark:text-white mr-1">{formatCurrency(expense.amount)}</span>
                          <button onClick={() => handleEdit(expense)}
                            className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition" title="Edit">
                            <PencilIcon size={15} />
                          </button>
                          <button onClick={() => handleDelete(expense.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition" title="Delete">
                            <TrashIcon size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!showForm && (
              <button onClick={() => setShowForm(true)}
                className="fixed bottom-20 md:bottom-8 right-6 bg-mint-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-mint-700 transition hover:scale-110 z-40">
                <PlusIcon size={28} />
              </button>
            )}
          </>
        )}

        {tab === 'recurring' && (
          <>
            <div className="flex justify-end">
              <button onClick={() => setShowRecurringForm(!showRecurringForm)}
                className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700 transition flex items-center gap-1.5">
                <PlusIcon size={16} /> Add Recurring
              </button>
            </div>

            {showRecurringForm && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm animate-slide-up">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">New Recurring Expense</h3>
                <form onSubmit={handleCreateRecurring} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                      <input type="number" value={recAmount} onChange={(e) => setRecAmount(e.target.value)} required min="1"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-mint-500 outline-none" placeholder="500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                      <select value={recCategory} onChange={(e) => setRecCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-mint-500 outline-none">
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                      <select value={recFrequency} onChange={(e) => setRecFrequency(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-mint-500 outline-none">
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    {recFrequency === 'weekly' ? (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Day of Week</label>
                        <select value={recDayOfWeek} onChange={(e) => setRecDayOfWeek(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-mint-500 outline-none">
                          {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Day of Month</label>
                        <select value={recDay} onChange={(e) => setRecDay(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-mint-500 outline-none">
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date <span className="text-slate-400">(opt)</span></label>
                      <input type="date" value={recEndDate} onChange={(e) => setRecEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-mint-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                      <input type="text" value={recDescription} onChange={(e) => setRecDescription(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-mint-500 outline-none" placeholder="e.g., Netflix" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="bg-mint-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-mint-700 flex items-center gap-1.5">
                      <CheckIcon size={16} /> Create
                    </button>
                    <button type="button" onClick={() => setShowRecurringForm(false)} className="px-6 py-2.5 rounded-lg border dark:border-slate-700 text-slate-600 dark:text-slate-300">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {recurringExpenses.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="flex justify-center mb-3"><ArrowPathIcon size={48} className="text-slate-300 dark:text-slate-600" /></div>
                <p>No recurring expenses. Set up monthly bills like rent, subscriptions, etc.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recurringExpenses.map((rec) => (
                  <div key={rec.id} className={'bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm transition ' + (!rec.is_active ? 'opacity-50' : '')}>
                    {editRecId === rec.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" value={editRecAmount} onChange={(e) => setEditRecAmount(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm" placeholder="Amount" />
                          <select value={editRecCategory} onChange={(e) => setEditRecCategory(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm">
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <select value={editRecFrequency} onChange={(e) => setEditRecFrequency(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm">
                            <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
                          </select>
                          {editRecFrequency === 'weekly' ? (
                            <select value={editRecDayOfWeek} onChange={(e) => setEditRecDayOfWeek(e.target.value)}
                              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm">
                              {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                            </select>
                          ) : (
                            <select value={editRecDay} onChange={(e) => setEditRecDay(e.target.value)}
                              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm">
                              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                          )}
                          <input type="date" value={editRecEndDate} onChange={(e) => setEditRecEndDate(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm" />
                          <input type="text" value={editRecDescription} onChange={(e) => setEditRecDescription(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm" placeholder="Description" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveRecurringEdit} className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700 flex items-center gap-1.5">
                            <CheckIcon size={14} /> Save
                          </button>
                          <button onClick={() => setEditRecId(null)} className="px-4 py-2 rounded-lg border dark:border-slate-700 text-sm text-slate-500 flex items-center gap-1.5">
                            <XMarkIcon size={14} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{CATEGORY_ICONS[rec.category] || '📦'}</span>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-white">{rec.category}</p>
                            <p className="text-xs text-slate-400">
                              {formatCurrency(rec.amount)} &middot; {scheduleLabel(rec)}
                              {rec.description ? ' · ' + rec.description : ''}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {rec.next_date && <p className="text-xs text-mint-600 dark:text-mint-400">Next: {formatDate(rec.next_date)}</p>}
                              {rec.end_date && <p className="text-xs text-orange-500">Ends: {formatDate(rec.end_date)}</p>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleToggleRecurring(rec.id)}
                            className={'px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ' + (rec.is_active ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400')}>
                            {rec.is_active ? <><PlayIcon size={10} /> Active</> : <><PauseIcon size={10} /> Paused</>}
                          </button>
                          <button onClick={() => handleEditRecurring(rec)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition" title="Edit">
                            <PencilIcon size={15} />
                          </button>
                          <button onClick={() => handleDeleteRecurring(rec.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition" title="Delete">
                            <TrashIcon size={15} />
                          </button>
                        </div>
                      </div>
                    )}
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
