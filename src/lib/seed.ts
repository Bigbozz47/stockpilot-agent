import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { dbConnect } from './db';
import { Product } from '../models/Product';
import { Supplier } from '../models/Supplier';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { AgentAuditLog } from '../models/AgentAuditLog';
import { BASELINE_PRODUCTS, BASELINE_SUPPLIERS } from './demoSeed';
import { logger } from './logger';

// Load .env.local without extra deps (seed runs outside Next.js).
function loadLocalEnv(): void {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const k = t.slice(0, i).trim();
    if (!(k in process.env)) process.env[k] = t.slice(i + 1).trim();
  }
}

const SKUS = [
  'CF-BEAN-1KG',
  'MLK-FULL-1L',
  'MCH-PDR-500G',
  'MLK-OAT-1L',
  'SGR-ARAB-500G',
  'TEA-EBF-100B',
  'CHP-COOK-200G',
  'CUP-PPR-12OZ',
  'SYR-VAN-750ML',
  'CRS-BTTR-50P',
] as const;

async function main(): Promise<void> {
  loadLocalEnv();
  await dbConnect();

  // Idempotent: wipe mock collections before re-seeding.
  await Promise.all([
    Product.deleteMany({}),
    Supplier.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    AgentAuditLog.deleteMany({}),
  ]);

  const suppliers = await Supplier.insertMany(BASELINE_SUPPLIERS);

  const products = await Product.insertMany(BASELINE_PRODUCTS);

  const productCount = await Product.countDocuments();
  const supplierCount = await Supplier.countDocuments();
  logger.info('seed', `Seeded ${productCount} products, ${supplierCount} suppliers`);
  logger.info('seed', `Suppliers: ${suppliers.map((s) => `${s.code} (MOQ ${s.minOrderQty}, ${s.leadTimeHours}h, x${s.priceMultiplier})`).join(' | ')}`);
  logger.info('seed', `Sample SKU: ${products[0].sku} | stock: ${products[0].currentStock}`);

  if (productCount !== 10 || supplierCount !== 3) throw new Error('Seed count mismatch');
  await mongoose.disconnect();
  logger.info('seed', 'Seed OK — disconnected');
}

main().catch(async (err) => {
  logger.error('seed', 'Seed FAILED:', err instanceof Error ? err.message : err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});