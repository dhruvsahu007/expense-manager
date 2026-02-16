'use client';

import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';
import { formatCurrency, CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/utils';
import { ReportsData } from '@/types';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = Object.values(CATEGORY_COLORS);

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const loadReports = () => {
    setLoading(true);
    api.getReports(months)
      .then((d) => {
        setData(d);
        // Default: latest month
        if (d.monthly_breakdown.length > 0 && !selectedMonth) {
          setSelectedMonth(d.monthly_breakdown[d.monthly_breakdown.length - 1].month);
        }
      })
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReports(); }, [months]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentBreakdown = data?.monthly_breakdown.find(m => m.month === selectedMonth);

  // Custom tooltip for spending trends
  const TrendTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-sm">
          <p className="font-medium text-slate-800 dark:text-white">{label}</p>
          <p className="text-mint-600">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reports</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-white dark:bg-slate-800 rounded-xl h-72 animate-pulse" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-slate-400">
          <p className="text-4xl mb-3">📊</p>
          <p>No report data available. Add some expenses first.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">📊 Reports</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Spending insights and budget analysis</p>
          </div>
          <select
            value={months}
            onChange={(e) => { setMonths(parseInt(e.target.value)); setSelectedMonth(null); }}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:border-mint-500 outline-none"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
        </div>

        {/* ═══════════════ Spending Trends ═══════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">📈 Spending Trends</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.spending_trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<TrendTooltip />} />
              <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>

          {/* Summary stats row */}
          {data.spending_trends.length >= 2 && (() => {
            const totals = data.spending_trends.map(t => t.total);
            const avg = totals.reduce((s, v) => s + v, 0) / totals.length;
            const max = Math.max(...totals);
            const min = Math.min(...totals);
            const latest = totals[totals.length - 1];
            const prev = totals[totals.length - 2];
            const change = prev > 0 ? ((latest - prev) / prev * 100) : 0;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Average</p>
                  <p className="font-bold text-slate-800 dark:text-white">{formatCurrency(avg)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Highest</p>
                  <p className="font-bold text-red-500">{formatCurrency(max)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Lowest</p>
                  <p className="font-bold text-green-500">{formatCurrency(min)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">M/M Change</p>
                  <p className={`font-bold ${change > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ═══════════════ Monthly Breakdown ═══════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">🗓️ Monthly Breakdown</h2>

          {/* Month selector pills */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
            {data.monthly_breakdown.map((m) => (
              <button
                key={m.month}
                onClick={() => setSelectedMonth(m.month)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                  selectedMonth === m.month
                    ? 'bg-mint-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {m.month}
              </button>
            ))}
          </div>

          {currentBreakdown && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div>
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Total: <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(currentBreakdown.total)}</span>
                </p>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={currentBreakdown.categories}
                      dataKey="total"
                      nameKey="category"
                      cx="50%" cy="50%"
                      outerRadius={90}
                      innerRadius={45}
                      label={({ category, percentage }) => `${category} ${percentage}%`}
                    >
                      {currentBreakdown.categories.map((c, i) => (
                        <Cell key={c.category} fill={CATEGORY_COLORS[c.category] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category table */}
              <div className="space-y-2">
                {currentBreakdown.categories.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{CATEGORY_ICONS[cat.category] || '📦'}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cat.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-800 dark:text-white">{formatCurrency(cat.total)}</span>
                      <span className="text-xs text-slate-400 ml-2">({cat.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════ Stacked Monthly Category Bar ═══════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">📊 Category Comparison</h2>
          {(() => {
            // Build stacked bar data
            const allCategories = new Set<string>();
            data.monthly_breakdown.forEach(m => m.categories.forEach(c => allCategories.add(c.category)));
            const cats = Array.from(allCategories);
            const barData = data.monthly_breakdown.map(m => {
              const row: Record<string, string | number> = { month: m.month };
              m.categories.forEach(c => { row[c.category] = c.total; });
              return row;
            });
            return (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  {cats.map((cat, i) => (
                    <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat] || COLORS[i % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>

        {/* ═══════════════ Budget Variance ═══════════════ */}
        {data.budget_variance.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">🎯 Budget Variance (This Month)</h2>
            <div className="space-y-4">
              {data.budget_variance.map((item) => {
                const pct = Math.min(item.percent_used, 100);
                const isOver = item.variance < 0;
                return (
                  <div key={item.category}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span>{CATEGORY_ICONS[item.category] || '📦'}</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.category}</span>
                      </div>
                      <div className="text-right text-sm">
                        <span className={isOver ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>
                          {formatCurrency(item.actual)}
                        </span>
                        <span className="text-slate-400"> / {formatCurrency(item.budget)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.percent_used >= 100 ? 'bg-red-500' : item.percent_used >= 80 ? 'bg-orange-400' : 'bg-mint-500'
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-400">{item.percent_used.toFixed(1)}% used</span>
                      <span className={`text-xs font-medium ${isOver ? 'text-red-500' : 'text-green-500'}`}>
                        {isOver ? `Over by ${formatCurrency(Math.abs(item.variance))}` : `${formatCurrency(item.variance)} remaining`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Variance bar chart */}
            <div className="mt-6">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.budget_variance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={90} stroke="#94a3b8" />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="budget" fill="#94a3b8" name="Budget" barSize={12} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="actual" name="Actual" barSize={12} radius={[0, 4, 4, 0]}>
                    {data.budget_variance.map((item, i) => (
                      <Cell key={i} fill={item.variance < 0 ? '#ef4444' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
