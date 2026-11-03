<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { getBusinessNavLinks, resolveClientPageTitle } from '#lib/tool/business-nav';
	import BusinessModuleBarItems from './BusinessModuleBarItems.svelte';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import AppearanceMenu from './AppearanceMenu.svelte';
	import LanguageMenu from './LanguageMenu.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';
	import { m } from '#lib/paraglide/messages';
	import appIcon from '#lib/asset/image/app-icon-ticket.svg';
	import { CircleUser, Globe, House, LogOut, Shield } from '@lucide/svelte';

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

	<div class="navbar relative z-10 max-w-full min-w-0 overflow-visible bg-base-200 shadow-md flex border-t border-base-300 gap-3">
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
			<WashTooltip tooltipText={m.nav_overview()} className="tooltip-secondary">
				<a href={brandHref} class="btn btn-secondary btn-square cursor-pointer" aria-label={m.nav_overview()}>
					<House class="size-5" aria-hidden="true" />
				</a>
			</WashTooltip>
		</div>
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