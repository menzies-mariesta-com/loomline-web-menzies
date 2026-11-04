import type { Component } from 'svelte';
import {
	Ticket,
	CalendarDays,
	Headset,
	UserRound
} from '@lucide/svelte';
import LucideUserCog from '#lib/component/own/library/lucide/LucideUserCog.svelte';
import { m } from '#lib/paraglide/messages';
import {
	administrationPageTemplates
} from '#lib/tool/business-console-pages';

export type BusinessNavLink = {
	href: string;
	label: string;
	icon: Component;
	exact?: boolean;
};

export type BusinessNavPage = {
	href: string;
	label: string;
	exact?: boolean;
};

export type BusinessNavPageGroup = {
	label: string;
	pages: BusinessNavPage[];
};

export type BusinessNavModule = {
	id: string;
	label: string;
	icon: Component;
	groups: BusinessNavPageGroup[];
};

export type BusinessModuleBarModel = {
	/** Hover dropdown modules (e.g. Administration). */
	modules: BusinessNavModule[];
	/** Top-level module bar tabs. */
	links: BusinessNavLink[];
};

function operationalLinks(base: string): BusinessNavLink[] {
	return [
		{ href: `${base}/agent`, label: m.nav_agent(), icon: Headset },
		{ href: `${base}/tickets`, label: m.nav_tickets(), icon: Ticket },
		{ href: `${base}/appointments`, label: m.nav_appointments(), icon: CalendarDays }
	];
}

function administrationModule(base: string): BusinessNavModule {
	const groups: BusinessNavPageGroup[] = [];
	const groupOrder: string[] = [];
	const groupPages = new Map<string, BusinessNavPage[]>();
	for (const tpl of administrationPageTemplates()) {
		const gl = tpl.groupLabel();
		if (!groupPages.has(gl)) {
			groupOrder.push(gl);
			groupPages.set(gl, []);
		}
		groupPages.get(gl)!.push({
			href: `${base}${tpl.pathSuffix}`,
			label: tpl.pageLabel()
		});
	}
	for (const label of groupOrder) {
		groups.push({ label, pages: groupPages.get(label) ?? [] });
	}

	return {
		id: 'administration',
		label: m.nav_administration(),
		icon: LucideUserCog,
		groups
	};
}

const STAFF_ROLE_SET = new Set([
	'platform_admin',
	'business_owner',
	'business_admin',
	'manager',
	'counter_agent'
]);
const MANAGE_ROLE_SET = new Set(['platform_admin', 'business_owner', 'business_admin', 'manager']);

/** Module bar: Administration dropdown first, then floor operations. Overview is the home icon only. */
export function getBusinessModuleBar(businessId: string, role: string): BusinessModuleBarModel {
	const base = `/b/${businessId}`;
	const isStaff = STAFF_ROLE_SET.has(role);
	const isGuest = role === 'guest';
	const canManage = MANAGE_ROLE_SET.has(role);
	const isCounterAgent = role === 'counter_agent';

	if (isGuest) {
		return {
			modules: [],
			links: [{ href: `${base}/guest`, label: m.nav_guest(), icon: UserRound }]
		};
	}
	if (!isStaff) return { modules: [], links: [] };

	if (isCounterAgent) {
		return {
			modules: [],
			links: [{ href: `${base}/agent`, label: m.nav_agent(), icon: Headset }]
		};
	}

	const modules = canManage ? [administrationModule(base)] : [];
	return { modules, links: operationalLinks(base) };
}

/** Flat list for sidebars and title resolution (no duplicate Overview tab). */
export function getBusinessNavLinks(businessId: string, role: string): BusinessNavLink[] {
	const { modules, links } = getBusinessModuleBar(businessId, role);
	const flat: BusinessNavLink[] = [...links];
	for (const mod of modules) {
		for (const group of mod.groups) {
			for (const page of group.pages) {
				flat.push({
					href: page.href,
					label: page.label,
					icon: mod.icon
				});
			}
		}
	}
	return flat;
}

