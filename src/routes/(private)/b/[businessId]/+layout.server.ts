import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import {
	getBusinessBySlug,
	isBusinessUuid,
	requireGuestOrStaff,
	requireUser
} from '#lib/server/qms/guards';
import { ensureBusinessConsoleRbac } from '#lib/server/qms/bootstrap-console-rbac';
import {
	loadMembershipForPageAccess,
	pathnameAllowedForConsole,
	resolveAllowedConsolePaths
} from '#lib/server/qms/page-access';

export const load: LayoutServerLoad = async ({ locals, params, url }) => {
	const key = params.businessId;

	if (!isBusinessUuid(key)) {
		const bySlug = await getBusinessBySlug(key);
		if (bySlug) {
			const next = `${url.pathname.replace(`/b/${key}`, `/b/${bySlug.id}`)}${url.search}`;
			throw redirect(301, next);
		}
	}

	const ctx = await requireGuestOrStaff(locals.user, key);
	const role =
		ctx.membership?.role ?? (ctx.membership === null ? 'platform_admin' : 'guest');

	await ensureBusinessConsoleRbac(key);
	const user = await requireUser(locals.user);
	const accessCtx = await loadMembershipForPageAccess(user.id, key);
	const allowedSet = await resolveAllowedConsolePaths({
		userId: user.id,
		businessId: key,
		membershipRole: accessCtx.role,
		membershipId: accessCtx.membershipId
	});

	if (!pathnameAllowedForConsole(url.pathname, key, allowedSet)) {
		throw redirect(303, `/b/${key}`);
	}

	return {
		business: ctx.business,
		membership: ctx.membership,
		role,
		allowedPaths: [...allowedSet]
	};
};
