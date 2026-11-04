import type { Actions, PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { business, voiceProfile } from '#lib/server/db/schema';
import { requireBusinessRole } from '#lib/server/qms/guards';
import {
	defaultAnnounceTemplateForLocale,
	normalizeAnnounceLocales,
	normalizeAnnounceRepeat,
	normalizeAnnounceRepeatDelayMs,
	normalizeSpeechSettings
} from '#lib/util/voice';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business: biz } = await requireBusinessRole(locals.user, params.businessId, [
		'business_owner',
		'business_admin',
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
			'business_admin',
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
			'business_admin',
			'manager',
			'platform_admin'
		]);
		const form = await request.formData();
		const announceLocales = normalizeAnnounceLocales(String(form.get('announceLocales') ?? ''));
		const announceRepeat = normalizeAnnounceRepeat(form.get('announceRepeat'), 1);
		const delaySec = Number(form.get('announceRepeatDelaySec'));
		const announceRepeatDelayMs = normalizeAnnounceRepeatDelayMs(
			Number.isFinite(delaySec) ? delaySec * 1000 : undefined
		);
		const primaryLocale = announceLocales[0] ?? 'en';

		let localeTemplates: Record<string, string> = {};
		try {
			localeTemplates = JSON.parse(String(form.get('localeTemplates') ?? '{}')) as Record<
				string,
				string
			>;
		} catch {
			return { success: false, message: 'Invalid announcement templates' };
		}

		let speechSettings = normalizeSpeechSettings(null);
		try {
			speechSettings = normalizeSpeechSettings(
				JSON.parse(String(form.get('speechSettings') ?? '{}'))
			);
		} catch {
			return { success: false, message: 'Invalid speech settings' };
		}

		const templates: Record<string, string> = {};
		for (const loc of announceLocales) {
			const template = String(localeTemplates[loc] ?? defaultAnnounceTemplateForLocale(loc)).trim();
			if (!template) {
				return { success: false, message: `Announcement text is required for ${loc}` };
			}
			if (!template.includes('{number}')) {
				return { success: false, message: `Include {number} in the ${loc} announcement text` };
			}
			templates[loc] = template;
		}

		const existing = await db.query.voiceProfile.findFirst({
			where: eq(voiceProfile.businessId, biz.id)
		});
		const payload = {
			locale: primaryLocale,
			announceLocales,
			announceRepeat,
			announceRepeatDelayMs,
			speechSettings,
			templates
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
