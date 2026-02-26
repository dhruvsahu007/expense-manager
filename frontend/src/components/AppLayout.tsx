'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

// Desktop shows all nav items
const ALL_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/expenses', label: 'Expenses', icon: '💸' },
  { href: '/budgets', label: 'Budgets', icon: '🎯' },
  { href: '/reports', label: 'Reports', icon: '📈' },
  { href: '/couple', label: 'Pool', icon: '👫' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

// Mobile bottom bar — 4 primary sections
const BOTTOM_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/expenses', label: 'Expenses', icon: '💸' },
  { href: '/couple', label: 'Pool', icon: '👫' },
  { href: '/reports', label: 'Reports', icon: '📈' },
];

// Mobile hamburger — secondary items
const HAMBURGER_NAV_ITEMS = [
  { href: '/budgets', label: 'Budgets', icon: '🎯' },
  { href: '/notifications', label: 'Notifications', icon: '🔔' },
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

            {/* Desktop Nav — full set */}
            <nav className="hidden md:flex items-center gap-1">
              {ALL_NAV_ITEMS.map((item) => (
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

              {/* Notification bell — desktop only */}
              <Link
                href="/notifications"
                className="hidden md:block relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
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
                className="md:hidden relative p-2 text-slate-600 dark:text-slate-300"
              >
                {mobileMenuOpen ? '✕' : '☰'}
                {!mobileMenuOpen && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Hamburger Menu — secondary items only */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 animate-slide-up">
            <div className="px-4 py-3 space-y-1">
              {HAMBURGER_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${
                    pathname.startsWith(item.href)
                      ? 'bg-mint-50 text-mint-700 dark:bg-mint-900/30 dark:text-mint-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                  {item.href === '/notifications' && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              ))}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="block px-4 py-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</span>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 font-medium w-full"
                >
                  <span>🚪</span>
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Nav — 4 primary sections */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-50 transition-colors safe-area-bottom">
        <div className="flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 min-w-[4rem] transition-colors ${
                  isActive
                    ? 'text-mint-600 dark:text-mint-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <span className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                <span className={`text-[11px] font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 bg-mint-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
