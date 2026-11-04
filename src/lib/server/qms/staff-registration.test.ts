import { describe, expect, it } from 'vitest';
import { isStaffRegistrationBlockedRole } from '#lib/server/qms/staff-registration';

describe('isStaffRegistrationBlockedRole', () => {
	it('blocks owner and platform admin', () => {
		expect(isStaffRegistrationBlockedRole('business_owner')).toBe(true);
		expect(isStaffRegistrationBlockedRole('platform_admin')).toBe(true);
	});

	it('allows staff roles', () => {
		expect(isStaffRegistrationBlockedRole('manager')).toBe(false);
		expect(isStaffRegistrationBlockedRole('business_admin')).toBe(false);
	});
});
