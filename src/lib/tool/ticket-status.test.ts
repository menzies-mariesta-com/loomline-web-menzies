import { describe, expect, it } from 'vitest';
import {
	canRecallTicket,
	canStartServing,
	canCallTicket
} from '#lib/tool/ticket-status';

describe('ticket-status', () => {
	it('recall only when called', () => {
		expect(canRecallTicket('called')).toBe(true);
		expect(canRecallTicket('waiting')).toBe(false);
	});

	it('serve when called or held', () => {
		expect(canStartServing('called')).toBe(true);
		expect(canStartServing('held')).toBe(true);
		expect(canStartServing('waiting')).toBe(false);
	});

	it('call when waiting only', () => {
		expect(canCallTicket('waiting')).toBe(true);
		expect(canCallTicket('called')).toBe(false);
	});
});
