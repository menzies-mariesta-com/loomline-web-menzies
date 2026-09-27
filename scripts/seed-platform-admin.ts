import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import * as schema from '../src/lib/server/db/schema';

config({ path: resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const email = process.env.SEED_PLATFORM_ADMIN_EMAIL ?? 'admin@loomline.local';
const password = process.env.SEED_PLATFORM_ADMIN_PASSWORD ?? 'LoomlineAdmin1!';
const name = process.env.SEED_PLATFORM_ADMIN_NAME ?? 'Loomline Admin';

const client = neon(databaseUrl);
const db = drizzle(client, { schema });

async function main() {
	let existing = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
	if (!existing) {
		const userId = randomUUID();
		const hashed = await hashPassword(password);
		await db.insert(schema.user).values({
			id: userId,
			name,
			email,
			emailVerified: true
		});
		await db.insert(schema.account).values({
			id: randomUUID(),
			accountId: userId,
			providerId: 'credential',
			userId,
			password: hashed
		});
		existing = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
		console.log('Created platform admin user', email);
	} else {
		console.log('Platform admin user already exists', email);
	}

	if (!existing) throw new Error('Failed to create admin user');

	const adminRow = await db.query.platformAdmin.findFirst({
		where: eq(schema.platformAdmin.userId, existing.id)
	});
	if (!adminRow) {
		await db.insert(schema.platformAdmin).values({ userId: existing.id });
		console.log('Linked platform_admin row');
	}

	const mem = await db.query.membership.findFirst({
		where: eq(schema.membership.userId, existing.id)
	});
	if (!mem) {
		await db.insert(schema.membership).values({
			userId: existing.id,
			businessId: null,
			role: 'platform_admin',
			status: 'active'
		});
		console.log('Created platform_admin membership');
	}

	console.log('Seed complete.');
	console.log(`Login email: ${email}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
