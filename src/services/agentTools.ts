import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { calculateDeficit, calculateOrderQuantity, calculateTotalCost } from '@/lib/math';
import { Product } from '@/models/Product';
import { Supplier } from '@/models/Supplier';
import { PurchaseOrder } from '@/models/PurchaseOrder';

/** XML-encapsulate untrusted DB text fed back into the LLM (prompt-injection guard). */
function xml(tag: string, value: string): string {
  const safe = value.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);
  return `<${tag}>${safe}</${tag}>`;
}

function genPoNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `PO-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// --- Tool 1: check_inventory_status ---
export const CheckInventoryInput = z.object({
  sku: z.string().trim().min(1).max(64).describe('Product SKU, e.g. MLK-FULL-1L'),
});
export const checkInventoryStatusDef = {
  type: 'function' as const,
  name: 'check_inventory_status',
  description: 'Returns live stock level, burn rate and safety-stock threshold for a SKU.',
  parameters: {
    type: 'object' as const,
    properties: { sku: { type: 'string' as const, description: 'Product SKU' } },
    required: ['sku' as const],
    additionalProperties: false,
  },
  strict: true,
};

export async function checkInventoryStatus(input: z.infer<typeof CheckInventoryInput>) {
  await dbConnect();
  const p = await Product.findOne({ sku: input.sku }).lean();
  if (!p) return { found: false as const, sku: input.sku };
  return {
    found: true as const,
    sku: p.sku,
    name: xml('product_name', p.name),
    category: p.category,
    currentStock: p.currentStock,
    safetyStock: p.safetyStock,
    reorderPoint: p.reorderPoint,
    avgDailyDemand: p.avgDailyDemand ?? 0,
    unitCost: p.unitCost,
    breached: p.currentStock < p.safetyStock,
  };
}

// --- Tool 2: evaluate_competing_suppliers ---
export const EvaluateSuppliersInput = z.object({
  sku: z.string().trim().min(1).max(64),
  unitsNeeded: z.number().int().min(1).max(100000),
});
export const evaluateSuppliersDef = {
  type: 'function' as const,
  name: 'evaluate_competing_suppliers',
  description: 'Lists vendors stocking the SKU with unit price, lead time, MOQ and reliability.',
  parameters: {
    type: 'object' as const,
    properties: {
      sku: { type: 'string' as const, description: 'Product SKU' },
      unitsNeeded: { type: 'number' as const, description: 'Units required' },
    },
    required: ['sku' as const, 'unitsNeeded' as const],
    additionalProperties: false,
  },
  strict: true,
};

export async function evaluateCompetingSuppliers(input: z.infer<typeof EvaluateSuppliersInput>) {
  await dbConnect();
  const suppliers = await Supplier.find({ supportedSkus: input.sku }).lean();
  const product = await Product.findOne({ sku: input.sku }).lean();
  if (!suppliers.length || !product) return { found: false as const, sku: input.sku, vendors: [] };
  return {
    found: true as const,
    sku: input.sku,
    vendors: suppliers.map((s) => {
      const unitPrice = Math.round(product.unitCost * s.priceMultiplier * 100) / 100;
      const orderQty = Math.max(s.minOrderQty, input.unitsNeeded);
      return {
        code: s.code,
        name: xml('vendor_name', s.name),
        unitPrice,
        leadTimeHours: s.leadTimeHours,
        minOrderQty: s.minOrderQty,
        reliabilityScore: s.reliabilityScore,
        orderQty,
        lineTotal: calculateTotalCost(orderQty, unitPrice),
      };
    }),
  };
}

// --- Tool 3: create_purchase_order_draft ---
export const CreateDraftInput = z.object({
  sku: z.string().trim().min(1).max(64),
  supplierCode: z.string().trim().min(1).max(16).toUpperCase(),
  quantity: z.number().int().min(1).max(100000),
  reasoning: z.string().trim().min(1).max(2000),
});
export const createDraftDef = {
  type: 'function' as const,
  name: 'create_purchase_order_draft',
  description: 'Deterministically computes deficit/qty/total via math engine and persists a DRAFT PO.',
  parameters: {
    type: 'object' as const,
    properties: {
      sku: { type: 'string' as const, description: 'Product SKU' },
      supplierCode: { type: 'string' as const, description: 'Vendor code, e.g. SUP-B' },
      quantity: { type: 'number' as const, description: 'Requested units (snapped to MOQ by engine)' },
      reasoning: { type: 'string' as const, description: 'Vendor selection rationale' },
    },
    required: ['sku' as const, 'supplierCode' as const, 'quantity' as const, 'reasoning' as const],
    additionalProperties: false,
  },
  strict: true,
};

export async function createPurchaseOrderDraft(input: z.infer<typeof CreateDraftInput>) {
  await dbConnect();
  const [product, supplier] = await Promise.all([
    Product.findOne({ sku: input.sku }).lean(),
    Supplier.findOne({ code: input.supplierCode }).lean(),
  ]);
  if (!product) return { created: false as const, error: `SKU not found: ${input.sku}` };
  if (!supplier) return { created: false as const, error: `Supplier not found: ${input.supplierCode}` };
  // All arithmetic via deterministic engine — LLM never invents figures.
  const deficit = calculateDeficit(
    product.currentStock, product.safetyStock, product.avgDailyDemand ?? 0,
    supplier.leadTimeHours / 24,
  );
  const quantity = calculateOrderQuantity(Math.max(deficit, input.quantity), supplier.minOrderQty);
  const unitPrice = Math.round(product.unitCost * supplier.priceMultiplier * 100) / 100;
  const subtotal = calculateTotalCost(quantity, unitPrice);
  const po = await PurchaseOrder.create({
    poNumber: genPoNumber(),
    supplierId: supplier._id,
    items: [{ sku: product.sku, name: product.name, quantity, unitPrice, subtotal }],
    totalAmount: subtotal,
    status: 'DRAFT',
    agentReasoningSummary: input.reasoning.slice(0, 2000),
  });
  return {
    created: true as const,
    poNumber: po.poNumber,
    supplierCode: supplier.code,
    supplierName: supplier.name,
    leadTimeHours: supplier.leadTimeHours,
    quantity,
    unitPrice,
    totalAmount: subtotal,
  };
}

export const AGENT_TOOL_DEFS = [checkInventoryStatusDef, evaluateSuppliersDef, createDraftDef];

export const TOOL_HANDLERS: Record<string, (args: never) => Promise<unknown>> = {
  check_inventory_status: checkInventoryStatus as (args: never) => Promise<unknown>,
  evaluate_competing_suppliers: evaluateCompetingSuppliers as (args: never) => Promise<unknown>,
  create_purchase_order_draft: createPurchaseOrderDraft as (args: never) => Promise<unknown>,
};

