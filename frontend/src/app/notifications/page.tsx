'use client';

import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';
import { Notification } from '@/types';
import { useEffect, useState } from 'react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = () => {
    api.getNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadNotifications(); }, []);

  const markRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      loadNotifications();
    } catch {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'budget_warning': return '⚠️';
      case 'savings_alert': return '💰';
      case 'imbalance_alert': return '⚖️';
      case 'monthly_summary': return '📊';
      default: return '🔔';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-20 md:pb-6">
        <h1 className="text-2xl font-bold text-slate-800">🔔 Notifications</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl h-20 animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-4xl mb-3">🔕</p>
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-xl px-4 py-3 shadow-sm flex items-start gap-3 transition ${
                  n.is_read ? 'bg-white' : 'bg-mint-50 border border-mint-200'
                }`}
              >
                <span className="text-2xl mt-0.5">{getIcon(n.notification_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{n.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-xs text-mint-600 font-medium hover:underline whitespace-nowrap"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
