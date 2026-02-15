'use client';

import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [income, setIncome] = useState(user?.monthly_income?.toString() || '');
  const [salaryDate, setSalaryDate] = useState(user?.salary_date?.toString() || '1');
  const [budget, setBudget] = useState(user?.monthly_budget?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {} finally { setSaving(false); }
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
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </form>
        </div>

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
