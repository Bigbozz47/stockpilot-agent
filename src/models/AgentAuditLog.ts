import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAgentAuditLog extends Document {
  triggerSku: string;
  initialStock: number;
  timestamp: Date;
  reasoningTrace: string[];
  selectedSupplierCode: string;
  proposalPoNumber: string;
  status: string;
}

const AgentAuditLogSchema = new Schema<IAgentAuditLog>(
  {
    triggerSku: { type: String, required: true, index: true, trim: true },
    initialStock: { type: Number, required: true, min: 0 },
    timestamp: { type: Date, default: Date.now },
    reasoningTrace: { type: [String], default: [] },
    selectedSupplierCode: { type: String, trim: true, uppercase: true, default: '' },
    proposalPoNumber: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: 'PROPOSED' },
  },
  { timestamps: false },
);

export const AgentAuditLog: Model<IAgentAuditLog> =
  mongoose.models.AgentAuditLog ||
  mongoose.model<IAgentAuditLog>('AgentAuditLog', AgentAuditLogSchema);