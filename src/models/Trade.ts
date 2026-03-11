import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITrade extends Document {
  accountId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  day: number;
  pair: string;
  date: Date;
  dayStatus: string;
  killZone: string;
  analyzedInLap: boolean;
  tradingType: string;           // 'Internal to External' | 'External to Internal'
  tradingTypeDetail: string;     // '4H FVG' | '1H FVG' | '4H Liquidity Sweep' | '1H Liquidity Sweep'
  entryFVG: string;              // conditional sub-option
  entryExist: boolean;
  trade: string;                 // 'Took' | 'Missed'
  followedRules: boolean;
  outcome: string;               // 'TP' | 'SL'
  tradeStatus: string;           // 'Good Win' | 'Good Loss' | 'Bad Win' | 'Bad Loss' - auto-filled
  tvLink: string;
  pnl: number;
  endBalance: number;            // auto-calculated
  postTradeComment: string;
  createdAt: Date;
}

const TradeSchema = new Schema<ITrade>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'TradingAccount', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    day: { type: Number, required: true },
    pair: { type: String, required: true },
    date: { type: Date, required: true },
    dayStatus: { type: String, required: true },
    killZone: { type: String, required: true },
    analyzedInLap: { type: Boolean, default: false },
    tradingType: { type: String, required: true },
    tradingTypeDetail: { type: String, default: '' },
    entryFVG: { type: String, default: '' },
    entryExist: { type: Boolean, default: false },
    trade: { type: String, default: '' },
    followedRules: { type: Boolean, default: false },
    outcome: { type: String, default: '' },
    tradeStatus: { type: String, default: '' },
    tvLink: { type: String, default: '' },
    pnl: { type: Number, default: 0 },
    endBalance: { type: Number, default: 0 },
    postTradeComment: { type: String, default: '' },
  },
  { timestamps: true }
);

const Trade: Model<ITrade> =
  mongoose.models.Trade || mongoose.model<ITrade>('Trade', TradeSchema);
export default Trade;
