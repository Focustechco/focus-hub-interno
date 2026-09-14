export const formatDate = (dateString?: string, includeTime: boolean = false): string => {
    if (!dateString) return '';

    // Parse date parts manually to avoid timezone issues
    let year: number, month: number, day: number, hours = 0, minutes = 0;

    if (dateString.includes('T')) {
        // Format: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss...
        const parts = dateString.split('T');
        const datePart = parts[0] || '';
        const timePart = parts[1] || '';
        const dateParts = datePart.split('-').map(Number);
        year = dateParts[0] || 2025;
        month = dateParts[1] || 1;
        day = dateParts[2] || 1;

        if (timePart) {
            const timeParts = timePart.split(':').map(Number);
            hours = timeParts[0] || 0;
            minutes = timeParts[1] || 0;
        }
    } else if (dateString.includes(' ')) {
        // Format: YYYY-MM-DD HH:MM:SS (PostgreSQL format)
        const parts = dateString.split(' ');
        const datePart = parts[0] || '';
        const timePart = parts[1] || '';
        const dateParts = datePart.split('-').map(Number);
        year = dateParts[0] || 2025;
        month = dateParts[1] || 1;
        day = dateParts[2] || 1;

        if (timePart) {
            const timeParts = timePart.split(':').map(Number);
            hours = timeParts[0] || 0;
            minutes = timeParts[1] || 0;
        }
    } else if (dateString.length >= 10) {
        // Format: YYYY-MM-DD (date only)
        const dateParts = dateString.slice(0, 10).split('-').map(Number);
        year = dateParts[0] || 2025;
        month = dateParts[1] || 1;
        day = dateParts[2] || 1;
    } else {
        // Fallback for other formats - try native parsing
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

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
    }

    // Format output
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const yearStr = year;

    if (includeTime && (hours !== 0 || minutes !== 0)) {
        const hoursStr = String(hours).padStart(2, '0');
        const minutesStr = String(minutes).padStart(2, '0');
        return `${dayStr}/${monthStr}/${yearStr}, ${hoursStr}:${minutesStr}`;
    }

    return `${dayStr}/${monthStr}/${yearStr}`;
};

export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};
