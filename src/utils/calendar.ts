/**
 * Google Calendar Integration Utility for Focus Hub
 * Provides helpers for Google Calendar API integration
 */

// Calendar event format
export interface CalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    start: {
        dateTime: string;
        timeZone?: string;
    };
    end: {
        dateTime: string;
        timeZone?: string;
    };
    colorId?: string;
    reminders?: {
        useDefault: boolean;
        overrides?: Array<{ method: string; minutes: number }>;
    };
}

// Google Calendar color IDs
export const CALENDAR_COLORS = {
    lavender: '1',
    sage: '2',
    grape: '3',
    flamingo: '4',
    banana: '5',
    tangerine: '6',
    peacock: '7',
    graphite: '8',
    blueberry: '9',
    basil: '10',
    tomato: '11',
};

// Priority to color mapping
export const PRIORITY_COLORS = {
    alta: CALENDAR_COLORS.tomato,
    media: CALENDAR_COLORS.tangerine,
    baixa: CALENDAR_COLORS.sage,
};

/**
 * Parse a date string to a local Date object.
 * Supports formats: YYYY-MM-DD, YYYY-MM-DDTHH:mm, YYYY-MM-DD HH:MM:SS
 * Avoids the UTC midnight interpretation that causes the "21:00" bug in UTC-3 timezone.
 */
function parseLocalDate(dateString: string): Date {
    let datePart: string;
    let timePart: string | undefined;

    // Check for T separator (ISO format)
    if (dateString.includes('T')) {
        const parts = dateString.split('T');
        datePart = parts[0] || '';
        timePart = parts[1];
    }
    // Check for space separator (PostgreSQL format)
    else if (dateString.includes(' ')) {
        const parts = dateString.split(' ');
        datePart = parts[0] || '';
        timePart = parts[1];
    }
    // Date only
    else {
        datePart = dateString.slice(0, 10);
        timePart = undefined;
    }

    const dateParts = datePart.split('-').map(Number);
    const year = dateParts[0] || 2025;
    const month = dateParts[1] || 1;
    const day = dateParts[2] || 1;

    if (timePart) {
        const timeParts = timePart.split(':').map(Number);
        const hours = timeParts[0] || 0;
        const minutes = timeParts[1] || 0;
        return new Date(year, month - 1, day, hours, minutes);
    }

    // Date only - default to 9:00 AM local time for calendar events
    return new Date(year, month - 1, day, 9, 0);
}

/**
 * Convert a Focus Hub task to a Google Calendar event
 */
export function taskToCalendarEvent(task: {
    title: string;
    description?: string;
    dueDate: string;
    priority?: string;
    estimatedTime?: number;
}): CalendarEvent {
    const startDate = parseLocalDate(task.dueDate);
    const endDate = new Date(startDate);

    // Add estimated time or default 1 hour
    const durationMinutes = task.estimatedTime || 60;
    endDate.setMinutes(endDate.getMinutes() + durationMinutes);

    return {
        summary: `[Focus Hub] ${task.title}`,
        description: task.description || '',
        start: {
            dateTime: startDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
            dateTime: endDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        colorId: task.priority ? PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] : undefined,
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 30 },
                { method: 'popup', minutes: 1440 }, // 1 day before
            ],
        },
    };
}

/**
 * Generate Google Calendar URL for adding an event
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
    const baseUrl = 'https://calendar.google.com/calendar/render';

    const startDate = new Date(event.start.dateTime);
    const endDate = new Date(event.end.dateTime);

    // Format dates for Google Calendar (YYYYMMDDTHHmmssZ)
    const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.summary,
        details: event.description || '',
        dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    });

    return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate ICS file content for calendar import
 */
export function generateICSContent(events: CalendarEvent[]): string {
    const formatICSDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsEvents = events.map(event => `
BEGIN:VEVENT
DTSTART:${formatICSDate(event.start.dateTime)}
DTEND:${formatICSDate(event.end.dateTime)}
SUMMARY:${event.summary}
DESCRIPTION:${event.description || ''}
END:VEVENT`).join('\n');

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Focus Hub//NONSGML v1.0//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${icsEvents}
END:VCALENDAR`;
}

/**
 * Download ICS file for all tasks
 */
export function downloadICS(events: CalendarEvent[], filename: string = 'focushub_tasks.ics'): void {
    const icsContent = generateICSContent(events);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

export default {
    taskToCalendarEvent,
    generateGoogleCalendarUrl,
    generateICSContent,
    downloadICS,
    CALENDAR_COLORS,
    PRIORITY_COLORS,
};
