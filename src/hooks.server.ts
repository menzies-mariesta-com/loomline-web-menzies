import { sequence } from '@sveltejs/kit/hooks';
import { building, dev } from '$app/env';
import { auth } from '#lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';
import { getTextDirection } from '#lib/paraglide/runtime';
import { paraglideMiddleware } from '#lib/paraglide/server';
import {
	clientIpFromRequest,
	enforceRateLimit
} from '#lib/server/security/rate-limit';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

const handleRateLimit: Handle = async ({ event, resolve }) => {
	if (event.request.method === 'POST') {
		const path = event.url.pathname;
		const ip = clientIpFromRequest(event.request, () => event.getClientAddress());

		if (path === '/auth/login' || path.endsWith('/auth/login')) {
			await enforceRateLimit({ scope: 'login:ip', id: ip, limit: 10, windowSeconds: 60 });
		}
		if (path.includes('/auth/accept-invite')) {
			await enforceRateLimit({ scope: 'invite:ip', id: ip, limit: 8, windowSeconds: 60 });
		}
		if (path.includes('/administration/staff/registration') && path.startsWith('/api/')) {
			await enforceRateLimit({ scope: 'staff-reg:ip', id: ip, limit: 30, windowSeconds: 60 });
		}
		if (path.startsWith('/kiosk/') && event.request.method === 'POST') {
			await enforceRateLimit({ scope: 'kiosk:ip', id: ip, limit: 40, windowSeconds: 60 });
		}
	}

	if (event.request.method === 'GET' && event.url.pathname.startsWith('/t/')) {
		const ip = clientIpFromRequest(event.request, () => event.getClientAddress());
		await enforceRateLimit({ scope: 'ticket-track:ip', id: ip, limit: 120, windowSeconds: 60 });
	}

	return resolve(event);
};

const PUBLIC_CACHE_PREFIXES = ['/', '/pricing', '/privacy', '/terms', '/docs', '/og-nextup.png'];

function isPublicCacheablePath(pathname: string): boolean {
	if (pathname.startsWith('/_app/immutable/')) return true;
	if (pathname === '/og-nextup.png') return true;
	return PUBLIC_CACHE_PREFIXES.some(
		(p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`))
	);
}

const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	const path = event.url.pathname;
	const headers = response.headers;

	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	if (path.startsWith('/display/') || path.startsWith('/kiosk/')) {
		headers.set('X-Frame-Options', 'SAMEORIGIN');
	} else {
		headers.set('X-Frame-Options', 'DENY');
	}

	if (!dev) {
		headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
	}

	headers.set(
		'Content-Security-Policy-Report-Only',
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'self'"
	);

	if (event.locals.user) {
		headers.set('Cache-Control', 'private, no-store');
		headers.set('Vary', 'Cookie');
	} else if (
		event.request.method === 'GET' &&
		response.status === 200 &&
		isPublicCacheablePath(path) &&
		!headers.has('Cache-Control')
	) {
		headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
	}

	return response;
};

export const handle: Handle = sequence(
	handleParaglide,
	handleRateLimit,
	handleBetterAuth,
	handleSecurityHeaders
);
