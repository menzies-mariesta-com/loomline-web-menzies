import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { db } from '#lib/server/db';
import { account, counter, displayDevice, queue, site, user } from '#lib/server/db/schema';
import { requireManager } from '#lib/server/qms/guards';
import { randomPairingCode } from '#lib/server/qms/ids';
import { createCredentialUser, ensureMembership } from '#lib/server/qms/provision-user';

const DEVICE_TYPES = new Set(['tv', 'kiosk', 'agent']);

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business } = await requireManager(locals.user, params.businessId);
	const [devices, sites, queues, counters] = await Promise.all([
		db
			.select()
			.from(displayDevice)
			.where(eq(displayDevice.businessId, business.id))
			.orderBy(asc(displayDevice.name)),
		db.select().from(site).where(eq(site.businessId, business.id)).orderBy(asc(site.name)),
		db.select().from(queue).where(eq(queue.businessId, business.id)).orderBy(asc(queue.name)),
		db.select().from(counter).where(eq(counter.businessId, business.id)).orderBy(asc(counter.label))
	]);
	const agentUserIds = [
		...new Set(devices.map((d) => d.agentUserId).filter((id): id is string => Boolean(id)))
	];
	const agentUsers =
		agentUserIds.length > 0
			? await db.select().from(user).where(inArray(user.id, agentUserIds))
			: [];
	const userById = Object.fromEntries(agentUsers.map((u) => [u.id, u]));
	const siteById = Object.fromEntries(sites.map((s) => [s.id, s]));
	const queueById = Object.fromEntries(queues.map((q) => [q.id, q]));
	const counterById = Object.fromEntries(counters.map((c) => [c.id, c]));
	return {
		devices: devices.map((d) => ({
			...d,
			site: siteById[d.siteId] ?? null,
			agentUser: d.agentUserId ? (userById[d.agentUserId] ?? null) : null,
			queueNames: (d.boundQueueIds ?? [])
				.map((id) => queueById[id]?.name)
				.filter((n): n is string => Boolean(n)),
			counterLabels: (d.boundCounterIds ?? [])
				.map((id) => counterById[id]?.label)
				.filter((n): n is string => Boolean(n))
		})),
		sites,
		queues,
		counters
	};
};

function parseDeviceType(raw: string): 'tv' | 'kiosk' | 'agent' | null {
	return DEVICE_TYPES.has(raw) ? (raw as 'tv' | 'kiosk' | 'agent') : null;
}

