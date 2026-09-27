/** Curated IANA zones when `Intl.supportedValuesOf('timeZone')` is unavailable. */
const COMMON_TIMEZONES = [
	'UTC',
	'Africa/Cairo',
	'Africa/Johannesburg',
	'Africa/Lagos',
	'Africa/Nairobi',
	'America/Anchorage',
	'America/Argentina/Buenos_Aires',
	'America/Bogota',
	'America/Chicago',
	'America/Denver',
	'America/Los_Angeles',
	'America/Mexico_City',
	'America/New_York',
	'America/Phoenix',
	'America/Sao_Paulo',
	'America/Toronto',
	'America/Vancouver',
	'Asia/Bangkok',
	'Asia/Dubai',
	'Asia/Hong_Kong',
	'Asia/Jakarta',
	'Asia/Kolkata',
	'Asia/Manila',
	'Asia/Seoul',
	'Asia/Shanghai',
	'Asia/Singapore',
	'Asia/Tokyo',
	'Asia/Yangon',
	'Australia/Melbourne',
	'Australia/Perth',
	'Australia/Sydney',
	'Europe/Amsterdam',
	'Europe/Berlin',
	'Europe/Istanbul',
	'Europe/London',
	'Europe/Madrid',
	'Europe/Moscow',
	'Europe/Paris',
	'Europe/Rome',
	'Europe/Stockholm',
	'Pacific/Auckland',
	'Pacific/Honolulu'
] as const;

/** Practical IANA timezone list for search-select UIs. */
export function listTimezones(): string[] {
	try {
		if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
			return (Intl as typeof Intl & { supportedValuesOf(key: string): string[] }).supportedValuesOf(
				'timeZone'
			);
		}
	} catch {
		/* fall through to curated list */
	}
	return [...COMMON_TIMEZONES];
}

/** Current UTC offset for a zone as `UTC±HH:MM` (e.g. `UTC+06:30`). */
export function timezoneUtcOffset(timeZone: string, at: Date = new Date()): string {
	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone,
			timeZoneName: 'longOffset'
		}).formatToParts(at);
		const raw = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
		// "GMT", "GMT+6", "GMT+06:30", "GMT-8", "UTC+05:30"
		const m = raw.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i);
		if (m) {
			const sign = m[1] === '-' ? '-' : '+';
			const hh = m[2].padStart(2, '0');
			const mm = (m[3] ?? '00').padStart(2, '0');
			return `UTC${sign}${hh}:${mm}`;
		}
		if (/^(GMT|UTC)$/i.test(raw.trim())) return 'UTC+00:00';
	} catch {
		/* ignore */
	}
	return 'UTC+00:00';
}

export function timezoneOptionLabel(timeZone: string, at?: Date): string {
	return `${timeZone} (${timezoneUtcOffset(timeZone, at)})`;
}

export type TimezoneOption = { value: string; label: string };

let cachedOptions: TimezoneOption[] | null = null;

export function listTimezoneOptions(at?: Date): TimezoneOption[] {
	if (!at && cachedOptions) return cachedOptions;
	const when = at ?? new Date();
	const options = listTimezones().map((zone) => ({
		value: zone,
		label: timezoneOptionLabel(zone, when)
	}));
	if (!at) cachedOptions = options;
	return options;
}
