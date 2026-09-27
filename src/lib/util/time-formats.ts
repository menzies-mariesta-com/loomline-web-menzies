/** Practical time format presets for config search-select. */
export const TIME_FORMAT_OPTIONS = [
	{ value: 'HH:mm', label: 'HH:mm' },
	{ value: 'HH:mm:ss', label: 'HH:mm:ss' },
	{ value: 'h:mm a', label: 'h:mm a' },
	{ value: 'h:mm:ss a', label: 'h:mm:ss a' },
	{ value: 'hh:mm a', label: 'hh:mm a' },
	{ value: 'H:mm', label: 'H:mm' },
	{ value: 'h:mm A', label: 'h:mm A' }
] as const;

export type TimeFormatOption = (typeof TIME_FORMAT_OPTIONS)[number];

/** Options plus a custom stored value if it is not in the preset list. */
export function timeFormatOptions(current?: string): { value: string; label: string }[] {
	const base = TIME_FORMAT_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
	const v = current?.trim();
	if (v && !base.some((o) => o.value === v)) {
		base.unshift({ value: v, label: v });
	}
	return base;
}
