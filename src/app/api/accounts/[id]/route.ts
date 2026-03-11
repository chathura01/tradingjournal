import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import TradingAccount from '@/models/TradingAccount';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  await connectDB();
  const account = await TradingAccount.findOne({
    _id: id,
    userId: (session.user as { id: string }).id,
  });
  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(account);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  await connectDB();
  const account = await TradingAccount.findOneAndUpdate(
    { _id: id, userId: (session.user as { id: string }).id },
    body,
    { new: true }
  );
  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(account);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  await connectDB();
  await TradingAccount.findOneAndDelete({
    _id: id,
    userId: (session.user as { id: string }).id,
  });

  return NextResponse.json({ message: 'Deleted' });
}
