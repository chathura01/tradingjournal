import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITradingAccount extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  broker: string;
  initialBalance: number;
  createdAt: Date;
}

const TradingAccountSchema = new Schema<ITradingAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    broker: { type: String, trim: true, default: '' },
    initialBalance: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

const TradingAccount: Model<ITradingAccount> =
  mongoose.models.TradingAccount ||
  mongoose.model<ITradingAccount>('TradingAccount', TradingAccountSchema);

export default TradingAccount;
