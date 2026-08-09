import { format } from 'date-fns';
import { Printer, CheckCircle2, Undo2 } from 'lucide-react';
import { Button, Drawer, Badge } from '@citydenapartments/shared';
import type { LaundryBillResponse } from '@citydenapartments/shared';
import { printLaundryReceipt } from '../lib/printReceipt';

interface Props {
  bill: LaundryBillResponse | null;
  onClose: () => void;
  onToggleStatus: (id: string, status: 'pending' | 'paid') => void;
  busy: boolean;
  readOnly?: boolean;
}

export default function BillDetailDrawer({ bill, onClose, onToggleStatus, busy, readOnly }: Props) {
  if (!bill) return null;
  const guestName = bill.customer?.name ?? bill.walkIn?.name ?? '—';
  const guestPhone = bill.customer?.phone ?? bill.walkIn?.phone ?? '—';

  return (
    <Drawer open onClose={onClose} width={520} title={
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{bill.billNumber}</span>
        <Badge
          status={bill.status}
          label={bill.status === 'paid' ? 'Paid' : 'Pending'}
          colorMap={{ paid: 'bg-emerald-50 text-emerald-700 border-emerald-200', pending: 'bg-amber-50 text-amber-700 border-amber-200' }}
        />
      </div>
    }>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-outline mb-0.5">Guest</p>
            <p className="font-medium">{guestName}</p>
            <p className="text-xs opacity-60">{guestPhone}</p>
          </div>
          <div>
            <p className="text-xs text-outline mb-0.5">Room</p>
            <p className="font-medium">{bill.roomNumber || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-outline mb-0.5">Created</p>
            <p>{format(new Date(bill.createdAt), 'dd MMM yyyy, hh:mm a')}</p>
          </div>
          <div>
            <p className="text-xs text-outline mb-0.5">Served by</p>
            <p>{bill.createdBy?.name ?? '—'}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-outline-variant">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-outline">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Service</th>
                <th className="px-3 py-2 text-center">Qty</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {bill.lines.map((l, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">{l.itemName}</td>
                  <td className="px-3 py-2 capitalize">{l.service}</td>
                  <td className="px-3 py-2 text-center">{l.qty}</td>
                  <td className="px-3 py-2 text-right font-medium">₦{l.lineTotal.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {bill.notes && (
          <p className="rounded-lg bg-surface-container-low px-3 py-2 text-sm">
            <span className="text-xs text-outline uppercase tracking-wide">Notes: </span>{bill.notes}
          </p>
        )}

        <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3">
          <span className="text-sm font-semibold uppercase tracking-wide">Total</span>
          <span className="text-xl font-bold">₦{bill.total.toLocaleString()}</span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" fullWidth={readOnly} icon={<Printer size={14} />} onClick={() => printLaundryReceipt(bill)}>
            Print Receipt
          </Button>
          {!readOnly && (
            <Button
              variant={bill.status === 'paid' ? 'outline' : 'default'}
              fullWidth
              icon={bill.status === 'paid' ? <Undo2 size={14} /> : <CheckCircle2 size={14} />}
              loading={busy}
              onClick={() => onToggleStatus(bill._id, bill.status === 'paid' ? 'pending' : 'paid')}
            >
              {bill.status === 'paid' ? 'Mark as Pending' : 'Mark as Paid'}
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  );
}
