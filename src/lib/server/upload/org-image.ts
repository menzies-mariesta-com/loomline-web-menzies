import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
	AWS_ACCESS_KEY_ID,
	AWS_ENDPOINT_URL_S3,
	AWS_REGION,
	AWS_SECRET_ACCESS_KEY,
	ORG_IMAGE_BUCKET
} from '$app/env/private';
import { randomToken } from '#lib/server/qms/ids';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 2 * 1024 * 1024;

/** Object key prefix inside the bucket (URL still uses the bare filename). */
export const ORG_IMAGE_KEY_PREFIX = 'orgs/';

function extFor(type: string): string {
	if (type === 'image/png') return 'png';
	if (type === 'image/webp') return 'webp';
	if (type === 'image/gif') return 'gif';
	return 'jpg';
}

function envTrim(value: string | undefined | null): string | undefined {
	const v = value?.trim();
	return v ? v : undefined;
}

/** Neon S3 config when credentials + endpoint + bucket are set. */
export function getOrgImageS3Config(): {
	client: S3Client;
	bucket: string;
} | null {
	const accessKeyId = envTrim(AWS_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID);
	const secretAccessKey = envTrim(AWS_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY);
	const region = envTrim(AWS_REGION ?? process.env.AWS_REGION) ?? 'us-east-2';
	const endpoint = envTrim(AWS_ENDPOINT_URL_S3 ?? process.env.AWS_ENDPOINT_URL_S3);
	const bucket =
		envTrim(ORG_IMAGE_BUCKET ?? process.env.ORG_IMAGE_BUCKET) ??
		envTrim(process.env.NEON_BUCKET) ??
		'uploads';

	if (!accessKeyId || !secretAccessKey || !endpoint) {
		return null;
	}

	const client = new S3Client({
		forcePathStyle: true,
		region,
		endpoint,
		credentials: { accessKeyId, secretAccessKey }
	});

	return { client, bucket };
}

export function orgImageObjectKey(fileKey: string): string {
	return `${ORG_IMAGE_KEY_PREFIX}${fileKey}`;
}

/**
 * Persist an org logo/avatar.
 * Prefers Neon Object Storage (S3) when `AWS_*` + bucket are configured;
 * falls back to Netlify Blobs, then local disk under `static/uploads/orgs/`.
 */
export async function saveOrgImage(file: File): Promise<string | null> {
	if (!file || file.size === 0) return null;
	if (!ALLOWED.has(file.type)) {
		throw new Error('Image must be JPEG, PNG, WebP, or GIF.');
	}
	if (file.size > MAX_BYTES) {
		throw new Error('Image must be 2MB or smaller.');
	}

	const arrayBuffer = await file.arrayBuffer();
	const fileKey = `org-${Date.now().toString(36)}-${randomToken(6)}.${extFor(file.type)}`;
	const publicUrl = `/api/uploads/orgs/${fileKey}`;

	const s3 = getOrgImageS3Config();
	if (s3) {
		const objectKey = orgImageObjectKey(fileKey);
		await s3.client.send(
			new PutObjectCommand({
				Bucket: s3.bucket,
				Key: objectKey,
				Body: Buffer.from(arrayBuffer),
				ContentType: file.type
			})
		);
		return publicUrl;
	}

	console.warn(
		'[org-image] Neon Object Storage not configured (need AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3). Falling back to Netlify Blobs / disk.'
	);

	try {
		const { getStore } = await import('@netlify/blobs');
		const store = getStore({ name: 'org-images', consistency: 'strong' });
		await store.set(fileKey, arrayBuffer, {
			metadata: { contentType: file.type, uploadedAt: new Date().toISOString() }
		});
		return publicUrl;
	} catch (err) {
		console.warn('[org-image] Netlify Blobs unavailable; writing to static/uploads/orgs/.', err);
		const dir = path.join(process.cwd(), 'static', 'uploads', 'orgs');
		await mkdir(dir, { recursive: true });
		await writeFile(path.join(dir, fileKey), Buffer.from(arrayBuffer));
		return `/uploads/orgs/${fileKey}`;
	}
}
