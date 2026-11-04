<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount, tick } from 'svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import {
		buildBusinessPageSearchOptions,
		filterBusinessModuleBar,
		filterNavRoleLinks,
		getBusinessModuleBar,
		resolveClientPageTitle
	} from '#lib/tool/business-nav';
	import BusinessModuleBarItems from './BusinessModuleBarItems.svelte';
	import SearchSelect from './SearchSelect.svelte';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import AppearanceMenu from './AppearanceMenu.svelte';
	import LanguageMenu from './LanguageMenu.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';
	import ShortcutTarget from '#lib/component/own/local/keyboard/ShortcutTarget.svelte';
	import { registerPageShortcuts } from '#lib/keyboard/registerPageShortcuts';
	import { m } from '#lib/paraglide/messages';
	import appIcon from '#lib/asset/image/app-icon-ticket.svg';
	import {
		CircleUser,
		Globe,
		House,
		LogOut,
		PanelTopClose,
		PanelTopOpen,
		Search,
		Shield
	} from '@lucide/svelte';

	type Props = {
		platformAdmin?: boolean;
		children: Snippet;
	};

	let { platformAdmin = false, children }: Props = $props();

	const business = $derived(
		(page.data as {
			business?: {
				id: string;
				name: string;
				imageUrl?: string | null;
				industryPack?: { name?: string | null } | null;
			};
		}).business
	);
	const role = $derived((page.data as { role?: string }).role ?? '');
	const allowedPaths = $derived(
		new Set((page.data as { allowedPaths?: string[] }).allowedPaths ?? [])
	);
	const path = $derived(page.url.pathname);
	const dataTitle = $derived(
		typeof (page.data as { title?: unknown }).title === 'string'
			? (page.data as { title: string }).title
			: undefined
	);

	const businessId = $derived(business?.id ?? '');
	const pageTitle = $derived(
		resolveClientPageTitle(path, { businessId: business?.id, role, dataTitle })
	);

	const brandHref = $derived(business ? `/b/${business.id}` : resolve('/workspaces'));
	const brandLabel = $derived(business ? business.name : 'Business console');
	const brandInitial = $derived((business?.name?.trim()?.[0] ?? 'B').toUpperCase());
	const templateName = $derived(business?.industryPack?.name?.trim() || '');
	const accountHref = $derived(business ? `/b/${business.id}/account` : resolve('/account'));

	let signingOut = $state(false);

	let isNavbarVisible = $state(true);
	function toggleNavbarVisibility() {
		isNavbarVisible = !isNavbarVisible;
	}

	let searchDialogOpen = $state(false);
	let selectedPageHref = $state('');
	let searchDialogEl = $state<HTMLDialogElement | null>(null);

	const pageSearchOptions = $derived.by(() => {
		if (!businessId) return [];
		const bar = filterBusinessModuleBar(
			filterNavRoleLinks(getBusinessModuleBar(businessId, role), role),
			allowedPaths
		);
		const base = `/b/${businessId}`;
		const out: { value: string; label: string }[] = [{ value: base, label: m.nav_overview() }];
		for (const link of bar.links) {
			out.push({ value: link.href, label: link.label });
		}
		for (const mod of bar.modules) {
			for (const group of mod.groups) {
				for (const pg of group.pages) {
					out.push({
						value: pg.href,
						label: [pg.label, mod.label, group.label].filter(Boolean).join(' · ')
					});
				}
			}
		}
		return out.filter((o) => allowedPaths.has(o.value) || o.value === base);
	});

	function openSearchDialog() {
		selectedPageHref = '';
		searchDialogOpen = true;
		tick().then(() => {
			document.getElementById('business-page-search')?.click();
		});
	}

	function closeSearchDialog() {
		searchDialogOpen = false;
	}

	function handleCommandSearchPick(href: string) {
		if (!href) return;
		closeSearchDialog();
		selectedPageHref = '';
		void goto(href);
	}

	$effect(() => {
		const dialog = searchDialogEl;
		if (!dialog) return;
		if (searchDialogOpen) {
			if (!dialog.open) dialog.showModal();
		} else if (dialog.open) {
			dialog.close();
		}
	});

	// Ctrl+K opens search dialog (Medora GPrivateMedoraModuleBar).
	$effect(() => {
		if (!businessId) return;
		function onKeyDown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
				e.preventDefault();
				openSearchDialog();
			}
		}
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	});

	$effect(() => {
		if (!businessId) return;
		const off = registerPageShortcuts([
			{
				id: 'page.command-search',
				scope: 'page',
				keys: ['S'],
				label: m.keyboard_nav_search(),
				run: () => openSearchDialog()
			},
			{
				id: 'page.overview',
				scope: 'page',
				keys: ['O'],
				label: m.keyboard_nav_overview(),
				run: () => {
					void goto(brandHref);
				}
			}
		]);
		return off;
	});

	let stripEl = $state<HTMLElement | null>(null);
	let stripScrollToken = $state(0);
	let canScrollLeft = $state(false);
	let canScrollRight = $state(false);

	/** Medora GPrivateMedoraModuleBar — soft chrome outline on module tabs. */
	const navBarControlBorder = 'border border-base-300 hover:border-primary/40';

	function updateOverflow() {
		const el = stripEl;
		if (!el) {
			canScrollLeft = false;
			canScrollRight = false;
			return;
		}
		const max = el.scrollWidth - el.clientWidth;
		const eps = 2;
		canScrollLeft = el.scrollLeft > eps;
		canScrollRight = max - el.scrollLeft > eps;
	}

	onMount(() => {
		updateOverflow();
		const ro = new ResizeObserver(updateOverflow);
		if (stripEl) ro.observe(stripEl);
		window.addEventListener('resize', updateOverflow);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', updateOverflow);
		};
	});
