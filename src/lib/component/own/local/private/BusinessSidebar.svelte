<script lang="ts">
	import { page } from '$app/state';
	import {
		getBusinessSidebarGroups,
		isBusinessNavActive
	} from '#lib/tool/business-nav';

	type Props = {
		businessId: string;
		role: string;
		drawerId?: string;
		iconOnly?: boolean;
	};

	let { businessId, role, drawerId = 'client-drawer', iconOnly = false }: Props = $props();

	const nav = $derived(getBusinessSidebarGroups(businessId, role));

	function closeDrawer() {
		const el = document.getElementById(drawerId);
		if (el instanceof HTMLInputElement) el.checked = false;
	}
</script>

{#if iconOnly}
	<ul class="flex w-full flex-col items-center gap-0.5 overflow-visible p-0">
		{#each nav.links as link (link.href)}
			{@const Icon = link.icon}
			{@const active = isBusinessNavActive(page.url.pathname, link.href, link.exact)}
			<li class="flex w-full justify-center overflow-visible">
				<a
					href={link.href}
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
	<ul class="menu menu-sm w-full gap-0.5 overflow-visible p-0">
		{#each nav.links as link (link.href)}
			{@const Icon = link.icon}
			{@const active = isBusinessNavActive(page.url.pathname, link.href, link.exact)}
			<li class="overflow-visible">
				<a
					href={link.href}
					class="cursor-pointer rounded-btn {active ? 'bg-primary/20 font-medium' : ''}"
					aria-current={active ? 'page' : undefined}
					onclick={closeDrawer}
				>
					<Icon class="size-4 shrink-0" aria-hidden="true" />
					{link.label}
				</a>
			</li>
		{/each}
		{#each nav.adminGroups as group (group.label)}
			<li class="menu-title">{group.label}</li>
			{#each group.pages as p (p.href)}
				{@const active = isBusinessNavActive(page.url.pathname, p.href, p.exact)}
				<li class="overflow-visible">
					<a
						href={p.href}
						class="cursor-pointer rounded-btn {active ? 'bg-primary/20 font-medium' : ''}"
						aria-current={active ? 'page' : undefined}
						onclick={closeDrawer}
					>
						{p.label}
					</a>
				</li>
			{/each}
		{/each}
	</ul>
{/if}
