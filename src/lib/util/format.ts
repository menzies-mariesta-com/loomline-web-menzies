export function slugify(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64);
}

export function formatTicketNumber(prefix: string, sequence: number): string {
	return `${prefix}${String(sequence).padStart(3, '0')}`;
}

export function shortDateTime(value: Date | string | null | undefined): string {
	if (!value) return '-';
	const d = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(d.getTime())) return '-';
	return d.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});
}
