/** Annual discount vs monthly list price (Waitwhile-style ~20%). */
export const ANNUAL_OFF = 0.2;

/** Local display rate for Myanmar (1 USD = 5000 MMK). */
export const USD_TO_MMK = 5000;

/**
 * On-premise monthly premium over the matching Cloud tier (USD).
 * Same product tiers; +$150 covers install/setup responsibility on customer infra.
 */
export const ONPREM_PREMIUM_USD = 150;

/** Cloud monthly list prices (USD). Platform is custom quote. */
export const CLOUD_MONTHLY_USD = {
	starter: 49,
	business: 149,
	scale: 299
} as const;

export type BillingPeriod = 'monthly' | 'annual';
export type PricingMarket = 'global' | 'myanmar';
export type ServiceMode = 'cloud' | 'onprem';

/** On-premise monthly list = Cloud monthly + premium. */
export function onpremMonthlyUsd(cloudMonthlyUsd: number): number {
	return cloudMonthlyUsd + ONPREM_PREMIUM_USD;
}

/** Effective monthly USD after annual discount (still shown as /mo). */
export function monthlyListUsd(monthlyUsd: number, period: BillingPeriod): number {
	if (period !== 'annual') return monthlyUsd;
	return Math.round(monthlyUsd * (1 - ANNUAL_OFF));
}

/**
 * Monthly list for display: Cloud as-is, On-premise = cloud + premium,
 * then apply annual discount to that figure.
 */
export function effectiveMonthlyUsd(
	cloudMonthlyUsd: number,
	mode: ServiceMode,
	period: BillingPeriod
): number {
	const list = mode === 'onprem' ? onpremMonthlyUsd(cloudMonthlyUsd) : cloudMonthlyUsd;
	return monthlyListUsd(list, period);
}

export function usdToMmk(usd: number): number {
	return usd * USD_TO_MMK;
}

/** Thousands separators for MMK display amounts. */
export function formatMmk(amount: number): string {
	return new Intl.NumberFormat('en-US').format(amount);
}

export function formatUsd(amount: number): string {
	return new Intl.NumberFormat('en-US').format(amount);
}
