import { and, eq, isNotNull, lte, ne } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { business, membership } from '#lib/server/db/schema';

export type ExpireTrialsResult = {
	businesses: number;
	memberships: number;
};

/**
 * Mark businesses whose trial_ends_at has passed as trial_expired,
 * and suspend their memberships so console access is blocked. Data is preserved.
 */
export async function expireEndedTrials(now = new Date()): Promise<ExpireTrialsResult> {
	const expired = await db.query.business.findMany({
		where: and(
			isNotNull(business.trialEndsAt),
			lte(business.trialEndsAt, now),
			ne(business.status, 'trial_expired'),
			ne(business.status, 'inactive')
		),
		limit: 100
	});

	let memberships = 0;
	for (const biz of expired) {
		await db
			.update(business)
			.set({ status: 'trial_expired' })
			.where(eq(business.id, biz.id));

		const updated = await db
			.update(membership)
			.set({ status: 'suspended' })
			.where(
				and(eq(membership.businessId, biz.id), eq(membership.status, 'active'))
			)
			.returning();
		memberships += updated.length;
	}

	return { businesses: expired.length, memberships };
}

/**
 * If this business is on an expired trial, mark it and deny console use.
 * Returns the (possibly refreshed) business row status after enforcement.
 */
export async function enforceTrialAccess(businessId: string): Promise<{
	ok: boolean;
	status: string;
	reason?: string;
}> {
	const biz = await db.query.business.findFirst({ where: eq(business.id, businessId) });
	if (!biz) return { ok: false, status: 'missing', reason: 'Business not found' };

	if (biz.status === 'trial_expired' || biz.status === 'inactive' || biz.status === 'suspended') {
		return {
			ok: false,
			status: biz.status,
			reason:
				biz.status === 'trial_expired'
					? 'Trial ended. Contact NextUp to reactivate.'
					: `Business is ${biz.status}.`
		};
	}

	if (biz.trialEndsAt && biz.trialEndsAt.getTime() <= Date.now()) {
		await db
			.update(business)
			.set({ status: 'trial_expired' })
			.where(eq(business.id, biz.id));
		await db
			.update(membership)
			.set({ status: 'suspended' })
			.where(and(eq(membership.businessId, biz.id), eq(membership.status, 'active')));
		return {
			ok: false,
			status: 'trial_expired',
			reason: 'Trial ended. Contact NextUp to reactivate.'
		};
	}

	if (biz.status !== 'active' && biz.status !== 'pending') {
		return { ok: false, status: biz.status, reason: `Business is ${biz.status}.` };
	}

	return { ok: true, status: biz.status };
}
