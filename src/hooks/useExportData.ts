import { useState } from 'react';

interface Column {
  key: string;
  label: string;
}

export function useExportData() {
  const [isExporting, setIsExporting] = useState(false);

  const exportCSV = (
    data: Record<string, unknown>[],
    filename: string,
    columns: Column[]
  ) => {
    setIsExporting(true);
    try {
      const headers = columns.map((col) => col.label).join(',');
      const rows = data.map((row) =>
        columns
          .map((col) => {
            const value = row[col.key];
            if (value === null || value === undefined) return '';
            const strValue = String(value);
            if (strValue.includes(',') || strValue.includes('"')) {
              return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
          })
          .join(',')
      );

      const csv = '\uFEFF' + [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportExcel = (
    data: Record<string, unknown>[],
    filename: string,
    columns: Column[]
  ) => {
    setIsExporting(true);
    try {
      const headers = columns.map((col) => `<th>${col.label}</th>`).join('');
      const rows = data
        .map(
          (row) =>
            '<tr>' +
            columns
              .map((col) => {
                const value = row[col.key];
                return `<td>${value !== null && value !== undefined ? value : ''}</td>`;
              })
              .join('') +
            '</tr>'
        )
        .join('');

      const table = `
        <table>
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      const blob = new Blob([table], {
        type: 'application/vnd.ms-excel;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting Excel:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportCSV, exportExcel, isExporting };
}
