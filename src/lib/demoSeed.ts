import { dbConnect } from './db';
import { Product } from '../models/Product';
import { Supplier } from '../models/Supplier';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { AgentAuditLog } from '../models/AgentAuditLog';

/** Canonical demo baseline — single source of truth for seed + 1-click reset. */
export const BASELINE_SUPPLIERS = [
  {
    name: 'Local Bulk Wholesaler',
    code: 'SUP-A',
    contactPhone: '+62-21-555-0101',
    leadTimeHours: 48,
    minOrderQty: 50,
    priceMultiplier: 1.0,
    reliabilityScore: 82,
    supportedSkus: [
      'CF-BEAN-1KG', 'MLK-FULL-1L', 'MCH-PDR-500G', 'MLK-OAT-1L', 'SGR-ARAB-500G',
      'TEA-EBF-100B', 'CHP-COOK-200G', 'CUP-PPR-12OZ', 'SYR-VAN-750ML', 'CRS-BTTR-50P',
    ],
  },
  {
    name: 'Express Logistics Hub',
    code: 'SUP-B',
    contactPhone: '+62-21-555-0102',
    leadTimeHours: 6,
    minOrderQty: 10,
    priceMultiplier: 1.05,
    reliabilityScore: 95,
    supportedSkus: [
      'CF-BEAN-1KG', 'MLK-FULL-1L', 'MCH-PDR-500G', 'MLK-OAT-1L', 'SGR-ARAB-500G',
      'TEA-EBF-100B', 'CHP-COOK-200G', 'CUP-PPR-12OZ', 'SYR-VAN-750ML', 'CRS-BTTR-50P',
    ],
  },
  {
    name: 'Regional Distributor',
    code: 'SUP-C',
    contactPhone: '+62-21-555-0103',
    leadTimeHours: 24,
    minOrderQty: 25,
    priceMultiplier: 1.02,
    reliabilityScore: 88,
    supportedSkus: [
      'CF-BEAN-1KG', 'MLK-FULL-1L', 'MCH-PDR-500G', 'MLK-OAT-1L', 'SGR-ARAB-500G',
      'TEA-EBF-100B', 'CHP-COOK-200G', 'CUP-PPR-12OZ', 'SYR-VAN-750ML', 'CRS-BTTR-50P',
    ],
  },
];

export const BASELINE_PRODUCTS = [
  { sku: 'CF-BEAN-1KG', name: 'Premium Coffee Beans 1kg', category: 'Beverage', currentStock: 8, safetyStock: 20, reorderPoint: 25, unitCost: 145000, avgDailyDemand: 4, unit: 'bag' },
  { sku: 'MLK-FULL-1L', name: 'Full Cream Milk 1L', category: 'Dairy', currentStock: 12, safetyStock: 30, reorderPoint: 36, unitCost: 22000, avgDailyDemand: 9, unit: 'carton' },
  { sku: 'MCH-PDR-500G', name: 'Matcha Powder 500g', category: 'Beverage', currentStock: 6, safetyStock: 12, reorderPoint: 15, unitCost: 185000, avgDailyDemand: 2, unit: 'tin' },
  { sku: 'MLK-OAT-1L', name: 'Oat Milk 1L', category: 'Dairy', currentStock: 15, safetyStock: 24, reorderPoint: 28, unitCost: 35000, avgDailyDemand: 6, unit: 'carton' },
  { sku: 'SGR-ARAB-500G', name: 'Arabica Sugar 500g', category: 'Pantry', currentStock: 40, safetyStock: 30, reorderPoint: 35, unitCost: 18000, avgDailyDemand: 5, unit: 'pack' },
  { sku: 'TEA-EBF-100B', name: 'English Breakfast Tea 100 bags', category: 'Beverage', currentStock: 9, safetyStock: 15, reorderPoint: 18, unitCost: 65000, avgDailyDemand: 3, unit: 'box' },
  { sku: 'CHP-COOK-200G', name: 'Choco Chip Cookies 200g', category: 'Snacks', currentStock: 22, safetyStock: 25, reorderPoint: 30, unitCost: 28000, avgDailyDemand: 7, unit: 'pack' },
  { sku: 'CUP-PPR-12OZ', name: 'Paper Cups 12oz (50 pcs)', category: 'Packaging', currentStock: 5, safetyStock: 20, reorderPoint: 24, unitCost: 45000, avgDailyDemand: 4, unit: 'sleeve' },
  { sku: 'SYR-VAN-750ML', name: 'Vanilla Syrup 750ml', category: 'Pantry', currentStock: 11, safetyStock: 14, reorderPoint: 16, unitCost: 95000, avgDailyDemand: 2, unit: 'bottle' },
  { sku: 'CRS-BTTR-50P', name: 'Butter Croissant (50 pcs)', category: 'Bakery', currentStock: 30, safetyStock: 40, reorderPoint: 48, unitCost: 12000, avgDailyDemand: 12, unit: 'box' },
];

/** Idempotent wipe + reinsert. Local Mongo completes in well under 400ms. */
export async function resetDemoData(): Promise<{ products: number; suppliers: number }> {
  await dbConnect();
  await Promise.all([
    Product.deleteMany({}),
    Supplier.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    AgentAuditLog.deleteMany({}),
  ]);
  await Supplier.insertMany(BASELINE_SUPPLIERS);
  await Product.insertMany(BASELINE_PRODUCTS);
  const [products, suppliers] = await Promise.all([Product.countDocuments(), Supplier.countDocuments()]);
  return { products, suppliers };
}
