import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Trade from '@/models/Trade';
import TradingAccount from '@/models/TradingAccount';

function computeTradeStatus(followedRules: boolean, outcome: string): string {
  if (followedRules && outcome === 'TP') return 'Good Win';
  if (followedRules && outcome === 'SL') return 'Good Loss';
  if (!followedRules && outcome === 'TP') return 'Bad Win';
  if (!followedRules && outcome === 'SL') return 'Bad Loss';
  return '';
}

async function recalcEndBalances(accountId: string) {
  await connectDB();
  const account = await TradingAccount.findById(accountId);
  if (!account) return;
  const trades = await Trade.find({ accountId }).sort({ day: 1 });
  let balance = account.initialBalance as number;
  for (const trade of trades) {
    balance += trade.pnl || 0;
    trade.endBalance = balance;
    await trade.save();
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  await connectDB();
  const trade = await Trade.findOne({ _id: id, userId: (session.user as { id: string }).id });
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(trade);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  // Auto-fill tradeStatus
  body.tradeStatus = computeTradeStatus(body.followedRules, body.outcome);

  await connectDB();
  const trade = await Trade.findOneAndUpdate(
    { _id: id, userId: (session.user as { id: string }).id },
    body,
    { new: true }
  );
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Recalculate all end balances in case PnL changed
  await recalcEndBalances(trade.accountId.toString());

  const updated = await Trade.findById(id);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  await connectDB();
  const trade = await Trade.findOneAndDelete({
    _id: id,
    userId: (session.user as { id: string }).id,
  });
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Recalculate all end balances after deletion
  await recalcEndBalances(trade.accountId.toString());

  return NextResponse.json({ message: 'Deleted' });
}
