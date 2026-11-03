/**
 * Admin shell sidebar layout preference.
 * Persisted as `full` | `icon` | `hidden` under `nextup-admin-sidebar-mode`.
 */

export type AdminSidebarMode = 'full' | 'icon' | 'hidden';

export const ADMIN_SIDEBAR_MODE_KEY = 'nextup-admin-sidebar-mode';

export const ADMIN_SIDEBAR_MODE_LABELS: Record<AdminSidebarMode, string> = {
	full: 'Full sidebar',
	icon: 'Icon-only sidebar',
	hidden: 'Burger menu'
};

export function isAdminSidebarMode(value: string | null | undefined): value is AdminSidebarMode {
	return value === 'full' || value === 'icon' || value === 'hidden';
}

export function readAdminSidebarMode(): AdminSidebarMode {
	if (typeof localStorage === 'undefined') return 'full';
	try {
		const stored = localStorage.getItem(ADMIN_SIDEBAR_MODE_KEY);
		if (isAdminSidebarMode(stored)) return stored;
		return 'full';
	} catch {
		return 'full';
	}
}

export function writeAdminSidebarMode(mode: AdminSidebarMode): AdminSidebarMode {
	if (typeof localStorage === 'undefined') return mode;
	try {
		localStorage.setItem(ADMIN_SIDEBAR_MODE_KEY, mode);
	} catch {
		/* ignore quota / private mode */
	}
	return mode;
}
