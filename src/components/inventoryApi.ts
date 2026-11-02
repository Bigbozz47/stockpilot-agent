export interface InventoryItem {
  _id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  unitCost: number;
  avgDailyDemand: number;
  isBelowSafetyStock: boolean;
  deficit: number;
}

export type StockStatus = 'HEALTHY' | 'CRITICAL_BREACH' | 'REORDER_IN_PROGRESS';

export function stockStatus(item: InventoryItem, pendingSkus: Set<string>): StockStatus {
  if (pendingSkus.has(item.sku)) return 'REORDER_IN_PROGRESS';
  return item.isBelowSafetyStock ? 'CRITICAL_BREACH' : 'HEALTHY';
}

export async function fetchInventory(): Promise<InventoryItem[]> {
  const res = await fetch('/api/inventory', { cache: 'no-store' });
  const json = (await res.json()) as { success: boolean; data: InventoryItem[] };
  if (!json.success) throw new Error('Inventory fetch failed');
  return json.data;
}

export async function fetchPendingSkus(): Promise<Set<string>> {
  try {
    const res = await fetch('/api/orders', { cache: 'no-store' });
    const json = (await res.json()) as { success: boolean; data: Array<{ status: string; items: Array<{ sku: string }> }> };
    if (!json.success) return new Set();
    const skus = json.data
      .filter((o) => o.status === 'DRAFT')
      .flatMap((o) => o.items.map((i) => i.sku));
    return new Set(skus);
  } catch {
    return new Set();
  }
}
