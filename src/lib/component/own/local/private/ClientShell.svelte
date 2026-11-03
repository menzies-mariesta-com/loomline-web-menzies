<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import {
		readClientSidebarMode,
		writeClientSidebarMode,
		type ClientSidebarMode
	} from '#lib/store/local-storage/client-sidebar-mode';
	import { resolveClientPageTitle } from '#lib/tool/business-nav';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import AppearanceMenu from './AppearanceMenu.svelte';
	import BusinessSidebar from './BusinessSidebar.svelte';
	import LanguageMenu from './LanguageMenu.svelte';
	import { m } from '#lib/paraglide/messages';
	import appIcon from '#lib/asset/image/app-icon-ticket.svg';
	import {
		CircleUser,
		Globe,
		LayoutGrid,
		LogOut,
		PanelLeft,
		PanelLeftClose,
		PanelLeftOpen,
		Shield
	} from '@lucide/svelte';

	type BusinessBrand = {
		id: string;
		name: string;
		imageUrl?: string | null;
		industryPack?: { name: string } | null;
	};

	type Props = {
		platformAdmin?: boolean;
		children: Snippet;
	};

	let { platformAdmin = false, children }: Props = $props();

	const DRAWER_ID = 'client-drawer';

	const business = $derived((page.data as { business?: BusinessBrand; role?: string }).business);
	const role = $derived((page.data as { role?: string }).role ?? '');
	const path = $derived(page.url.pathname);
	const dataTitle = $derived(
		typeof (page.data as { title?: unknown }).title === 'string'
			? (page.data as { title: string }).title
			: undefined
	);
	const pageTitle = $derived(
		resolveClientPageTitle(path, {
			businessId: business?.id,
			role,
			dataTitle
		})
	);
	const onWorkspaces = $derived(path === '/workspaces' || path.startsWith('/workspaces/'));
	const onAccount = $derived(
		path === '/account' ||
			path.startsWith('/account/') ||
			/^\/b\/[^/]+\/account(\/|$)/.test(path)
	);
	const accountHref = $derived(
		business ? `/b/${business.id}/account` : resolve('/account')
	);
	const brandInitial = $derived((business?.name?.trim()?.[0] ?? 'B').toUpperCase());
	const templateName = $derived(business?.industryPack?.name?.trim() || '');
	const brandHref = $derived(business ? `/b/${business.id}` : resolve('/workspaces'));
	const brandLabel = $derived(business ? business.name : 'Business console');

	/** Default `full` for SSR; restored from localStorage in onMount. */
	let mode = $state<ClientSidebarMode>('full');
	/** Tailwind `md` (768px): desktop rail modes apply only at this breakpoint and up. */
	let isMdUp = $state(false);
	/** Bound to the daisyUI drawer checkbox (overlay open state). */
	let drawerOpen = $state(false);
	let signingOut = $state(false);

	const iconOnly = $derived(isMdUp && mode === 'icon');
	/** Hidden mode on md+ uses the same overlay drawer as small screens (not a pinned rail). */
	const burgerMode = $derived(isMdUp && mode === 'hidden');
	const asideWidthClass = $derived(iconOnly ? 'w-14' : 'w-64');
	/** Show labelled nav (full width panel) whenever the overlay drawer is used. */
	const showLabels = $derived(!iconOnly);

	const nextMode = $derived<ClientSidebarMode>(
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

	function closeDrawer() {
		drawerOpen = false;
	}

	function toggleDrawer() {
		drawerOpen = !drawerOpen;
	}

	function setMode(next: ClientSidebarMode) {
		mode = writeClientSidebarMode(next);
		closeDrawer();
	}

	function cycleSidebarMode() {
		setMode(nextMode);
	}

	function onSidebarControlClick() {
		/* Small screens + desktop burger/hidden: toggle overlay drawer (do not cycle). */
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
		mode = readClientSidebarMode();
		const mq = window.matchMedia('(min-width: 768px)');
		const syncMd = () => {
			isMdUp = mq.matches;
			/* Leaving the md breakpoint closes any overlay. */
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
<!-- Burger/hidden: no md:drawer-open so the rail stays closed until the header burger opens the overlay. -->
<div
	class="drawer {washRecipes.pageWash} min-h-[100dvh] w-full {mode !== 'hidden'
		? 'md:drawer-open'
		: ''}"
>
	<input id={DRAWER_ID} type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />

	<div class="drawer-content flex h-[100dvh] min-h-0 min-w-0 flex-col overflow-x-hidden">
		<header
			class="{washRecipes.navbar} sticky top-0 z-30 box-border flex h-12 max-h-12 min-h-12 shrink-0 items-center gap-2 px-3 py-0 md:px-4"
		>
			<div class="flex-none">
				<div class="tooltip tooltip-primary tooltip-right" data-tip={sidebarControlTip}>
					<button
						type="button"
						class="btn btn-ghost btn-square btn-sm btn-primary cursor-pointer"
						aria-label={sidebarControlTip}
						aria-expanded={(!isMdUp || burgerMode) && drawerOpen}
						onclick={onSidebarControlClick}
					>
						<SidebarControlIcon class="size-5" aria-hidden="true" />
					</button>
				</div>
			</div>

			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-semibold sm:text-base">{pageTitle}</p>
			</div>

			<div class="flex shrink-0 items-center gap-1 sm:gap-2">
				{#if platformAdmin}
					<div class="tooltip tooltip-secondary tooltip-bottom" data-tip={m.common_nextup_admin()}>
						<a
							href={resolve('/admin')}
							class="btn btn-ghost btn-square btn-sm btn-secondary hidden cursor-pointer sm:inline-flex"
							aria-label={m.common_nextup_admin()}
						>
							<Shield class="size-4" aria-hidden="true" />
						</a>
					</div>
				{/if}
				<AppearanceMenu size="sm" />
				<LanguageMenu size="sm" />
			</div>
		</header>

		<main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto p-4 sm:p-6">
			{@render children()}
		</main>
	</div>

	<!-- Icon-only: overflow-visible so tooltip-right tips are not clipped by daisyUI drawer-side. -->
	<div
		class="drawer-side z-40 {iconOnly ? 'md:!overflow-visible' : ''}"
	>
		<label for={DRAWER_ID} class="drawer-overlay cursor-pointer" aria-label={m.common_close_menu()}></label>
		<aside
			class="border-base-300 bg-base-100 flex min-h-full {asideWidthClass} flex-col border-e px-0 pb-4 pt-0 transition-[width] duration-200 md:sticky md:top-0 md:h-[100dvh] {iconOnly
				? 'items-center overflow-visible'
				: 'overflow-hidden'}"
			data-sidebar-mode={mode}
		>
			<!-- Same outer height as page header: h-12 + border-b on one box-border element. -->
			<a
				href={brandHref}
				class="border-base-300 box-border flex h-12 max-h-12 min-h-12 w-full min-w-0 shrink-0 cursor-pointer items-center border-b {iconOnly
					? 'justify-center px-0'
					: 'gap-2 px-5'}"
				onclick={closeDrawer}
			>
				{#if business?.imageUrl}
					<img
						src={business.imageUrl}
						alt=""
						class="border-base-300 size-7 shrink-0 rounded-lg border object-cover"
						width="28"
						height="28"
					/>
				{:else if business}
					<span
						class="bg-secondary/20 text-secondary flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
						aria-hidden="true"
					>
						{brandInitial}
					</span>
				{:else}
					<img
						src={appIcon}
						alt=""
						width="28"
						height="28"
						class="size-7 shrink-0"
						aria-hidden="true"
					/>
				{/if}
				{#if showLabels}
					<span class="flex min-w-0 flex-col leading-tight">
						<span class="truncate text-sm font-semibold">{brandLabel}</span>
						{#if business}
							<span class="text-ink-muted truncate text-[10px] font-normal italic">
								{templateName || m.common_no_template()}
							</span>
						{:else}
							<span class="text-ink-muted truncate text-[10px] font-normal italic">
								{m.common_tenant_workspaces()}
							</span>
						{/if}
					</span>
				{:else}
					<span class="sr-only">{brandLabel}</span>
				{/if}
			</a>

			<!-- Icon-only: no overflow clip so tooltip-right can paint into the content area. -->
			<div
				class="flex min-h-0 w-full flex-1 flex-col {iconOnly
					? 'items-center overflow-visible'
					: 'overflow-y-auto px-3'}"
			>
				{#if !business || platformAdmin}
					{#if iconOnly}
						<ul class="mb-3 mt-3 flex w-full flex-col items-center gap-0.5 overflow-visible p-0">
							{#if !business}
								<li class="flex w-full justify-center overflow-visible">
									<a
										href={resolve('/workspaces')}
										class="btn btn-ghost btn-square btn-sm tooltip tooltip-right cursor-pointer {onWorkspaces
											? 'btn-primary tooltip-primary bg-primary/20 text-primary'
											: 'btn-secondary tooltip-secondary'}"
										data-tip={m.common_workspaces()}
										aria-label={m.common_workspaces()}
										aria-current={onWorkspaces ? 'page' : undefined}
										onclick={closeDrawer}
									>
										<LayoutGrid class="size-4 shrink-0" aria-hidden="true" />
									</a>
								</li>
							{/if}
							{#if platformAdmin}
								<li class="flex w-full justify-center overflow-visible">
									<a
										href={resolve('/admin')}
										class="btn btn-ghost btn-square btn-sm btn-secondary tooltip tooltip-right tooltip-secondary cursor-pointer"
										data-tip={m.common_nextup_admin()}
										aria-label={m.common_nextup_admin()}
										onclick={closeDrawer}
									>
										<Shield class="size-4 shrink-0" aria-hidden="true" />
									</a>
								</li>
							{/if}
						</ul>
					{:else}
						<ul class="menu menu-sm mb-3 mt-3 w-full gap-0.5 overflow-visible p-0">
							{#if !business}
								<li class="overflow-visible">
									<a
										href={resolve('/workspaces')}
										class="cursor-pointer rounded-btn {onWorkspaces
											? 'bg-primary/20 font-medium'
											: ''}"
										aria-current={onWorkspaces ? 'page' : undefined}
										onclick={closeDrawer}
									>
										<LayoutGrid class="size-4" aria-hidden="true" />
										{m.common_workspaces()}
									</a>
								</li>
							{/if}
							{#if platformAdmin}
								<li class="overflow-visible">
									<a
										href={resolve('/admin')}
										class="cursor-pointer rounded-btn"
										onclick={closeDrawer}
									>
										<Shield class="size-4" aria-hidden="true" />
										{m.common_nextup_admin()}
									</a>
								</li>
							{/if}
						</ul>
					{/if}
				{/if}

				{#if business}
					<div class="mb-3 mt-3 w-full overflow-visible">
						<BusinessSidebar
							businessId={business.id}
							{role}
							drawerId={DRAWER_ID}
							{iconOnly}
						/>
					</div>
				{/if}
			</div>

			<div class="mt-auto w-full shrink-0">
				<div class="border-base-300 border-t" aria-hidden="true"></div>
				<div
					class="flex flex-col gap-0.5 {iconOnly
						? 'items-center py-2'
						: 'overflow-visible px-3 py-2'}"
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

					<form
						id="client-shell-logout"
						method="POST"
						action={resolve('/auth/logout')}
						class="hidden"
						aria-hidden="true"
						use:enhance={bindSubmitting((v) => (signingOut = v))}
					></form>

					{#if iconOnly}
						<a
							href={accountHref}
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
						<button
							type="submit"
							form="client-shell-logout"
							class="btn btn-ghost btn-square btn-sm btn-error tooltip tooltip-right tooltip-error"
							class:cursor-pointer={!signingOut}
							class:cursor-not-allowed={signingOut}
							class:btn-disabled={signingOut}
							class:loading={signingOut}
							data-tip={m.common_sign_out()}
							aria-label={m.common_sign_out()}
							disabled={signingOut}
							aria-busy={signingOut}
						>
							<LogOut class="size-4 shrink-0" aria-hidden="true" />
						</button>
					{:else}
						<ul class="menu menu-sm w-full gap-0.5 overflow-visible p-0">
							<li class="overflow-visible">
								<a
									href={accountHref}
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
							<li class="overflow-visible">
								<button
									type="submit"
									form="client-shell-logout"
									class="btn btn-ghost btn-error btn-sm h-auto min-h-0 justify-start gap-2 px-3 font-normal"
									class:cursor-pointer={!signingOut}
									class:cursor-not-allowed={signingOut}
									class:btn-disabled={signingOut}
									class:loading={signingOut}
									disabled={signingOut}
									aria-busy={signingOut}
								>
									<LogOut class="size-4 shrink-0" aria-hidden="true" />
									{m.common_sign_out()}
								</button>
							</li>
						</ul>
					{/if}
				</div>
			</div>
		</aside>
	</div>
</div>
