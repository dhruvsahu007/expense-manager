'use client';

import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [income, setIncome] = useState(user?.monthly_income?.toString() || '');
  const [salaryDate, setSalaryDate] = useState(user?.salary_date?.toString() || '1');
  const [budget, setBudget] = useState(user?.monthly_budget?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateMe({
        name,
        monthly_income: income ? parseFloat(income) : undefined,
        salary_date: parseInt(salaryDate),
        monthly_budget: budget ? parseFloat(budget) : undefined,
      });
      await refreshUser();
      toast.success('Settings saved!');
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await api.exportExpenses();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `splitmint-expenses-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Expenses exported!');
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-6 pb-20 md:pb-6">
        <h1 className="text-2xl font-bold text-slate-800">⚙️ Settings</h1>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Profile & Income</h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email" value={user?.email || ''} disabled
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Salary (₹)</label>
              <input
                type="number" value={income} onChange={(e) => setIncome(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                placeholder="50000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Salary Date</label>
              <select
                value={salaryDate} onChange={(e) => setSalaryDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Budget Cap (₹)</label>
              <input
                type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                placeholder="30000"
              />
              <p className="text-xs text-slate-400 mt-1">Get alerted when spending hits 80% of this</p>
            </div>

            <button
              type="submit" disabled={saving}
              className="w-full bg-mint-600 text-white py-3 rounded-lg font-medium hover:bg-mint-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Data Export */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">📥 Data Export</h2>
          <p className="text-sm text-slate-500 mb-4">Download all your expenses as a CSV file for your records or analysis.</p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full border border-mint-200 text-mint-600 py-3 rounded-lg font-medium hover:bg-mint-50 transition disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : '📄 Export All Expenses (CSV)'}
          </button>
        </div>

        {/* Account */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Account</h2>
          <p className="text-sm text-slate-500 mb-4">Member since {user ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : ''}</p>
          <button
            onClick={logout}
            className="w-full border border-red-200 text-red-500 py-3 rounded-lg font-medium hover:bg-red-50 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
