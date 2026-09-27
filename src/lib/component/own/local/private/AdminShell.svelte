<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import favicon from '#lib/asset/image/favicon.svg';
	import {
		readAdminSidebarMode,
		writeAdminSidebarMode,
		type AdminSidebarMode
	} from '#lib/store/local-storage/admin-sidebar-mode';
	import AppearanceMenu from './AppearanceMenu.svelte';
	import LanguageMenu from './LanguageMenu.svelte';
	import { m } from '#lib/paraglide/messages';
	import {
		Building2,
		CircleUser,
		Globe,
		LayoutDashboard,
		LayoutGrid,
		LayoutTemplate,
		Mail,
		PanelLeft,
		PanelLeftClose,
		PanelLeftOpen,
		Settings2,
		Users
	} from '@lucide/svelte';

	type Props = {
		children: Snippet;
	};

	let { children }: Props = $props();

	const path = $derived(page.url.pathname);
	const onAccount = $derived(
		path === '/admin/account' ||
			path.startsWith('/admin/account/') ||
			path === '/account' ||
			path.startsWith('/account/')
	);
	const DRAWER_ID = 'admin-drawer';

	const links = $derived([
		{ href: '/admin', label: m.nav_overview(), icon: LayoutDashboard, exact: true as const },
		{ href: '/admin/businesses', label: m.nav_businesses(), icon: Building2 },
		{ href: '/admin/templates', label: m.nav_templates(), icon: LayoutTemplate },
		{ href: '/admin/invites', label: m.nav_invites(), icon: Mail },
		{ href: '/admin/team', label: m.nav_team(), icon: Users },
		{ href: '/admin/config', label: m.nav_config(), icon: Settings2 }
	]);

	const pageTitle = $derived(
		onAccount
			? m.common_account()
			: (links.find((link) => isActive(link.href, 'exact' in link && link.exact))?.label ??
				m.common_loomline_admin())
	);

	/** Default `full` for SSR; restored from localStorage in onMount. */
	let mode = $state<AdminSidebarMode>('full');
	/** Tailwind `md` (768px): desktop rail modes apply only at this breakpoint and up. */
	let isMdUp = $state(false);
	/** Bound to the daisyUI drawer checkbox (overlay open state). */
	let drawerOpen = $state(false);

	const iconOnly = $derived(isMdUp && mode === 'icon');
	/** Hidden mode on md+ uses the same overlay drawer as small screens (not a pinned rail). */
	const burgerMode = $derived(isMdUp && mode === 'hidden');
	const asideWidthClass = $derived(iconOnly ? 'w-14' : 'w-72');

	const nextMode = $derived<AdminSidebarMode>(
		mode === 'full' ? 'icon' : mode === 'icon' ? 'hidden' : 'full'
	);

	const sidebarControlTip = $derived(
		!isMdUp || burgerMode
			? drawerOpen
				? m.common_close_menu()
				: m.common_open_menu()
			: nextMode === 'icon'
				? m.common_icon_sidebar()
				: m.common_hide_sidebar()
	);

	const SidebarControlIcon = $derived(
		!isMdUp || burgerMode
			? PanelLeft
			: mode === 'full'
				? PanelLeft
				: PanelLeftClose
	);

	function isActive(href: string, exact?: boolean) {
		if (exact) return path === href || path === `${href}/`;
		return path === href || path.startsWith(`${href}/`);
	}

	function closeDrawer() {
		drawerOpen = false;
	}

	function toggleDrawer() {
		drawerOpen = !drawerOpen;
	}

	function setMode(next: AdminSidebarMode) {
		mode = writeAdminSidebarMode(next);
		closeDrawer();
	}

	function cycleSidebarMode() {
		setMode(nextMode);
	}

	function onSidebarControlClick() {
		if (!isMdUp || burgerMode) {
			toggleDrawer();
			return;
		}
		cycleSidebarMode();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		closeDrawer();
	}

	onMount(() => {
		mode = readAdminSidebarMode();
		const mq = window.matchMedia('(min-width: 768px)');
		const syncMd = () => {
			isMdUp = mq.matches;
			if (!mq.matches) closeDrawer();
		};
		syncMd();
		mq.addEventListener('change', syncMd);
		return () => mq.removeEventListener('change', syncMd);
	});

	$effect(() => {
		path;
		closeDrawer();
	});
