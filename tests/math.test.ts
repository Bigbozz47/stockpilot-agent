import { describe, expect, it } from 'vitest';
import { calculateDeficit, calculateOrderQuantity, calculateTotalCost, calculateSplitOrderFailover } from '../src/lib/math';

describe('calculateDeficit', () => {
  it('returns 0 when stock equals safety stock with no burn', () => {
    expect(calculateDeficit(20, 20, 0, 0)).toBe(0);
  });
  it('returns 0 when stock exceeds safety stock (surplus never negative)', () => {
    expect(calculateDeficit(30, 20, 5, 2)).toBe(0);
  });
  it('returns full safety stock when stock is zero', () => {
    expect(calculateDeficit(0, 20, 0, 0)).toBe(20);
  });
  it('adds lead-time burn and ceils fractional demand', () => {
    expect(calculateDeficit(8, 20, 4, 0.25)).toBe(13); // ceil(12 + 1)
  });
  it('matches the demo-scenario coffee figures', () => {
    expect(calculateDeficit(6, 20, 4, 0.25)).toBe(15); // SUP-B 6h express
    expect(calculateDeficit(6, 20, 4, 2)).toBe(22); // SUP-A 48h bulk
  });
  it('matches the demo-scenario milk figures', () => {
    expect(calculateDeficit(25, 30, 9, 2)).toBe(23); // SUP-A 48h bulk
  });
  it('handles zero demand with zero gap', () => {
    expect(calculateDeficit(0, 0, 0, 0)).toBe(0);
  });
});

describe('calculateOrderQuantity', () => {
  it('returns MOQ when deficit is zero', () => {
    expect(calculateOrderQuantity(0, 50)).toBe(50);
  });
  it('returns MOQ for negative deficit (never negative)', () => {
    expect(calculateOrderQuantity(-5, 50)).toBe(50);
  });
  it('returns deficit when above MOQ', () => {
    expect(calculateOrderQuantity(13, 10)).toBe(13);
  });
  it('returns exact MOQ at the boundary', () => {
    expect(calculateOrderQuantity(10, 10)).toBe(10);
  });
  it('rounds up to pack size', () => {
    expect(calculateOrderQuantity(13, 10, 6)).toBe(18);
  });
  it('matches demo-scenario MOQ clamping', () => {
    expect(calculateOrderQuantity(23, 50)).toBe(50); // milk → SUP-A MOQ
    expect(calculateOrderQuantity(15, 10)).toBe(15); // coffee → SUP-B
  });
});

describe('calculateTotalCost', () => {
  it('rounds to two-decimal precision', () => {
    expect(calculateTotalCost(3, 19.99, 5)).toBe(64.97);
  });
  it('handles zero shipping fee', () => {
    expect(calculateTotalCost(10, 22000)).toBe(220000);
  });
  it('is float-safe on fractional unit prices', () => {
    expect(calculateTotalCost(3, 0.1)).toBe(0.3);
    expect(calculateTotalCost(7, 0.07)).toBe(0.49);
  });
  it('matches demo-scenario totals', () => {
    expect(calculateTotalCost(15, 152250)).toBe(2283750); // coffee express
    expect(calculateTotalCost(50, 22000)).toBe(1100000); // milk bulk
  });
});

describe('calculateSplitOrderFailover', () => {
  it('recovers a 5kg shortfall via backup emergency lot', () => {
    const r = calculateSplitOrderFailover({
      primaryOrderedQty: 30,
      primaryDeliveredQty: 25,
      primaryUnitPrice: 152250,
      backupUnitPrice: 147900,
      backupMinOrderQty: 25,
    });
    expect(r.failoverRequired).toBe(true);
    expect(r.unfulfilledDeficit).toBe(5);
    expect(r.effectiveMinLot).toBe(10);
    expect(r.failoverOrderQty).toBe(10);
    expect(r.failoverTotalCost).toBe(1479000);
    expect(r.primaryEscrowRefunded).toBe(761250);
    expect(r.netAdditionalOutOfPocket).toBe(717750);
    expect(r.protectedRevenueValue).toBe(400);
  });

  it('no-ops when delivery is complete', () => {
    const r = calculateSplitOrderFailover({
      primaryOrderedQty: 30,
      primaryDeliveredQty: 30,
      primaryUnitPrice: 152250,
      backupUnitPrice: 147900,
      backupMinOrderQty: 25,
    });
    expect(r).toMatchObject({ failoverRequired: false, failoverOrderQty: 0, failoverTotalCost: 0, primaryEscrowRefunded: 0 });
  });

  it('clamps negative and over-delivery inputs safely', () => {
    const neg = calculateSplitOrderFailover({
      primaryOrderedQty: 30,
      primaryDeliveredQty: -5,
      primaryUnitPrice: 152250,
      backupUnitPrice: 147900,
      backupMinOrderQty: 25,
    });
    expect(neg.unfulfilledDeficit).toBe(30);
    const over = calculateSplitOrderFailover({
      primaryOrderedQty: 30,
      primaryDeliveredQty: 35,
      primaryUnitPrice: 152250,
      backupUnitPrice: 147900,
      backupMinOrderQty: 25,
    });
    expect(over.failoverRequired).toBe(false);
  });
});
