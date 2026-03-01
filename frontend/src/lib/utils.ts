export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f97316',
  Rent: '#8b5cf6',
  Utilities: '#06b6d4',
  Travel: '#ec4899',
  Shopping: '#f59e0b',
  Subscriptions: '#6366f1',
  EMI: '#ef4444',
  Entertainment: '#14b8a6',
  Health: '#22c55e',
  Other: '#94a3b8',
};

export const CATEGORY_ICONS: Record<string, string> = {
  Food: '🍔',
  Rent: '🏠',
  Utilities: '💡',
  Travel: '✈️',
  Shopping: '🛒',
  Subscriptions: '📱',
  EMI: '🏦',
  Entertainment: '🎬',
  Health: '🏥',
  Other: '📦',
};

export function getCategoryIcon(category: string, categories?: import('@/types').Category[]): string {
  if (CATEGORY_ICONS[category]) return CATEGORY_ICONS[category];
  const found = categories?.find(c => c.name === category);
  return found?.icon || '📌';
}

export function getCategoryColor(category: string, categories?: import('@/types').Category[]): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  const found = categories?.find(c => c.name === category);
  return found?.color || '#6b7280';
}
