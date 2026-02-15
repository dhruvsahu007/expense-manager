'use client';

import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [income, setIncome] = useState(user?.monthly_income?.toString() || '');
  const [salaryDate, setSalaryDate] = useState(user?.salary_date?.toString() || '1');
  const [budget, setBudget] = useState(user?.monthly_budget?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Notification preferences (localStorage-based)
  const getNotifPref = (key: string) => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem(`notif_${key}`);
      return val === null ? true : val === 'true';
    }
    return true;
  };
  const [notifBudget, setNotifBudget] = useState(getNotifPref('budget_warning'));
  const [notifSavings, setNotifSavings] = useState(getNotifPref('savings_alert'));
  const [notifImbalance, setNotifImbalance] = useState(getNotifPref('imbalance_alert'));
  const [notifSummary, setNotifSummary] = useState(getNotifPref('monthly_summary'));

  const toggleNotifPref = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    localStorage.setItem(`notif_${key}`, String(value));
    toast.success(`${key.replace('_', ' ')} notifications ${value ? 'enabled' : 'disabled'}`);
  };

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

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      '⚠️ Are you sure you want to delete your account?\n\n' +
      'This will permanently delete:\n' +
      '• All your expenses & recurring expenses\n' +
      '• All budgets & notifications\n' +
      '• All couple data, shared expenses & goals\n\n' +
      'This action CANNOT be undone.'
    );
    if (!confirmed) return;

    const doubleConfirmed = confirm(
      '🚨 FINAL CONFIRMATION\n\n' +
      'Type OK to permanently delete your account and all data.\n' +
      'This is irreversible.'
    );
    if (!doubleConfirmed) return;

    setDeleting(true);
    try {
      await api.deleteAccount();
      toast.success('Account deleted. Goodbye! 👋');
      logout();
    } catch {
      toast.error('Failed to delete account');
    } finally { setDeleting(false); }
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-6 pb-20 md:pb-6">
        <h1 className="text-2xl font-bold text-slate-800">⚙️ Settings</h1>

        {/* Profile & Income */}
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

        {/* Appearance */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">🎨 Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Theme</p>
              <p className="text-xs text-slate-400">Choose your preferred color scheme</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  theme === 'light' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                ☀️ Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  theme === 'dark' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                🌙 Dark
              </button>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">🔔 Notification Preferences</h2>
          <div className="space-y-4">
            <NotifToggle
              label="Budget warnings"
              description="Get alerted when spending nears budget limits"
              enabled={notifBudget}
              onChange={(v) => toggleNotifPref('budget_warning', v, setNotifBudget)}
            />
            <NotifToggle
              label="Savings alerts"
              description="Notifications about savings goals progress"
              enabled={notifSavings}
              onChange={(v) => toggleNotifPref('savings_alert', v, setNotifSavings)}
            />
            <NotifToggle
              label="Couple imbalance"
              description="Alert when shared expense split is uneven"
              enabled={notifImbalance}
              onChange={(v) => toggleNotifPref('imbalance_alert', v, setNotifImbalance)}
            />
            <NotifToggle
              label="Monthly summary"
              description="Monthly spending summary digest"
              enabled={notifSummary}
              onChange={(v) => toggleNotifPref('monthly_summary', v, setNotifSummary)}
            />
          </div>
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
          <div className="space-y-3">
            <button
              onClick={logout}
              className="w-full border border-red-200 text-red-500 py-3 rounded-lg font-medium hover:bg-red-50 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200">
          <h2 className="text-lg font-semibold text-red-600 mb-2">⚠️ Danger Zone</h2>
          <p className="text-sm text-slate-500 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : '🗑️ Delete My Account'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

function NotifToggle({ label, description, enabled, onChange }: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-mint-500' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
