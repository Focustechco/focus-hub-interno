export const formatDate = (dateString?: string, includeTime: boolean = false): string => {
    if (!dateString) return '';

    // Handle "YYYY-MM-DD" (no time) explicitly to render as local date
    // If we use new Date("YYYY-MM-DD"), it treats it as UTC, usually resulting in the previous day in Brazil (UTC-3)
    if (dateString.length === 10 && !dateString.includes('T')) {
        const [year, month, day] = dateString.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        return localDate.toLocaleDateString('pt-BR');
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid

    const options: Intl.DateTimeFormatOptions = {
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
