import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getOrgImageS3Config, orgImageObjectKey } from '#lib/server/upload/org-image';

const SAFE_KEY = /^org-[a-z0-9]+-[a-z0-9]+\.(jpe?g|png|webp|gif)$/i;

function contentTypeFor(key: string): string {
	const lower = key.toLowerCase();
	if (lower.endsWith('.png')) return 'image/png';
	if (lower.endsWith('.webp')) return 'image/webp';
	if (lower.endsWith('.gif')) return 'image/gif';
	return 'image/jpeg';
}

const CACHE_HEADERS = {
	'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
} as const;

/** Serve org images from Neon Object Storage (S3), then Blobs / static disk. */
export const GET: RequestHandler = async ({ params }) => {
	const key = params.key ?? '';
	if (!SAFE_KEY.test(key)) throw error(400, 'Invalid key');

	const s3 = getOrgImageS3Config();
	if (s3) {
		try {
			const result = await s3.client.send(
				new GetObjectCommand({
					Bucket: s3.bucket,
					Key: orgImageObjectKey(key)
				})
			);
			if (result.Body) {
				const bytes = await result.Body.transformToByteArray();
				return new Response(bytes, {
					headers: {
						'Content-Type': result.ContentType ?? contentTypeFor(key),
						...CACHE_HEADERS
					}
				});
			}
		} catch (err) {
			const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
				?.httpStatusCode;
			if (status === 404 || status === 403) {
				/* miss: try legacy backends */
			} else {
				console.error('[org-image] Neon GetObject failed:', err);
			}
		}
	}

	try {
		const { getStore } = await import('@netlify/blobs');
		const store = getStore({ name: 'org-images', consistency: 'strong' });
		const result = await store.getWithMetadata(key, { type: 'arrayBuffer' });
		if (result?.data) {
			const metaType =
				typeof result.metadata?.contentType === 'string'
					? result.metadata.contentType
					: contentTypeFor(key);
			return new Response(result.data, {
				headers: {
					'Content-Type': metaType,
					...CACHE_HEADERS
				}
			});
		}
	} catch {
		/* Blobs unavailable: try static disk */
	}

	try {
		const filePath = path.join(process.cwd(), 'static', 'uploads', 'orgs', key);
		const buf = await readFile(filePath);
		return new Response(buf, {
			headers: {
				'Content-Type': contentTypeFor(key),
				...CACHE_HEADERS
			}
		});
	} catch {
		throw error(404, 'Not found');
	}
};
