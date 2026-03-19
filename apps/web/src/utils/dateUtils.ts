const azMonths = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
    'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
];

/**
 * Format a date string or Date object to Azerbaijani format: DD Month YYYY
 * Example: '01 Fevral 2026'
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return '—';
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = azMonths[d.getMonth()];
    const year = d.getFullYear();
    
    return `${day} ${month} ${year}`;
}
