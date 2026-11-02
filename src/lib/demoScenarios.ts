/**
 * Demo presets — fully deterministic, repeatable stage directions for the 2-minute pitch.
 * All expected figures are hand-derived from src/lib/math.ts against the seeded catalog:
 *   deficit = ceil((safety - stock) + burn * leadDays); qty = max(deficit, MOQ); total = qty * unitPrice.
 */
export interface DemoExpectation {
  supplierCode: string;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  rationale: string;
}

export interface DemoScenario {
  id: 'friday-coffee-rush' | 'bulk-milk-restock';
  pillLabel: string;
  title: string;
  description: string;
  sku: string;
  productName: string;
  /** Stock level staged via upsert before the agent stream opens. */
  presetStock: number;
  simulatedDay: 'Friday' | 'Monday';
  expect: DemoExpectation;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'friday-coffee-rush',
    pillLabel: 'Friday Coffee Rush',
    title: 'Scenario 1 — Friday Peak Rush · Arabica Coffee Beans',
    description: 'Friday rush: 6 bags on hand vs safety 20, burn 4/day. SUP-A bulk (48h) misses the weekend window; SUP-B express (6h) covers it at a 5% premium.',
    sku: 'CF-BEAN-1KG',
    productName: 'Premium Coffee Beans 1kg',
    presetStock: 6,
    simulatedDay: 'Friday',
    expect: {
      // deficit = ceil((20-6) + 4*0.25) = 15 → qty max(15, MOQ 10) = 15
      supplierCode: 'SUP-B',
      supplierName: 'Express Logistics Hub',
      quantity: 15,
      // unitPrice = round(145000 * 1.05) = 152250 → total = 15 * 152250
      unitPrice: 152250,
      totalAmount: 2283750,
      rationale: 'Friday surge: 6h express beats 48h bulk; 5% premium avoids a weekend stockout.',
    },
  },
  {
    id: 'bulk-milk-restock',
    pillLabel: 'Bulk Milk Restock',
    title: 'Scenario 2 — Normal Restock · Full Cream Milk 1L',
    description: 'Calm Monday: 25 cartons on hand survive the slowest lead time, so bulk economics win — SUP-A MOQ 50 at the lowest unit cost.',
    sku: 'MLK-FULL-1L',
    productName: 'Full Cream Milk 1L',
    presetStock: 25,
    simulatedDay: 'Monday',
    expect: {
      // deficit = ceil((30-25) + 9*2) = 23 → qty max(23, MOQ 50) = 50
      supplierCode: 'SUP-A',
      supplierName: 'Local Bulk Wholesaler',
      quantity: 50,
      // unitPrice = round(22000 * 1.00) = 22000 → total = 50 * 22000
      unitPrice: 22000,
      totalAmount: 1100000,
      rationale: 'Weekday steady demand: bulk MOQ 50 at lowest unit cost; no surge premium needed.',
    },
  },
];
