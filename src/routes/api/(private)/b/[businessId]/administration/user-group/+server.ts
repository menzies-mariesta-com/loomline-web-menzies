import { isHttpError, json, type RequestHandler } from '@sveltejs/kit';
import {
	createUserGroup,
	deleteUserGroup,
	listUserGroupsWithPages,
	renameUserGroup,
	setPagesForUserGroup
} from '#lib/server/qms/user-group';

function httpErrorPayload(e: unknown): { status: number; message: string } {
	if (isHttpError(e)) {
		const body = e.body as { message?: string } | undefined;
		return { status: e.status, message: body?.message ?? 'Error' };
	}
	return { status: 500, message: 'Unexpected error' };
}

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const data = await listUserGroupsWithPages(params.businessId);
	return json(data);
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = await request.json();
	const mode = String(body.mode ?? '');

	try {
		if (mode === 'create') {
			const row = await createUserGroup(locals.user, params.businessId, String(body.name ?? ''));
			return json({ ok: true, group: row });
		}
		if (mode === 'rename') {
			await renameUserGroup(
				locals.user,
				params.businessId,
				String(body.userGroupId ?? ''),
				String(body.name ?? '')
			);
			return json({ ok: true });
		}
		if (mode === 'set_pages') {
			await setPagesForUserGroup(
				locals.user,
				params.businessId,
				String(body.userGroupId ?? ''),
				Array.isArray(body.pageIds) ? body.pageIds.map(String) : []
			);
			return json({ ok: true });
		}
		if (mode === 'delete') {
			await deleteUserGroup(locals.user, params.businessId, String(body.userGroupId ?? ''));
			return json({ ok: true });
		}
	} catch (e) {
		const err = httpErrorPayload(e);
		return json({ error: err.message }, { status: err.status });
	}

	return json({ error: 'Invalid mode' }, { status: 400 });
};
