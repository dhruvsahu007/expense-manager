'use client';

import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { IndividualDashboard } from '@/types';
import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { CATEGORY_COLORS } from '@/lib/utils';

const COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#6366f1', '#ef4444', '#14b8a6', '#22c55e', '#94a3b8'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<IndividualDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getIndividualDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6 pb-20 md:pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">Here&apos;s your financial snapshot this month</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Income"
                value={formatCurrency(data.total_income)}
                icon="💰"
                color="bg-emerald-50 text-emerald-700"
              />
              <StatCard
                label="Expenses"
                value={formatCurrency(data.total_expenses)}
                icon="💸"
                color="bg-red-50 text-red-600"
              />
              <StatCard
                label="Savings"
                value={formatCurrency(data.savings_amount)}
                icon="🏦"
                color={data.savings_amount >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}
              />
              <StatCard
                label="Savings Rate"
                value={`${data.savings_rate}%`}
                icon="📈"
                color={data.savings_rate >= 20 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}
              />
            </div>

            {/* Burn Rate */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Daily Burn Rate</p>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(data.burn_rate)}/day</p>
                </div>
                <span className="text-3xl">🔥</span>
              </div>
              <div className="mt-2">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-mint-400 to-mint-600 rounded-full transition-all"
                    style={{ width: `${Math.min((data.total_expenses / (data.total_income || 1)) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {formatCurrency(data.total_expenses)} of {formatCurrency(data.total_income)} spent
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Category Pie Chart */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Spending by Category</h3>
                {data.category_breakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={data.category_breakdown}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ category, percentage }) => `${category} ${percentage}%`}
                      >
                        {data.category_breakdown.map((entry, index) => (
                          <Cell
                            key={entry.category}
                            fill={CATEGORY_COLORS[entry.category] || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-slate-400">
                    No expenses yet this month
                  </div>
                )}
              </div>

              {/* Monthly Bar Chart */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Monthly Trend</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.monthly_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg">Could not load dashboard data</p>
            <p className="text-sm mt-1">Make sure the backend is running</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className={`rounded-xl p-5 shadow-sm ${color} animate-slide-up`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-sm opacity-70 mt-1">{label}</p>
    </div>
  );
}
