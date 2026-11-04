import { m } from '#lib/paraglide/messages';

/** Path suffix after `/b/{businessId}` for RBAC catalog + nav (single source of truth). */
export type ConsolePageTemplate = {
	pathSuffix: string;
	groupLabel: () => string;
	pageLabel: () => string;
	sortOrder: number;
};

export const CONSOLE_PAGE_TEMPLATES: ConsolePageTemplate[] = [
	{ pathSuffix: '/agent', groupLabel: () => m.nav_agent(), pageLabel: () => m.nav_agent(), sortOrder: 10 },
	{
		pathSuffix: '/tickets',
		groupLabel: () => m.nav_tickets(),
		pageLabel: () => m.nav_tickets(),
		sortOrder: 11
	},
	{
		pathSuffix: '/appointments',
		groupLabel: () => m.nav_appointments(),
		pageLabel: () => m.nav_appointments(),
		sortOrder: 12
	},
	{ pathSuffix: '/guest', groupLabel: () => m.nav_guest(), pageLabel: () => m.nav_guest(), sortOrder: 13 },
	{
		pathSuffix: '/sites',
		groupLabel: () => m.nav_group_floor_setup(),
		pageLabel: () => m.nav_sites(),
		sortOrder: 20
	},
	{
		pathSuffix: '/services',
		groupLabel: () => m.nav_group_floor_setup(),
		pageLabel: () => m.nav_services(),
		sortOrder: 21
	},
	{
		pathSuffix: '/queues',
		groupLabel: () => m.nav_group_floor_setup(),
		pageLabel: () => m.nav_queues(),
		sortOrder: 22
	},
	{
		pathSuffix: '/counters',
		groupLabel: () => m.nav_group_floor_setup(),
		pageLabel: () => m.nav_counters(),
		sortOrder: 23
	},
	{
		pathSuffix: '/devices',
		groupLabel: () => m.nav_group_floor_setup(),
		pageLabel: () => m.nav_devices(),
		sortOrder: 24
	},
	{
		pathSuffix: '/departments',
		groupLabel: () => m.nav_group_routing(),
		pageLabel: () => m.nav_departments(),
		sortOrder: 30
	},
	{
		pathSuffix: '/destinations',
		groupLabel: () => m.nav_group_routing(),
		pageLabel: () => m.nav_destinations(),
		sortOrder: 31
	},
	{
		pathSuffix: '/timelines',
		groupLabel: () => m.nav_group_routing(),
		pageLabel: () => m.nav_timelines(),
		sortOrder: 32
	},
	{
		pathSuffix: '/administration/staff/registration',
		groupLabel: () => m.nav_group_business(),
		pageLabel: () => m.nav_staff_registration(),
		sortOrder: 40
	},
	{
		pathSuffix: '/administration/staff/list',
		groupLabel: () => m.nav_group_business(),
		pageLabel: () => m.nav_staff_list(),
		sortOrder: 41
	},
	{
		pathSuffix: '/administration/user-group',
		groupLabel: () => m.nav_group_business(),
		pageLabel: () => m.nav_user_groups(),
		sortOrder: 42
	},
	{
		pathSuffix: '/config',
		groupLabel: () => m.nav_group_business(),
		pageLabel: () => m.nav_config(),
		sortOrder: 43
	},
	{
		pathSuffix: '/logs',
		groupLabel: () => m.nav_group_business(),
		pageLabel: () => m.nav_logs(),
		sortOrder: 44
	}
];

export function businessConsolePath(businessId: string, pathSuffix: string): string {
	return `/b/${businessId}${pathSuffix}`;
}

/** Administration dropdown pages (excludes top-level operational tabs). */
export function administrationPageTemplates(): ConsolePageTemplate[] {
	return CONSOLE_PAGE_TEMPLATES.filter((p) =>
		[
			'/sites',
			'/services',
			'/queues',
			'/counters',
			'/devices',
			'/departments',
			'/destinations',
			'/timelines',
			'/administration/staff/registration',
			'/administration/staff/list',
			'/administration/user-group',
			'/config',
			'/logs'
		].includes(p.pathSuffix)
	);
}

export const DEFAULT_USER_GROUP_NAMES = {
	fullAdmin: 'Full administration',
	floorOps: 'Floor operations',
	guestAccess: 'Guest access'
} as const;
