"use client";

import { useRef, useCallback } from 'react';
import { Printer } from 'lucide-react';
import { Button } from './Button';
import { DiscountType, type DiscountTypeType } from '../../types';

export interface BranchPolicies {
  checkInTime?: string;
  checkOutTime?: string;
  earlyCheckIn?: string;
  lateCheckOut?: string;
  cancellation?: string;
  houseRules?: string[];
  paymentInfo?: string;
  breakfastInfo?: string;
  contactPhone?: string;
  contactEmail?: string;
  additionalNotes?: string;
}

export interface BranchInfo {
  name: string;
  address: string;
  code: string;
  policies?: BranchPolicies;
}

export interface ReceiptRoomEntry {
  roomId: {
    _id: string;
    roomNumber: string;
    roomTypeId?: { _id: string; name: string };
  };
  actualPricePerNight: number;
  totalForRoom: number;
  maxGuests: number;
}

export interface ReceiptBooking {
  _id: string;
  bookingReference: string;
  branchId: string;
  guestDetails: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    nationality?: string;
    comingFrom?: string;
    stateOfOrigin?: string;
    occupation?: string;
    nextDestination?: string;
    gender?: string;
    religion?: string;
  };
  rooms: ReceiptRoomEntry[];
  numberOfGuests: number;
  checkInDate: string;
  checkOutDate: string;
  discount: number;
  discountType?: DiscountTypeType;
  discountPercentage?: number;
  discountReason?: string;
  totalAmountPaid: number;
  includeVat?: boolean;
  includeServiceCharge?: boolean;
  vatAmount?: number;
  serviceChargeAmount?: number;
  paymentMethod: string;
  paymentReference?: string;
  bookingStatus: string;
  bookingSource: string;
  createdAt: string;
}

interface BookingReceiptProps {
  booking: ReceiptBooking;
  branch: BranchInfo;
  receptionistName?: string;
}

