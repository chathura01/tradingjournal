'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import Link from 'next/link';

interface TradingAccount {
  _id: string;
  name: string;
  broker: string;
  initialBalance: number;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', broker: '', initialBalance: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const fetchAccounts = async () => {
    setLoading(true);
    const res = await fetch('/api/accounts');
    const data = await res.json();
    setAccounts(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    if (session) fetchAccounts();
  }, [session]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name || !form.initialBalance) {
      setFormError('Account name and initial balance are required.');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        broker: form.broker,
        initialBalance: parseFloat(form.initialBalance),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowModal(false);
      setForm({ name: '', broker: '', initialBalance: '' });
      fetchAccounts();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/accounts/${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    fetchAccounts();
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Trading Accounts</h2>
            <p className="text-gray-400 mt-1">Select an account to open its journal</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 transition shadow-lg shadow-emerald-500/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Account
          </button>
        </div>

        {/* Accounts Grid */}
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No accounts yet</h3>
            <p className="text-gray-400 mb-6">Create your first trading account to start journaling</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 transition"
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {accounts.map(account => (
              <div
                key={account._id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all group"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <button
                    onClick={() => setDeleteId(account._id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <h3 className="font-semibold text-white text-lg">{account.name}</h3>
                {account.broker && <p className="text-sm text-gray-400 mt-0.5">{account.broker}</p>}

                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Initial Balance</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    ${account.initialBalance.toLocaleString()}
                  </p>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/journal/${account._id}`}
                    className="flex-1 text-center py-2 text-sm font-medium bg-gray-800 hover:bg-emerald-500 text-gray-300 hover:text-white rounded-lg transition"
                  >
                    Open Journal
                  </Link>
                  <Link
                    href={`/analytics/${account._id}`}
                    className="flex-1 text-center py-2 text-sm font-medium bg-gray-800 hover:bg-purple-600 text-gray-300 hover:text-white rounded-lg transition"
                  >
                    Analytics
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Account Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setFormError(''); }} title="Create Trading Account">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Account Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. FTMO Challenge"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Broker</label>
            <input
              type="text"
              value={form.broker}
              onChange={e => setForm(f => ({ ...f, broker: e.target.value }))}
              placeholder="e.g. FTMO, IC Markets"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Initial Balance ($) *</label>
            <input
              type="number"
              value={form.initialBalance}
              onChange={e => setForm(f => ({ ...f, initialBalance: e.target.value }))}
              placeholder="10000"
              min="0"
              step="0.01"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowModal(false); setFormError(''); }}
              className="flex-1 py-2.5 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 text-sm text-white font-medium bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        message="Are you sure you want to delete this account? All associated trades will also be removed."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        requireMatch={accounts.find(a => a._id === deleteId)?.name}
      />
    </>
  );
}
