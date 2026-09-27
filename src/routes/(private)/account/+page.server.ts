import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { accountPageActions, loadAccountPage } from '#lib/server/account-page';
import {
	getMembershipsForUser,
	isBusinessUuid,
	isPlatformAdmin,
	requireUser
} from '#lib/server/qms/guards';

function businessIdFromReferer(referer: string | null): string | null {
	if (!referer) return null;
	try {
		const path = new URL(referer).pathname;
		const match = path.match(/^\/b\/([^/]+)/);
		if (!match?.[1] || !isBusinessUuid(match[1])) return null;
		return match[1];
	} catch {
		return null;
	}
}

function refererIsAdmin(referer: string | null): boolean {
	if (!referer) return false;
	try {
		const path = new URL(referer).pathname;
		return path === '/admin' || path.startsWith('/admin/');
	} catch {
		return false;
	}
}

export const load: PageServerLoad = async ({ locals, request }) => {
	const u = await requireUser(locals.user);
	const memberships = await getMembershipsForUser(u.id);
	const platformAdmin = await isPlatformAdmin(u.id);
	const referer = request.headers.get('referer');

	const fromBusiness = businessIdFromReferer(referer);
	if (fromBusiness) {
		const allowed =
			platformAdmin || memberships.some((m) => m.business?.id === fromBusiness);
		if (allowed) throw redirect(303, `/b/${fromBusiness}/account`);
	}

	if (refererIsAdmin(referer) && platformAdmin) {
		throw redirect(303, '/admin/account');
	}

	const firstBusiness = memberships.find((m) => m.business)?.business;
	if (firstBusiness) {
		throw redirect(303, `/b/${firstBusiness.id}/account`);
	}

	if (platformAdmin) {
		throw redirect(303, '/admin/account');
	}

	// Authenticated with no memberships and not platform admin: workspaces shell.
	return loadAccountPage(locals);
};

export const actions: Actions = accountPageActions;
