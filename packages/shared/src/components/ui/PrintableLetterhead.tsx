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
    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - City Den Apartments</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Serif:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 10mm 12mm 10mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Manrope', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
              padding: 4px;
            }
            /* Letterhead Header */
            .letterhead-header {
              display: flex !important;
              align-items: flex-start !important;
              justify-content: space-between !important;
              border-bottom: 2px solid #0f172a !important;
              padding-bottom: 12px !important;
              margin-bottom: 16px !important;
            }
            .brand-left {
              display: flex !important;
              align-items: center !important;
              gap: 12px !important;
            }
            .logo-img, img {
              width: 52px !important;
              height: 52px !important;
              max-width: 52px !important;
              max-height: 52px !important;
              object-fit: contain !important;
            }
            .brand-title {
              font-size: 16px !important;
              font-weight: 800 !important;
              letter-spacing: 0.12em !important;
              color: #0f172a !important;
              text-transform: uppercase !important;
              margin: 0 !important;
              line-height: 1.2 !important;
            }
            .brand-address {
              font-size: 11px !important;
              font-style: italic !important;
              color: #475569 !important;
              margin-top: 2px !important;
            }
            .report-title-box {
              text-align: right !important;
            }
            .report-title {
              font-size: 14px !important;
              font-weight: 800 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
              color: #0f172a !important;
              margin: 0 !important;
            }
            .report-subtitle {
              font-size: 10px !important;
              color: #475569 !important;
              margin-top: 2px !important;
            }
            .report-date {
              font-size: 11px !important;
              font-weight: 700 !important;
              color: #0284c7 !important;
              margin-top: 4px !important;
            }
            /* Metrics Banner Grid */
            .metrics-grid {
              display: flex !important;
              flex-wrap: nowrap !important;
              gap: 10px !important;
              margin-bottom: 16px !important;
              width: 100% !important;
            }
            .metric-card {
              flex: 1 1 0px !important;
              min-width: 0 !important;
              border: 1px solid #cbd5e1 !important;
              background-color: #f8fafc !important;
              padding: 8px 10px !important;
              border-radius: 6px !important;
              box-sizing: border-box !important;
            }
            .metric-label {
              font-size: 9px !important;
              font-weight: 700 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.08em !important;
              color: #64748b !important;
              margin: 0 !important;
            }
            .metric-value {
              font-size: 13px !important;
              font-weight: 800 !important;
              color: #0f172a !important;
              margin-top: 2px !important;
              margin-bottom: 0 !important;
            }
            /* Table Styling */
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-bottom: 16px !important;
              font-size: 10.5px !important;
            }
            thead {
              display: table-header-group !important;
            }
            tr {
              page-break-inside: avoid !important;
            }
            th {
              background-color: #f1f5f9 !important;
              color: #0f172a !important;
              font-weight: 700 !important;
              text-transform: uppercase !important;
              font-size: 9px !important;
              letter-spacing: 0.05em !important;
              padding: 7px 6px !important;
              border: 1px solid #cbd5e1 !important;
            }
            td {
              padding: 6px !important;
              border: 1px solid #cbd5e1 !important;
              color: #1e293b !important;
            }
            tr:nth-child(even) td {
              background-color: #f8fafc !important;
            }
            .totals-row td {
              background-color: #e2e8f0 !important;
              font-weight: 800 !important;
              color: #0f172a !important;
              border-top: 2px solid #0f172a !important;
            }
            /* Signature & Notes Section */
            .notes-box {
              margin-top: 10px !important;
              padding: 8px 10px !important;
              border-radius: 6px !important;
              background-color: #f8fafc !important;
              border: 1px solid #e2e8f0 !important;
              font-size: 10px !important;
              color: #334155 !important;
            }
            .signature-section {
              margin-top: 24px !important;
              display: flex !important;
              justify-content: space-between !important;
              gap: 20px !important;
              page-break-inside: avoid !important;
            }
            .sig-box {
              flex: 1 !important;
              border-top: 1px solid #94a3b8 !important;
              padding-top: 6px !important;
              font-size: 10px !important;
              color: #475569 !important;
            }
            .footer-meta {
              margin-top: 20px !important;
              padding-top: 8px !important;
              border-top: 1px solid #e2e8f0 !important;
              display: flex !important;
              justify-content: space-between !important;
              font-size: 9px !important;
              color: #64748b !important;
              page-break-inside: avoid !important;
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
    }, 350);
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
      <div ref={printRef} className="bg-white p-6 rounded-lg border border-outline-variant text-on-surface shadow-sm max-w-full overflow-hidden">
        {/* Letterhead Header */}
        <div className="letterhead-header flex items-start justify-between border-b-2 border-on-surface pb-4 mb-4">
          <div className="brand-left flex items-center gap-3">
            <img
              src={cdLogo}
              alt="Logo"
              style={{ width: 52, height: 52, maxWidth: 52, maxHeight: 52, objectFit: 'contain' }}
              className="logo-img shrink-0"
            />
            <div>
              <h2 className="brand-title text-base font-extrabold tracking-wider uppercase text-on-surface leading-tight">
                {branchName}
              </h2>
              <p className="brand-address text-xs italic text-on-surface-variant mt-0.5">{branchAddress}</p>
            </div>
          </div>
          <div className="report-title-box text-right">
            <h1 className="report-title text-sm font-extrabold uppercase tracking-wide text-on-surface">{title}</h1>
            {subtitle && <p className="report-subtitle text-xs text-on-surface-variant font-medium">{subtitle}</p>}
            <p className="report-date text-xs font-bold text-primary mt-1">DATE — {currentDateStr.toUpperCase()}</p>
          </div>
        </div>

        {/* Summary Metrics Cards Grid */}
        {metrics && metrics.length > 0 && (
          <div className="metrics-grid flex flex-wrap sm:flex-nowrap gap-2.5 mb-4 w-full">
            {metrics.map((m, i) => (
              <div key={i} className="metric-card flex-1 min-w-[120px] p-2.5 rounded border border-outline-variant bg-surface-container-lowest">
                <p className="metric-label text-[10px] font-bold uppercase tracking-wider text-outline">{m.label}</p>
                <p className="metric-value text-sm font-extrabold text-on-surface mt-0.5">{m.value}</p>
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
          <div className="notes-box mt-3 p-2.5 rounded bg-surface-container-lowest border border-outline-variant text-xs text-on-surface-variant">
            <span className="font-bold text-on-surface uppercase text-[10px] tracking-wider block mb-1">Notes / Instructions:</span>
            {notes}
          </div>
        )}

        {/* Signature Verification Block */}
        {showSignatureBlock && (
          <div className="signature-section mt-8 flex justify-between gap-6 pt-4 text-xs text-outline border-t border-dashed border-outline-variant">
            <div className="sig-box flex-1 border-t border-outline-variant pt-1">
              <p className="font-semibold text-on-surface">Inspected / Prepared By</p>
              <p className="text-[10px] text-outline mt-0.5">Name & Signature</p>
            </div>
            <div className="sig-box flex-1 border-t border-outline-variant pt-1">
              <p className="font-semibold text-on-surface">Verified / Manager Signoff</p>
              <p className="text-[10px] text-outline mt-0.5">Name & Signature</p>
            </div>
            <div className="sig-box flex-1 border-t border-outline-variant pt-1">
              <p className="font-semibold text-on-surface">Date</p>
              <p className="text-[10px] text-outline mt-0.5">DD / MM / YYYY</p>
            </div>
          </div>
        )}

        {/* Footer Metadata */}
        <div className="footer-meta mt-6 pt-3 border-t border-outline-variant/60 flex items-center justify-between text-[10px] text-outline font-medium">
          <span>Printed on {printTimestampStr} · Website: <strong>citydenapartments.com</strong></span>
          <span>City Den Apartments Operations System · Confidential</span>
        </div>
      </div>
    </div>
  );
}