</script>

<svelte:window onkeydown={onKeydown} />

<!-- Literal `md:drawer-open` so daisyUI emits it in utilities (washRecipes.drawer alone is not scanned). -->
<div
	class="drawer {washRecipes.pageWash} min-h-[100dvh] w-full {mode !== 'hidden'
		? 'md:drawer-open'
		: ''}"
>
	<input id={DRAWER_ID} type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />

	<div class="drawer-content flex h-[100dvh] min-h-0 min-w-0 flex-col overflow-x-hidden">
		<header class="{washRecipes.navbar} sticky top-0 z-30 min-h-14 gap-2 px-3 md:px-5">
			<div class="flex-none">
				<div class="tooltip tooltip-primary tooltip-right" data-tip={sidebarControlTip}>
					<button
						type="button"
						class="btn btn-ghost btn-square btn-primary cursor-pointer"
						aria-label={sidebarControlTip}
						aria-expanded={(!isMdUp || burgerMode) && drawerOpen}
						onclick={onSidebarControlClick}
					>
						<SidebarControlIcon class="size-5" aria-hidden="true" />
					</button>
				</div>
			</div>

			<div class="min-w-0 flex-1">
				<p class="truncate text-base font-semibold sm:text-lg">{pageTitle}</p>
			</div>

			<div class="flex shrink-0 items-center gap-1 sm:gap-2">
				<div class="tooltip tooltip-secondary tooltip-bottom" data-tip={m.common_workspaces()}>
					<a
						href={resolve('/workspaces')}
						class="btn btn-ghost btn-square btn-secondary cursor-pointer"
						aria-label={m.common_workspaces()}
					>
						<LayoutGrid class="size-4" aria-hidden="true" />
					</a>
				</div>
				<AppearanceMenu />
				<LanguageMenu />
			</div>
		</header>

		<main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto p-4 sm:p-6 lg:p-8">
			{@render children()}
		</main>
	</div>

	<!-- Icon-only: overflow-visible so tooltip-right tips are not clipped by daisyUI drawer-side. -->
	<div class="drawer-side z-40 {iconOnly ? 'md:!overflow-visible' : ''}">
		<label for={DRAWER_ID} class="drawer-overlay cursor-pointer" aria-label={m.common_close_menu()}></label>
		<aside
			class="border-base-300 bg-base-100 flex min-h-full {asideWidthClass} flex-col border-e py-5 transition-[width] duration-200 md:sticky md:top-0 md:h-[100dvh] {iconOnly
				? 'items-center overflow-visible px-0'
				: 'overflow-hidden px-3'}"
			data-sidebar-mode={mode}
		>
			<a
				href={resolve('/admin')}
				class="mb-1 flex w-full cursor-pointer items-center rounded-lg py-1.5 {iconOnly
					? 'justify-center px-0'
					: 'gap-2.5 px-2'}"
				onclick={closeDrawer}
			>
				<img
					src={favicon}
					alt=""
					width="36"
					height="36"
					class="size-9 shrink-0 rounded-lg"
					aria-hidden="true"
				/>
				{#if !iconOnly}
					<span class="min-w-0">
						<span class="block font-semibold leading-tight">{m.common_loomline_admin()}</span>
					</span>
				{:else}
					<span class="sr-only">{m.common_loomline_admin()}</span>
				{/if}
			</a>

			<nav
				class="mt-5 flex min-h-0 w-full flex-1 flex-col {iconOnly
					? 'items-center overflow-visible'
					: 'overflow-y-auto'}"
				aria-label={m.common_loomline_admin()}
			>
				{#if iconOnly}
					<ul class="flex w-full flex-col items-center gap-0.5 overflow-visible p-0">
						{#each links as link (link.href)}
							{@const Icon = link.icon}
							{@const active = isActive(link.href, 'exact' in link && link.exact)}
							<li class="flex w-full justify-center overflow-visible">
								<a
									href={resolve(link.href)}
									class="btn btn-ghost btn-square btn-sm tooltip tooltip-right cursor-pointer {active
										? 'btn-primary tooltip-primary bg-primary/20 text-primary'
										: 'btn-secondary tooltip-secondary'}"
									data-tip={link.label}
									aria-label={link.label}
									aria-current={active ? 'page' : undefined}
									onclick={closeDrawer}
								>
									<Icon class="size-4 shrink-0" aria-hidden="true" />
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<ul class="menu menu-md w-full gap-0.5 overflow-visible p-0">
						{#each links as link (link.href)}
							{@const Icon = link.icon}
							{@const active = isActive(link.href, 'exact' in link && link.exact)}
							<li class="overflow-visible">
								<a
									href={resolve(link.href)}
									class="cursor-pointer rounded-btn {active
										? 'bg-primary/20 text-primary font-medium'
										: ''}"
									aria-current={active ? 'page' : undefined}
									onclick={closeDrawer}
								>
									<Icon class="size-4 shrink-0" aria-hidden="true" />
									{link.label}
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</nav>

			<div class="mt-auto w-full shrink-0">
				<div
					class="border-base-300 border-t {iconOnly ? '' : '-mx-3'}"
					aria-hidden="true"
				></div>
				<div
					class="flex flex-col gap-0.5 {iconOnly
						? 'items-center py-2'
						: 'overflow-visible py-2'}"
				>
					{#if burgerMode}
						<button
							type="button"
							class="btn btn-ghost btn-sm btn-primary w-full cursor-pointer justify-start gap-2"
							aria-label={m.common_full_sidebar()}
							onclick={() => setMode('full')}
						>
							<PanelLeftOpen class="size-4 shrink-0" aria-hidden="true" />
							Full sidebar
						</button>
					{/if}

					{#if iconOnly}
						<a
							href={resolve('/admin/account')}
							class="btn btn-ghost btn-square btn-sm btn-primary tooltip tooltip-right tooltip-primary cursor-pointer"
							data-tip={m.common_account()}
							aria-label={m.common_account()}
							aria-current={onAccount ? 'page' : undefined}
							onclick={closeDrawer}
						>
							<CircleUser class="size-4 shrink-0" aria-hidden="true" />
						</a>
						<a
							href={resolve('/')}
							class="btn btn-ghost btn-square btn-sm btn-primary tooltip tooltip-right tooltip-primary cursor-pointer"
							data-tip={m.common_website()}
							aria-label={m.common_website()}
							onclick={closeDrawer}
						>
							<Globe class="size-4 shrink-0" aria-hidden="true" />
						</a>
					{:else}
						<ul class="menu menu-sm w-full gap-0.5 overflow-visible p-0">
							<li class="overflow-visible">
								<a
									href={resolve('/admin/account')}
									class="cursor-pointer rounded-btn {onAccount
										? 'bg-primary/20 text-primary font-medium'
										: ''}"
									aria-current={onAccount ? 'page' : undefined}
									onclick={closeDrawer}
								>
									<CircleUser class="size-4 shrink-0" aria-hidden="true" />
									{m.common_account()}
								</a>
							</li>
							<li class="overflow-visible">
								<a
									href={resolve('/')}
									class="cursor-pointer rounded-btn"
									onclick={closeDrawer}
								>
									<Globe class="size-4 shrink-0" aria-hidden="true" />
									{m.common_website()}
								</a>
							</li>
						</ul>
					{/if}
				</div>
			</div>
		</aside>
	</div>
</div>
