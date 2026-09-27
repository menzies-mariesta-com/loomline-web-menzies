import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import {
	getBusinessBySlug,
	isBusinessUuid,
	requireGuestOrStaff
} from '#lib/server/qms/guards';

export const load: LayoutServerLoad = async ({ locals, params, url }) => {
	const key = params.businessId;

	// Legacy bookmarks: `/b/[slug]/…` → 301 to `/b/[uuid]/…`
	if (!isBusinessUuid(key)) {
		const bySlug = await getBusinessBySlug(key);
		if (bySlug) {
			const next = `${url.pathname.replace(`/b/${key}`, `/b/${bySlug.id}`)}${url.search}`;
			throw redirect(301, next);
		}
		// Fall through; requireGuestOrStaff will 404 on unknown id
	}

	const ctx = await requireGuestOrStaff(locals.user, key);
	return {
		business: ctx.business,
		membership: ctx.membership,
		role: ctx.membership?.role ?? (ctx.membership === null ? 'platform_admin' : 'guest')
	};
};
