/** Practical date format presets for config search-select. */
export const DATE_FORMAT_OPTIONS = [
	{ value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
	{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
	{ value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
	{ value: 'D MMM YYYY', label: 'D MMM YYYY' },
	{ value: 'DD MMM YYYY', label: 'DD MMM YYYY' },
	{ value: 'MMM D, YYYY', label: 'MMM D, YYYY' },
	{ value: 'MMM d, yyyy', label: 'MMM d, yyyy' },
	{ value: 'd MMM yyyy', label: 'd MMM yyyy' },
	{ value: 'yyyy-MM-dd', label: 'yyyy-MM-dd' },
	{ value: 'dd/MM/yyyy', label: 'dd/MM/yyyy' },
	{ value: 'MM/dd/yyyy', label: 'MM/dd/yyyy' }
] as const;

export type DateFormatOption = (typeof DATE_FORMAT_OPTIONS)[number];

/** Options plus a custom stored value if it is not in the preset list. */
export function dateFormatOptions(current?: string): { value: string; label: string }[] {
	const base = DATE_FORMAT_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
	const v = current?.trim();
	if (v && !base.some((o) => o.value === v)) {
		base.unshift({ value: v, label: v });
	}
	return base;
}