export function getBusinessSidebarGroups(
	businessId: string,
	role: string
): { links: BusinessNavLink[]; adminGroups: BusinessNavPageGroup[] } {
	const { modules, links } = getBusinessModuleBar(businessId, role);
	const adminGroups = modules.find((x) => x.id === 'administration')?.groups ?? [];
	return { links, adminGroups };
}

export function isBusinessNavActive(pathname: string, href: string, exact?: boolean): boolean {
	if (exact) return pathname === href;
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function activeAdministrationPage(
	pathname: string,
	businessId: string,
	role: string
): BusinessNavPage | null {
	const { modules } = getBusinessModuleBar(businessId, role);
	const mod = modules.find((x) => x.id === 'administration');
	if (!mod) return null;
	let best: BusinessNavPage | null = null;
	for (const group of mod.groups) {
		for (const page of group.pages) {
			if (!isBusinessNavActive(pathname, page.href, page.exact)) continue;
			if (!best || page.href.length > best.href.length) best = page;
		}
	}
	return best;
}

function titleCaseSegment(segment: string): string {
	return segment
		.replace(/[-_]+/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Top-bar page title from route + nav labels (never the business name). */
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
		const adminPage = activeAdministrationPage(pathname, opts.businessId, opts.role ?? '');
		if (adminPage) return adminPage.label;

		const links = getBusinessNavLinks(opts.businessId, opts.role ?? '');
		const match = links
			.filter((link) => isBusinessNavActive(pathname, link.href, link.exact))
			.sort((a, b) => b.href.length - a.href.length)[0];
		if (match) return match.label;

		if (pathname === `/b/${opts.businessId}` || pathname === `/b/${opts.businessId}/`) {
			return m.nav_overview();
		}
	}

	if (opts.dataTitle?.trim()) return opts.dataTitle.trim();

	const segments = pathname.split('/').filter(Boolean);
	const last = segments.at(-1);
	if (!last || last === opts.businessId) return m.nav_overview();
	return titleCaseSegment(last);
}

export type BusinessPageSearchOption = {
	value: string;
	label: string;
};

/** Flat command-palette entries for module bar search (Medora pageSearchOptions). */
export function buildBusinessPageSearchOptions(
	businessId: string,
	role: string
): BusinessPageSearchOption[] {
	const base = `/b/${businessId}`;
	const { modules, links } = getBusinessModuleBar(businessId, role);
	const out: BusinessPageSearchOption[] = [{ value: base, label: m.nav_overview() }];

	for (const link of links) {
		out.push({ value: link.href, label: link.label });
	}

	for (const mod of modules) {
		for (const group of mod.groups) {
			for (const page of group.pages) {
				const labelParts = [page.label, mod.label, group.label].filter((part) => part.length > 0);
				out.push({ value: page.href, label: labelParts.join(' · ') });
			}
		}
	}

	return out;
}

export function filterBusinessModuleBar(
	model: BusinessModuleBarModel,
	allowedPaths: Set<string> | string[]
): BusinessModuleBarModel {
	const allowed = allowedPaths instanceof Set ? allowedPaths : new Set(allowedPaths);
	const links = model.links.filter((link) => allowed.has(link.href));
	const modules = model.modules
		.map((mod) => ({
			...mod,
			groups: mod.groups
				.map((group) => ({
					...group,
					pages: group.pages.filter((page) => allowed.has(page.href))
				}))
				.filter((group) => group.pages.length > 0)
		}))
		.filter((mod) => mod.groups.length > 0);
	return { modules, links };
}

export function filterNavRoleLinks(
	model: BusinessModuleBarModel,
	role: string
): BusinessModuleBarModel {
	if (role === 'counter_agent') {
		return { modules: [], links: model.links.filter((l) => l.href.endsWith('/agent')) };
	}
	if (role === 'guest') {
		return { modules: [], links: model.links.filter((l) => l.href.endsWith('/guest')) };
	}
	return model;
}
