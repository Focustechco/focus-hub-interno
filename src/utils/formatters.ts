export const formatDate = (dateString?: string, includeTime: boolean = false): string => {
    if (!dateString) return '';

    // Handle "YYYY-MM-DD" (no time) explicitly to render as local date
    // If we use new Date("YYYY-MM-DD"), it treats it as UTC, usually resulting in the previous day in Brazil (UTC-3)
    if (dateString.length === 10 && !dateString.includes('T')) {
        const [year, month, day] = dateString.split('-').map(Number);
        // Since dateString is YYYY-MM-DD, we can just append T12:00:00 to force midday and then format
        // Or better, just split and format manually to avoid any timezone shifts
        // existing logic: const localDate = new Date(year, month - 1, day);
        // This creates a date at 00:00 local system time.
        // If we want strict visual representation of that string regardless of where we are, manually formatting is safest for "dates without time"
        // But the requirement says "Consistency". If backend sends 2024-12-25, it probably means 2024-12-25 in Sao Paulo.
        // The existing logic already does `new Date(year, month - 1, day)` which works for display as-is.
        // I will just leave it but maybe ensure locale matches.
        const localDate = new Date(year, month - 1, day);
        return localDate.toLocaleDateString('pt-BR');
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid

    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    };

    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }

    return date.toLocaleString('pt-BR', options);
};

export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};
