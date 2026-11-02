import mongoose, { Document, Model, Schema, Types } from 'mongoose';

/** Canonical lifecycle for the closed-loop procurement demo. */
export type POStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'SETTLED'
  | 'PARTIAL_SETTLED'
  | 'REJECTED';

export interface IPOItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/** Deterministic escrow ledger persisted at settlement — server-computed, never client-supplied. */
export interface IEscrowBreakdown {
  orderedQty: number;
  billableQty: number;
  shortfallQty: number;
  originalLockedEscrow: number;
  supplierPayout: number;
  buyerRefundSaved: number;
  slaPenaltyAmount: number;
  slaBreached: boolean;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  supplierId: Types.ObjectId;
  items: IPOItem[];
  totalAmount: number;
  status: POStatus;
  agentReasoningSummary: string;
  approvedAt?: Date;
  receivedQuantity?: number;
  settledAmount?: number;
  settledAt?: Date;
  deliveryNotes?: string;
  deliveryProofBoxesDetected?: number;
  parentPoNumber?: string;
  failoverChildPoNumber?: string;
  isFailoverOrder?: boolean;
  supplierAckStatus?: 'PENDING_ACK' | 'ACK_FULL_CAPACITY' | 'ACK_PARTIAL_CAPACITY';
  escrowBreakdown?: IEscrowBreakdown;
  createdAt: Date;
}

const POItemSchema = new Schema<IPOItem>(
  {
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const EscrowBreakdownSchema = new Schema<IEscrowBreakdown>(
  {
    orderedQty: { type: Number, required: true, min: 0 },
    billableQty: { type: Number, required: true, min: 0 },
    shortfallQty: { type: Number, required: true, min: 0 },
    originalLockedEscrow: { type: Number, required: true, min: 0 },
    supplierPayout: { type: Number, required: true, min: 0 },
    buyerRefundSaved: { type: Number, required: true, min: 0 },
    slaPenaltyAmount: { type: Number, required: true, min: 0 },
    slaBreached: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: { type: String, required: true, unique: true, index: true, trim: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: { type: [POItemSchema], required: true, validate: (v: IPOItem[]) => v.length > 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['DRAFT', 'APPROVED', 'DISPATCHED', 'DELIVERED', 'SETTLED', 'PARTIAL_SETTLED', 'REJECTED'],
      default: 'DRAFT',
    },
    agentReasoningSummary: { type: String, trim: true, default: '' },
    approvedAt: { type: Date },
    receivedQuantity: { type: Number, min: 0 },
    settledAmount: { type: Number, min: 0 },
    settledAt: { type: Date },
    deliveryNotes: { type: String, trim: true, maxlength: 1000 },
    deliveryProofBoxesDetected: { type: Number, min: 0 },
    parentPoNumber: { type: String, trim: true, index: true },
    failoverChildPoNumber: { type: String, trim: true },
    isFailoverOrder: { type: Boolean, default: false },
    supplierAckStatus: {
      type: String,
      enum: ['PENDING_ACK', 'ACK_FULL_CAPACITY', 'ACK_PARTIAL_CAPACITY'],
    },
    escrowBreakdown: { type: EscrowBreakdownSchema, required: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// totalAmount must equal sum of item subtotals (cent tolerance)
PurchaseOrderSchema.pre('validate', function (next) {
  const sum = this.items.reduce((acc, i) => acc + i.subtotal, 0);
  if (Math.abs(sum - this.totalAmount) > 0.01) {
    next(new Error(`totalAmount ${this.totalAmount} != sum of subtotals ${sum.toFixed(2)}`));
  } else {
    next();
  }
});

export const PurchaseOrder: Model<IPurchaseOrder> =
  mongoose.models.PurchaseOrder ||
  mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);