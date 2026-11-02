/**
 * Deterministic inventory math — pure functions, no I/O, no LLM calls.
 * All formulas use ceiling + cent-rounding to avoid float drift.
 */

/** Stock shortfall incl. demand burn during supplier lead time. Never negative. */
export function calculateDeficit(
  currentStock: number,
  safetyStock: number,
  dailyVelocity: number,
  leadTimeDays: number,
): number {
  const gap = safetyStock - currentStock + dailyVelocity * leadTimeDays;
  return Math.max(0, Math.ceil(gap));
}

/** Order qty snapped up to packSize, floored at supplier MOQ. Never negative. */
export function calculateOrderQuantity(
  deficit: number,
  minOrderQty: number,
  packSize = 1,
): number {
  if (deficit <= 0) return minOrderQty > 0 ? minOrderQty : 0;
  const size = packSize > 0 ? packSize : 1;
  return Math.max(minOrderQty, Math.ceil(deficit / size) * size);
}

/** Line total in currency units, rounded to cents. */
export function calculateTotalCost(
  quantity: number,
  unitCost: number,
  shippingFee = 0,
): number {
  return Math.round((quantity * unitCost + shippingFee) * 100) / 100;
}

/** Result of the deterministic 3-way match escrow computation. */
export interface EscrowSettlementResult {
  orderedQty: number;
  billableQty: number;
  shortfallQty: number;
  originalLockedEscrow: number;
  supplierPayout: number;
  buyerRefundSaved: number;
  slaPenaltyAmount: number;
  slaBreached: boolean;
  settlementStatus: 'FULL_SETTLEMENT' | 'PARTIAL_SETTLEMENT' | 'ZERO_DELIVERY_REFUND';
}

