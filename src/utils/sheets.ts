/**
 * Google Sheets / CSV Export Utilities for Focus Hub
 */

export interface ExportColumn<T> {
    header: string;
    accessor: (item: T) => string | number | undefined;
}

/**
 * Generate CSV string from data array
 */
export function generateCSV<T>(data: T[], columns: ExportColumn<T>[]): string {
    const headers = columns.map(c => `"${c.header}"`).join(',');

    const rows = data.map(item =>
        columns.map(col => {
            const value = col.accessor(item);
            if (value === undefined || value === null) return '""';
            // Escape quotes and wrap in quotes
            const strValue = String(value).replace(/"/g, '""');
            return `"${strValue}"`;
        }).join(',')
    );

    return [headers, ...rows].join('\n');
}

/**
 * Download CSV as file
 */
export function downloadCSV(csvContent: string, filename: string): void {
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Open CSV data in Google Sheets (creates new sheet with data)
 */
export function openInGoogleSheets(csvContent: string, title: string = 'Focus Hub Export'): void {
    // Open Google Sheets create new page

    // Open Google Sheets create new page
    // User will need to paste the data or we provide instructions
    const sheetsUrl = `https://docs.google.com/spreadsheets/create?title=${encodeURIComponent(title)}`;

    // Copy CSV to clipboard for easy paste
    navigator.clipboard.writeText(csvContent).then(() => {
        console.log('[Sheets] CSV copied to clipboard');
    }).catch(err => {
        console.error('[Sheets] Failed to copy:', err);
    });

    window.open(sheetsUrl, '_blank');
}

/**
 * Pre-configured column definitions for Tasks
 */
export const taskColumns: ExportColumn<any>[] = [
    { header: 'Título', accessor: t => t.title },
    { header: 'Descrição', accessor: t => t.description },
    { header: 'Status', accessor: t => t.status },
    { header: 'Prioridade', accessor: t => t.priority },
    { header: 'Responsável', accessor: t => t.assigneeName || t.assigneeId },
    { header: 'Data de Entrega', accessor: t => t.dueDate },
    { header: 'Tempo Estimado (min)', accessor: t => t.estimatedTime },
    { header: 'Criado em', accessor: t => t.createdAt },
];

/**
 * Pre-configured column definitions for Check-ins
 */
export const checkInColumns: ExportColumn<any>[] = [
    { header: 'Usuário', accessor: c => c.userName },
    { header: 'Data/Hora Entrada', accessor: c => c.checkInTime },
    { header: 'Data/Hora Saída', accessor: c => c.checkOutTime },
    { header: 'Relatório Diário', accessor: c => c.dailyReport },
    { header: 'Local', accessor: c => c.location },
];

export default { generateCSV, downloadCSV, openInGoogleSheets, taskColumns, checkInColumns };