</script>

<div class="my-app">
	<div class="sticky top-0 z-40 shrink-0 overflow-visible">
	{#if isNavbarVisible}
	<header
		class="{washRecipes.navbar} relative z-50 box-border flex h-12 max-h-12 min-h-12 shrink-0 items-center gap-2 overflow-visible px-3 py-0 md:px-4"
	>
		<a href={brandHref} class="flex min-w-0 shrink-0 items-center gap-2">
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
			<span class="hidden min-w-0 flex-col leading-tight sm:flex">
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
		</a>

		<div class="flex min-w-0 flex-1 basis-[min(100%,16rem)] justify-center px-1">
			<div
				class="btn btn-primary btn-outline pointer-events-none h-auto min-h-10 max-w-full whitespace-normal break-words text-center normal-case no-animation"
				title={pageTitle}
			>
				{pageTitle}
			</div>
		</div>

		<div class="relative z-[60] flex shrink-0 items-center gap-1 overflow-visible sm:gap-2">
			{#if platformAdmin}
				<a
					href={resolve('/admin')}
					class="btn btn-ghost btn-square btn-sm btn-secondary hidden cursor-pointer sm:inline-flex"
					aria-label={m.common_nextup_admin()}
				>
					<Shield class="size-4" aria-hidden="true" />
				</a>
			{/if}
			<AppearanceMenu size="sm" />
			<LanguageMenu size="sm" />
			<WashTooltip tooltipText={m.common_account()} className="tooltip-primary">
				<a
					href={accountHref}
					class="btn btn-ghost btn-square btn-sm btn-primary cursor-pointer"
					aria-label={m.common_account()}
				>
					<CircleUser class="size-4 shrink-0" aria-hidden="true" />
				</a>
			</WashTooltip>
			<WashTooltip tooltipText={m.common_website()} className="tooltip-primary">
				<a
					href={resolve('/')}
					class="btn btn-ghost btn-square btn-sm btn-primary cursor-pointer"
					aria-label={m.common_website()}
				>
					<Globe class="size-4 shrink-0" aria-hidden="true" />
				</a>
			</WashTooltip>
			<WashTooltip tooltipText={m.common_sign_out()} className="tooltip-error">
				<button
					type="submit"
					form="business-top-shell-logout"
					class="btn btn-ghost btn-square btn-sm btn-error"
					class:cursor-pointer={!signingOut}
					class:cursor-not-allowed={signingOut}
					class:btn-disabled={signingOut}
					class:loading={signingOut}
					aria-label={m.common_sign_out()}
					disabled={signingOut}
					aria-busy={signingOut}
				>
					<LogOut class="size-4 shrink-0" aria-hidden="true" />
				</button>
			</WashTooltip>
		</div>
	</header>
	{/if}

	<div class="navbar relative z-10 max-w-full min-w-0 overflow-visible bg-base-200 shadow-md flex border-t border-base-300 gap-3">
		{#if isNavbarVisible}
			<WashTooltip tooltipText={m.nav_close_top_panel()} className="tooltip-primary">
				<button
					type="button"
					class="btn btn-primary cursor-pointer"
					aria-label={m.nav_close_top_panel()}
					onclick={toggleNavbarVisibility}
				>
					<PanelTopClose class="size-5" aria-hidden="true" />
				</button>
			</WashTooltip>
		{:else}
			<WashTooltip tooltipText={m.nav_open_top_panel()} className="tooltip-primary">
				<button
					type="button"
					class="btn btn-primary cursor-pointer"
					aria-label={m.nav_open_top_panel()}
					onclick={toggleNavbarVisibility}
				>
					<PanelTopOpen class="size-5" aria-hidden="true" />
				</button>
			</WashTooltip>
		{/if}
		<div class="relative min-w-0 flex-1">
			{#if canScrollLeft}
				<div
					class="menzies-module-bar-fade menzies-module-bar-fade-left pointer-events-none absolute inset-y-0 left-0 z-10 w-8"
					aria-hidden="true"
				></div>
			{/if}
			{#if canScrollRight}
				<div
					class="menzies-module-bar-fade menzies-module-bar-fade-right pointer-events-none absolute inset-y-0 right-0 z-10 w-8"
					aria-hidden="true"
				></div>
			{/if}
			<div
				bind:this={stripEl}
				data-module-bar-scroll
				class="menzies-module-bar-scroll flex min-w-0 w-full flex-nowrap items-center gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain"
				onscroll={() => {
					updateOverflow();
					stripScrollToken += 1;
				}}
			>
				{#if businessId}
					<BusinessModuleBarItems
						{businessId}
						{role}
						{navBarControlBorder}
						{stripScrollToken}
					/>
				{/if}
			</div>
		</div>
		<div class="shrink-0">
			<ShortcutTarget keys={['O']} label={m.keyboard_nav_overview()}>
				<WashTooltip tooltipText={m.nav_overview()} className="tooltip-secondary">
					<a href={brandHref} class="btn btn-secondary btn-square cursor-pointer" aria-label={m.nav_overview()}>
						<House class="size-5" aria-hidden="true" />
					</a>
				</WashTooltip>
			</ShortcutTarget>
		</div>
		{#if businessId && pageSearchOptions.length > 0}
			<div class="shrink-0">
				<ShortcutTarget keys={['S']} label={m.keyboard_nav_search()}>
					<WashTooltip tooltipText={m.nav_command_search_shortcut()} className="tooltip-secondary">
						<button
							type="button"
							class="btn btn-secondary btn-square cursor-pointer relative"
							aria-label={m.nav_command_search_shortcut()}
							onclick={openSearchDialog}
						>
							<Search class="size-5" aria-hidden="true" />
						</button>
					</WashTooltip>
				</ShortcutTarget>
			</div>
		{/if}
	</div>
	</div>

	<form
		id="business-top-shell-logout"
		method="POST"
		action={resolve('/auth/logout')}
		class="hidden"
		aria-hidden="true"
		use:enhance={bindSubmitting((v) => (signingOut = v))}
	></form>

	<main class="my-main flex min-h-0 min-w-0 flex-1 flex-col overflow-auto p-4 sm:p-6">
		{@render children()}
	</main>
</div>

{#if businessId && pageSearchOptions.length > 0}
	<dialog
		bind:this={searchDialogEl}
		class="modal modal-middle"
		aria-labelledby="business-nav-search-title"
		onclose={() => {
			searchDialogOpen = false;
		}}
	>
		<div class="modal-box flex w-11/12 max-w-lg flex-col gap-0 overflow-hidden border border-base-300 bg-base-100 p-0 shadow-sm">
			<div class="border-base-300 border-b px-4 py-3">
				<h2 id="business-nav-search-title" class="card-title text-primary font-bold">
					{m.nav_command_search_title()}
				</h2>
			</div>
			<div class="flex min-h-0 flex-1 flex-col px-4 py-3">
				<label class="form-control w-full" for="business-page-search">
					<span class="label-text mb-1">{m.nav_command_search_select()}</span>
					<SearchSelect
						id="business-page-search"
						name="pageSearch"
						class="w-full"
						options={pageSearchOptions}
						bind:value={selectedPageHref}
						placeholder={m.nav_command_search_select()}
						filterPlaceholder={m.nav_command_search_filter()}
						onSelect={handleCommandSearchPick}
					/>
				</label>
			</div>
			<div class="modal-action border-base-300 border-t px-4 py-3">
				<button type="button" class="btn cursor-pointer" onclick={closeSearchDialog}>
					{m.common_cancel()}
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button type="submit" class="cursor-pointer">close</button>
		</form>
	</dialog>
{/if}