function calculateNights(ci: string, co: string): number {
  const start = new Date(ci);
  const end = new Date(co);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function fmtDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
    + ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const PRINT_STYLES = `
  @page { margin: 0.4in; size: A4 portrait; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    background: #fff; color: #1a1a1a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt-header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.25rem; }
  .receipt-hotel-name { font-size: 1.3rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; margin: 0; }
  .receipt-branch { font-size: 0.9rem; font-weight: 600; margin: 0.2rem 0; }
  .receipt-address { font-size: 0.7rem; color: #555; margin: 0; }
  .receipt-contact { font-size: 0.65rem; color: #555; margin: 0.2rem 0 0; }
  .receipt-title-section { font-size: 1rem; font-weight: 700; margin: 0.6rem 0 0; letter-spacing: 0.1em; }
  .receipt-ref { font-family: 'Courier New', monospace; font-size: 0.9rem; font-weight: 600; color: #1a1a1a; margin: 0.3rem 0 0; }
  .receipt-section-title { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #666; margin: 1rem 0 0.35rem; border-bottom: 1px solid #ddd; padding-bottom: 0.2rem; }
  .receipt-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .receipt-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; }
  .receipt-label { font-size: 0.6rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
  .receipt-value { font-size: 0.8rem; font-weight: 500; color: #1a1a1a; margin-top: 0.05rem; }
  .receipt-table { width: 100%; border-collapse: collapse; margin: 0.35rem 0; }
  .receipt-table th { text-align: left; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; color: #888; padding: 0.3rem 0.4rem; border-bottom: 1px solid #ddd; }
  .receipt-table td { font-size: 0.8rem; padding: 0.3rem 0.4rem; border-bottom: 1px solid #eee; }
  .receipt-table td:last-child, .receipt-table th:last-child { text-align: right; }
  .receipt-total-row td { font-weight: 700; border-top: 2px solid #1a1a1a; border-bottom: 2px solid #1a1a1a; }
  .receipt-policy-item { font-size: 0.7rem; line-height: 1.45; color: #333; margin-bottom: 0.3rem; padding-left: 0.9rem; position: relative; }
  .receipt-policy-item::before { content: '\\2022'; position: absolute; left: 0.2rem; color: #888; }
  .receipt-policy-block { font-size: 0.7rem; line-height: 1.45; color: #333; margin-bottom: 0.3rem; }
  .receipt-footer { text-align: center; border-top: 2px solid #1a1a1a; padding-top: 0.75rem; margin-top: 1.25rem; }
  .receipt-footer p { font-size: 0.65rem; color: #fff; margin: 0.1rem 0; }
  .receipt-powered { font-size: 0.55rem; color: #999; margin-top: 0.4rem; }
  .receipt-badge { display: inline-block; font-size: 0.6rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 2px; letter-spacing: 0.05em; }
  .receipt-badge-confirmed { background: #e8f5e9; color: #2e7d32; border: 1px solid #2e7d32; }
  .receipt-badge-checked-in { background: #e3f2fd; color: #1565c0; border: 1px solid #1565c0; }
  .receipt-badge-checked-out { background: #f3e5f5; color: #7b1fa2; border: 1px solid #7b1fa2; }
  .receipt-badge-cancelled { background: #fbe9e7; color: #c62828; border: 1px solid #c62828; }
  .receipt-signature-area { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #ddd; }
  .receipt-signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem; }
  .receipt-signature-line { border-top: 1px solid #1a1a1a; width: 200px; margin-top: 0.25rem; }
  .receipt-agreement { font-size: 0.7rem; line-height: 1.45; color: #333; margin-bottom: 0.75rem; }
`;

function buildRoomRowsHtml(booking: ReceiptBooking, nights: number) {
  return (booking.rooms || []).map(r => {
    const roomLabel = `${r.roomId.roomNumber}${r.roomId.roomTypeId ? ` — ${r.roomId.roomTypeId.name}` : ''}`;
    return `<tr><td>Room ${roomLabel}</td><td>\u20A6${r.actualPricePerNight.toLocaleString()} \u00D7 ${nights} night${nights > 1 ? 's' : ''}</td><td>\u20A6${r.totalForRoom.toLocaleString()}</td></tr>`;
  }).join('');
}

function buildRoomsListHtml(booking: ReceiptBooking) {
  return (booking.rooms || []).map(r =>
    `<p class="receipt-value">${r.roomId.roomNumber}${r.roomId.roomTypeId ? ` <span style="font-size:0.65rem;color:#888">${r.roomId.roomTypeId.name}</span>` : ''}</p>`
  ).join('');
}

function buildPrintHtml({
  booking, branch, receptionistName, nights, subtotal, p,
}: {
  booking: ReceiptBooking; branch: BranchInfo; receptionistName?: string;
  nights: number; subtotal: number; p: NonNullable<BranchInfo['policies']>;
}) {
  const statusClass = booking.bookingStatus === 'checked_in' ? 'checked-in'
    : booking.bookingStatus === 'checked_out' ? 'checked-out'
    : booking.bookingStatus === 'cancelled' ? 'cancelled' : 'confirmed';
  const statusLabel = booking.bookingStatus === 'checked_in' ? 'CHECKED IN'
    : booking.bookingStatus === 'checked_out' ? 'CHECKED OUT'
    : booking.bookingStatus === 'cancelled' ? 'CANCELLED' : 'CONFIRMED';

  const roomRowsHtml = buildRoomRowsHtml(booking, nights);
  const roomsHtml = buildRoomsListHtml(booking);

  return `<html><head><meta charset="utf-8"><title>Booking Receipt - ${booking.bookingReference}</title>
<style>${PRINT_STYLES}</style></head><body>
<div class="receipt-header">
  <h1 class="receipt-hotel-name">City Den Apartments</h1>
  <p class="receipt-branch">${branch.name}</p>
  <p class="receipt-address">${branch.address}</p>
  <p class="receipt-contact">${p.contactPhone || ''}${p.contactEmail ? ' | ' + p.contactEmail : ''}</p>
  <h2 class="receipt-title-section">Booking Confirmation Voucher</h2>
  <p class="receipt-ref">${booking.bookingReference}</p>
  <p style="margin:0.2rem 0 0;font-size:0.65rem;color:#888">Status: <span class="receipt-badge receipt-badge-${statusClass}">${statusLabel}</span></p>
</div>
<div class="receipt-section-title">Guest Information</div>
<div class="receipt-grid-2">
  <div><p class="receipt-label">Guest Name</p><p class="receipt-value">${booking.guestDetails.name}</p></div>
  <div><p class="receipt-label">Phone</p><p class="receipt-value">${booking.guestDetails.phone}</p></div>
  ${booking.guestDetails.email ? `<div><p class="receipt-label">Email</p><p class="receipt-value">${booking.guestDetails.email}</p></div>` : ''}
  <div><p class="receipt-label">Number of Guests</p><p class="receipt-value">${booking.numberOfGuests}</p></div>
  ${booking.guestDetails.address ? `<div><p class="receipt-label">Address</p><p class="receipt-value">${booking.guestDetails.address}</p></div>` : ''}
  ${booking.guestDetails.nationality ? `<div><p class="receipt-label">Nationality</p><p class="receipt-value">${booking.guestDetails.nationality}</p></div>` : ''}
  <div><p class="receipt-label">Booking Source</p><p class="receipt-value">${booking.bookingSource === 'walk_in' ? 'Walk-in' : booking.bookingSource}</p></div>
</div>
<div class="receipt-section-title">Stay Details</div>
<div class="receipt-grid-3">
  <div><p class="receipt-label">Rooms</p>${roomsHtml}</div>
  <div><p class="receipt-label">Check-in</p><p class="receipt-value">${fmtDate(booking.checkInDate)}</p><p style="font-size:0.65rem;color:#888">from ${p.checkInTime || '14:00'}</p></div>
  <div><p class="receipt-label">Check-out</p><p class="receipt-value">${fmtDate(booking.checkOutDate)}</p><p style="font-size:0.65rem;color:#888">by ${p.checkOutTime || '12:00'}</p></div>
</div>
<div class="receipt-section-title">Payment Summary</div>
<table class="receipt-table">
  <thead><tr><th>Description</th><th>Rate</th><th>Amount</th></tr></thead>
  <tbody>
    ${roomRowsHtml}
    ${booking.discount > 0 ? `<tr><td>Discount${booking.discountPercentage ? ` (${booking.discountPercentage}%)` : ''}${booking.discountReason ? ` - ${booking.discountReason}` : ''}</td><td></td><td>-\u20A6${booking.discount.toLocaleString()}</td></tr>` : ''}
    ${booking.includeVat && booking.vatAmount ? `<tr><td>VAT (7.5%)</td><td></td><td>\u20A6${booking.vatAmount.toLocaleString()}</td></tr>` : ''}
    ${booking.includeServiceCharge && booking.serviceChargeAmount ? `<tr><td>Service Charge (10%)</td><td></td><td>\u20A6${booking.serviceChargeAmount.toLocaleString()}</td></tr>` : ''}
    <tr class="receipt-total-row"><td colspan="2">Total Paid</td><td>\u20A6${booking.totalAmountPaid.toLocaleString()}</td></tr>
  </tbody>
</table>
<div class="receipt-grid-2" style="margin-top:0.35rem">
  <div><p class="receipt-label">Payment Method</p><p class="receipt-value">${booking.paymentMethod.replace('_', ' ')}</p></div>
  ${booking.paymentReference ? `<div><p class="receipt-label">Payment Reference</p><p class="receipt-value" style="font-family:'Courier New',monospace;font-size:0.7rem">${booking.paymentReference}</p></div>` : ''}
</div>
<div class="receipt-section-title">Hotel Policies &amp; Information</div>
<p class="receipt-policy-block"><strong>Check-in:</strong> ${p.checkInTime || '14:00'} | <strong>Check-out:</strong> ${p.checkOutTime || '12:00'}</p>
${p.earlyCheckIn ? `<p class="receipt-label">Early Check-in</p><p class="receipt-policy-block">${p.earlyCheckIn}</p>` : ''}
${p.lateCheckOut ? `<p class="receipt-label">Late Check-out</p><p class="receipt-policy-block">${p.lateCheckOut}</p>` : ''}
${p.cancellation ? `<p class="receipt-label">Cancellation Policy</p><p class="receipt-policy-block">${p.cancellation}</p>` : ''}
${p.houseRules && p.houseRules.length > 0 ? `<p class="receipt-label">House Rules</p>${p.houseRules.map(r => `<p class="receipt-policy-item">${r}</p>`).join('')}` : ''}
${p.paymentInfo ? `<p class="receipt-label">Payment Information</p><p class="receipt-policy-block">${p.paymentInfo}</p>` : ''}
${p.breakfastInfo ? `<p class="receipt-label">Breakfast</p><p class="receipt-policy-block">${p.breakfastInfo}</p>` : ''}
${p.additionalNotes ? `<p class="receipt-label">Additional Notes</p><p class="receipt-policy-block">${p.additionalNotes}</p>` : ''}
<div class="receipt-section-title">Terms &amp; Agreement</div>
<p class="receipt-agreement">I have read and agree to the above Terms and Conditions, including the house rules, cancellation policy, and payment terms.</p>
<div class="receipt-signature-area">
  <div class="receipt-signature-grid">
    <div><p class="receipt-label">Guest Signature</p><div class="receipt-signature-line"></div></div>
    <div><p class="receipt-label">Hotel Representative</p><p style="font-size:0.7rem;color:#333;margin-top:0.1rem">${receptionistName || ''}</p></div>
  </div>
</div>
<div class="receipt-footer">
  <p>Thank you for choosing City Den Apartments \u2014 ${branch.name}</p>
  <p>We wish you a pleasant stay!</p>
  ${receptionistName ? `<p style="margin-top:0.4rem;font-size:0.65rem">Processed by: ${receptionistName}</p>` : ''}
  <p style="margin-top:0.2rem;font-size:0.6rem;color:#999">Generated on ${fmtDateTime(booking.createdAt || new Date().toISOString())}</p>
  <p class="receipt-powered">Powered by City Den Apartments Management System</p>
</div>
</body></html>`;
}

export function BookingReceipt({ booking, branch, receptionistName }: BookingReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const nights = calculateNights(booking.checkInDate, booking.checkOutDate);
  const subtotal = (booking.rooms || []).reduce((sum, r) => sum + (r.totalForRoom || r.actualPricePerNight * nights), 0);
  const p = branch.policies || {};

  const handlePrint = useCallback(() => {
    const html = buildPrintHtml({ booking, branch, receptionistName, nights, subtotal, p });
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
  }, [booking, branch, receptionistName, nights, subtotal, p]);

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 0.4in; size: A4 portrait; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .receipt-preview {
          max-width: 800px; margin: 0 auto;
          background: #fff; color: #1a1a1a;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
        }
        .receipt-preview .receipt-header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 1.25rem; }
        .receipt-preview .receipt-hotel-name { font-size: 1.3rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; margin: 0; }
        .receipt-preview .receipt-branch { font-size: 0.9rem; font-weight: 600; margin: 0.2rem 0; }
        .receipt-preview .receipt-address { font-size: 0.7rem; color: #555; margin: 0; }
        .receipt-preview .receipt-contact { font-size: 0.65rem; color: #555; margin: 0.2rem 0 0; }
        .receipt-preview .receipt-title-section { font-size: 1rem; font-weight: 700; margin: 0.6rem 0 0; letter-spacing: 0.1em; }
        .receipt-preview .receipt-ref { font-family: 'Courier New', monospace; font-size: 0.9rem; font-weight: 600; margin: 0.3rem 0 0; }
        .receipt-preview .receipt-section-title { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #666; margin: 1rem 0 0.35rem; border-bottom: 1px solid #ddd; padding-bottom: 0.2rem; }
        .receipt-preview .receipt-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
        .receipt-preview .receipt-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; }
        .receipt-preview .receipt-label { font-size: 0.6rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
        .receipt-preview .receipt-value { font-size: 0.8rem; font-weight: 500; color: #1a1a1a; margin-top: 0.05rem; }
        .receipt-preview .receipt-table { width: 100%; border-collapse: collapse; margin: 0.35rem 0; }
        .receipt-preview .receipt-table th { text-align: left; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; color: #888; padding: 0.3rem 0.4rem; border-bottom: 1px solid #ddd; }
        .receipt-preview .receipt-table td { font-size: 0.8rem; padding: 0.3rem 0.4rem; border-bottom: 1px solid #eee; }
        .receipt-preview .receipt-table td:last-child, .receipt-preview .receipt-table th:last-child { text-align: right; }
        .receipt-preview .receipt-total-row td { font-weight: 700; border-top: 2px solid #1a1a1a; border-bottom: 2px solid #1a1a1a; }
        .receipt-preview .receipt-policy-item { font-size: 0.7rem; line-height: 1.45; color: #333; margin-bottom: 0.3rem; padding-left: 0.9rem; position: relative; }
        .receipt-preview .receipt-policy-item::before { content: '\\2022'; position: absolute; left: 0.2rem; color: #888; }
        .receipt-preview .receipt-policy-block { font-size: 0.7rem; line-height: 1.45; color: #333; margin-bottom: 0.3rem; }
        .receipt-preview .receipt-footer { text-align: center; border-top: 2px solid #1a1a1a; padding-top: 0.75rem; margin-top: 1.25rem; }
        .receipt-preview .receipt-footer p { font-size: 0.65rem; color: #666; margin: 0.1rem 0; }
        .receipt-preview .receipt-powered { font-size: 0.55rem; color: #999; margin-top: 0.4rem; }
        .receipt-preview .receipt-badge { display: inline-block; font-size: 0.6rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 2px; letter-spacing: 0.05em; }
        .receipt-preview .receipt-badge-confirmed { background: #e8f5e9; color: #2e7d32; border: 1px solid #2e7d32; }
        .receipt-preview .receipt-badge-checked-in { background: #e3f2fd; color: #1565c0; border: 1px solid #1565c0; }
        .receipt-preview .receipt-badge-checked-out { background: #f3e5f5; color: #7b1fa2; border: 1px solid #7b1fa2; }
        .receipt-preview .receipt-badge-cancelled { background: #fbe9e7; color: #c62828; border: 1px solid #c62828; }
        .receipt-preview .receipt-signature-area { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #ddd; }
        .receipt-preview .receipt-signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem; }
        .receipt-preview .receipt-signature-line { border-top: 1px solid #1a1a1a; width: 200px; margin-top: 0.25rem; }
        .receipt-preview .receipt-agreement { font-size: 0.7rem; line-height: 1.45; color: #333; margin-bottom: 0.75rem; }
      `}</style>

      <div ref={receiptRef} className="receipt-preview" style={{ padding: '1.5rem' }}>
        <div className="receipt-header">
          <h1 className="receipt-hotel-name">City Den Apartments</h1>
          <p className="receipt-branch">{branch.name}</p>
          <p className="receipt-address">{branch.address}</p>
          <p className="receipt-contact">
            {p.contactPhone && <span>{p.contactPhone}</span>}
            {p.contactEmail && <span> | {p.contactEmail}</span>}
          </p>
          <h2 className="receipt-title-section">Booking Confirmation Voucher</h2>
          <p className="receipt-ref">{booking.bookingReference}</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.65rem', color: '#888' }}>
            Status:{' '}
            <span className={`receipt-badge receipt-badge-${booking.bookingStatus === 'checked_in' ? 'checked-in' : booking.bookingStatus === 'checked_out' ? 'checked-out' : booking.bookingStatus === 'cancelled' ? 'cancelled' : 'confirmed'}`}>
              {booking.bookingStatus === 'checked_in' ? 'CHECKED IN' : booking.bookingStatus === 'checked_out' ? 'CHECKED OUT' : booking.bookingStatus === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}
            </span>
          </p>
        </div>

        <div className="receipt-section-title">Guest Information</div>
        <div className="receipt-grid-2">
          <div>
            <p className="receipt-label">Guest Name</p>
            <p className="receipt-value">{booking.guestDetails.name}</p>
          </div>
          <div>
            <p className="receipt-label">Phone</p>
            <p className="receipt-value">{booking.guestDetails.phone}</p>
          </div>
          {booking.guestDetails.email && (
            <div>
              <p className="receipt-label">Email</p>
              <p className="receipt-value">{booking.guestDetails.email}</p>
            </div>
          )}
          <div>
            <p className="receipt-label">Number of Guests</p>
            <p className="receipt-value">{booking.numberOfGuests}</p>
          </div>
          {booking.guestDetails.address && (
            <div>
              <p className="receipt-label">Address</p>
              <p className="receipt-value">{booking.guestDetails.address}</p>
            </div>
          )}
          {booking.guestDetails.nationality && (
            <div>
              <p className="receipt-label">Nationality</p>
              <p className="receipt-value">{booking.guestDetails.nationality}</p>
            </div>
          )}
          <div>
            <p className="receipt-label">Booking Source</p>
            <p className="receipt-value">{booking.bookingSource === 'walk_in' ? 'Walk-in' : booking.bookingSource}</p>
          </div>
        </div>

        <div className="receipt-section-title">Stay Details</div>
        <div className="receipt-grid-3">
          <div>
            <p className="receipt-label">Rooms</p>
            {(booking.rooms || []).map((r, i) => (
              <div key={i}>
                <p className="receipt-value">{r.roomId.roomNumber}</p>
                {r.roomId.roomTypeId && <p style={{ fontSize: '0.65rem', color: '#888' }}>{r.roomId.roomTypeId.name}</p>}
              </div>
            ))}
          </div>
          <div>
            <p className="receipt-label">Check-in</p>
            <p className="receipt-value">{fmtDate(booking.checkInDate)}</p>
            <p style={{ fontSize: '0.65rem', color: '#888' }}>from {p.checkInTime || '14:00'}</p>
          </div>
          <div>
            <p className="receipt-label">Check-out</p>
            <p className="receipt-value">{fmtDate(booking.checkOutDate)}</p>
            <p style={{ fontSize: '0.65rem', color: '#888' }}>by {p.checkOutTime || '12:00'}</p>
          </div>
        </div>

        <div className="receipt-section-title">Payment Summary</div>
        <table className="receipt-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(booking.rooms || []).map((r, i) => (
              <tr key={i}>
                <td>Room {r.roomId.roomNumber}{r.roomId.roomTypeId ? ` — ${r.roomId.roomTypeId.name}` : ''}</td>
                <td>₦{r.actualPricePerNight.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}</td>
                <td>₦{r.totalForRoom.toLocaleString()}</td>
              </tr>
            ))}
            {booking.discount > 0 && (
              <tr>
                <td>
                  Discount
                  {booking.discountPercentage ? ` (${booking.discountPercentage}%)` : ''}
                  {booking.discountReason ? ` - ${booking.discountReason}` : ''}
                </td>
                <td></td>
                <td>-₦{booking.discount.toLocaleString()}</td>
              </tr>
            )}
            {booking.includeVat && booking.vatAmount ? (
              <tr>
                <td>VAT (7.5%)</td>
                <td></td>
                <td>₦{booking.vatAmount.toLocaleString()}</td>
              </tr>
            ) : null}
            {booking.includeServiceCharge && booking.serviceChargeAmount ? (
              <tr>
                <td>Service Charge (10%)</td>
                <td></td>
                <td>₦{booking.serviceChargeAmount.toLocaleString()}</td>
              </tr>
            ) : null}
            <tr className="receipt-total-row">
              <td colSpan={2}>Total Paid</td>
              <td>₦{booking.totalAmountPaid.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <div className="receipt-grid-2" style={{ marginTop: '0.35rem' }}>
          <div>
            <p className="receipt-label">Payment Method</p>
            <p className="receipt-value">{booking.paymentMethod.replace('_', ' ')}</p>
          </div>
          {booking.paymentReference && (
            <div>
              <p className="receipt-label">Payment Reference</p>
              <p className="receipt-value" style={{ fontFamily: 'Courier New, monospace', fontSize: '0.7rem' }}>{booking.paymentReference}</p>
            </div>
          )}
        </div>

        <div className="receipt-section-title">Hotel Policies & Information</div>
        <p className="receipt-policy-block"><strong>Check-in:</strong> {p.checkInTime || '14:00'} | <strong>Check-out:</strong> {p.checkOutTime || '12:00'}</p>
        {p.earlyCheckIn && <><p className="receipt-label">Early Check-in</p><p className="receipt-policy-block">{p.earlyCheckIn}</p></>}
        {p.lateCheckOut && <><p className="receipt-label">Late Check-out</p><p className="receipt-policy-block">{p.lateCheckOut}</p></>}
        {p.cancellation && <><p className="receipt-label">Cancellation Policy</p><p className="receipt-policy-block">{p.cancellation}</p></>}
        {p.houseRules && p.houseRules.length > 0 && (
          <><p className="receipt-label">House Rules</p>{p.houseRules.map((rule, i) => (
            <p key={i} className="receipt-policy-item">{rule}</p>
          ))}</>
        )}
        {p.paymentInfo && <><p className="receipt-label">Payment Information</p><p className="receipt-policy-block">{p.paymentInfo}</p></>}
        {p.breakfastInfo && <><p className="receipt-label">Breakfast</p><p className="receipt-policy-block">{p.breakfastInfo}</p></>}
        {p.additionalNotes && <><p className="receipt-label">Additional Notes</p><p className="receipt-policy-block">{p.additionalNotes}</p></>}

        <div className="receipt-section-title">Terms & Agreement</div>
        <p className="receipt-agreement">I have read and agree to the above Terms and Conditions, including the house rules, cancellation policy, and payment terms.</p>

        <div className="receipt-signature-area">
          <div className="receipt-signature-grid">
            <div>
              <p className="receipt-label">Guest Signature</p>
              <div className="receipt-signature-line"></div>
            </div>
            <div>
              <p className="receipt-label">Hotel Representative</p>
              <p style={{ fontSize: '0.7rem', color: '#333', marginTop: '0.1rem' }}>{receptionistName || ''}</p>
            </div>
          </div>
        </div>

        <div className="receipt-footer">
          <p>Thank you for choosing City Den Apartments — {branch.name}</p>
          <p>We wish you a pleasant stay!</p>
          {receptionistName && <p style={{ marginTop: '0.4rem', fontSize: '0.65rem' }}>Processed by: {receptionistName}</p>}
          <p style={{ marginTop: '0.2rem', fontSize: '0.6rem', color: '#999' }}>
            Generated on {fmtDateTime(booking.createdAt || new Date().toISOString())}
          </p>
          <p className="receipt-powered">Powered by City Den Apartments Management System</p>
        </div>

        <div style={{ textAlign: 'center', padding: '1rem 0 0', borderTop: '1px solid #eee', marginTop: '1rem' }}>
          <Button onClick={handlePrint} icon={<Printer size={14} />}>
            Print Receipt
          </Button>
        </div>
      </div>
    </>
  );
}
