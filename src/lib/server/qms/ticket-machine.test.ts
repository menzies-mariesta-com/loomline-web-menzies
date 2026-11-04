import { describe, expect, it } from 'vitest';
import { isUniqueViolation } from '#lib/server/qms/ticket-machine';

describe('isUniqueViolation', () => {
	it('detects postgres-style unique errors', () => {
		expect(isUniqueViolation(new Error('duplicate key value violates unique constraint'))).toBe(true);
		expect(isUniqueViolation(new Error('23505'))).toBe(true);
		expect(isUniqueViolation(new Error('something else'))).toBe(false);
		expect(isUniqueViolation('nope')).toBe(false);
	});
});
