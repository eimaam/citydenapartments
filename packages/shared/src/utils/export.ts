import jsPDF, { GState } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);

export interface ExportColumn<T = any> {
  title: string;
  dataIndex?: keyof T & string;
  key?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: T, index: number) => string;
}

export interface ExportOptions<T = any> {
  filename: string;
  columns: ExportColumn<T>[];
  data: T[];
  title?: string;
  subtitle?: string;
}

const BRAND = {
  name: 'City Den Apartments',
  primary: [59, 130, 246] as const,
  primaryDark: [30, 64, 175] as const,
  accent: [212, 175, 55] as const,
  text: [30, 30, 40] as const,
  textMuted: [100, 100, 110] as const,
  bgAlt: [248, 249, 250] as const,
  border: [220, 222, 228] as const,
  headerBg: [30, 30, 40] as const,
};

function isNumericColumn(values: string[]): boolean {
  if (values.length === 0) return false;
  const sample = values.filter(Boolean).slice(0, 10);
  if (sample.length === 0) return false;
  return sample.every((v) => /^[\d,]+$/.test(v.replace(/[₦$€£NGN]/g, '').trim()));
}

function resolveValue<T>(record: T, column: ExportColumn<T>, index: number): string {
  if (column.render) {
    const val = column.dataIndex ? record[column.dataIndex] : undefined;
    return column.render(val, record, index);
  }
  if (column.dataIndex) {
    const val = record[column.dataIndex];
    return val == null ? '' : String(val);
  }
  return '';
}

export function exportToCSV<T>({ filename, columns, data }: ExportOptions<T>): string | void {
  const headers = columns.map((c) => c.title);
  const rows = data.map((record, i) =>
    columns.map((col) => {
      const val = resolveValue(record, col, i);
      return `"${String(val).replace(/"/g, '""')}"`;
    }),
  );

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPDF<T>({ filename, columns, data, title, subtitle }: ExportOptions<T>): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 10;

  const headerRow = columns.map((c) => c.title);
  const bodyRows = data.map((record, i) =>
    columns.map((col) => resolveValue(record, col, i).replace(/\u20A6/g, 'NGN ')),
  );

  const numericCols = columns.map((_, ci) =>
    isNumericColumn(bodyRows.map((r) => r[ci])),
  );

  const columnStyles: Record<number, any> = {};
  columns.forEach((col, i) => {
    const align = col.align || (numericCols[i] ? 'right' : 'left');
    columnStyles[i] = { halign: align };
  });

  // ── First-page header ──
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pw, 3, 'F');

  doc.setFontSize(16);
  doc.setTextColor(...BRAND.primaryDark);
  doc.text(title || 'Report', m, 10);

  const dateStr = new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
  doc.setFontSize(6.5);
  doc.setTextColor(...BRAND.textMuted);
  doc.text(`Generated: ${dateStr}${subtitle ? ` \u2022 ${subtitle}` : ''}`, m, 14.5);

  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.4);
  doc.line(m, 16.5, pw - m, 16.5);

  // ── Table ──
  (doc as any).autoTable({
    head: [headerRow],
    body: bodyRows,
    startY: 20,
    tableWidth: 'auto',
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      lineColor: BRAND.border,
      lineWidth: 0.1,
      textColor: BRAND.text,
    },
    headStyles: {
      fillColor: BRAND.headerBg,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    bodyStyles: { valign: 'middle' },
    alternateRowStyles: { fillColor: BRAND.bgAlt },
    columnStyles,
    margin: { top: 20, right: m, bottom: 18, left: m },
    didDrawPage: (d: any) => {
      const pg = (doc as any).internal.getNumberOfPages();

      // Watermark
      doc.saveGraphicsState();
      doc.setGState(new GState({ opacity: 0.06 }));
      doc.setFontSize(56);
      doc.setTextColor(0, 0, 0);
      doc.text('City Den Apartments', pw / 2, ph / 2, { align: 'center', angle: -30 });
      doc.restoreGraphicsState();

      if (d.pageNumber > 1) {
        doc.setFillColor(...BRAND.primary);
        doc.rect(0, 0, pw, 3, 'F');
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text('CITY DEN APARTMENTS', m, 2.2);
        doc.setFontSize(5);
        doc.text(`${title || 'Report'} (cont.)`, pw - m, 2.2, { align: 'right' });
      }

      const fy = ph - 6;
      doc.setDrawColor(...BRAND.border);
      doc.setLineWidth(0.2);
      doc.line(m, fy + 2.5, pw - m, fy + 2.5);
      doc.setFontSize(6);
      doc.setTextColor(...BRAND.textMuted);
      doc.text('City Den Apartments \u2014 Management System', m, fy + 5.5);
      doc.text(`Page ${d.pageNumber} of ${pg}`, pw - m, fy + 5.5, { align: 'right' });
    },
  });

  doc.save(`${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
}