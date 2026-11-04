import { isHttpError, json, type RequestHandler } from '@sveltejs/kit';
import type { MembershipRole } from '#lib/server/qms/guards';
import { isPlatformAdmin, requireOwner } from '#lib/server/qms/guards';
import {
	createStaffRegistration,
	getStaffRegistrationContext,
	updateStaffRegistration
} from '#lib/server/qms/staff-registration';

function httpErrorPayload(e: unknown): { status: number; message: string } {
	if (isHttpError(e)) {
		const body = e.body as { message?: string } | undefined;
		return { status: e.status, message: body?.message ?? e.body?.toString() ?? 'Error' };
	}
	return { status: 500, message: 'Unexpected error' };
}

export const GET: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const membershipId = url.searchParams.get('membershipId');
	const ctx = await getStaffRegistrationContext(params.businessId, membershipId);
	let canCreateAdmin = false;
	if (await isPlatformAdmin(locals.user.id)) canCreateAdmin = true;
	else {
		try {
			await requireOwner(locals.user, params.businessId);
			canCreateAdmin = true;
		} catch {
			canCreateAdmin = false;
		}
	}
	return json({ ...ctx, canCreateAdmin });
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = await request.json();
	const mode = String(body.mode ?? 'create');

	try {
		if (mode === 'create') {
			const result = await createStaffRegistration(locals.user, params.businessId, {
				name: String(body.name ?? ''),
				email: String(body.email ?? ''),
				password: String(body.password ?? ''),
				role: String(body.role ?? 'manager') as MembershipRole,
				userGroupIds: Array.isArray(body.userGroupIds) ? body.userGroupIds.map(String) : [],
				siteIds: Array.isArray(body.siteIds) ? body.siteIds.map(String) : [],
				active: body.active !== false
			});
			return json({ ok: true, ...result });
		}

		if (mode === 'update') {
			await updateStaffRegistration(locals.user, params.businessId, {
				membershipId: String(body.membershipId ?? ''),
				name: body.name != null ? String(body.name) : undefined,
				email: body.email != null ? String(body.email) : undefined,
				password: body.password != null ? String(body.password) : undefined,
				role: body.role != null ? (String(body.role) as MembershipRole) : undefined,
				userGroupIds: Array.isArray(body.userGroupIds)
					? body.userGroupIds.map(String)
					: undefined,
				siteIds: Array.isArray(body.siteIds) ? body.siteIds.map(String) : undefined,
				active: typeof body.active === 'boolean' ? body.active : undefined
			});
			return json({ ok: true });
		}
	} catch (e) {
		const err = httpErrorPayload(e);
		return json({ error: err.message }, { status: err.status });
	}

	return json({ error: 'Invalid mode' }, { status: 400 });
};
