import type { IPurchaseOrder } from '@/models/PurchaseOrder';
import type { ISupplier } from '@/models/Supplier';
import { logger } from '@/lib/logger';

/** In-memory outbox for demo observability. Real WhatsApp gateway plugs in here. */
export const notificationOutbox: Array<{ to: string; message: string; sentAt: Date }> = [];

export function formatVendorDispatchMessage(
  po: Pick<IPurchaseOrder, 'poNumber' | 'items' | 'totalAmount'>,
  supplier: Pick<ISupplier, 'name' | 'code' | 'contactPhone' | 'leadTimeHours'>,
): string {
  const lines = po.items.map(
    (i, n) =>
      `${n + 1}. ${i.name} (${i.sku}) — ${i.quantity} x Rp${i.unitPrice.toLocaleString('id-ID')} = Rp${i.subtotal.toLocaleString('id-ID')}`,
  );
  return [
    `Halo ${supplier.name} [${supplier.code}], pesanan baru dari StockPilot Agent:`,
    `PO: ${po.poNumber}`,
    ...lines,
    `Total: Rp${po.totalAmount.toLocaleString('id-ID')}`,
    `Mohon konfirmasi pengiriman (lead time ${supplier.leadTimeHours} jam).`,
    `---`,
    `Hello ${supplier.name}, new order from StockPilot Agent: PO ${po.poNumber}, total Rp${po.totalAmount.toLocaleString('id-ID')}. Please confirm dispatch.`,
  ].join('\n');
}

export function sendVendorWhatsAppNotification(
  po: Pick<IPurchaseOrder, 'poNumber' | 'items' | 'totalAmount'>,
  supplier: Pick<ISupplier, 'name' | 'code' | 'contactPhone' | 'leadTimeHours'>,
): { to: string; message: string; sentAt: Date } {
  const message = formatVendorDispatchMessage(po, supplier);
  const entry = { to: supplier.contactPhone, message, sentAt: new Date() };
  notificationOutbox.push(entry);
  logger.info('WhatsApp', `dispatch to ${entry.to}:\n${message}`);
  return entry;
}

/** Bilateral settlement notice: pro-rata payout confirmation to the delivering supplier. */
export function sendSettlementConfirmation(
  poNumber: string,
  supplier: Pick<ISupplier, 'name' | 'code' | 'contactPhone'>,
  payout: number,
  billableQty: number,
): { to: string; message: string; sentAt: Date } {
  const message = [
    `Halo ${supplier.name} [${supplier.code}], escrow StockPilot dibuka:`,
    `PO: ${poNumber} — ${billableQty} unit terverifikasi.`,
    `Payout Rp${payout.toLocaleString('id-ID')} dirilis instan. Terima kasih!`,
    `---`,
    `Hello ${supplier.name}: escrow released for PO ${poNumber} — ${billableQty} verified units, payout Rp${payout.toLocaleString('id-ID')}.`,
  ].join('\n');
  const entry = { to: supplier.contactPhone, message, sentAt: new Date() };
  notificationOutbox.push(entry);
  logger.info('WhatsApp', `settlement to ${entry.to}:\n${message}`);
  return entry;
}

/** Failover dispatch notice to the backup vendor for the recovery sub-PO. */
export function sendFailoverDispatchNotification(
  childPoNumber: string,
  parentPoNumber: string,
  supplier: Pick<ISupplier, 'name' | 'code' | 'contactPhone' | 'leadTimeHours'>,
  qty: number,
  total: number,
): { to: string; message: string; sentAt: Date } {
  const message = [
    `Halo ${supplier.name} [${supplier.code}], order failover darurat dari StockPilot:`,
    `Child PO: ${childPoNumber} (induk ${parentPoNumber}) — ${qty} unit, total Rp${total.toLocaleString('id-ID')}.`,
    `Mohon kirim kilat (lead ${supplier.leadTimeHours} jam) untuk tutup akhir pekan.`,
    `---`,
    `Hello ${supplier.name}: emergency failover ${childPoNumber} (parent ${parentPoNumber}) — ${qty} units, Rp${total.toLocaleString('id-ID')}. Express dispatch requested.`,
  ].join('\n');
  const entry = { to: supplier.contactPhone, message, sentAt: new Date() };
  notificationOutbox.push(entry);
  logger.info('WhatsApp', `failover to ${entry.to}:\n${message}`);
  return entry;
}
