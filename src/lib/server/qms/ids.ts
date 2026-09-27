import { randomBytes } from 'node:crypto';
import { formatTicketNumber, slugify } from '#lib/util/format';

export { formatTicketNumber, slugify };

export function randomToken(bytes = 24): string {
	return randomBytes(bytes).toString('base64url');
}

export function randomPairingCode(): string {
	return randomBytes(4).toString('hex').toUpperCase();
}
