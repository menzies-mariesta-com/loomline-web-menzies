import { fail, type RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { APIError } from 'better-auth/api';
import { auth } from '#lib/server/auth';
import { db } from '#lib/server/db';
import { account } from '#lib/server/db/schema';
import { getMembershipsForUser, requireUser } from '#lib/server/qms/guards';

export async function loadAccountPage(locals: App.Locals) {
	const u = await requireUser(locals.user);
	const memberships = await getMembershipsForUser(u.id);
	const credential = await db.query.account.findFirst({
		where: and(eq(account.userId, u.id), eq(account.providerId, 'credential'))
	});

	const user = locals.user!;
	const session = locals.session;

	return {
		title: 'Account',
		profile: {
			id: user.id,
			name: user.name,
			email: user.email,
			emailVerified: user.emailVerified,
			image: user.image ?? null,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		},
		sessionInfo: session
			? {
					createdAt: session.createdAt,
					expiresAt: session.expiresAt,
					updatedAt: session.updatedAt,
					ipAddress: session.ipAddress ?? null,
					userAgent: session.userAgent ?? null
				}
			: null,
		hasPassword: Boolean(credential?.password),
		memberships: memberships.map((m) => ({
			id: m.id,
			role: m.role,
			business: m.business
				? {
						id: m.business.id,
						name: m.business.name,
						imageUrl: m.business.imageUrl ?? null
					}
				: null
		}))
	};
}

export async function updateProfileAction({ request, locals }: RequestEvent) {
	await requireUser(locals.user);
	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const imageRaw = String(form.get('image') ?? '').trim();
	const image = imageRaw.length > 0 ? imageRaw : null;

	if (!name) {
		return fail(400, {
			action: 'updateProfile' as const,
			success: false,
			message: 'Name is required.',
			name,
			image: imageRaw
		});
	}

	if (image && !/^https?:\/\//i.test(image) && !image.startsWith('/')) {
		return fail(400, {
			action: 'updateProfile' as const,
			success: false,
			message: 'Image must be a URL (http/https) or a site path.',
			name,
			image: imageRaw
		});
	}

	try {
		await auth.api.updateUser({
			body: { name, image },
			headers: request.headers,
			request
		});
	} catch (err) {
		const message =
			err instanceof APIError ? err.message : 'Could not update your profile. Try again.';
		return fail(400, {
			action: 'updateProfile' as const,
			success: false,
			message,
			name,
			image: imageRaw
		});
	}

	return {
		action: 'updateProfile' as const,
		success: true,
		message: 'Profile saved.'
	};
}

export async function changePasswordAction({ request, locals }: RequestEvent) {
	await requireUser(locals.user);
	const form = await request.formData();
	const currentPassword = String(form.get('currentPassword') ?? '');
	const newPassword = String(form.get('newPassword') ?? '');
	const confirmPassword = String(form.get('confirmPassword') ?? '');
	const revokeOtherSessions = form.get('revokeOtherSessions') === 'on';

	if (!currentPassword || !newPassword || !confirmPassword) {
		return fail(400, {
			action: 'changePassword' as const,
			success: false,
			message: 'Fill in current password, new password, and confirmation.'
		});
	}

	if (newPassword.length < 8) {
		return fail(400, {
			action: 'changePassword' as const,
			success: false,
			message: 'New password must be at least 8 characters.'
		});
	}

	if (newPassword !== confirmPassword) {
		return fail(400, {
			action: 'changePassword' as const,
			success: false,
			message: 'New password and confirmation do not match.'
		});
	}

	if (currentPassword === newPassword) {
		return fail(400, {
			action: 'changePassword' as const,
			success: false,
			message: 'New password must be different from your current password.'
		});
	}

	try {
		await auth.api.changePassword({
			body: {
				currentPassword,
				newPassword,
				revokeOtherSessions
			},
			headers: request.headers,
			request
		});
	} catch (err) {
		const message =
			err instanceof APIError
				? err.message
				: 'Could not change password. Check your current password and try again.';
		return fail(400, {
			action: 'changePassword' as const,
			success: false,
			message
		});
	}

	return {
		action: 'changePassword' as const,
		success: true,
		message: revokeOtherSessions
			? 'Password updated. Other sessions were signed out.'
			: 'Password updated.'
	};
}

export const accountPageActions = {
	updateProfile: updateProfileAction,
	changePassword: changePasswordAction
};
