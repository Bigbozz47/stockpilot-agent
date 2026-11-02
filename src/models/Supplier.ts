import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  code: string;
  contactPhone: string;
  leadTimeHours: number;
  minOrderQty: number;
  priceMultiplier: number;
  reliabilityScore: number;
  supportedSkus: string[];
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    contactPhone: { type: String, required: true, trim: true },
    leadTimeHours: { type: Number, required: true, min: 1 },
    minOrderQty: { type: Number, required: true, min: 1 },
    priceMultiplier: { type: Number, required: true, min: 0 },
    reliabilityScore: { type: Number, required: true, min: 0, max: 100 },
    supportedSkus: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const Supplier: Model<ISupplier> =
  mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);