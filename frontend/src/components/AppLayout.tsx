'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/expenses', label: 'Expenses', icon: '💸' },
  { href: '/budgets', label: 'Budgets', icon: '🎯' },
  { href: '/reports', label: 'Reports', icon: '📈' },
  { href: '/couple', label: 'Couple', icon: '👫' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      api.getUnreadCount().then((r) => setUnreadCount(r.unread_count)).catch(() => {});
    }
  }, [user, pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl text-mint-600 font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Top Nav */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="text-xl font-bold text-mint-600">
                💰 SplitMint
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    pathname.startsWith(item.href)
                      ? 'bg-mint-50 text-mint-700 dark:bg-mint-900/30 dark:text-mint-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>

              {/* Notification bell */}
              <Link
                href="/notifications"
                className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>

              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-300">{user.name}</span>
                <button
                  onClick={logout}
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 transition"
                >
                  Logout
                </button>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-600 dark:text-slate-300"
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 animate-slide-up">
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium ${
                    pathname.startsWith(item.href)
                      ? 'bg-mint-50 text-mint-700 dark:bg-mint-900/30 dark:text-mint-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="block px-4 py-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</span>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="block px-4 py-2 text-sm text-red-500 font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-50 transition-colors">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center px-3 py-1 text-xs ${
                pathname.startsWith(item.href) ? 'text-mint-600' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
