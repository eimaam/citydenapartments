"use client";

import React, { useRef } from 'react';
import cdLogo from '../../assets/images/logo.png';
import { Button } from './Button';
import { Printer, Download } from 'lucide-react';

export interface PrintMetric {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface PrintColumn<T> {
  title: string;
  key: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (val: any, row: T, index: number) => React.ReactNode;
}

export interface PrintableLetterheadProps<T> {
  title: string;
  subtitle?: string;
  date?: string;
  branchName?: string;
  branchAddress?: string;
  metrics?: PrintMetric[];
  columns: PrintColumn<T>[];
  data: T[];
  totalsRow?: Record<string, string | number>;
  onCsvDownload?: () => void;
  showSignatureBlock?: boolean;
  notes?: string;
}

export function PrintableLetterhead<T>({
  title,
  subtitle,
  date,
  branchName = 'CITY DEN APARTMENTS',
  branchAddress = 'No 5 Audu Ogbe street Jabi. FCT',
  metrics,
  columns,
  data,
  totalsRow,
  onCsvDownload,
  showSignatureBlock = true,
  notes,
}: PrintableLetterheadProps<T>) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - City Den Apartments</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 10mm 15mm 10mm;
            }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #0f172a;
              background: #fff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-container {
              width: 100%;
              max-width: 210mm;
              margin: 0 auto;
            }
            /* Header Letterhead */
            .letterhead-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .brand-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo-img {
              width: 48px;
              height: 48px;
              object-fit: contain;
            }
            .brand-title {
              font-size: 18px;
              font-weight: 800;
              letter-spacing: 0.15em;
              color: #0f172a;
              text-transform: uppercase;
              margin: 0;
            }
            .brand-address {
              font-size: 11px;
              font-style: italic;
              color: #475569;
              margin-top: 2px;
            }
            .report-title-box {
              text-align: right;
            }
            .report-title {
              font-size: 15px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #0f172a;
              margin: 0;
            }
            .report-date {
              font-size: 11px;
              font-weight: 700;
              color: #0284c7;
              margin-top: 4px;
            }
            /* Metrics Banner */
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
              gap: 8px;
              margin-bottom: 16px;
            }
            .metric-card {
              border: 1px solid #e2e8f0;
              background-color: #f8fafc;
              padding: 8px 10px;
              border-radius: 6px;
            }
            .metric-label {
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
            }
            .metric-value {
              font-size: 14px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 2px;
            }
            /* Table Styling */
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
              font-size: 11px;
            }
            thead {
              display: table-header-group;
            }
            tr {
              page-break-inside: avoid;
            }
            th {
              background-color: #f1f5f9;
              color: #0f172a;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.05em;
              padding: 8px 6px;
              border: 1px solid #cbd5e1;
            }
            td {
              padding: 6px;
              border: 1px solid #e2e8f0;
              color: #1e293b;
            }
            tr:nth-child(even) td {
              background-color: #fafafa;
            }
            .totals-row td {
              background-color: #f1f5f9 !important;
              font-weight: 800;
              color: #0f172a;
              border-top: 2px solid #0f172a;
            }
            /* Signature & Footer */
            .signature-section {
              margin-top: 24px;
              display: flex;
              justify-content: space-between;
              gap: 20px;
              page-break-inside: avoid;
            }
            .sig-box {
              flex: 1;
              border-top: 1px solid #94a3b8;
              padding-top: 6px;
              font-size: 10px;
              color: #475569;
            }
            .footer-meta {
              margin-top: 20px;
              padding-top: 8px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #64748b;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const currentDateStr = date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const printTimestampStr = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4">
      {/* Control Buttons */}
      <div className="flex justify-end gap-2 print:hidden">
        {onCsvDownload && (
          <Button variant="secondary" size="sm" onClick={onCsvDownload} className="gap-1.5">
            <Download size={14} /> Download CSV
          </Button>
        )}
        <Button size="sm" onClick={handlePrint} className="gap-1.5">
          <Printer size={14} /> Print Document
        </Button>
      </div>

      {/* Printable Area Container */}
      <div ref={printRef} className="bg-white p-6 rounded-lg border border-outline-variant text-on-surface shadow-sm">
        {/* Letterhead Header */}
        <div className="letterhead-header flex items-start justify-between border-b-2 border-on-surface pb-4 mb-4">
          <div className="flex items-center gap-3">
            <img src={cdLogo} alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <h2 className="text-base font-extrabold tracking-wider uppercase text-on-surface leading-tight">
                {branchName}
              </h2>
              <p className="text-xs italic text-on-surface-variant mt-0.5">{branchAddress}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-sm font-extrabold uppercase tracking-wide text-on-surface">{title}</h1>
            {subtitle && <p className="text-xs text-on-surface-variant font-medium">{subtitle}</p>}
            <p className="text-xs font-bold text-primary mt-1">DATE — {currentDateStr.toUpperCase()}</p>
          </div>
        </div>

        {/* Optional Summary Metrics Cards */}
        {metrics && metrics.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {metrics.map((m, i) => (
              <div key={i} className="p-2.5 rounded border border-outline-variant bg-surface-container-lowest">
                <p className="text-[10px] font-bold uppercase tracking-wider text-outline">{m.label}</p>
                <p className="text-sm font-extrabold text-on-surface mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant text-[10px] font-bold uppercase text-outline">
                <th className="p-2 border border-outline-variant w-10 text-center">S/N</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={`p-2 border border-outline-variant ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="border-b border-outline-variant/60 hover:bg-surface-container/30">
                  <td className="p-2 border border-outline-variant text-center font-mono text-outline">{idx + 1}</td>
                  {columns.map((col) => {
                    const val = (row as any)[col.key];
                    return (
                      <td
                        key={col.key}
                        className={`p-2 border border-outline-variant ${
                          col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(val, row, idx) : val != null ? String(val) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {totalsRow && (
                <tr className="totals-row font-bold bg-surface-container border-t-2 border-on-surface text-on-surface">
                  <td className="p-2 border border-outline-variant text-center font-mono">TOTAL</td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`p-2 border border-outline-variant ${
                        col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {totalsRow[col.key] != null ? totalsRow[col.key] : ''}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Optional Notes */}
        {notes && (
          <div className="mt-3 p-2.5 rounded bg-surface-container-lowest border border-outline-variant text-xs text-on-surface-variant">
            <span className="font-bold text-on-surface uppercase text-[10px] tracking-wider block mb-1">Notes / Instructions:</span>
            {notes}
          </div>
        )}

        {/* Signature Verification Block */}
        {showSignatureBlock && (
          <div className="mt-8 flex justify-between gap-6 pt-4 text-xs text-outline border-t border-dashed border-outline-variant">
            <div className="flex-1 border-t border-outline-variant pt-1">
              <p className="font-semibold text-on-surface">Inspected / Prepared By</p>
              <p className="text-[10px] text-outline mt-0.5">Name & Signature</p>
            </div>
            <div className="flex-1 border-t border-outline-variant pt-1">
              <p className="font-semibold text-on-surface">Verified / Manager Signoff</p>
              <p className="text-[10px] text-outline mt-0.5">Name & Signature</p>
            </div>
            <div className="flex-1 border-t border-outline-variant pt-1">
              <p className="font-semibold text-on-surface">Date</p>
              <p className="text-[10px] text-outline mt-0.5">DD / MM / YYYY</p>
            </div>
          </div>
        )}

        {/* Footer Metadata */}
        <div className="mt-6 pt-3 border-t border-outline-variant/60 flex items-center justify-between text-[10px] text-outline font-medium">
          <span>Printed on {printTimestampStr} · Website: <strong>citydenapartments.com</strong></span>
          <span>City Den Apartments Operations System · Confidential</span>
        </div>
      </div>
    </div>
  );
}
