import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { platformConfigProfile } from '#lib/server/db/schema';

const DEFAULT_PROFILES = [
	{
		name: 'Myanmar (Yangon)',
		timezone: 'Asia/Yangon',
		locale: 'en',
		dateFormat: 'MMM d, yyyy',
		timeFormat: 'HH:mm',
		currency: 'MMK'
	},
	{
		name: 'US Pacific',
		timezone: 'America/Los_Angeles',
		locale: 'en-US',
		dateFormat: 'MMM d, yyyy',
		timeFormat: 'h:mm a',
		currency: 'USD'
	},
	{
		name: 'Singapore',
		timezone: 'Asia/Singapore',
		locale: 'en-SG',
		dateFormat: 'd MMM yyyy',
		timeFormat: 'HH:mm',
		currency: 'SGD'
	}
] as const;

/** Soft-seed a few reusable config profiles when the table is empty. */
export async function ensureConfigProfilesSeeded() {
	const existing = await db.query.platformConfigProfile.findFirst();
	if (existing) return;

	for (const profile of DEFAULT_PROFILES) {
		await db.insert(platformConfigProfile).values({ ...profile });
	}
}

export async function getConfigProfile(id: string) {
	return db.query.platformConfigProfile.findFirst({
		where: eq(platformConfigProfile.id, id)
	});
}