export interface EscrowSettlementParams {
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  shippingFee?: number;
  slaBreached?: boolean;
  slaPenaltyRate?: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Deterministic 3-way match escrow settlement. Pure sync, zero I/O, zero LLM.
 * Buyer pays only for verified receipt; supplier is guaranteed payout per delivered unit.
 */
export function calculateEscrowSettlement(params: EscrowSettlementParams): EscrowSettlementResult {
  const orderedQty = Math.max(0, Math.floor(params.orderedQty));
  const receivedQty = Math.max(0, Math.floor(params.receivedQty));
  const unitPrice = Math.max(0, params.unitPrice);
  const slaBreached = params.slaBreached === true;
  const slaPenaltyRate = params.slaPenaltyRate ?? 0.05;

  const billableQty = Math.min(orderedQty, receivedQty);
  const shortfallQty = orderedQty - billableQty;
  const verifiedMerchandiseSubtotal = round2(billableQty * unitPrice);
  const originalLockedEscrow = round2(orderedQty * unitPrice + (params.shippingFee ?? 0));

  const slaPenaltyAmount = slaBreached ? round2(verifiedMerchandiseSubtotal * slaPenaltyRate) : 0;
  const effectiveShippingFee = slaBreached ? 0 : round2(params.shippingFee ?? 0);
  const supplierPayout = Math.max(0, round2(verifiedMerchandiseSubtotal - slaPenaltyAmount + effectiveShippingFee));
  const buyerRefundSaved = Math.max(0, round2(originalLockedEscrow - supplierPayout));

  const settlementStatus =
    billableQty === 0
      ? 'ZERO_DELIVERY_REFUND'
      : shortfallQty === 0 && !slaBreached
        ? 'FULL_SETTLEMENT'
        : 'PARTIAL_SETTLEMENT';

  return {
    orderedQty,
    billableQty,
    shortfallQty,
    originalLockedEscrow,
    supplierPayout,
    buyerRefundSaved,
    slaPenaltyAmount,
    slaBreached,
    settlementStatus,
  };
}

// ponytail: inline asserts only; add vitest suite when math.ts grows beyond 3 fns.
if (process.env.RUN_MATH_ASSERTS === 'true') {
  const eq = (got: number, want: number, label: string) => {
    if (got !== want) throw new Error(`[math] ${label}: got ${got}, want ${want}`);
  };
  eq(calculateDeficit(30, 20, 5, 2), 0, 'surplus-no-deficit');
  eq(calculateDeficit(0, 0, 0, 0), 0, 'zero-zero');
  eq(calculateDeficit(8, 20, 4, 0.25), 13, 'fractional-lead');
  eq(calculateOrderQuantity(0, 50), 50, 'zero-deficit-returns-moq');
  eq(calculateOrderQuantity(13, 10), 13, 'exact-above-moq');
  eq(calculateOrderQuantity(10, 10), 10, 'exact-moq');
  eq(calculateOrderQuantity(13, 10, 6), 18, 'pack-round-up');
  eq(calculateTotalCost(18, 145000 * 1.05), 2740500, 'express-coffee');
  eq(calculateTotalCost(3, 19.99, 5), 64.97, 'cent-rounding');
}

/** Result of the deterministic split-order failover computation. Pure sync, zero I/O, zero LLM. */
export interface SplitOrderFailoverResult {
  unfulfilledDeficit: number;
  failoverRequired: boolean;
  failoverOrderQty: number;
  failoverTotalCost: number;
  primaryEscrowRefunded: number;
  netAdditionalOutOfPocket: number;
  protectedRevenueValue: number;
  effectiveMinLot: number;
}

export interface SplitOrderFailoverParams {
  primaryOrderedQty: number;
  primaryDeliveredQty: number;
  primaryUnitPrice: number;
  backupUnitPrice: number;
  backupMinOrderQty: number;
  backupEmergencyLotSize?: number;
  estimatedRevenueAtRiskPerUnit?: number;
}

/**
 * Bilateral split-order failover. When the primary supplier short-ships,
 * compute the exact recovery order for the backup vendor: pro-rata primary
 * refund is re-allocated, emergency micro-lots keep coverage at 100%.
 */
export function calculateSplitOrderFailover(params: SplitOrderFailoverParams): SplitOrderFailoverResult {
  const ordered = Math.max(0, Math.floor(params.primaryOrderedQty));
  const delivered = Math.max(0, Math.floor(params.primaryDeliveredQty));
  const primaryUnitPrice = Math.max(0, params.primaryUnitPrice);
  const backupUnitPrice = Math.max(0, params.backupUnitPrice);
  const unfulfilledDeficit = Math.max(0, ordered - delivered);

  if (unfulfilledDeficit === 0) {
    return {
      unfulfilledDeficit: 0,
      failoverRequired: false,
      failoverOrderQty: 0,
      failoverTotalCost: 0,
      primaryEscrowRefunded: 0,
      netAdditionalOutOfPocket: 0,
      protectedRevenueValue: 0,
      effectiveMinLot: 0,
    };
  }

  const effectiveMinLot = Math.max(
    1,
    Math.floor(params.backupEmergencyLotSize ?? Math.min(Math.max(1, params.backupMinOrderQty), 10)),
  );
  const failoverOrderQty = Math.max(effectiveMinLot, Math.ceil(unfulfilledDeficit));
  const failoverTotalCost = round2(failoverOrderQty * backupUnitPrice);
  const primaryEscrowRefunded = round2(unfulfilledDeficit * primaryUnitPrice);
  const netAdditionalOutOfPocket = Math.max(0, round2(failoverTotalCost - primaryEscrowRefunded));
  const protectedRevenueValue = round2(unfulfilledDeficit * (params.estimatedRevenueAtRiskPerUnit ?? 80));

  return {
    unfulfilledDeficit,
    failoverRequired: true,
    failoverOrderQty,
    failoverTotalCost,
    primaryEscrowRefunded,
    netAdditionalOutOfPocket,
    protectedRevenueValue,
    effectiveMinLot,
  };
}
