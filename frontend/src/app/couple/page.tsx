'use client';

import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, CATEGORY_ICONS } from '@/lib/utils';
import { Couple, SharedExpense, BalanceSummary, SavingsGoal } from '@/types';
import { useEffect, useState } from 'react';

const CATEGORIES = ['Food', 'Rent', 'Utilities', 'Travel', 'Shopping', 'Subscriptions', 'EMI', 'Entertainment', 'Health', 'Other'];

export default function CouplePage() {
  const { user } = useAuth();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [pendingInvites, setPendingInvites] = useState<Couple[]>([]);
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>([]);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'expenses' | 'goals'>('expenses');

  // Invite form
  const [partnerEmail, setPartnerEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Shared expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [seAmount, setSeAmount] = useState('');
  const [seCategory, setSeCategory] = useState('Food');
  const [seDesc, setSeDesc] = useState('');
  const [seSplitType, setSeSplitType] = useState('equal');
  const [seSplitRatio, setSeSplitRatio] = useState('50:50');
  const [seMyShare, setSeMyShare] = useState('');
  const [sePartnerShare, setSePartnerShare] = useState('');
  const [seDate, setSeDate] = useState(new Date().toISOString().split('T')[0]);
  const [seSubmitting, setSeSubmitting] = useState(false);

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalSubmitting, setGoalSubmitting] = useState(false);

  // Contribute form
  const [contributeGoalId, setContributeGoalId] = useState<number | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const loadData = async () => {
    try {
      const coupleData = await api.getCoupleStatus();
      setCouple(coupleData);
      if (coupleData.status === 'active') {
        const [expenses, bal, g] = await Promise.all([
          api.getSharedExpenses(),
          api.getBalance(),
          api.getSavingsGoals(),
        ]);
        setSharedExpenses(expenses);
        setBalance(bal);
        setGoals(g);
      }
    } catch {
      // No couple yet
      try {
        const invites = await api.getPendingInvites();
        setPendingInvites(invites);
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError('');
    try {
      await api.invitePartner(partnerEmail);
      setPartnerEmail('');
      loadData();
    } catch (err: any) {
      setInviteError(err.message);
    } finally { setInviting(false); }
  };

  const handleAccept = async (coupleId: number) => {
    try {
      await api.acceptInvite(coupleId);
      loadData();
    } catch {}
  };

  const handleDecline = async (coupleId: number) => {
    try {
      await api.declineInvite(coupleId);
      setCouple(null);
      setPendingInvites([]);
      loadData();
    } catch {}
  };

  const handleSharedExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSeSubmitting(true);
    try {
      const ratio = seSplitType === 'custom' ? `${seMyShare}:${sePartnerShare}` : '50:50';
      await api.createSharedExpense({
        amount: parseFloat(seAmount),
        category: seCategory,
        description: seDesc || undefined,
        split_type: seSplitType,
        split_ratio: ratio,
        date: seDate,
      });
      setSeAmount('');
      setSeDesc('');
      setSeMyShare('');
      setSePartnerShare('');
      setSeSplitType('equal');
      setShowExpenseForm(false);
      loadData();
    } catch {} finally { setSeSubmitting(false); }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalSubmitting(true);
    try {
      await api.createSavingsGoal({
        title: goalTitle,
        target_amount: parseFloat(goalTarget),
        deadline: goalDeadline || undefined,
      });
      setGoalTitle('');
      setGoalTarget('');
      setGoalDeadline('');
      setShowGoalForm(false);
      loadData();
    } catch {} finally { setGoalSubmitting(false); }
  };

  const handleContribute = async (goalId: number) => {
    try {
      await api.contributeToGoal(goalId, parseFloat(contributeAmount));
      setContributeGoalId(null);
      setContributeAmount('');
      loadData();
    } catch {}
  };

  const handleDeleteSharedExpense = async (id: number) => {
    if (!confirm('Delete this shared expense?')) return;
    try {
      await api.deleteSharedExpense(id);
      loadData();
    } catch {}
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-lg text-mint-600">Loading couple mode...</div>
        </div>
      </AppLayout>
    );
  }

  // No couple — show invite UI
  if (!couple || couple.status === 'pending') {
    const isInvitee = couple?.status === 'pending' && couple?.role === 'invitee';
    const isInviter = couple?.status === 'pending' && couple?.role === 'inviter';

    return (
      <AppLayout>
        <div className="max-w-lg mx-auto space-y-6 pb-20 md:pb-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800">👫 Couple Mode</h1>
            <p className="text-slate-500 mt-2">
              Invite your partner to start tracking shared expenses together
            </p>
          </div>

          {/* Pending invites I received (from /couple/status with role=invitee) */}
          {isInvitee && couple && (
            <div className="bg-amber-50 rounded-xl p-5">
              <h3 className="font-semibold text-amber-800 mb-3">💌 You have an invite!</h3>
              <div className="flex items-center justify-between bg-white rounded-lg p-4">
                <div>
                  <p className="font-medium text-slate-800">{couple.partner_name}</p>
                  <p className="text-sm text-slate-500">{couple.partner_email}</p>
                  <p className="text-xs text-slate-400 mt-1">wants to track expenses together</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(couple.id)}
                    className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700 transition"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(couple.id)}
                    className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pending invites from /pending-invites endpoint (fallback) */}
          {!isInvitee && pendingInvites.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-5">
              <h3 className="font-semibold text-amber-800 mb-3">Pending Invites</h3>
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between bg-white rounded-lg p-3 mb-2">
                  <div>
                    <p className="font-medium text-slate-800">{inv.partner_name}</p>
                    <p className="text-sm text-slate-500">{inv.partner_email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(inv.id)}
                      className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(inv.id)}
                      className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sent invite pending (only for the inviter) */}
          {isInviter && couple && (
            <div className="bg-blue-50 rounded-xl p-5 text-center">
              <p className="text-blue-700 font-medium">
                ⏳ Invite sent to {couple.partner_name || couple.partner_email}
              </p>
              <p className="text-blue-500 text-sm mt-1">Waiting for them to accept</p>
            </div>
          )}

          {/* Send invite (only when no couple exists at all) */}
          {!couple && pendingInvites.length === 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Invite Partner</h3>
              {inviteError && (
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">{inviteError}</div>
              )}
              <form onSubmit={handleInvite} className="flex gap-3">
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  required
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                  placeholder="partner@example.com"
                />
                <button
                  type="submit"
                  disabled={inviting}
                  className="bg-mint-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-mint-700 transition disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Invite'}
                </button>
              </form>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  // Active couple
  return (
    <AppLayout>
      <div className="space-y-6 pb-24 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">👫 Couple Mode</h1>
            <p className="text-slate-500 text-sm">
              With {couple.partner_name} · {couple.partner_email}
            </p>
          </div>
        </div>

        {/* Balance Card */}
        {balance && (
          <div className="bg-gradient-to-r from-mint-500 to-emerald-600 rounded-xl p-5 text-white">
            <p className="text-sm opacity-80">Total Shared Expenses</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(balance.total_shared)}</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm opacity-80">You paid</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(
                    user?.id === couple.user_1_id ? balance.user_1_paid : balance.user_2_paid
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm opacity-80">Partner paid</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(
                    user?.id === couple.user_1_id ? balance.user_2_paid : balance.user_1_paid
                  )}
                </p>
              </div>
            </div>
            {balance.net_balance !== 0 && (
              <div className="mt-4 pt-3 border-t border-white/20">
                <p className="text-sm font-medium">
                  {(user?.id === couple.user_1_id ? balance.net_balance > 0 : balance.net_balance < 0)
                    ? `You owe ${formatCurrency(Math.abs(balance.net_balance))}`
                    : `Partner owes you ${formatCurrency(Math.abs(balance.net_balance))}`
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('expenses')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'expenses' ? 'bg-mint-600 text-white' : 'bg-white text-slate-600'}`}
          >
            Shared Expenses
          </button>
          <button
            onClick={() => setTab('goals')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'goals' ? 'bg-mint-600 text-white' : 'bg-white text-slate-600'}`}
          >
            Savings Goals
          </button>
        </div>

        {/* ─── Shared Expenses Tab ─── */}
        {tab === 'expenses' && (
          <>
            {showExpenseForm && (
              <div className="bg-white rounded-xl p-6 shadow-sm animate-slide-up">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Shared Expense</h3>
                <form onSubmit={handleSharedExpense} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        value={seAmount}
                        onChange={(e) => setSeAmount(e.target.value)}
                        required min="1"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                      <select
                        value={seCategory} onChange={(e) => setSeCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                      >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Split Type</label>
                      <select
                        value={seSplitType}
                        onChange={(e) => {
                          const type = e.target.value;
                          setSeSplitType(type);
                          if (type === 'equal') {
                            const half = seAmount ? (parseFloat(seAmount) / 2).toFixed(0) : '';
                            setSeMyShare(half);
                            setSePartnerShare(half);
                          } else {
                            setSeMyShare('');
                            setSePartnerShare('');
                          }
                        }}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                      >
                        <option value="equal">Split Equally</option>
                        <option value="custom">Custom Split</option>
                      </select>
                    </div>
                    {seSplitType === 'equal' ? (
                      <div className="flex items-end">
                        <p className="text-sm text-slate-500 pb-3">
                          Each person pays {seAmount ? formatCurrency(parseFloat(seAmount) / 2) : '₹0'}
                        </p>
                      </div>
                    ) : (
                      <div></div>
                    )}
                  </div>

                  {seSplitType === 'custom' && (
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-medium text-slate-600">How much does each person owe?</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            {user?.name || 'You'} pays (₹)
                          </label>
                          <input
                            type="number"
                            value={seMyShare}
                            onChange={(e) => {
                              const myVal = e.target.value;
                              setSeMyShare(myVal);
                              if (seAmount && myVal) {
                                const remainder = Math.max(0, parseFloat(seAmount) - parseFloat(myVal));
                                setSePartnerShare(remainder.toFixed(0));
                              }
                            }}
                            required min="0"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            {couple?.partner_name || 'Partner'} pays (₹)
                          </label>
                          <input
                            type="number"
                            value={sePartnerShare}
                            onChange={(e) => {
                              const partnerVal = e.target.value;
                              setSePartnerShare(partnerVal);
                              if (seAmount && partnerVal) {
                                const remainder = Math.max(0, parseFloat(seAmount) - parseFloat(partnerVal));
                                setSeMyShare(remainder.toFixed(0));
                              }
                            }}
                            required min="0"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      {seAmount && seMyShare && sePartnerShare && (
                        Math.abs(parseFloat(seMyShare) + parseFloat(sePartnerShare) - parseFloat(seAmount)) > 0.01 ? (
                          <p className="text-xs text-red-500">
                            ⚠️ Shares add up to {formatCurrency(parseFloat(seMyShare) + parseFloat(sePartnerShare))} but total is {formatCurrency(parseFloat(seAmount))}
                          </p>
                        ) : (
                          <p className="text-xs text-mint-600">✓ Split adds up correctly</p>
                        )
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                      <input
                        type="date" value={seDate} onChange={(e) => setSeDate(e.target.value)} required
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <input
                        type="text" value={seDesc} onChange={(e) => setSeDesc(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={seSubmitting}
                      className="bg-mint-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-mint-700 disabled:opacity-50"
                    >
                      {seSubmitting ? 'Adding...' : 'Add'}
                    </button>
                    <button type="button" onClick={() => setShowExpenseForm(false)}
                      className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {sharedExpenses.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-4xl mb-3">🧾</p>
                <p>No shared expenses yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sharedExpenses.map((exp) => (
                  <div key={exp.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{CATEGORY_ICONS[exp.category] || '📦'}</span>
                      <div>
                        <p className="font-medium text-slate-800">{exp.category}</p>
                        <p className="text-xs text-slate-400">
                          Paid by {exp.paid_by_name} · {exp.split_type === 'equal' ? '50/50' : (() => {
                            const parts = exp.split_ratio.split(':');
                            const isUser1 = user?.id === couple.user_1_id;
                            const myShare = isUser1 ? parts[0] : parts[1];
                            const partnerShare = isUser1 ? parts[1] : parts[0];
                            return `${user?.name}: ₹${myShare}, ${couple.partner_name}: ₹${partnerShare}`;
                          })()} · {formatDate(exp.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-800">{formatCurrency(exp.amount)}</span>
                      <button
                        onClick={() => handleDeleteSharedExpense(exp.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 md:opacity-100"
                        title="Delete expense"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showExpenseForm && (
              <button
                onClick={() => setShowExpenseForm(true)}
                className="fixed bottom-20 md:bottom-8 right-6 bg-mint-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-mint-700 transition hover:scale-110 z-40"
              >
                +
              </button>
            )}
          </>
        )}

        {/* ─── Goals Tab ─── */}
        {tab === 'goals' && (
          <>
            <div className="flex justify-end">
              <button
                onClick={() => setShowGoalForm(!showGoalForm)}
                className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700"
              >
                + New Goal
              </button>
            </div>

            {showGoalForm && (
              <div className="bg-white rounded-xl p-6 shadow-sm animate-slide-up">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Create Savings Goal</h3>
                <form onSubmit={handleCreateGoal} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Goal Title</label>
                    <input
                      type="text" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} required
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                      placeholder="e.g., Goa Trip"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Target (₹)</label>
                      <input
                        type="number" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} required min="1"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                        placeholder="100000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Deadline (optional)</label>
                      <input
                        type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={goalSubmitting}
                    className="bg-mint-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-mint-700 disabled:opacity-50"
                  >
                    {goalSubmitting ? 'Creating...' : 'Create Goal'}
                  </button>
                </form>
              </div>
            )}

            {goals.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-4xl mb-3">🎯</p>
                <p>No savings goals yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <div key={goal.id} className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-800">{goal.title}</h3>
                      {goal.is_completed ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">✅ Complete</span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-500">
                        {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                      </span>
                      <span className="font-medium text-mint-600">{goal.percent_complete}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-mint-400 to-mint-600 rounded-full transition-all"
                        style={{ width: `${Math.min(goal.percent_complete || 0, 100)}%` }}
                      />
                    </div>
                    {goal.monthly_contribution_needed && (
                      <p className="text-xs text-slate-400 mb-3">
                        Need {formatCurrency(goal.monthly_contribution_needed)}/month to reach goal
                      </p>
                    )}
                    {!goal.is_completed && (
                      <div className="flex gap-2 mt-2">
                        {contributeGoalId === goal.id ? (
                          <div className="flex gap-2 flex-1">
                            <input
                              type="number" value={contributeAmount}
                              onChange={(e) => setContributeAmount(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                              placeholder="Amount"
                            />
                            <button
                              onClick={() => handleContribute(goal.id)}
                              className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => setContributeGoalId(null)}
                              className="px-3 py-2 rounded-lg border text-sm text-slate-500"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setContributeGoalId(goal.id)}
                            className="text-mint-600 text-sm font-medium hover:underline"
                          >
                            + Contribute
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
