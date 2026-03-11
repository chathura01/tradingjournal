'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Trade {
  _id: string;
  day: number;
  pair: string;
  date: string;
  dayStatus: string;
  killZone: string;
  analyzedInLap: boolean;
  tradingType: string;
  tradingTypeDetail: string;
  entryFVG: string;
  entryExist: boolean;
  trade: string;
  followedRules: boolean;
  outcome: string;
  tradeStatus: string;
  tvLink: string;
  pnl: number;
  endBalance: number;
  postTradeComment: string;
}

type TradeForm = Omit<Trade, '_id' | 'day' | 'tradeStatus' | 'endBalance'>;

const emptyForm = (): TradeForm => ({
  pair: '',
  date: new Date().toISOString().split('T')[0],
  dayStatus: '',
  killZone: '',
  analyzedInLap: false,
  tradingType: '',
  tradingTypeDetail: '',
  entryFVG: '',
  entryExist: false,
  trade: '',
  followedRules: false,
  outcome: '',
  tvLink: '',
  pnl: '' as unknown as number,
  postTradeComment: '',
});

// ─── Color helpers ────────────────────────────────────────────────────────────
function pairColor(v: string) {
  const m: Record<string, string> = {
    'EUR/USD': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'GBP/USD': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    'GER40':   'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'XAU/USD': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  };
  return m[v] || 'bg-gray-700 text-gray-300 border-gray-600';
}

function dayStatusColor(v: string) {
  const m: Record<string, string> = {
    'Trading Day':       'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'High Impact News':  'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'US Bank Holiday':   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };
  return m[v] || 'bg-gray-700 text-gray-300 border-gray-600';
}

function killZoneColor(v: string) {
  const m: Record<string, string> = {
    'London':   'bg-sky-500/20 text-sky-300 border-sky-500/30',            // light blue
    'New York': 'bg-purple-500/20 text-purple-300 border-purple-500/30',   // purple
    'Gap':      'bg-gray-500/20 text-gray-300 border-gray-500/30',         // ash
  };
  return m[v] || 'bg-gray-700 text-gray-300 border-gray-600';
}

function yesNoColor(v: boolean) {
  return v
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    : 'bg-red-500/20 text-red-300 border-red-500/30';
}

function outcomeColor(v: string) {
  if (v === 'TP') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (v === 'SL') return 'bg-red-500/20 text-red-300 border-red-500/30';
  return 'bg-gray-700 text-gray-300 border-gray-600';
}

function tradeStatusColor(v: string) {
  const m: Record<string, string> = {
    'Good Win':  'bg-green-500/20 text-green-300 border-green-500/30',     // green
    'Good Loss': 'bg-rose-500/20 text-rose-300 border-rose-500/30',        // pinkish red
    'Bad Win':   'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',  // yellow
    'Bad Loss':  'bg-red-500/20 text-red-300 border-red-500/30',           // red
  };
  return m[v] || 'bg-gray-700 text-gray-300 border-gray-600';
}

function tradeColor(v: string) {
  if (v === 'Took')   return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (v === 'Missed') return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  return 'bg-gray-700 text-gray-300 border-gray-600';
}

function tradingTypeColor(v: string) {
  if (v === 'Internal to External') return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  if (v === 'External to Internal') return 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30';
  return 'bg-gray-700 text-gray-300 border-gray-600';
}

function computeTradeStatus(followedRules: boolean, outcome: string): string {
  if (followedRules && outcome === 'TP') return 'Good Win';
  if (followedRules && outcome === 'SL') return 'Good Loss';
  if (!followedRules && outcome === 'TP') return 'Bad Win';
  if (!followedRules && outcome === 'SL') return 'Bad Loss';
  return '';
}

// ─── Badge component ──────────────────────────────────────────────────────────
function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  if (!label && label !== 'false') return <span className="text-gray-600">–</span>;
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${colorClass} whitespace-nowrap`}>
      {label}
    </span>
  );
}

// ─── Conditional FVG detail options ──────────────────────────────────────────
function getDetailOptions(tradingType: string) {
  if (tradingType === 'Internal to External') return ['4H FVG', '1H FVG'];
  if (tradingType === 'External to Internal') return ['4H Liquidity Sweep', '1H Liquidity Sweep'];
  return [];
}

function getEntryFVGOptions(tradingType: string, detail: string): string[] {
  if (tradingType === 'Internal to External') {
    if (detail === '4H FVG') return ['15 Min FVG', '5 Min 2 FVGs'];
    if (detail === '1H FVG') return ['5 Min FVG', '1 Min 2 FVGs'];
  }
  if (tradingType === 'External to Internal') {
    if (detail === '4H Liquidity Sweep') return ['15 Min FVG', '5 Min 2 FVGs'];
    if (detail === '1H Liquidity Sweep') return ['5 Min FVG', '1 Min 2 FVGs'];
  }
  return [];
}

// ─── Inline select helper ─────────────────────────────────────────────────────
function Sel({ value, onChange, options, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; className?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${className}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function JournalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const accountId = params.accountId as string;

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState('');
  const [initialBalance, setInitialBalance] = useState(0);

  // Add form state
  const [addForm, setAddForm] = useState<TradeForm>(emptyForm());
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TradeForm>(emptyForm());
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [accRes, tradesRes] = await Promise.all([
      fetch(`/api/accounts/${accountId}`),
      fetch(`/api/trades?accountId=${accountId}`),
    ]);
    if (accRes.ok) {
      const acc = await accRes.json();
      setAccountName(acc.name);
      setInitialBalance(acc.initialBalance);
    }
    if (tradesRes.ok) {
      const t = await tradesRes.json();
      setTrades(Array.isArray(t) ? t : []);
    }
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  // ── Add trade ───────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.pair || !addForm.dayStatus || !addForm.killZone || !addForm.tradingType) {
      setAddError('Please fill in all required fields.');
      return;
    }
    setAddLoading(true);
    const res = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, accountId }),
    });
    setAddLoading(false);
    if (res.ok) {
      setAddForm(emptyForm());
      setShowAddForm(false);
      fetchData();
    } else {
      const d = await res.json();
      setAddError(d.error || 'Failed to save trade');
    }
  };

  // ── Edit trade ──────────────────────────────────────────────────────────────
  const startEdit = (trade: Trade) => {
    setEditId(trade._id);
    setEditForm({
      pair: trade.pair,
      date: trade.date ? trade.date.split('T')[0] : '',
      dayStatus: trade.dayStatus,
      killZone: trade.killZone,
      analyzedInLap: trade.analyzedInLap,
      tradingType: trade.tradingType,
      tradingTypeDetail: trade.tradingTypeDetail,
      entryFVG: trade.entryFVG,
      entryExist: trade.entryExist,
      trade: trade.trade,
      followedRules: trade.followedRules,
      outcome: trade.outcome,
      tvLink: trade.tvLink,
      pnl: trade.pnl,
      postTradeComment: trade.postTradeComment,
    });
  };

  const handleEdit = async (id: string) => {
    setEditLoading(true);
    await fetch(`/api/trades/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, accountId }),
    });
    setEditLoading(false);
    setEditId(null);
    fetchData();
  };

  // ── Delete trade ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/trades/${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentBalance = trades.length > 0 ? trades[trades.length - 1].endBalance : initialBalance;
  const totalPnl = currentBalance - initialBalance;

  return (
    <>
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h2 className="text-2xl font-bold text-white">{accountName}</h2>
              <p className="text-sm text-gray-400">Trading Journal</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Stats */}
            <div className="flex gap-3">
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-gray-500">Initial</p>
                <p className="text-sm font-bold text-gray-300">${initialBalance.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-gray-500">Balance</p>
                <p className="text-sm font-bold text-emerald-400">${currentBalance.toLocaleString()}</p>
              </div>
              <div className={`bg-gray-900 border rounded-xl px-4 py-2 text-center ${totalPnl >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                <p className="text-xs text-gray-500">Total PnL</p>
                <p className={`text-sm font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/analytics/${accountId}`}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </Link>
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-emerald-500/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Trade
              </button>
            </div>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-gray-900 border border-emerald-500/20 rounded-2xl p-5 mb-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              New Trade Entry
            </h3>
            <TradeFormUI
              form={addForm}
              setForm={f => setAddForm(f)}
              onSubmit={handleAdd}
              loading={addLoading}
              error={addError}
              onCancel={() => { setShowAddForm(false); setAddForm(emptyForm()); setAddError(''); }}
              submitLabel="Save Trade"
            />
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950">
                  {[
                    '#', 'Pair', 'Date', 'Status', 'KillZone', 'Lap',
                    'Type', 'Detail', 'Entry FVG', 'Exist', 'Trade',
                    'Rules', 'Outcome', 'Trade Status', 'TV Link',
                    'PnL', 'Balance', 'Comment', 'Actions'
                  ].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={19} className="py-16 text-center text-gray-500">
                      No trades yet. Click &quot;Add Trade&quot; to record your first trade.
                    </td>
                  </tr>
                ) : (
                  trades.map(trade => (
                    editId === trade._id ? (
                      <tr key={trade._id} className="bg-gray-800/50">
                        <td colSpan={19} className="px-4 py-4">
                          <TradeFormUI
                            form={editForm}
                            setForm={f => setEditForm(f)}
                            onSubmit={async (e) => { e.preventDefault(); await handleEdit(trade._id); }}
                            loading={editLoading}
                            error=""
                            onCancel={() => setEditId(null)}
                            submitLabel="Update"
                            compact
                          />
                        </td>
                      </tr>
                    ) : (
                      <tr key={trade._id} className="hover:bg-gray-800/30 transition-colors group">
                        <td className="px-3 py-3 text-gray-400 font-mono text-xs">{trade.day}</td>
                        <td className="px-3 py-3">
                          <Badge label={trade.pair} colorClass={pairColor(trade.pair)} />
                        </td>
                        <td className="px-3 py-3 text-gray-300 whitespace-nowrap text-xs">
                          {trade.date ? new Date(trade.date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric'}) : '–'}
                        </td>
                        <td className="px-3 py-3">
                          <Badge label={trade.dayStatus} colorClass={dayStatusColor(trade.dayStatus)} />
                        </td>
                        <td className="px-3 py-3">
                          <Badge label={trade.killZone} colorClass={killZoneColor(trade.killZone)} />
                        </td>
                        <td className="px-3 py-3">
                          <Badge label={trade.analyzedInLap ? 'Yes' : 'No'} colorClass={yesNoColor(trade.analyzedInLap)} />
                        </td>
                        <td className="px-3 py-3">
                          <Badge label={trade.tradingType === 'Internal to External' ? 'Int→Ext' : trade.tradingType === 'External to Internal' ? 'Ext→Int' : trade.tradingType} colorClass={tradingTypeColor(trade.tradingType)} />
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">{trade.tradingTypeDetail || '–'}</td>
                        <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">{trade.entryFVG || '–'}</td>
                        <td className="px-3 py-3">
                          <Badge label={trade.entryExist ? 'Yes' : 'No'} colorClass={yesNoColor(trade.entryExist)} />
                        </td>
                        <td className="px-3 py-3">
                          <Badge label={trade.trade} colorClass={tradeColor(trade.trade)} />
                        </td>
                        <td className="px-3 py-3">
                          <Badge label={trade.followedRules ? 'Yes' : 'No'} colorClass={yesNoColor(trade.followedRules)} />
                        </td>
                        <td className="px-3 py-3">
                          <Badge label={trade.outcome} colorClass={outcomeColor(trade.outcome)} />
                        </td>
                        <td className="px-3 py-3">
                          <Badge label={trade.tradeStatus} colorClass={tradeStatusColor(trade.tradeStatus)} />
                        </td>
                        <td className="px-3 py-3 max-w-[100px] overflow-hidden">
                          {trade.tvLink ? (
                            <a href={trade.tvLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs truncate block">
                              View Chart
                            </a>
                          ) : <span className="text-gray-600">–</span>}
                        </td>
                        <td className={`px-3 py-3 font-mono text-xs font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade.pnl >= 0 ? '+' : ''}{trade.pnl?.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-white font-semibold">
                          ${trade.endBalance?.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 max-w-[120px] text-xs text-gray-400 group/comment relative">
                          <div className="truncate cursor-help">
                            {trade.postTradeComment || '–'}
                          </div>
                          {trade.postTradeComment && (
                            <div className="absolute hidden group-hover/comment:block z-50 bg-gray-800 text-gray-200 border border-gray-700 shadow-xl rounded-lg p-3 text-xs w-64 whitespace-normal top-full left-1/2 -translate-x-1/2 mt-1">
                              {trade.postTradeComment}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => startEdit(trade)}
                              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteId(trade._id)}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <ConfirmDialog
        isOpen={!!deleteId}
        message="Are you sure you want to delete this trade entry? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}

// ─── Trade Form Component ─────────────────────────────────────────────────────
function TradeFormUI({
  form, setForm, onSubmit, loading, error, onCancel, submitLabel, compact = false
}: {
  form: TradeForm;
  setForm: (f: TradeForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
  onCancel: () => void;
  submitLabel: string;
  compact?: boolean;
}) {
  const detailOptions = getDetailOptions(form.tradingType);
  const entryFVGOptions = getEntryFVGOptions(form.tradingType, form.tradingTypeDetail);
  const tradeStatus = computeTradeStatus(form.followedRules, form.outcome);

  const labelClass = 'block text-xs font-medium text-gray-400 mb-1';
  const inputClass = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';
  const selectClass = `${inputClass} cursor-pointer`;

  const set = (key: keyof TradeForm, value: unknown) => {
    setForm({ ...form, [key]: value } as TradeForm);
  };

  const gridClass = compact
    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3'
    : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4';

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      <div className={gridClass}>
        {/* 2. Pair */}
        <div>
          <label className={labelClass}>Pair *</label>
          <select value={form.pair} onChange={e => set('pair', e.target.value)} className={selectClass} required>
            <option value="">Select pair</option>
            {['EUR/USD','GBP/USD','GER40','XAU/USD'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* 3. Date */}
        <div>
          <label className={labelClass}>Date *</label>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            className={inputClass}
            required
          />
        </div>

        {/* 4. Day Status */}
        <div>
          <label className={labelClass}>Day Status *</label>
          <select value={form.dayStatus} onChange={e => set('dayStatus', e.target.value)} className={selectClass} required>
            <option value="">Select status</option>
            {['Trading Day','High Impact News','US Bank Holiday'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* 5. KillZone */}
        <div>
          <label className={labelClass}>KillZone *</label>
          <select value={form.killZone} onChange={e => set('killZone', e.target.value)} className={selectClass} required>
            <option value="">Select zone</option>
            {['London','New York','Gap'].map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>

        {/* 6. Analyzed in Lap */}
        <div>
          <label className={labelClass}>Analyze in Lap</label>
          <select value={form.analyzedInLap ? 'Yes' : 'No'} onChange={e => set('analyzedInLap', e.target.value === 'Yes')} className={selectClass}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        {/* 7. Trading Type */}
        <div>
          <label className={labelClass}>Trading Type *</label>
          <select
            value={form.tradingType}
            onChange={e => setForm({ ...form, tradingType: e.target.value, tradingTypeDetail: '', entryFVG: '' })}
            className={selectClass}
            required
          >
            <option value="">Select type</option>
            <option value="Internal to External">Internal to External</option>
            <option value="External to Internal">External to Internal</option>
          </select>
        </div>

        {/* 7a. Detail */}
        {form.tradingType && (
          <div>
            <label className={labelClass}>
              {form.tradingType === 'Internal to External' ? 'FVG Level' : 'Liq. Sweep'}
            </label>
            <select
              value={form.tradingTypeDetail}
              onChange={e => setForm({ ...form, tradingTypeDetail: e.target.value, entryFVG: '' })}
              className={selectClass}
            >
              <option value="">Select</option>
              {detailOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}

        {/* 7b. Entry FVG */}
        {form.tradingTypeDetail && entryFVGOptions.length > 0 && (
          <div>
            <label className={labelClass}>Entry FVG</label>
            <select value={form.entryFVG} onChange={e => set('entryFVG', e.target.value)} className={selectClass}>
              <option value="">Select</option>
              {entryFVGOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )}

        {/* 8. Entry Exist */}
        <div>
          <label className={labelClass}>Entry Exist</label>
          <select value={form.entryExist ? 'Yes' : 'No'} onChange={e => set('entryExist', e.target.value === 'Yes')} className={selectClass}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        {/* 9. Trade */}
        <div>
          <label className={labelClass}>Trade</label>
          <select value={form.trade} onChange={e => set('trade', e.target.value)} className={selectClass}>
            <option value="">Select</option>
            <option value="Took">Took</option>
            <option value="Missed">Missed</option>
          </select>
        </div>

        {/* 10. Followed Rules */}
        <div>
          <label className={labelClass}>Followed Rules</label>
          <select value={form.followedRules ? 'Yes' : 'No'} onChange={e => set('followedRules', e.target.value === 'Yes')} className={selectClass}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        {/* 11. Outcome */}
        <div>
          <label className={labelClass}>Outcome</label>
          <select value={form.outcome} onChange={e => set('outcome', e.target.value)} className={selectClass}>
            <option value="">Select</option>
            <option value="TP">TP</option>
            <option value="SL">SL</option>
          </select>
        </div>

        {/* 12. Trade Status - auto-filled */}
        <div>
          <label className={labelClass}>Trade Status (auto)</label>
          <div className={`px-3 py-2 rounded-lg border text-sm font-medium ${tradeStatusColor(tradeStatus)} min-h-[38px] flex items-center`}>
            {tradeStatus || <span className="text-gray-600 font-normal text-xs">Auto-filled</span>}
          </div>
        </div>

        {/* 14. PnL */}
        <div>
          <label className={labelClass}>PnL ($)</label>
          <input
            type="number"
            value={form.pnl === 0 && form.pnl.toString() === '0' ? 0 : form.pnl}
            onChange={e => set('pnl', e.target.value === '' ? '' : parseFloat(e.target.value))}
            step="0.01"
            placeholder="0.00"
            className={inputClass}
          />
        </div>
      </div>

      {/* 13. TV Link & 16. Post Trade Comment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>TV Link</label>
          <input
            type="url"
            value={form.tvLink}
            onChange={e => set('tvLink', e.target.value)}
            placeholder="https://www.tradingview.com/..."
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Post Trade Comment</label>
          <input
            type="text"
            value={form.postTradeComment}
            onChange={e => set('postTradeComment', e.target.value)}
            placeholder="Optional comment..."
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-xl transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 text-sm text-white font-medium bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
