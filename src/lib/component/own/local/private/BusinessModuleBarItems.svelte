<script lang="ts">
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import {
		clampFloatingPanelLeft,
		FLOATING_PANEL_Z
	} from '#lib/attachments/floating-panel-portal';
	import {
		activeAdministrationPage,
		getBusinessModuleBar,
		isBusinessNavActive,
		type BusinessNavModule,
		type BusinessNavPage
	} from '#lib/tool/business-nav';

	type Props = {
		businessId: string;
		role: string;
		navBarControlBorder: string;
		stripScrollToken?: number;
	};

	let { businessId, role, navBarControlBorder, stripScrollToken = 0 }: Props = $props();

	const path = $derived(page.url.pathname);
	const model = $derived(getBusinessModuleBar(businessId, role));

	let hoveredModuleId = $state<string | null>(null);
	let moduleMenuPos = $state({ top: 0, left: 0 });
	let moduleMenuEl = $state<HTMLElement | null>(null);
	let moduleMenuTrigger = $state<HTMLElement | null>(null);
	let moduleMenuCloseTimer: ReturnType<typeof setTimeout> | null = null;

	const hoveredModule = $derived(
		hoveredModuleId == null
			? null
			: (model.modules.find((m) => m.id === hoveredModuleId) ?? null)
	);

	const activeAdminPage = $derived(activeAdministrationPage(path, businessId, role));
	const administrationActive = $derived(activeAdminPage != null);

	function cancelCloseModuleMenu() {
		if (moduleMenuCloseTimer != null) {
			clearTimeout(moduleMenuCloseTimer);
			moduleMenuCloseTimer = null;
		}
	}

	function scheduleCloseModuleMenu() {
		cancelCloseModuleMenu();
		moduleMenuCloseTimer = setTimeout(() => {
			hoveredModuleId = null;
			moduleMenuCloseTimer = null;
		}, 140);
	}

	function clampModuleMenuLeft(preferredLeft: number) {
		const width = moduleMenuEl?.offsetWidth ?? 208;
		return clampFloatingPanelLeft(preferredLeft, width);
	}

	function syncModuleMenuPosition() {
		const trigger = moduleMenuTrigger;
		if (!trigger || hoveredModuleId == null) return;
		const r = trigger.getBoundingClientRect();
		moduleMenuPos = {
			top: r.bottom,
			left: clampModuleMenuLeft(r.left)
		};
	}

	async function openModuleMenu(moduleId: string, trigger: HTMLElement) {
		cancelCloseModuleMenu();
		moduleMenuTrigger = trigger;
		hoveredModuleId = moduleId;
		syncModuleMenuPosition();
		await tick();
		syncModuleMenuPosition();
	}

	function isPageActive(p: BusinessNavPage): boolean {
		return isBusinessNavActive(path, p.href, p.exact);
	}

	$effect(() => {
		void stripScrollToken;
		hoveredModuleId = null;
		moduleMenuTrigger = null;
		cancelCloseModuleMenu();
	});

	$effect(() => {
		if (hoveredModuleId == null) return;
		syncModuleMenuPosition();
		const onMove = () => syncModuleMenuPosition();
		window.addEventListener('scroll', onMove, true);
		window.addEventListener('resize', onMove);
		return () => {
			window.removeEventListener('scroll', onMove, true);
			window.removeEventListener('resize', onMove);
		};
	});

	function moduleButton(
		mod: BusinessNavModule,
		_isActiveModule: boolean
	): { class: string; ariaExpanded: boolean } {
		return {
			class: `btn ${navBarControlBorder} shrink-0 cursor-pointer gap-2`,
			ariaExpanded: hoveredModuleId === mod.id
		};
	}
</script>

{#each model.modules as mod (mod.id)}
	{@const Icon = mod.icon}
	{@const isActiveModule = mod.id === 'administration' && administrationActive}
	<div
		class="shrink-0"
		role="group"
		onmouseenter={(e) => openModuleMenu(mod.id, e.currentTarget)}
		onmouseleave={scheduleCloseModuleMenu}
	>
		{#if isActiveModule}
			<div class="aura aura-dual text-primary shrink-0">
				<button
					type="button"
					class={moduleButton(mod, true).class}
					aria-haspopup="menu"
					aria-expanded={moduleButton(mod, true).ariaExpanded}
					onfocus={(e) => openModuleMenu(mod.id, e.currentTarget)}
					onclick={(e) => openModuleMenu(mod.id, e.currentTarget)}
				>
					<Icon class="size-4 shrink-0" aria-hidden="true" />
					<span class="whitespace-nowrap">{mod.label}</span>
				</button>
			</div>
		{:else}
			<button
				type="button"
				class={moduleButton(mod, false).class}
				aria-haspopup="menu"
				aria-expanded={moduleButton(mod, false).ariaExpanded}
				onfocus={(e) => openModuleMenu(mod.id, e.currentTarget)}
				onclick={(e) => openModuleMenu(mod.id, e.currentTarget)}
			>
				<Icon class="size-4 shrink-0" aria-hidden="true" />
				<span class="whitespace-nowrap">{mod.label}</span>
			</button>
		{/if}
	</div>
{/each}

{#each model.links as link (link.href)}
	{@const Icon = link.icon}
	{@const active = isBusinessNavActive(path, link.href, link.exact)}
	{#if active}
		<div class="aura aura-dual text-primary shrink-0">
			<a
				href={link.href}
				class="btn {navBarControlBorder} cursor-pointer gap-2"
				aria-current="page"
			>
				<Icon class="size-4 shrink-0" aria-hidden="true" />
				<span class="whitespace-nowrap">{link.label}</span>
			</a>
		</div>
	{:else}
		<a href={link.href} class="btn {navBarControlBorder} shrink-0 cursor-pointer gap-2">
			<Icon class="size-4 shrink-0" aria-hidden="true" />
			<span class="whitespace-nowrap">{link.label}</span>
		</a>
	{/if}
{/each}

{#if hoveredModule != null}
	<div
		bind:this={moduleMenuEl}
		role="menu"
		tabindex="-1"
		class="fixed bg-transparent p-0 pt-1 shadow-none"
		style:top="{moduleMenuPos.top}px"
		style:left="{moduleMenuPos.left}px"
		style:z-index={FLOATING_PANEL_Z}
		onmouseenter={cancelCloseModuleMenu}
		onmouseleave={scheduleCloseModuleMenu}
	>
		<ul
			tabindex="-1"
			class="menzies-module-dropdown-menu menu flex w-max min-w-52 max-w-[min(24rem,calc(100vw-1rem))] flex-col flex-nowrap overflow-x-hidden overflow-y-auto rounded-box border border-base-300 bg-base-100 p-2 shadow-lg max-h-[min(70vh,24rem)]"
		>
			{#each hoveredModule.groups as group (group.label)}
				<li class="menu-title w-full shrink-0 px-2 py-1 text-xs opacity-70">{group.label}</li>
				{#each group.pages as p (p.href)}
					<li class="w-full shrink-0">
						<a
							href={p.href}
							class="whitespace-nowrap {isPageActive(p) ? 'menu-active font-medium' : ''}"
							aria-current={isPageActive(p) ? 'page' : undefined}
							onclick={() => {
								hoveredModuleId = null;
								cancelCloseModuleMenu();
							}}
						>
							{p.label}
						</a>
					</li>
				{/each}
			{/each}
		</ul>
	</div>
{/if}
