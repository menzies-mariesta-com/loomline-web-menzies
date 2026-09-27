import type { Actions, PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { business, voiceProfile } from '#lib/server/db/schema';
import { requireBusinessRole } from '#lib/server/qms/guards';
import {
	DEFAULT_VOICE_TEMPLATE,
	normalizeAnnounceLocales,
	normalizeAnnounceRepeat
} from '#lib/util/voice';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business: biz } = await requireBusinessRole(locals.user, params.businessId, [
		'business_owner',
		'manager',
		'platform_admin'
	]);
	const voices = await db.query.voiceProfile.findMany({
		where: eq(voiceProfile.businessId, biz.id)
	});
	return { voices };
};

export const actions: Actions = {
	saveMessaging: async ({ request, locals, params }) => {
		const { business: biz } = await requireBusinessRole(locals.user, params.businessId, [
			'business_owner',
			'manager',
			'platform_admin'
		]);
		const form = await request.formData();
		await db
			.update(business)
			.set({
				messagingConfig: {
					smsEnabled: form.get('smsEnabled') === 'on',
					telegramEnabled: form.get('telegramEnabled') === 'on',
					viberEnabled: form.get('viberEnabled') === 'on',
					discordEnabled: form.get('discordEnabled') === 'on',
					emailEnabled: form.get('emailEnabled') === 'on'
				},
				publicSignupEnabled: form.get('publicSignupEnabled') === 'on'
			})
			.where(eq(business.id, biz.id));
		return { success: true, message: 'Messaging settings saved' };
	},
	saveVoice: async ({ request, locals, params }) => {
		const { business: biz } = await requireBusinessRole(locals.user, params.businessId, [
			'business_owner',
			'manager',
			'platform_admin'
		]);
		const form = await request.formData();
		const template = String(form.get('nowServing') ?? DEFAULT_VOICE_TEMPLATE).trim();
		if (!template) {
			return { success: false, message: 'Now serving template is required' };
		}
		const announceLocales = normalizeAnnounceLocales(String(form.get('announceLocales') ?? ''));
		const announceRepeat = normalizeAnnounceRepeat(form.get('announceRepeat'), 1);
		const primaryLocale = announceLocales[0] ?? 'en';

		const existing = await db.query.voiceProfile.findFirst({
			where: eq(voiceProfile.businessId, biz.id)
		});
		const payload = {
			locale: primaryLocale,
			announceLocales,
			announceRepeat,
			templates: { now_serving: template }
		};
		if (existing) {
			await db.update(voiceProfile).set(payload).where(eq(voiceProfile.id, existing.id));
		} else {
			await db.insert(voiceProfile).values({
				businessId: biz.id,
				...payload,
				isDefault: true
			});
		}
		return { success: true, message: 'Voice announcements saved' };
	}
};
