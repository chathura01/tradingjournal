'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface Trade {
  _id: string;
  day: number;
  pair: string;
  outcome: string;
  tradeStatus: string;
  pnl: number;
  endBalance: number;
  followedRules: boolean;
  trade: string;
  killZone: string;
  dayStatus: string;
}

const PIE_COLORS: Record<string, string> = {
  'Good Win': '#10b981',
  'Good Loss': '#0ea5e9',
  'Bad Win': '#f59e0b',
  'Bad Loss': '#f43f5e',
  'TP': '#10b981',
  'SL': '#f43f5e',
  'Took': '#10b981',
  'Missed': '#64748b',
};

function StatCard({ label, value, sub, color = 'text-white' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const accountId = params.accountId as string;

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState('');
  const [initialBalance, setInitialBalance] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const fetchData = useCallback(async () => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculations
  const completedTrades = trades.filter(t => t.outcome === 'TP' || t.outcome === 'SL');
  const wins = completedTrades.filter(t => t.outcome === 'TP').length;
  const losses = completedTrades.filter(t => t.outcome === 'SL').length;
  const winRate = completedTrades.length > 0 ? ((wins / completedTrades.length) * 100).toFixed(1) : '0.0';

  const tookTrades = trades.filter(t => t.trade === 'Took').length;
  const missedTrades = trades.filter(t => t.trade === 'Missed').length;

  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const currentBalance = trades.length > 0 ? trades[trades.length - 1].endBalance : initialBalance;

  const goodWins = trades.filter(t => t.tradeStatus === 'Good Win').length;
  const goodLoss = trades.filter(t => t.tradeStatus === 'Good Loss').length;
  const badWins = trades.filter(t => t.tradeStatus === 'Bad Win').length;
  const badLoss = trades.filter(t => t.tradeStatus === 'Bad Loss').length;

  // Balance curve data
  const balanceCurve = [
    { day: 0, balance: initialBalance },
    ...trades.map(t => ({ day: t.day, balance: t.endBalance, pnl: t.pnl })),
  ];

  // Trade status breakdown pie
  const statusData = [
    { name: 'Good Win', value: goodWins },
    { name: 'Good Loss', value: goodLoss },
    { name: 'Bad Win', value: badWins },
    { name: 'Bad Loss', value: badLoss },
  ].filter(d => d.value > 0);

  // Outcome pie
  const outcomeData = [
    { name: 'TP', value: wins },
    { name: 'SL', value: losses },
  ].filter(d => d.value > 0);

  // Took vs Missed
  const takenData = [
    { name: 'Took', value: tookTrades },
    { name: 'Missed', value: missedTrades },
  ].filter(d => d.value > 0);

  // PnL per day bar
  const pnlData = trades.map(t => ({ day: t.day, pnl: t.pnl || 0, pair: t.pair }));

  // Pair breakdown
  const pairBreakdown: Record<string, { wins: number; losses: number }> = {};
  completedTrades.forEach(t => {
    if (!pairBreakdown[t.pair]) pairBreakdown[t.pair] = { wins: 0, losses: 0 };
    if (t.outcome === 'TP') pairBreakdown[t.pair].wins++;
    else pairBreakdown[t.pair].losses++;
  });
  const pairData = Object.entries(pairBreakdown).map(([pair, data]) => ({
    pair, wins: data.wins, losses: data.losses
  }));

  const tooltipStyle = {
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: '#f9fafb',
    fontSize: '12px',
  };

  return (
    <>
      <Navbar />
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/journal/${accountId}`} className="text-gray-400 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-white">{accountName} - Analytics</h2>
            <p className="text-sm text-gray-400">{trades.length} total trade entries</p>
          </div>
        </div>

        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-400">No trade data yet. Add trades in your journal first.</p>
            <Link href={`/journal/${accountId}`} className="mt-4 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm transition">
              Go to Journal
            </Link>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <StatCard label="Win Rate" value={`${winRate}%`} sub={`${wins}W / ${losses}L`} color={parseFloat(winRate) >= 50 ? 'text-emerald-400' : 'text-red-400'} />
              <StatCard label="Total PnL" value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`} sub="from all trades" color={totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              <StatCard label="Current Balance" value={`$${currentBalance.toFixed(2)}`} color="text-white" />
              <StatCard label="Good Trades" value={goodWins + goodLoss} sub={`${goodWins} wins, ${goodLoss} losses`} color="text-emerald-400" />
              <StatCard label="Bad Trades" value={badWins + badLoss} sub={`${badWins} wins, ${badLoss} losses`} color="text-rose-400" />
            </div>

            {/* Balance Curve */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
              <h3 className="text-md font-semibold text-white mb-4">Balance Curve</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={balanceCurve} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 12, fill: '#6b7280' }} label={{ value: 'Day', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={v => `$${v.toLocaleString()}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Balance'] as any} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: '#10b981', r: 3 }}
                    activeDot={{ r: 5, fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* PnL per Day */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
              <h3 className="text-md font-semibold text-white mb-4">PnL per Day</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pnlData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff' }}
                    cursor={{ fill: 'transparent' }}
                    formatter={(v: any) => [`${Number(v) >= 0 ? '+' : ''}$${Number(v).toFixed(2)}`, 'PnL'] as any}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {pnlData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Outcome */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Outcome (TP vs SL)</h3>
                {outcomeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {outcomeData.map((entry, i) => (
                          <Cell key={i} fill={PIE_COLORS[entry.name] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-500 text-xs text-center py-8">No data</p>}
              </div>

              {/* Trade Status */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Trade Quality</h3>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {statusData.map((entry, i) => (
                          <Cell key={i} fill={PIE_COLORS[entry.name] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-500 text-xs text-center py-8">No data</p>}
              </div>

              {/* Took vs Missed */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Took vs Missed</h3>
                {takenData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={takenData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {takenData.map((entry, i) => (
                          <Cell key={i} fill={PIE_COLORS[entry.name] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-500 text-xs text-center py-8">No data</p>}
              </div>
            </div>

            {/* Pair Performance */}
            {pairData.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-md font-semibold text-white mb-4">Pair Performance</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={pairData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="pair" stroke="#6b7280" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'transparent' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                    <Bar dataKey="wins" fill="#10b981" radius={[4, 4, 0, 0]} name="Wins" />
                    <Bar dataKey="losses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Losses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
