/**
 * Centralized shared types — single source of truth for cross-cutting
 * contracts (AGENTS.md: centralized type definitions in src/types).
 */
import type { EscrowSettlementResult, SplitOrderFailoverResult } from '@/lib/math';
import type { POStatus } from '@/models/PurchaseOrder';

export type { POStatus };
export type { EscrowSettlementResult, SplitOrderFailoverResult };

/** Bilateral counterparty acknowledgement for the failover handshake. */
export type SupplierAckStatus = 'PENDING_ACK' | 'ACK_FULL_CAPACITY' | 'ACK_PARTIAL_CAPACITY';

/** Failover child-PO linkage persisted on the parent PO. */
export interface FailoverLink {
  childPoNumber: string;
  backupSupplierCode: string;
  failoverOrderQty: number;
  failoverTotalCost: number;
  primaryEscrowRefunded: number;
  netAdditionalOutOfPocket: number;
  protectedRevenueValue: number;
}

/** 4-step lifecycle stepper stages rendered in ActionCard. */
export type LifecycleStage = 'proposed' | 'approved' | 'delivered' | 'settled';
export const PO_STATUS_TO_STAGE: Record<POStatus, LifecycleStage> = {
  DRAFT: 'proposed',
  APPROVED: 'approved',
  DISPATCHED: 'approved',
  DELIVERED: 'delivered',
  PARTIAL_SETTLED: 'settled',
  SETTLED: 'settled',
  REJECTED: 'proposed',
};

/** SAM 3.1 vision verification. */
export interface VisionBox {
  id: string;
  label: string;
  bbox: [number, number, number, number];
  confidence: number;
  status: 'VERIFIED' | 'MISSING';
}

export interface VisionVerificationResult {
  sku: string;
  model: 'sam-3.1';
  prompt: string;
  expectedBoxes: number;
  detectedBoxes: number;
  missingBoxes: number;
  verifiedKg: number;
  packSizeKg: number;
  boxes: VisionBox[];
  avgConfidence: number;
  latencyMs: number;
  fallbackActive: boolean;
}

/** Muse Voice Transcribe. */
export type VoicePresetId = 'URGENT_RESTOCK_VOICE' | 'PARTIAL_POD_VOICE';

export interface VoiceExtractedIntent {
  action: 'TRIGGER_DEPLETION_AND_AGENT' | 'VERIFY_PARTIAL_DELIVERY';
  sku: string;
  reportedStock?: number;
  receivedQuantity?: number;
  urgency?: 'HIGH' | 'NORMAL';
  slaBreached?: boolean;
}

export interface VoiceTranscriptionResult {
  presetId: VoicePresetId;
  transcript: string;
  language: 'id-en';
  speakerLabel: string;
  turnTiming: string;
  biasedKeywordsMatched: string[];
  modelUsed: 'muse-voice-transcribe-1.0';
  estimatedCostUsd: number;
  latencyMs: number;
  fallbackActive: boolean;
  extractedIntent: VoiceExtractedIntent;
}
