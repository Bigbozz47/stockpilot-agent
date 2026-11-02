import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IProduct extends Document {
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  unitCost: number;
  avgDailyDemand: number;
  unit: string;
}

const ProductSchema = new Schema<IProduct>(
  {
    sku: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    currentStock: { type: Number, required: true, min: 0, default: 0 },
    safetyStock: { type: Number, required: true, min: 0 },
    reorderPoint: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    avgDailyDemand: { type: Number, min: 0, default: 0 },
    unit: { type: String, trim: true, default: 'pcs' },
  },
  { timestamps: true },
);

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);