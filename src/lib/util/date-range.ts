/** Calendar-day key `YYYY-MM-DD` from a Date or ISO-ish string (local). */
export function dayKey(value: Date | string | null | undefined): string {
	if (!value) return '';
	const d = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(d.getTime())) return '';
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** Inclusive calendar-day filter. Range value: `YYYY-MM-DD/YYYY-MM-DD` or empty. */
export function inDateRange(value: Date | string | null | undefined, range: string): boolean {
	if (!range || !range.includes('/')) return true;
	const [start = '', end = ''] = range.split('/');
	if (!start && !end) return true;
	const day = dayKey(value);
	if (!day) return false;
	if (start && day < start) return false;
	if (end && day > end) return false;
	return true;
}

function formatShortDate(iso: string): string {
	const d = new Date(`${iso}T12:00:00`);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Label for a Cally range value, e.g. `Aug 1 to Aug 21` or `Any dates`. */
export function rangeLabel(range: string): string {
	if (!range.includes('/')) return 'Any dates';
	const [start = '', end = ''] = range.split('/');
	if (!start && !end) return 'Any dates';
	if (start && end) return `${formatShortDate(start)} to ${formatShortDate(end)}`;
	if (start) return `From ${formatShortDate(start)}`;
	return `Through ${formatShortDate(end)}`;
}
