import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDateTime } from '../lib/constants';

interface ExportConfig {
  title: string;
  subtitle?: string;
  businessName: string;
  dateRange?: { from: string; to: string };
}

interface TableColumn {
  header: string;
  key: string;
  format?: 'currency' | 'number' | 'date' | 'percent';
  width?: number;
}

interface KPI {
  label: string;
  value: number | string;
  format?: 'currency' | 'number' | 'percent';
}

export function usePDFExport() {
  const formatValue = (value: number | string, format?: string): string => {
    if (typeof value === 'string') return value;
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'number':
        return value.toLocaleString('es-MX');
      default:
        return String(value);
    }
  };

  const exportReportPDF = (
    config: ExportConfig,
    kpis: KPI[],
    tableData: Record<string, unknown>[],
    columns: TableColumn[]
  ) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55);
    doc.text(config.businessName, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(16);
    doc.setTextColor(55, 65, 81);
    doc.text(config.title, pageWidth / 2, y, { align: 'center' });
    y += 7;

    if (config.subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(config.subtitle, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }

    if (config.dateRange) {
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Periodo: ${config.dateRange.from} - ${config.dateRange.to}`,
        pageWidth / 2,
        y,
        { align: 'center' }
      );
      y += 5;
    }

    doc.setFontSize(8);
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // KPIs section
    if (kpis.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text('Resumen', 14, y);
      y += 8;

      const kpiPerRow = 3;
      const kpiWidth = (pageWidth - 28) / kpiPerRow;

      kpis.forEach((kpi, index) => {
        const col = index % kpiPerRow;
        const row = Math.floor(index / kpiPerRow);
        const x = 14 + col * kpiWidth;
        const kpiY = y + row * 20;

        // KPI box
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(x, kpiY - 5, kpiWidth - 4, 18, 2, 2, 'F');

        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(kpi.label, x + 4, kpiY + 2);

        doc.setFontSize(12);
        doc.setTextColor(31, 41, 55);
        doc.text(formatValue(kpi.value, kpi.format), x + 4, kpiY + 10);
      });

      y += Math.ceil(kpis.length / kpiPerRow) * 20 + 10;
    }

    // Table
    if (tableData.length > 0) {
      const headers = columns.map((col) => col.header);
      const rows = tableData.map((row) =>
        columns.map((col) => {
          const value = row[col.key];
          if (value === undefined || value === null) return '';
          if (col.format === 'currency' && typeof value === 'number') {
            return formatCurrency(value);
          }
          if (col.format === 'percent' && typeof value === 'number') {
            return `${value.toFixed(1)}%`;
          }
          if (col.format === 'date' && typeof value === 'string') {
            return new Date(value).toLocaleDateString('es-MX');
          }
          return String(value);
        })
      );

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: y,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        margin: { left: 14, right: 14 },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const filename = `${config.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  const exportSalesReportPDF = (
    businessName: string,
    period: string,
    dateRange: { from: string; to: string },
    data: {
      totalSales: number;
      totalTickets: number;
      averageTicket: number;
      cashAmount: number;
      cardAmount: number;
      terminalAmount: number;
      transferAmount: number;
      topProducts: { name: string; quantity: number; total: number }[];
      dailyBreakdown: { date: string; total: number; tickets: number }[];
    }
  ) => {
    const kpis: KPI[] = [
      { label: 'Ventas Totales', value: data.totalSales, format: 'currency' },
      { label: 'Tickets', value: data.totalTickets, format: 'number' },
      { label: 'Ticket Promedio', value: data.averageTicket, format: 'currency' },
      { label: 'Efectivo', value: data.cashAmount, format: 'currency' },
      { label: 'Tarjeta', value: data.cardAmount, format: 'currency' },
      { label: 'Terminal', value: data.terminalAmount, format: 'currency' },
    ];

    const columns: TableColumn[] = [
      { header: 'Fecha', key: 'date', format: 'date' },
      { header: 'Ventas', key: 'total', format: 'currency' },
      { header: 'Tickets', key: 'tickets', format: 'number' },
      { header: 'Promedio', key: 'average', format: 'currency' },
    ];

    const tableData = data.dailyBreakdown.map((d) => ({
      date: d.date,
      total: d.total,
      tickets: d.tickets,
      average: d.tickets > 0 ? d.total / d.tickets : 0,
    }));

    exportReportPDF(
      {
        title: 'Reporte de Ventas',
        subtitle: period === 'today' ? 'Hoy' : period === 'week' ? 'Esta Semana' : 'Este Mes',
        businessName,
        dateRange,
      },
      kpis,
      tableData,
      columns
    );
  };

  return { exportReportPDF, exportSalesReportPDF };
}
