'use client';

import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, CATEGORY_ICONS } from '@/lib/utils';
import { Couple, SharedExpense, BalanceSummary, SavingsGoal, Settlement, JointAccountSummary } from '@/types';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const CATEGORIES = ['Food', 'Rent', 'Utilities', 'Travel', 'Shopping', 'Subscriptions', 'EMI', 'Entertainment', 'Health', 'Other'];
const CONTRIBUTION_TYPES = ['salary', 'bonus', 'savings', 'other'];

export default function CouplePage() {
  const { user } = useAuth();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [pendingInvites, setPendingInvites] = useState<Couple[]>([]);
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>([]);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [jointSummary, setJointSummary] = useState<JointAccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'expenses' | 'settlements' | 'goals' | 'joint'>('expenses');

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
  const [seMyShare, setSeMyShare] = useState('');
  const [sePartnerShare, setSePartnerShare] = useState('');
  const [seDate, setSeDate] = useState(new Date().toISOString().split('T')[0]);
  const [sePaidFromJoint, setSePaidFromJoint] = useState(false);
  const [seSubmitting, setSeSubmitting] = useState(false);

  // Settlement form
  const [showSettleForm, setShowSettleForm] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalSubmitting, setGoalSubmitting] = useState(false);

  // Contribute form
  const [contributeGoalId, setContributeGoalId] = useState<number | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  // Shared expense edit state
  const [editingExpId, setEditingExpId] = useState<number | null>(null);
  const [editExpAmount, setEditExpAmount] = useState('');
  const [editExpCategory, setEditExpCategory] = useState('');
  const [editExpDesc, setEditExpDesc] = useState('');
  const [editExpSplitType, setEditExpSplitType] = useState('equal');
  const [editExpMyShare, setEditExpMyShare] = useState('');
  const [editExpPartnerShare, setEditExpPartnerShare] = useState('');
  const [editExpDate, setEditExpDate] = useState('');

  // Joint Account form
  const [showContribForm, setShowContribForm] = useState(false);
  const [contribAmount, setContribAmount] = useState('');
  const [contribType, setContribType] = useState('salary');
  const [contribNote, setContribNote] = useState('');
  const [contribDate, setContribDate] = useState(new Date().toISOString().split('T')[0]);
  const [contribSubmitting, setContribSubmitting] = useState(false);
  const [jointSubTab, setJointSubTab] = useState<'overview' | 'contributions' | 'transactions'>('overview');

  const loadData = async () => {
    try {
      const coupleData = await api.getCoupleStatus();
      setCouple(coupleData);
      if (coupleData.status === 'active') {
        const [expenses, bal, g, s] = await Promise.all([
          api.getSharedExpenses(),
          api.getBalance(),
          api.getSavingsGoals(),
          api.getSettlements().catch(() => []),
        ]);
        setSharedExpenses(expenses);
        setBalance(bal);
        setGoals(g);
        setSettlements(s);
        // Load joint account (may not exist yet)
        try {
          const js = await api.getJointAccount();
          setJointSummary(js);
        } catch { setJointSummary(null); }
      }
    } catch {
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
      toast.success('Invite sent!');
      setPartnerEmail('');
      loadData();
    } catch (err: any) {
      setInviteError(err.message);
      toast.error('Failed to send invite');
    } finally { setInviting(false); }
  };

  const handleAccept = async (coupleId: number) => {
    try {
      await api.acceptInvite(coupleId);
      toast.success('Invite accepted!');
      loadData();
    } catch { toast.error('Failed to accept invite'); }
  };

  const handleDecline = async (coupleId: number) => {
    try {
      await api.declineInvite(coupleId);
      toast.success('Invite declined');
      setCouple(null);
      setPendingInvites([]);
      loadData();
    } catch { toast.error('Failed to decline'); }
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
        paid_from_joint: sePaidFromJoint,
      });
      toast.success(sePaidFromJoint ? 'Expense added from Joint Account! 💰' : 'Shared expense added!');
      setSeAmount(''); setSeDesc(''); setSeMyShare(''); setSePartnerShare('');
      setSeSplitType('equal'); setShowExpenseForm(false); setSePaidFromJoint(false);
      loadData();
    } catch { toast.error('Failed to add expense'); } finally { setSeSubmitting(false); }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettleSubmitting(true);
    try {
      await api.createSettlement({
        amount: parseFloat(settleAmount),
        note: settleNote || undefined,
      });
      toast.success('Settlement recorded!');
      setSettleAmount(''); setSettleNote(''); setShowSettleForm(false);
      loadData();
    } catch { toast.error('Failed to settle'); } finally { setSettleSubmitting(false); }
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
      toast.success('Goal created!');
      setGoalTitle(''); setGoalTarget(''); setGoalDeadline('');
      setShowGoalForm(false);
      loadData();
    } catch { toast.error('Failed to create goal'); } finally { setGoalSubmitting(false); }
  };

  const handleContribute = async (goalId: number) => {
    try {
      await api.contributeToGoal(goalId, parseFloat(contributeAmount));
      toast.success('Contribution added!');
      setContributeGoalId(null); setContributeAmount('');
      loadData();
    } catch { toast.error('Failed to contribute'); }
  };

  // ─── Joint Account handlers ───────────────────────────────────────────────
  const handleCreateJointAccount = async () => {
    try {
      await api.createJointAccount({ account_name: 'Joint Account' });
      toast.success('Joint Account created! 🎉');
      loadData();
    } catch (err: any) { toast.error(err.message || 'Failed to create joint account'); }
  };

  const handleToggleJointAccount = async () => {
    try {
      const result = await api.toggleJointAccount();
      toast.success(result.is_active ? 'Joint Account activated!' : 'Joint Account deactivated');
      loadData();
    } catch { toast.error('Failed to toggle joint account'); }
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    setContribSubmitting(true);
    try {
      await api.addJointContribution({
        amount: parseFloat(contribAmount),
        contribution_type: contribType,
        note: contribNote || undefined,
        date: contribDate,
      });
      toast.success('Contribution added! 💰');
      setContribAmount(''); setContribNote(''); setShowContribForm(false); loadData();
    } catch { toast.error('Failed to add contribution'); }
    finally { setContribSubmitting(false); }
  };

  const handleDeleteContribution = async (id: number) => {
    if (!confirm('Delete this contribution?')) return;
    try { await api.deleteJointContribution(id); toast.success('Contribution removed'); loadData(); }
    catch (err: any) { toast.error(err.message || 'Failed to delete'); }
  };

  const handleDeleteSharedExpense = async (id: number) => {
    if (!confirm('Delete this shared expense?')) return;
    try {
      await api.deleteSharedExpense(id);
      toast.success('Expense deleted');
      loadData();
    } catch { toast.error('Failed to delete'); }
  };

  const handleEditSharedExpense = (exp: SharedExpense) => {
    setEditingExpId(exp.id);
    setEditExpAmount(exp.amount.toString());
    setEditExpCategory(exp.category);
    setEditExpDesc(exp.description || '');
    setEditExpDate(exp.date);
    setEditExpSplitType(exp.split_type);
    if (exp.split_type === 'custom') {
      const parts = exp.split_ratio.split(':');
      const isUser1 = user?.id === couple?.user_1_id;
      setEditExpMyShare(isUser1 ? parts[0] : parts[1]);
      setEditExpPartnerShare(isUser1 ? parts[1] : parts[0]);
    } else {
      setEditExpMyShare('');
      setEditExpPartnerShare('');
    }
  };

  const handleSaveEditSharedExpense = async () => {
    if (!editingExpId) return;
    try {
      const ratio = editExpSplitType === 'custom'
        ? `${editExpMyShare}:${editExpPartnerShare}`
        : '50:50';
      await api.updateSharedExpense(editingExpId, {
        amount: parseFloat(editExpAmount),
        category: editExpCategory,
        description: editExpDesc || undefined,
        split_type: editExpSplitType,
        split_ratio: ratio,
        date: editExpDate,
      });
      toast.success('Shared expense updated!');
      setEditingExpId(null);
      loadData();
    } catch {
      toast.error('Failed to update expense');
    }
  };

  // Helper: who owes whom
  const getDebtInfo = () => {
    if (!balance || !couple || !user) return null;
    const netAfter = balance.net_after_settlements ?? balance.net_balance;
    if (Math.abs(netAfter) < 1) return { text: 'All settled up! ✓', owed: 0, youOwe: false };
    const isUser1 = user.id === couple.user_1_id;
    // net_balance > 0 means user_2 owes user_1
    const youOwe = isUser1 ? netAfter < 0 : netAfter > 0;
    return {
      text: youOwe
        ? `You owe ${couple.partner_name} ${formatCurrency(Math.abs(netAfter))}`
        : `${couple.partner_name} owes you ${formatCurrency(Math.abs(netAfter))}`,
      owed: Math.abs(netAfter),
      youOwe,
    };
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
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">👫 Couple Mode</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Invite your partner to start tracking shared expenses together
            </p>
          </div>

          {isInvitee && couple && (
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-5">
              <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-3">💌 You have an invite!</h3>
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-4">
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">{couple.partner_name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{couple.partner_email}</p>
                  <p className="text-xs text-slate-400 mt-1">wants to track expenses together</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAccept(couple.id)} className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700 transition">Accept</button>
                  <button onClick={() => handleDecline(couple.id)} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition">Decline</button>
                </div>
              </div>
            </div>
          )}

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
                    <button onClick={() => handleAccept(inv.id)} className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700">Accept</button>
                    <button onClick={() => handleDecline(inv.id)} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isInviter && couple && (
            <div className="bg-blue-50 rounded-xl p-5 text-center">
              <p className="text-blue-700 font-medium">⏳ Invite sent to {couple.partner_name || couple.partner_email}</p>
              <p className="text-blue-500 text-sm mt-1">Waiting for them to accept</p>
            </div>
          )}

          {!couple && pendingInvites.length === 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Invite Partner</h3>
              {inviteError && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">{inviteError}</div>}
              <form onSubmit={handleInvite} className="flex gap-3">
                <input type="email" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} required
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none" placeholder="partner@example.com" />
                <button type="submit" disabled={inviting} className="bg-mint-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-mint-700 transition disabled:opacity-50">
                  {inviting ? 'Sending...' : 'Invite'}
                </button>
              </form>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  const debtInfo = getDebtInfo();

  // Active couple
  return (
    <AppLayout>
      <div className="space-y-6 pb-24 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">👫 Couple Mode</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">With {couple.partner_name} · {couple.partner_email}</p>
          </div>
        </div>

        {/* ─── Joint Account Widget (if active) ─── */}
        {jointSummary && jointSummary.account.is_active && (
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="font-semibold text-lg">{jointSummary.account.account_name}</p>
                  <p className="text-xs opacity-80">Pooled account for shared expenses</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Balance</p>
                <p className={`text-2xl font-bold ${jointSummary.balance < 0 ? 'text-red-200' : ''}`}>
                  {formatCurrency(jointSummary.balance)}
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{jointSummary.user_1_name}: {formatCurrency(jointSummary.user_1_contributed)} ({jointSummary.user_1_percent}%)</span>
                <span>{jointSummary.user_2_name}: {formatCurrency(jointSummary.user_2_contributed)} ({jointSummary.user_2_percent}%)</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden flex">
                {jointSummary.total_contributions > 0 && (
                  <>
                    <div className="bg-violet-200 h-full transition-all" style={{ width: `${jointSummary.user_1_percent}%` }} />
                    <div className="bg-purple-200 h-full transition-all" style={{ width: `${jointSummary.user_2_percent}%` }} />
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/20">
              <div><p className="text-xs opacity-70">This Month In</p><p className="font-semibold">{formatCurrency(jointSummary.month_contributions)}</p></div>
              <div><p className="text-xs opacity-70">This Month Out</p><p className="font-semibold">{formatCurrency(jointSummary.month_spent)}</p></div>
              <div><p className="text-xs opacity-70">Total Contributed</p><p className="font-semibold">{formatCurrency(jointSummary.total_contributions)}</p></div>
            </div>
            {jointSummary.balance < 0 && (
              <div className="mt-3 bg-red-500/30 rounded-lg px-3 py-2 text-sm">⚠️ Joint account is in deficit! Add funds to cover expenses.</div>
            )}
            <button onClick={() => { setTab('joint'); setShowContribForm(true); }}
              className="mt-3 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition w-full text-center">
              + Add Funds
            </button>
          </div>
        )}

        {/* Balance Card */}
        {balance && (
          <div className="bg-gradient-to-r from-mint-500 to-emerald-600 rounded-xl p-5 text-white">
            <p className="text-sm opacity-80">Total Shared Expenses</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(balance.total_shared)}</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm opacity-80">{balance.user_1_name || 'Partner 1'} paid</p>
                <p className="text-lg font-semibold">{formatCurrency(balance.user_1_paid)}</p>
              </div>
              <div>
                <p className="text-sm opacity-80">{balance.user_2_name || 'Partner 2'} paid</p>
                <p className="text-lg font-semibold">{formatCurrency(balance.user_2_paid)}</p>
              </div>
            </div>

            {/* Net Balance with settlements */}
            <div className="mt-4 pt-3 border-t border-white/20 space-y-2">
              {(balance.settlements_total ?? 0) > 0 && (
                <p className="text-sm opacity-80">
                  Total settled: {formatCurrency(balance.settlements_total || 0)}
                </p>
              )}
              {debtInfo && (
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold ${debtInfo.owed === 0 ? '' : ''}`}>
                    {debtInfo.text}
                  </p>
                  {debtInfo.owed > 0 && (
                    <button
                      onClick={() => {
                        setSettleAmount(debtInfo.owed.toString());
                        setShowSettleForm(true);
                        setTab('settlements');
                      }}
                      className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                    >
                      Settle Up 💸
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['expenses', 'settlements', 'goals', 'joint'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${tab === t ? 'bg-mint-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
              {t === 'expenses' ? 'Shared Expenses' :
               t === 'settlements' ? `Settlements${settlements.length > 0 ? ` (${settlements.length})` : ''}` :
               t === 'goals' ? 'Savings Goals' : '💰 Joint Account'}
            </button>
          ))}
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
                      <input type="number" value={seAmount} onChange={(e) => setSeAmount(e.target.value)} required min="1"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                      <select value={seCategory} onChange={(e) => setSeCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none">
                        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Split Type</label>
                      <select value={seSplitType}
                        onChange={(e) => {
                          setSeSplitType(e.target.value);
                          if (e.target.value === 'equal') { setSeMyShare(''); setSePartnerShare(''); }
                        }}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none">
                        <option value="equal">Split Equally</option>
                        <option value="custom">Custom Split</option>
                      </select>
                    </div>
                    {seSplitType === 'equal' && (
                      <div className="flex items-end">
                        <p className="text-sm text-slate-500 pb-3">Each pays {seAmount ? formatCurrency(parseFloat(seAmount) / 2) : '₹0'}</p>
                      </div>
                    )}
                  </div>
                  {seSplitType === 'custom' && (
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-medium text-slate-600">How much does each person owe?</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">{user?.name || 'You'} pays (₹)</label>
                          <input type="number" value={seMyShare}
                            onChange={(e) => { setSeMyShare(e.target.value); if (seAmount && e.target.value) setSePartnerShare(Math.max(0, parseFloat(seAmount) - parseFloat(e.target.value)).toFixed(0)); }}
                            required min="0" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none" placeholder="0" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">{couple?.partner_name || 'Partner'} pays (₹)</label>
                          <input type="number" value={sePartnerShare}
                            onChange={(e) => { setSePartnerShare(e.target.value); if (seAmount && e.target.value) setSeMyShare(Math.max(0, parseFloat(seAmount) - parseFloat(e.target.value)).toFixed(0)); }}
                            required min="0" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none" placeholder="0" />
                        </div>
                      </div>
                      {seAmount && seMyShare && sePartnerShare && (
                        Math.abs(parseFloat(seMyShare) + parseFloat(sePartnerShare) - parseFloat(seAmount)) > 0.01
                          ? <p className="text-xs text-red-500">⚠️ Shares add up to {formatCurrency(parseFloat(seMyShare) + parseFloat(sePartnerShare))} but total is {formatCurrency(parseFloat(seAmount))}</p>
                          : <p className="text-xs text-mint-600">✓ Split adds up correctly</p>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                      <input type="date" value={seDate} onChange={(e) => setSeDate(e.target.value)} required
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <input type="text" value={seDesc} onChange={(e) => setSeDesc(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none" placeholder="Optional" />
                    </div>
                  </div>
                  {/* Pay from Joint Account toggle */}
                  {jointSummary && jointSummary.account.is_active && (
                    <div className="bg-violet-50 dark:bg-violet-900/30 rounded-xl p-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={sePaidFromJoint} onChange={(e) => setSePaidFromJoint(e.target.checked)}
                          className="w-5 h-5 rounded border-violet-300 text-violet-600 focus:ring-violet-500" />
                        <div>
                          <p className="text-sm font-medium text-violet-800 dark:text-violet-200">💰 Pay from Joint Account</p>
                          <p className="text-xs text-violet-600 dark:text-violet-300">Balance: {formatCurrency(jointSummary.balance)}</p>
                        </div>
                      </label>
                      {sePaidFromJoint && seAmount && parseFloat(seAmount) > jointSummary.balance && (
                        <p className="text-xs text-red-600 mt-2">⚠️ Amount exceeds joint account balance!</p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="submit" disabled={seSubmitting} className="bg-mint-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-mint-700 disabled:opacity-50">
                      {seSubmitting ? 'Adding...' : sePaidFromJoint ? '💰 Add from Joint' : 'Add'}
                    </button>
                    <button type="button" onClick={() => { setShowExpenseForm(false); setSePaidFromJoint(false); }} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600">Cancel</button>
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
                  <div key={exp.id} className="bg-white rounded-xl px-4 py-3 shadow-sm animate-fade-in group">
                    {editingExpId === exp.id ? (
                      /* ─── Inline Edit Mode ─── */
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Amount (₹)</label>
                            <input type="number" value={editExpAmount} onChange={(e) => setEditExpAmount(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-mint-500 outline-none" placeholder="Amount" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                            <select value={editExpCategory} onChange={(e) => setEditExpCategory(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-mint-500 outline-none">
                              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                            <input type="date" value={editExpDate} onChange={(e) => setEditExpDate(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-mint-500 outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                            <input type="text" value={editExpDesc} onChange={(e) => setEditExpDesc(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-mint-500 outline-none" placeholder="Optional" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Split Type</label>
                          <select value={editExpSplitType}
                            onChange={(e) => { setEditExpSplitType(e.target.value); if (e.target.value === 'equal') { setEditExpMyShare(''); setEditExpPartnerShare(''); } }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-mint-500 outline-none">
                            <option value="equal">Split Equally (50/50)</option>
                            <option value="custom">Custom Split</option>
                          </select>
                        </div>
                        {editExpSplitType === 'custom' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">{user?.name || 'You'} pays (₹)</label>
                              <input type="number" value={editExpMyShare}
                                onChange={(e) => { setEditExpMyShare(e.target.value); if (editExpAmount && e.target.value) setEditExpPartnerShare(Math.max(0, parseFloat(editExpAmount) - parseFloat(e.target.value)).toFixed(0)); }}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-mint-500 outline-none" placeholder="0" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">{couple?.partner_name || 'Partner'} pays (₹)</label>
                              <input type="number" value={editExpPartnerShare}
                                onChange={(e) => { setEditExpPartnerShare(e.target.value); if (editExpAmount && e.target.value) setEditExpMyShare(Math.max(0, parseFloat(editExpAmount) - parseFloat(e.target.value)).toFixed(0)); }}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-mint-500 outline-none" placeholder="0" />
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={handleSaveEditSharedExpense} className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700">
                            Save
                          </button>
                          <button onClick={() => setEditingExpId(null)} className="px-4 py-2 rounded-lg border text-sm text-slate-500">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ─── Display Mode ─── */
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{CATEGORY_ICONS[exp.category] || '📦'}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-800">{exp.description || exp.category}</p>
                              {exp.paid_from_joint && <span className="text-xs bg-violet-100 dark:bg-violet-800 text-violet-700 dark:text-violet-200 px-1.5 py-0.5 rounded">💰 Joint</span>}
                            </div>
                            <p className="text-xs text-slate-400">
                              {exp.paid_from_joint ? 'From Joint Account' : `Paid by ${exp.paid_by_name}`} · {exp.split_type === 'equal' ? '50/50' : (() => {
                                const parts = exp.split_ratio.split(':');
                                const isUser1 = user?.id === couple.user_1_id;
                                const myShare = isUser1 ? parts[0] : parts[1];
                                const partnerShare = isUser1 ? parts[1] : parts[0];
                                return `You: ₹${myShare}, ${couple.partner_name}: ₹${partnerShare}`;
                              })()} · {formatDate(exp.date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{formatCurrency(exp.amount)}</span>
                          <button onClick={() => handleEditSharedExpense(exp)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition opacity-0 group-hover:opacity-100 md:opacity-100"
                            title="Edit expense">✏️</button>
                          <button onClick={() => handleDeleteSharedExpense(exp.id)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 md:opacity-100"
                            title="Delete expense">🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!showExpenseForm && (
              <button onClick={() => setShowExpenseForm(true)}
                className="fixed bottom-20 md:bottom-8 right-6 bg-mint-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-mint-700 transition hover:scale-110 z-40">
                +
              </button>
            )}
          </>
        )}

        {/* ─── Settlements Tab ─── */}
        {tab === 'settlements' && (
          <>
            {/* Settle Up Form */}
            {showSettleForm && (
              <div className="bg-white rounded-xl p-6 shadow-sm animate-slide-up">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">💸 Record Settlement</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Record a payment you made to {couple.partner_name} (or they made to you) to settle debts.
                </p>
                <form onSubmit={handleSettle} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                    <input type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} required min="1"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none" placeholder="Amount paid" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Note (optional)</label>
                    <input type="text" value={settleNote} onChange={(e) => setSettleNote(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none" placeholder="e.g., UPI transfer" />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={settleSubmitting} className="bg-mint-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-mint-700 disabled:opacity-50">
                      {settleSubmitting ? 'Recording...' : 'Record Payment'}
                    </button>
                    <button type="button" onClick={() => setShowSettleForm(false)} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Debt summary card */}
            {debtInfo && (
              <div className={`rounded-xl p-4 shadow-sm ${debtInfo.owed === 0 ? 'bg-green-50 border border-green-200' : debtInfo.youOwe ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Current Balance</p>
                    <p className={`text-lg font-bold ${debtInfo.owed === 0 ? 'text-green-700' : debtInfo.youOwe ? 'text-red-600' : 'text-blue-600'}`}>
                      {debtInfo.text}
                    </p>
                  </div>
                  {debtInfo.owed > 0 && !showSettleForm && (
                    <button onClick={() => { setSettleAmount(debtInfo.owed.toString()); setShowSettleForm(true); }}
                      className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700 transition">
                      Settle Up 💸
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Settlement History */}
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Settlement History</h3>
              {settlements.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-3xl mb-2">🤝</p>
                  <p>No settlements recorded yet</p>
                  <p className="text-sm mt-1">Record payments when you settle debts with your partner</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {settlements.map((s) => (
                    <div key={s.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💸</span>
                        <div>
                          <p className="font-medium text-slate-800">
                            {s.paid_by_user_id === user?.id ? 'You' : couple.partner_name} paid {s.paid_to_user_id === user?.id ? 'you' : couple.partner_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {s.note && <span>{s.note} · </span>}
                            {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-green-600">{formatCurrency(s.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!showSettleForm && settlements.length > 0 && (
              <button onClick={() => setShowSettleForm(true)}
                className="fixed bottom-20 md:bottom-8 right-6 bg-mint-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-mint-700 transition hover:scale-110 z-40">
                💸
              </button>
            )}
          </>
        )}

        {/* ─── Goals Tab ─── */}
        {tab === 'goals' && (
          <>
            <div className="flex justify-end">
              <button onClick={() => setShowGoalForm(!showGoalForm)}
                className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mint-700">
                + New Goal
              </button>
            </div>

            {showGoalForm && (
              <div className="bg-white rounded-xl p-6 shadow-sm animate-slide-up">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Create Savings Goal</h3>
                <form onSubmit={handleCreateGoal} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Goal Title</label>
                    <input type="text" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} required
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none" placeholder="e.g., Goa Trip" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Target (₹)</label>
                      <input type="number" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} required min="1"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none" placeholder="100000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Deadline (optional)</label>
                      <input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-mint-500 outline-none" />
                    </div>
                  </div>
                  <button type="submit" disabled={goalSubmitting} className="bg-mint-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-mint-700 disabled:opacity-50">
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
                      {goal.is_completed && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">✅ Complete</span>}
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-500">{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
                      <span className="font-medium text-mint-600">{goal.percent_complete}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-gradient-to-r from-mint-400 to-mint-600 rounded-full transition-all" style={{ width: `${Math.min(goal.percent_complete || 0, 100)}%` }} />
                    </div>
                    {goal.monthly_contribution_needed && (
                      <p className="text-xs text-slate-400 mb-3">Need {formatCurrency(goal.monthly_contribution_needed)}/month to reach goal</p>
                    )}
                    {!goal.is_completed && (
                      <div className="flex gap-2 mt-2">
                        {contributeGoalId === goal.id ? (
                          <div className="flex gap-2 flex-1">
                            <input type="number" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Amount" />
                            <button onClick={() => handleContribute(goal.id)} className="bg-mint-600 text-white px-4 py-2 rounded-lg text-sm">Add</button>
                            <button onClick={() => setContributeGoalId(null)} className="px-3 py-2 rounded-lg border text-sm text-slate-500">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setContributeGoalId(goal.id)} className="text-mint-600 text-sm font-medium hover:underline">+ Contribute</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══════════ JOINT ACCOUNT TAB ═══════════ */}
        {tab === 'joint' && (
          <>
            {!jointSummary ? (
              /* No joint account yet — setup screen */
              <div className="max-w-md mx-auto text-center py-8 space-y-6">
                <div className="text-6xl">💰</div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Joint Account</h2>
                <p className="text-slate-500 dark:text-slate-400">
                  Pool your salaries into a shared account for common expenses.
                  Both partners contribute and all joint expenses are deducted automatically.
                </p>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm space-y-4 text-left">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200">How it works:</h3>
                  <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex gap-2">✅ Both partners add their salary/funds</li>
                    <li className="flex gap-2">✅ Track who contributed how much</li>
                    <li className="flex gap-2">✅ Shared expenses can deduct from the joint pool</li>
                    <li className="flex gap-2">✅ Real-time balance &amp; monthly summary</li>
                    <li className="flex gap-2">✅ Low balance alerts</li>
                  </ul>
                </div>
                <button onClick={handleCreateJointAccount}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold text-lg hover:from-violet-600 hover:to-purple-700 transition shadow-lg">
                  🚀 Create Joint Account
                </button>
              </div>
            ) : (
              /* Joint account exists */
              <div className="space-y-6">
                {/* Status & Toggle */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white text-lg">💰 {jointSummary.account.account_name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Created {new Date(jointSummary.account.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${jointSummary.account.is_active ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        {jointSummary.account.is_active ? '● Active' : '○ Inactive'}
                      </span>
                      <button onClick={handleToggleJointAccount}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${jointSummary.account.is_active ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100' : 'bg-mint-50 dark:bg-mint-900/30 text-mint-600 hover:bg-mint-100'}`}>
                        {jointSummary.account.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Balance Overview */}
                <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-5 text-white">
                  <div className="text-center mb-4">
                    <p className="text-sm opacity-80">Current Balance</p>
                    <p className={`text-4xl font-bold ${jointSummary.balance < 0 ? 'text-red-200' : ''}`}>
                      {formatCurrency(jointSummary.balance)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <p className="text-xs opacity-70">Total In</p>
                      <p className="text-xl font-bold">{formatCurrency(jointSummary.total_contributions)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <p className="text-xs opacity-70">Total Out</p>
                      <p className="text-xl font-bold">{formatCurrency(jointSummary.total_spent)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-sm font-medium mb-2">Contribution Split</p>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{jointSummary.user_1_name}: {formatCurrency(jointSummary.user_1_contributed)} ({jointSummary.user_1_percent}%)</span>
                      <span>{jointSummary.user_2_name}: {formatCurrency(jointSummary.user_2_contributed)} ({jointSummary.user_2_percent}%)</span>
                    </div>
                    <div className="h-4 bg-white/20 rounded-full overflow-hidden flex">
                      {jointSummary.total_contributions > 0 && (
                        <>
                          <div className="bg-violet-200 h-full transition-all rounded-l-full" style={{ width: `${jointSummary.user_1_percent}%` }} />
                          <div className="bg-purple-300 h-full transition-all rounded-r-full" style={{ width: `${jointSummary.user_2_percent}%` }} />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-xs opacity-70">This Month Added</p>
                      <p className="font-bold">{formatCurrency(jointSummary.month_contributions)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-xs opacity-70">This Month Spent</p>
                      <p className="font-bold">{formatCurrency(jointSummary.month_spent)}</p>
                    </div>
                  </div>
                  {jointSummary.balance < 0 && (
                    <div className="mt-3 bg-red-500/30 rounded-lg px-3 py-2 text-sm">⚠️ Account in deficit! Add funds to cover expenses.</div>
                  )}
                </div>

                {/* Add Contribution Button & Form */}
                {jointSummary.account.is_active && (
                  <button onClick={() => setShowContribForm(!showContribForm)}
                    className="w-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 py-3 rounded-xl font-medium hover:bg-violet-100 dark:hover:bg-violet-900/50 transition text-center">
                    + Add Contribution
                  </button>
                )}

                {showContribForm && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm animate-slide-up">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">💰 Add Funds to Joint Account</h3>
                    <form onSubmit={handleAddContribution} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                          <input type="number" value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} required min="1"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-violet-500 outline-none" placeholder="50000" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                          <select value={contribType} onChange={(e) => setContribType(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-violet-500 outline-none">
                            {CONTRIBUTION_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                          <input type="date" value={contribDate} onChange={(e) => setContribDate(e.target.value)} required
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-violet-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Note (optional)</label>
                          <input type="text" value={contribNote} onChange={(e) => setContribNote(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-violet-500 outline-none" placeholder="e.g., Feb salary" />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button type="submit" disabled={contribSubmitting}
                          className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-2.5 rounded-lg font-medium hover:from-violet-600 hover:to-purple-700 disabled:opacity-50">
                          {contribSubmitting ? 'Adding...' : '💰 Add to Joint Account'}
                        </button>
                        <button type="button" onClick={() => setShowContribForm(false)}
                          className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Sub-tabs */}
                <div className="flex gap-2">
                  {(['overview', 'contributions', 'transactions'] as const).map(st => (
                    <button key={st} onClick={() => setJointSubTab(st)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${jointSubTab === st ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                      {st === 'overview' ? '📊 Overview' : st === 'contributions' ? '📥 Contributions' : '📤 Transactions'}
                    </button>
                  ))}
                </div>

                {/* Overview sub-tab */}
                {jointSubTab === 'overview' && jointSummary.recent_contributions.length === 0 && jointSummary.recent_transactions.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-4xl mb-3">💰</p>
                    <p>No activity yet. Add your first contribution!</p>
                  </div>
                )}
                {jointSubTab === 'overview' && (jointSummary.recent_contributions.length > 0 || jointSummary.recent_transactions.length > 0) && (
                  <div className="space-y-4">
                    {jointSummary.recent_contributions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Recent Contributions</h4>
                        <div className="space-y-2">
                          {jointSummary.recent_contributions.slice(0, 5).map(c => (
                            <div key={c.id} className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">📥</span>
                                <div>
                                  <p className="font-medium text-slate-800 dark:text-white">{c.user_name}</p>
                                  <p className="text-xs text-slate-400">
                                    {c.contribution_type.charAt(0).toUpperCase() + c.contribution_type.slice(1)}
                                    {c.note && ` · ${c.note}`} · {formatDate(c.date)}
                                  </p>
                                </div>
                              </div>
                              <span className="font-semibold text-green-600 dark:text-green-400">+{formatCurrency(c.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {jointSummary.recent_transactions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Recent Expenses from Joint</h4>
                        <div className="space-y-2">
                          {jointSummary.recent_transactions.slice(0, 5).map(t => (
                            <div key={t.id} className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">📤</span>
                                <div>
                                  <p className="font-medium text-slate-800 dark:text-white">{t.description || 'Expense'}</p>
                                  <p className="text-xs text-slate-400">{formatDate(t.date)}</p>
                                </div>
                              </div>
                              <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(t.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Contributions sub-tab */}
                {jointSubTab === 'contributions' && (
                  <div className="space-y-2">
                    {jointSummary.recent_contributions.length === 0 ? (
                      <div className="text-center py-8 text-slate-400"><p className="text-3xl mb-2">📥</p><p>No contributions yet</p></div>
                    ) : (
                      jointSummary.recent_contributions.map(c => (
                        <div key={c.id} className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">📥</span>
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white">{c.user_name}</p>
                              <p className="text-xs text-slate-400">
                                {c.contribution_type.charAt(0).toUpperCase() + c.contribution_type.slice(1)}
                                {c.note && ` · ${c.note}`} · {formatDate(c.date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-green-600 dark:text-green-400">+{formatCurrency(c.amount)}</span>
                            <button onClick={() => handleDeleteContribution(c.id)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition opacity-0 group-hover:opacity-100 md:opacity-100"
                              title="Delete">🗑️</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Transactions sub-tab */}
                {jointSubTab === 'transactions' && (
                  <div className="space-y-2">
                    {jointSummary.recent_transactions.length === 0 ? (
                      <div className="text-center py-8 text-slate-400"><p className="text-3xl mb-2">📤</p><p>No transactions yet</p></div>
                    ) : (
                      jointSummary.recent_transactions.map(t => (
                        <div key={t.id} className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">📤</span>
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white">{t.description || 'Shared Expense'}</p>
                              <p className="text-xs text-slate-400">{formatDate(t.date)}</p>
                            </div>
                          </div>
                          <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(t.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
