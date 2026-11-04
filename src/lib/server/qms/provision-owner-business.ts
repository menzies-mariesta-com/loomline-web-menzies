import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { business, invite, industryPack } from '#lib/server/db/schema';
import {
	applyIndustryPackToBusiness,
	businessSlugFromName
} from '#lib/server/qms/business-bootstrap';
import { getConfigProfile } from '#lib/server/qms/config-profiles';
import { inviteSetPasswordUrl, normalizeInviteToken } from '#lib/server/qms/email';
import { randomToken } from '#lib/server/qms/ids';
import { deliverInviteEmail } from '#lib/server/qms/invite-delivery';
import { writeAudit } from '#lib/server/qms/audit';
import {
	isPaidPlanKey,
	isTrialDuration,
	parsePlanKey,
	trialEndsAtFrom,
	type PaidPlanKey,
	type TrialDuration
} from '#lib/tool/plans';
import { ORIGIN } from '$app/env/private';

export type AccessKind = 'plan' | 'trial';

export type ProvisionOwnerBusinessInput = {
	actorUserId: string;
	businessName: string;
	ownerEmail: string;
	/** Required for industry pack bootstrap; falls back to first pack if omitted. */
	industryPackId?: string | null;
	configId?: string | null;
	timezoneOverride?: string;
	imageUrl?: string | null;
	accessKind: AccessKind;
	planKey?: string | null;
	trialDuration?: string | null;
};

export type ProvisionOwnerBusinessResult =
	| {
			ok: true;
			business: typeof business.$inferSelect;
			inviteId: string;
			inviteDelivered: boolean;
			loggedOnly?: boolean;
	  }
	| { ok: false; message: string };

async function resolvePackId(preferred?: string | null): Promise<string | null> {
	if (preferred) {
		const pack = await db.query.industryPack.findFirst({
			where: eq(industryPack.id, preferred)
		});
		if (pack) return pack.id;
	}
	const first = await db.query.industryPack.findFirst({
		orderBy: (p, { asc }) => [asc(p.name)]
	});
	return first?.id ?? null;
}

/**
 * Create a business bound to an owner invite (plan or trial).
 * Tight owner ↔ business binding: one insert + owner invite in the same flow.
 */
export async function provisionOwnerBusiness(
	input: ProvisionOwnerBusinessInput
): Promise<ProvisionOwnerBusinessResult> {
	const name = input.businessName.trim();
	const ownerEmail = input.ownerEmail.trim().toLowerCase();
	if (!name || !ownerEmail) {
		return { ok: false, message: 'Business name and owner email are required.' };
	}

	let planKey: PaidPlanKey | 'trial' | null = null;
	let serviceMode: string | null = null;
	let trialDuration: TrialDuration | null = null;
	let trialEndsAt: Date | null = null;
	let status: 'active' | 'pending' = 'active';

	if (input.accessKind === 'trial') {
		if (!input.trialDuration || !isTrialDuration(input.trialDuration)) {
			return { ok: false, message: 'Trial duration must be 7 days, 2 weeks, or 1 month.' };
		}
		trialDuration = input.trialDuration;
		planKey = 'trial';
		serviceMode = 'cloud';
		trialEndsAt = trialEndsAtFrom(trialDuration);
		status = 'active';
	} else {
		if (!input.planKey || !isPaidPlanKey(input.planKey)) {
			return { ok: false, message: 'Select one of the eight Cloud / On-premise plans.' };
		}
		planKey = input.planKey;
		const parsed = parsePlanKey(planKey);
		serviceMode = parsed?.mode ?? null;
		trialDuration = null;
		trialEndsAt = null;
	}

	const packId = await resolvePackId(input.industryPackId);
	if (!packId) {
		return { ok: false, message: 'No industry template is available. Seed templates first.' };
	}

	let timezone = input.timezoneOverride?.trim() || 'Asia/Yangon';
	let localeDefault = 'en';
	let configId: string | null = input.configId?.trim() || null;
	let branding: Record<string, unknown> = {};

	if (configId) {
		const profile = await getConfigProfile(configId);
		if (!profile) {
			return { ok: false, message: 'Selected config was not found.' };
		}
		timezone = input.timezoneOverride?.trim() || profile.timezone;
		localeDefault = profile.locale;
		branding = {
			dateFormat: profile.dateFormat,
			timeFormat: profile.timeFormat,
			currency: profile.currency
		};
	}

	let slug = businessSlugFromName(name);
	const clash = await db.query.business.findFirst({ where: eq(business.slug, slug) });
	if (clash) slug = `${slug}-${Date.now().toString(36)}`;

	const [biz] = await db
		.insert(business)
		.values({
			name,
			slug,
			timezone,
			localeDefault,
			status,
			industryPackId: packId,
			configId,
			imageUrl: input.imageUrl ?? null,
			branding,
			inviteCode: randomToken(8),
			planKey,
			serviceMode,
			trialEndsAt,
			trialDuration
		})
		.returning();

	await applyIndustryPackToBusiness(biz.id, packId);

	const { ensureBusinessConsoleRbac } = await import('#lib/server/qms/bootstrap-console-rbac');
	await ensureBusinessConsoleRbac(biz.id);

	const token = normalizeInviteToken(randomToken(24));
	const inviteUrl = inviteSetPasswordUrl(ORIGIN, token);
	const [inv] = await db
		.insert(invite)
		.values({
			businessId: biz.id,
			email: ownerEmail,
			role: 'business_owner',
			token,
			status: 'pending',
			invitedByUserId: input.actorUserId,
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000)
		})
		.returning();

	const mailResult = await deliverInviteEmail({
		businessId: biz.id,
		to: ownerEmail,
		templateKey: 'owner_invite',
		businessName: biz.name,
		inviteUrl,
		roleLabel: 'business owner'
	});

	await writeAudit({
		actorUserId: input.actorUserId,
		businessId: biz.id,
		action: 'business.provision_owner',
		entityType: 'business',
		entityId: biz.id,
		payload: {
			ownerEmail,
			planKey,
			trialDuration,
			trialEndsAt: trialEndsAt?.toISOString() ?? null,
			inviteDelivered: mailResult.ok
		}
	});

	return {
		ok: true,
		business: biz,
		inviteId: inv.id,
		inviteDelivered: mailResult.ok,
		loggedOnly: mailResult.loggedOnly
	};
}
