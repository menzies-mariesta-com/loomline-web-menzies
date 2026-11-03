/**
 * Business / client shell sidebar layout preference.
 * Persisted as `full` | `icon` | `hidden` under `nextup-client-sidebar-mode`.
 */

export type ClientSidebarMode = 'full' | 'icon' | 'hidden';

export const CLIENT_SIDEBAR_MODE_KEY = 'nextup-client-sidebar-mode';

export const CLIENT_SIDEBAR_MODE_LABELS: Record<ClientSidebarMode, string> = {
	full: 'Full sidebar',
	icon: 'Icon-only sidebar',
	hidden: 'Burger menu'
};

export function isClientSidebarMode(value: string | null | undefined): value is ClientSidebarMode {
	return value === 'full' || value === 'icon' || value === 'hidden';
}

export function readClientSidebarMode(): ClientSidebarMode {
	if (typeof localStorage === 'undefined') return 'full';
	try {
		const stored = localStorage.getItem(CLIENT_SIDEBAR_MODE_KEY);
		if (isClientSidebarMode(stored)) return stored;
		return 'full';
	} catch {
		return 'full';
	}
}

export function writeClientSidebarMode(mode: ClientSidebarMode): ClientSidebarMode {
	if (typeof localStorage === 'undefined') return mode;
	try {
		localStorage.setItem(CLIENT_SIDEBAR_MODE_KEY, mode);
	} catch {
		/* ignore quota / private mode */
	}
	return mode;
}
