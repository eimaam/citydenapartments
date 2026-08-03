import { format } from 'date-fns';
import type { LaundryBillResponse } from '@citydenapartments/shared';

export function printLaundryReceipt(bill: LaundryBillResponse) {
  const guestName = bill.customer?.name ?? bill.walkIn?.name ?? '—';
  const guestPhone = bill.customer?.phone ?? bill.walkIn?.phone ?? '—';

  const linesHtml = bill.lines
    .map(
      (l, i) => `
      <tr>
        <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:right;color:#666;">${i + 1}</td>
        <td style="padding:6px 4px;border-bottom:1px dashed #ccc;">${l.itemName}</td>
        <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:center;text-transform:capitalize;">${l.service}</td>
        <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:center;">${l.qty}</td>
        <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:right;">₦${l.unitPrice.toLocaleString()}</td>
        <td style="padding:6px 4px;border-bottom:1px dashed #ccc;text-align:right;font-weight:500;">₦${l.lineTotal.toLocaleString()}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Laundry Receipt — ${bill.billNumber}</title>
  <style>
    body { font-family: 'Courier New', Courier, monospace; color: #111; width: 90mm; margin: 0 auto; padding: 16px; }
    .center { text-align: center; }
    .brand { font-size: 20px; font-weight: bold; letter-spacing: 2px; }
    .muted { color: #666; font-size: 11px; }
    .divider { border-top: 1px dashed #999; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; color: #444; }
    .total-row td { padding-top: 8px; font-weight: bold; }
    .status { display: inline-block; padding: 2px 10px; border: 1px solid #111; text-transform: uppercase; letter-spacing: 1px; font-size: 11px; }
    .status.paid { background: #111; color: #fff; }
    .footer { margin-top: 12px; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <div class="center">
    <div class="brand">CITYDEN APARTMENTS</div>
    <div class="muted">LAUNDRY &amp; PRESSING SERVICE</div>
  </div>
  <div class="divider"></div>
  <table>
    <tr><td class="muted">Bill No.</td><td style="text-align:right;font-weight:bold;">${bill.billNumber}</td></tr>
    <tr><td class="muted">Date</td><td style="text-align:right;">${format(new Date(bill.createdAt), 'dd MMM yyyy, hh:mm a')}</td></tr>
    <tr><td class="muted">Guest</td><td style="text-align:right;">${guestName}</td></tr>
    <tr><td class="muted">Phone</td><td style="text-align:right;">${guestPhone}</td></tr>
    <tr><td class="muted">Room</td><td style="text-align:right;">${bill.roomNumber || '—'}</td></tr>
  </table>
  <div class="divider"></div>
  <table>
    <thead>
      <tr>
        <th style="text-align:right;">#</th>
        <th>Item</th>
        <th style="text-align:center;">Service</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Rate</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${linesHtml}</tbody>
    <tr class="total-row">
      <td colspan="5" style="text-align:right;">TOTAL</td>
      <td style="text-align:right;font-size:14px;">₦${bill.total.toLocaleString()}</td>
    </tr>
  </table>
  <div class="divider"></div>
  <div class="center">
    <span class="status ${bill.status}">${bill.status.toUpperCase()}</span>
  </div>
  <div class="divider"></div>
  <div class="center footer">Thank you for your patronage!</div>
  <div class="center footer" style="margin-top:2px;">${bill.createdBy?.name ? `Served by ${bill.createdBy.name}` : ''}</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=420,height=640');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 250);
}
