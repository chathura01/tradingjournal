import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import TradingAccount from '@/models/TradingAccount';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const accounts = await TradingAccount.find({
    userId: (session.user as { id: string }).id,
  }).sort({ createdAt: -1 });

  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, broker, initialBalance } = await req.json();
  if (!name || initialBalance === undefined) {
    return NextResponse.json({ error: 'Name and initial balance are required' }, { status: 400 });
  }

  await connectDB();
  const account = await TradingAccount.create({
    userId: (session.user as { id: string }).id,
    name,
    broker: broker || '',
    initialBalance: Number(initialBalance),
  });

  return NextResponse.json(account, { status: 201 });
}
