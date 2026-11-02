import { z } from 'zod';

/** Canonical PO number format: PO-YYYYMMDD-XXXX (uppercase alphanumerics). */
export const PONumber = z
  .string()
  .trim()
  .regex(/^PO-\d{8}-[A-Z0-9]+$/, 'poNumber must match PO-YYYYMMDD-XXXX');
