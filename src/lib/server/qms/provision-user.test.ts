import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFirst = vi.fn();

vi.mock('#lib/server/db', () => ({
	db: {
		query: {
			user: { findFirst: (...args: unknown[]) => findFirst(...args) }
		}
	}
}));

import { assertEmailAvailable } from '#lib/server/qms/provision-user';

describe('assertEmailAvailable', () => {
	beforeEach(() => {
		findFirst.mockReset();
	});

	it('rejects empty email', async () => {
		await expect(assertEmailAvailable('  ')).rejects.toThrow(/Email required/);
	});

	it('rejects when user already exists', async () => {
		findFirst.mockResolvedValueOnce({ id: 'u1', email: 'taken@example.com' });
		await expect(assertEmailAvailable('Taken@Example.com')).rejects.toThrow(/already exists/);
		expect(findFirst).toHaveBeenCalled();
	});

	it('passes when no user row', async () => {
		findFirst.mockResolvedValueOnce(undefined);
		await expect(assertEmailAvailable('new@example.com')).resolves.toBeUndefined();
	});
});
