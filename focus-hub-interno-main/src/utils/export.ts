/**
 * Export utility functions for Focus Hub
 */

export interface ExportData {
    headers: string[];
    rows: (string | number | boolean)[][];
}

/**
 * Convert data to CSV format and trigger download
 */
export function exportToCSV(data: ExportData, filename: string): void {
    const { headers, rows } = data;

    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...rows.map(row =>
            row.map(cell => {
                // Escape quotes and wrap in quotes if contains comma or quote
                const cellStr = String(cell ?? '');
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',')
        )
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${formatDateForFilename()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Format date for filename
 */
function formatDateForFilename(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Export tasks to CSV
 */
export function exportTasks(tasks: any[], users: any[]): void {
    const headers = ['ID', 'Título', 'Descrição', 'Status', 'Prioridade', 'Responsável', 'Data Limite', 'Criado Em'];

    const rows = tasks.map(task => {
        const assignee = users.find(u => u.id === task.assigneeId);
        return [
            task.id,
            task.title,
            task.description || '',
            task.status,
            task.priority,
            assignee?.name || 'Não atribuído',
            task.dueDate || '',
            task.createdAt || ''
        ];
    });

    exportToCSV({ headers, rows }, 'tarefas_focushub');
}

/**
 * Export check-ins to CSV
 */
export function exportCheckIns(checkIns: any[], users: any[]): void {
    const headers = ['ID', 'Usuário', 'Entrada', 'Saída', 'Relatório'];

    const rows = checkIns.map(ci => {
        const user = users.find(u => u.id === ci.userId);
        return [
            ci.id,
            user?.name || 'Desconhecido',
            ci.checkInTime || '',
            ci.checkOutTime || '',
            ci.dailyReport || ''
        ];
    });

    exportToCSV({ headers, rows }, 'checkins_focushub');
}

/**
 * Export goals to CSV
 */
export function exportGoals(goals: any[]): void {
    const headers = ['ID', 'Título', 'Tipo', 'Período', 'Progresso', 'Meta', 'Status'];

    const rows = goals.map(goal => [
        goal.id,
        goal.title,
        goal.type,
        goal.period,
        goal.currentValue || 0,
        goal.targetValue || 100,
        goal.status || 'em_andamento'
    ]);

    exportToCSV({ headers, rows }, 'metas_focushub');
}
