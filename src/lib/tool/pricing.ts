/** Annual discount vs monthly list price (Waitwhile-style ~20%). */
export const ANNUAL_OFF = 0.2;

/** Local display rate for Myanmar (1 USD = 5000 MMK). */
export const USD_TO_MMK = 5000;

export type BillingPeriod = 'monthly' | 'annual';
export type PricingMarket = 'global' | 'myanmar';

/** Effective monthly USD after annual discount (still shown as /mo). */
export function monthlyListUsd(monthlyUsd: number, period: BillingPeriod): number {
	if (period !== 'annual') return monthlyUsd;
	return Math.round(monthlyUsd * (1 - ANNUAL_OFF));
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
