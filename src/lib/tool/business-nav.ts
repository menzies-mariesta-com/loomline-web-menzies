import {
	LayoutDashboard,
	MapPin,
	Briefcase,
	Monitor,
	ListOrdered,
	Ticket,
	CalendarDays,
	Tablet,
	Users,
	Headset,
	Settings2,
	UserRound,
	Building2,
	ArrowRightLeft,
	GitBranch
} from '@lucide/svelte';
import { m } from '#lib/paraglide/messages';

export type BusinessNavLink = {
	href: string;
	label: string;
	icon: typeof LayoutDashboard;
	exact?: boolean;
};

export function getBusinessNavLinks(businessId: string, role: string): BusinessNavLink[] {
	const base = `/b/${businessId}`;
	const isStaff = ['platform_admin', 'business_owner', 'manager', 'counter_agent'].includes(role);
	const isGuest = role === 'guest';
	const canManage = ['platform_admin', 'business_owner', 'manager'].includes(role);
	const isCounterAgent = role === 'counter_agent';

	if (isGuest) {
		return [
			{ href: base, label: m.common_home(), icon: LayoutDashboard, exact: true },
			{ href: `${base}/guest`, label: m.nav_guest(), icon: UserRound }
		];
	}
	if (!isStaff) return [];

	/** Station accounts: ticket calling only. */
	if (isCounterAgent) {
		return [
			{ href: base, label: m.common_home(), icon: LayoutDashboard, exact: true },
			{ href: `${base}/agent`, label: m.nav_agent(), icon: Headset }
		];
	}

	const staff: BusinessNavLink[] = [
		{ href: base, label: m.common_home(), icon: LayoutDashboard, exact: true },
		{ href: `${base}/agent`, label: m.nav_agent(), icon: Headset },
		{ href: `${base}/departments`, label: m.nav_departments(), icon: Building2 },
		{ href: `${base}/destinations`, label: m.nav_destinations(), icon: ArrowRightLeft },
		{ href: `${base}/timelines`, label: m.nav_timelines(), icon: GitBranch },
		{ href: `${base}/counters`, label: m.nav_counters(), icon: Monitor },
		{ href: `${base}/services`, label: m.nav_services(), icon: Briefcase },
		{ href: `${base}/queues`, label: m.nav_queues(), icon: ListOrdered },
		{ href: `${base}/sites`, label: m.nav_sites(), icon: MapPin },
		{ href: `${base}/tickets`, label: m.nav_tickets(), icon: Ticket },
		{ href: `${base}/appointments`, label: m.nav_appointments(), icon: CalendarDays },
		{ href: `${base}/devices`, label: m.nav_devices(), icon: Tablet }
	];

	if (canManage) {
		staff.push(
			{ href: `${base}/team`, label: m.nav_team(), icon: Users },
			{ href: `${base}/config`, label: m.nav_config(), icon: Settings2 }
		);
	}

	return staff;
}

export function isBusinessNavActive(pathname: string, href: string, exact?: boolean): boolean {
	if (exact) return pathname === href;
	return pathname === href || pathname.startsWith(`${href}/`);
}

function titleCaseSegment(segment: string): string {
	return segment
		.replace(/[-_]+/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Top-bar page title from route + sidebar nav labels (never the business name). */
export function resolveClientPageTitle(
	pathname: string,
	opts: { businessId?: string; role?: string; dataTitle?: string } = {}
): string {
	if (pathname === '/workspaces' || pathname.startsWith('/workspaces/')) {
		return m.common_workspaces();
	}

	if (
		pathname === '/account' ||
		pathname.startsWith('/account/') ||
		pathname === '/admin/account' ||
		pathname.startsWith('/admin/account/') ||
		/^\/b\/[^/]+\/account(\/|$)/.test(pathname)
	) {
		return m.common_account();
	}

	if (opts.businessId) {
		const links = getBusinessNavLinks(opts.businessId, opts.role ?? '');
		const match = links
			.filter((link) => isBusinessNavActive(pathname, link.href, link.exact))
			.sort((a, b) => b.href.length - a.href.length)[0];
		if (match) return match.label;
	}

	if (opts.dataTitle?.trim()) return opts.dataTitle.trim();

	const segments = pathname.split('/').filter(Boolean);
	const last = segments.at(-1);
	if (!last || last === opts.businessId) return m.common_home();
	return titleCaseSegment(last);
}
