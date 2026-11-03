/** Paid plan keys: service mode + tier (matches pricing page). */
export const PAID_PLAN_KEYS = [
	'cloud_starter',
	'cloud_business',
	'cloud_scale',
	'cloud_platform',
	'onprem_starter',
	'onprem_business',
	'onprem_scale',
	'onprem_platform'
] as const;

export type PaidPlanKey = (typeof PAID_PLAN_KEYS)[number];
export type PlanKey = PaidPlanKey | 'trial';

export const TRIAL_DURATIONS = ['7d', '2w', '1m'] as const;
export type TrialDuration = (typeof TRIAL_DURATIONS)[number];

export type ServiceMode = 'cloud' | 'onprem';
export type PlanTier = 'starter' | 'business' | 'scale' | 'platform';

const PAID_SET = new Set<string>(PAID_PLAN_KEYS);
const DURATION_SET = new Set<string>(TRIAL_DURATIONS);

export function isPaidPlanKey(value: string): value is PaidPlanKey {
	return PAID_SET.has(value);
}

export function isTrialDuration(value: string): value is TrialDuration {
	return DURATION_SET.has(value);
}

export function parsePlanKey(value: string): {
	mode: ServiceMode;
	tier: PlanTier;
} | null {
	if (!isPaidPlanKey(value)) return null;
	const [mode, tier] = value.split('_') as [ServiceMode, PlanTier];
	return { mode, tier };
}

export function planKeyLabel(key: PlanKey | string | null | undefined): string {
	if (!key) return '-';
	if (key === 'trial') return 'Trial';
	const parsed = parsePlanKey(key);
	if (!parsed) return key;
	const mode = parsed.mode === 'onprem' ? 'On-premise' : 'Cloud';
	const tier = parsed.tier.charAt(0).toUpperCase() + parsed.tier.slice(1);
	return `${mode} ${tier}`;
}

export const PAID_PLAN_OPTIONS = PAID_PLAN_KEYS.map((value) => ({
	value,
	label: planKeyLabel(value)
}));

export const TRIAL_DURATION_OPTIONS = [
	{ value: '7d' as const, label: '7 days' },
	{ value: '2w' as const, label: '2 weeks' },
	{ value: '1m' as const, label: '1 month' }
];

export function trialDurationLabel(duration: TrialDuration | string): string {
	const hit = TRIAL_DURATION_OPTIONS.find((o) => o.value === duration);
	return hit?.label ?? duration;
}

/** Calendar days for a trial duration selection. */
export function trialDurationDays(duration: TrialDuration): number {
	switch (duration) {
		case '7d':
			return 7;
		case '2w':
			return 14;
		case '1m':
			return 30;
	}
}

export function trialEndsAtFrom(duration: TrialDuration, from = new Date()): Date {
	const ends = new Date(from.getTime());
	ends.setUTCDate(ends.getUTCDate() + trialDurationDays(duration));
	return ends;
}
