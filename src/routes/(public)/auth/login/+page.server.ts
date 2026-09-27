import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { auth } from '#lib/server/auth';
import { APIError } from 'better-auth/api';
import { db } from '#lib/server/db';
import { user } from '#lib/server/db/schema';
import { resolvePostLoginPath } from '#lib/server/qms/guards';

export const load: PageServerLoad = async ({ locals, url }) => {
	const requested = url.searchParams.get('redirectTo');
	if (locals.user) {
		throw redirect(303, await resolvePostLoginPath(locals.user.id, requested));
	}
	return { redirectTo: requested || '/workspaces' };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');
		const redirectTo = String(form.get('redirectTo') ?? '/workspaces');

		try {
			await auth.api.signInEmail({
				body: { email, password },
				headers: request.headers,
				request
			});
		} catch (err) {
			const message =
				err instanceof APIError ? err.message : 'Sign in failed. Check your credentials.';
			return fail(400, { message, email });
		}

		const row = await db.query.user.findFirst({ where: eq(user.email, email) });
		const dest = row
			? await resolvePostLoginPath(row.id, redirectTo)
			: redirectTo.startsWith('/')
				? redirectTo
				: '/workspaces';

		throw redirect(303, dest);
	}
};
