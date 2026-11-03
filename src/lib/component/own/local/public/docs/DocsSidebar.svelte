<script lang="ts">
	import type { Component } from 'svelte';
	import type { DocNavGroup } from '#lib/tool/docs/types';
	import {
		Bell,
		BookOpen,
		Code2,
		LayoutGrid,
		Monitor,
		Ticket,
		Users
	} from '@lucide/svelte';

	let {
		groups,
		currentSlug,
		onNavigate
	}: {
		groups: DocNavGroup[];
		currentSlug: string;
		onNavigate?: () => void;
	} = $props();

	const sectionIcons: Record<string, Component> = {
		start: BookOpen,
		floor: LayoutGrid,
		operations: Ticket,
		admin: Users,
		connect: Code2,
		events: Bell,
		surfaces: Monitor
	};

	let openBySection = $state<Record<string, boolean>>({});

	function isOpen(id: string) {
		return openBySection[id] ?? true;
	}
</script>

{#each groups as group (group.id)}
	{@const SectionIcon = sectionIcons[group.id] ?? BookOpen}
	{@const hasActive = group.items.some((item) => item.slug === currentSlug)}
	<li>
		<details
			class="group"
			open={isOpen(group.id)}
			ontoggle={(e) => {
				openBySection = { ...openBySection, [group.id]: e.currentTarget.open };
			}}
		>
			<summary class="cursor-pointer font-medium {hasActive ? 'text-primary' : ''}">
				<SectionIcon class="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
				<span class="flex-1 truncate">{group.label}</span>
			</summary>
			<ul class="ms-3 mt-0.5 space-y-0.5 border-s border-ink-border/60 py-1 ps-3 pe-1">
				{#each group.items as item (item.slug)}
					{@const active = item.slug === currentSlug}
					<li>
						<a
							href={item.href}
							class="cursor-pointer py-2 text-sm {active ? 'menu-wash-active bg-primary/20 font-medium' : ''}"
							aria-current={active ? 'page' : undefined}
							onclick={() => onNavigate?.()}
						>
							<span class="truncate">{item.title}</span>
						</a>
					</li>
				{/each}
			</ul>
		</details>
	</li>
{/each}
