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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

  await connectDB();
  const trades = await Trade.find({
    accountId,
    userId: (session.user as { id: string }).id,
  }).sort({ day: 1 });

  return NextResponse.json(trades);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  await connectDB();

  // Verify account belongs to user
  const account = await TradingAccount.findOne({ _id: body.accountId, userId });
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  // Auto-increment day
  const lastTrade = await Trade.findOne({ accountId: body.accountId }).sort({ day: -1 });
  const day = lastTrade ? lastTrade.day + 1 : 1;

  // Auto-fill tradeStatus
  const tradeStatus = computeTradeStatus(body.followedRules, body.outcome);

  // Auto-calculate endBalance
  const previousTrades = await Trade.find({ accountId: body.accountId }).sort({ day: 1 });
  const previousBalance =
    previousTrades.length > 0
      ? previousTrades[previousTrades.length - 1].endBalance
      : account.initialBalance;
  const endBalance = previousBalance + Number(body.pnl || 0);

  const trade = await Trade.create({
    ...body,
    userId,
    day,
    tradeStatus,
    endBalance,
  });

  return NextResponse.json(trade, { status: 201 });
}
