'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [salaryDate, setSalaryDate] = useState('1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup({
        name,
        email,
        password,
        monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : undefined,
        salary_date: parseInt(salaryDate),
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-slate-50 dark:bg-slate-900 transition-colors">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-mint-600">💰 SplitMint</h1>
          <p className="text-slate-500 mt-2">Start your smart money journey</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 animate-slide-up">
          <h2 className="text-2xl font-semibold text-slate-800 mb-6">Create account</h2>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-200 outline-none transition"
                placeholder="Rahul Sharma"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-200 outline-none transition"
                placeholder="rahul@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-200 outline-none transition"
                placeholder="Min 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Monthly Salary (₹) <span className="text-slate-400">— optional</span>
              </label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-200 outline-none transition"
                placeholder="50000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Salary Date (day of month)
              </label>
              <select
                value={salaryDate}
                onChange={(e) => setSalaryDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-mint-500 focus:ring-2 focus:ring-mint-200 outline-none transition"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-mint-600 text-white py-3 rounded-lg font-medium hover:bg-mint-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-mint-600 font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