async function resolveStationAccount(opts: {
	businessId: string;
	type: 'tv' | 'kiosk' | 'agent';
	emailRaw: string;
	passwordRaw: string;
	deviceName: string;
	existingAgentUserId: string | null;
	/** When true, password is required to create/reset. When false (edit with existing), password optional. */
	requirePassword: boolean;
}): Promise<{ agentUserId: string | null; note: string | null } | { error: string }> {
	if (opts.type !== 'agent') {
		return { agentUserId: null, note: null };
	}

	const email = opts.emailRaw.trim().toLowerCase();
	const password = opts.passwordRaw;

	if (opts.existingAgentUserId && !email && !password) {
		return { agentUserId: opts.existingAgentUserId, note: null };
	}

	if (!email) {
		return { error: 'Station email is required for agent devices' };
	}
	if (opts.requirePassword && !password) {
		return { error: 'Station password is required for agent devices' };
	}
	if (password && password.length < 8) {
		return { error: 'Station password must be at least 8 characters' };
	}

	if (!password) {
		const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
		if (!existing) {
			return { error: 'Station password required to create a new account' };
		}
		if (opts.existingAgentUserId && existing.id === opts.existingAgentUserId) {
			await ensureMembership({
				userId: existing.id,
				businessId: opts.businessId,
				role: 'counter_agent'
			});
			return { agentUserId: existing.id, note: null };
		}
		return { error: 'An account with this email already exists' };
	}

	const existingByEmail = await db.query.user.findFirst({ where: eq(user.email, email) });
	if (existingByEmail) {
		if (opts.existingAgentUserId && existingByEmail.id === opts.existingAgentUserId) {
			const hashed = await hashPassword(password);
			const cred = await db.query.account.findFirst({
				where: and(eq(account.userId, existingByEmail.id), eq(account.providerId, 'credential'))
			});
			if (cred) {
				await db.update(account).set({ password: hashed }).where(eq(account.id, cred.id));
			}
			await ensureMembership({
				userId: existingByEmail.id,
				businessId: opts.businessId,
				role: 'counter_agent'
			});
			return { agentUserId: existingByEmail.id, note: `Updated station account ${email}` };
		}
		return { error: 'An account with this email already exists' };
	}

	try {
		const provisioned = await createCredentialUser({
			email,
			password,
			name: opts.deviceName
		});
		await ensureMembership({
			userId: provisioned.id,
			businessId: opts.businessId,
			role: 'counter_agent'
		});
		return {
			agentUserId: provisioned.id,
			note: `Station account created for ${email}`
		};
	} catch (e) {
		return { error: e instanceof Error ? e.message : 'Station account failed' };
	}
}

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const siteId = String(form.get('siteId') ?? '');
		const type = parseDeviceType(String(form.get('type') ?? 'tv'));
		if (!name || !siteId || !type) return fail(400, { message: 'Name, site, and type required' });
		const [siteRow] = await db
			.select()
			.from(site)
			.where(and(eq(site.id, siteId), eq(site.businessId, business.id)))
			.limit(1);
		if (!siteRow) return fail(400, { message: 'Invalid site' });

		const queueIds = form.getAll('queueIds').map(String);
		const counterId = String(form.get('counterId') ?? '').trim();
		const boundCounterIds =
			type === 'agent' && counterId
				? (
						await db
							.select({ id: counter.id })
							.from(counter)
							.where(and(eq(counter.id, counterId), eq(counter.businessId, business.id)))
							.limit(1)
					).map((c) => c.id)
				: [];

		const station = await resolveStationAccount({
			businessId: business.id,
			type,
			emailRaw: String(form.get('stationEmail') ?? ''),
			passwordRaw: String(form.get('stationPassword') ?? ''),
			deviceName: name,
			existingAgentUserId: null,
			requirePassword: true
		});
		if ('error' in station) return fail(400, { message: station.error });

		const [row] = await db
			.insert(displayDevice)
			.values({
				businessId: business.id,
				siteId,
				name,
				type,
				pairingCode: randomPairingCode(),
				agentUserId: station.agentUserId,
				boundQueueIds: queueIds,
				boundCounterIds,
				isActive: true
			})
			.returning();

		const parts = [
			type === 'agent'
				? 'Agent station created. Staff sign in with the station email and password.'
				: `Device created. Code ${row.pairingCode}`
		];
		if (station.note) parts.push(station.note);
		return { success: true, message: parts.join(' ') };
	},

	update: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const name = String(form.get('name') ?? '').trim();
		const siteId = String(form.get('siteId') ?? '');
		const type = parseDeviceType(String(form.get('type') ?? 'tv'));
		const isActive = String(form.get('isActive') ?? 'true') === 'true';
		if (!id || !name || !siteId || !type) {
			return fail(400, { message: 'Missing required fields' });
		}
		const [existing] = await db
			.select()
			.from(displayDevice)
			.where(and(eq(displayDevice.id, id), eq(displayDevice.businessId, business.id)))
			.limit(1);
		if (!existing) return fail(404, { message: 'Device not found' });

		const [siteRow] = await db
			.select()
			.from(site)
			.where(and(eq(site.id, siteId), eq(site.businessId, business.id)))
			.limit(1);
		if (!siteRow) return fail(400, { message: 'Invalid site' });

		const queueIds = form.getAll('queueIds').map(String);
		const counterId = String(form.get('counterId') ?? '').trim();
		const boundCounterIds =
			type === 'agent' && counterId
				? (
						await db
							.select({ id: counter.id })
							.from(counter)
							.where(and(eq(counter.id, counterId), eq(counter.businessId, business.id)))
							.limit(1)
					).map((c) => c.id)
				: type === 'agent'
					? []
					: (existing.boundCounterIds ?? []);

		const station = await resolveStationAccount({
			businessId: business.id,
			type,
			emailRaw: String(form.get('stationEmail') ?? ''),
			passwordRaw: String(form.get('stationPassword') ?? ''),
			deviceName: name,
			existingAgentUserId: type === 'agent' ? (existing.agentUserId ?? null) : null,
			requirePassword: type === 'agent' && !existing.agentUserId
		});
		if ('error' in station) return fail(400, { message: station.error });

		const updated = await db
			.update(displayDevice)
			.set({
				name,
				siteId,
				type,
				boundQueueIds: queueIds,
				boundCounterIds: type === 'agent' ? boundCounterIds : existing.boundCounterIds,
				agentUserId: type === 'agent' ? station.agentUserId : null,
				isActive
			})
			.where(and(eq(displayDevice.id, id), eq(displayDevice.businessId, business.id)))
			.returning();
		if (!updated.length) return fail(404, { message: 'Device not found' });

		const parts = ['Device updated'];
		if (station.note) parts.push(station.note);
		return { success: true, message: parts.join('. ') };
	},

	revoke: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { message: 'Id required' });
		const updated = await db
			.update(displayDevice)
			.set({ isActive: false })
			.where(and(eq(displayDevice.id, id), eq(displayDevice.businessId, business.id)))
			.returning();
		if (!updated.length) return fail(404, { message: 'Device not found' });
		return { success: true, message: 'Device revoked' };
	},

	reactivate: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { message: 'Id required' });
		const updated = await db
			.update(displayDevice)
			.set({ isActive: true })
			.where(and(eq(displayDevice.id, id), eq(displayDevice.businessId, business.id)))
			.returning();
		if (!updated.length) return fail(404, { message: 'Device not found' });
		return { success: true, message: 'Device reactivated' };
	},

	regenerateCode: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { message: 'Id required' });
		const code = randomPairingCode();
		const updated = await db
			.update(displayDevice)
			.set({ pairingCode: code })
			.where(and(eq(displayDevice.id, id), eq(displayDevice.businessId, business.id)))
			.returning();
		if (!updated.length) return fail(404, { message: 'Device not found' });
		return { success: true, message: `New pairing code ${code}` };
	},

	delete: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { message: 'Id required' });
		await db
			.delete(displayDevice)
			.where(and(eq(displayDevice.id, id), eq(displayDevice.businessId, business.id)));
		return { success: true, message: 'Device deleted' };
	}
};
