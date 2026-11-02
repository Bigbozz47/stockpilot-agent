import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import { fail } from '@/lib/apiResponse';
import { PONumber } from '@/lib/poNumber';
import { PurchaseOrder } from '@/models/PurchaseOrder';
import { Supplier } from '@/models/Supplier';

/** Minimal single-page PDF writer — stdlib only, no PDF dep. */
function buildPdf(lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  let y = 750;
  const ops = lines
    .map((l) => {
      const op = `BT /F1 11 Tf 50 ${y} Td (${esc(l.slice(0, 110))}) Tj ET`;
      y -= 18;
      return op;
    })
    .join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(ops)} >>\nstream\n${ops}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const parsed = PONumber.safeParse(req.nextUrl.searchParams.get('poNumber') ?? '');
    if (!parsed.success) return fail('poNumber query param must match PO-YYYYMMDD-XXXX', 400);
    await dbConnect();
    const po = await PurchaseOrder.findOne({ poNumber: parsed.data }).lean();
    if (!po) return fail(`PO not found: ${parsed.data}`, 404);
    const supplier = await Supplier.findById(po.supplierId).lean();
    const lines = [
      `STOCKPILOT AGENT - PURCHASE ORDER ${po.poNumber}`,
      `Supplier: ${supplier ? `${supplier.name} [${supplier.code}]` : String(po.supplierId)}`,
      `Status: ${po.status}   Date: ${new Date(po.createdAt).toLocaleDateString('en-GB')}`,
      `------------------------------------------------------------`,
      ...po.items.map(
        (i, n) => `${n + 1}. ${i.name} (${i.sku}) ${i.quantity} x ${i.unitPrice} = ${i.subtotal}`,
      ),
      `------------------------------------------------------------`,
      `TOTAL: ${po.totalAmount}`,
      po.agentReasoningSummary ? `Note: ${po.agentReasoningSummary}` : '',
    ].filter(Boolean);
    const pdf = buildPdf(lines);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${po.poNumber}.pdf"`,
        'Content-Length': String(pdf.length),
      },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}
