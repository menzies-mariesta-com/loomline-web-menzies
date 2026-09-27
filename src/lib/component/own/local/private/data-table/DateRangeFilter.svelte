<script lang="ts">
	import { onMount } from 'svelte';
	import {
		DROPDOWN_PANEL_OVERFLOW,
		DROPDOWN_PANEL_Z,
		dropdownPlacementClassName,
		measureDropdownPlacement,
		type DropdownPlacement
	} from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { closeDetailsOnOutside } from '#lib/attachments/close-details-on-outside';
	import { rangeLabel } from '#lib/util/date-range';

	type Props = {
		label: string;
		value?: string;
		onchange?: (next: string) => void;
	};

	let { label, value = $bindable(''), onchange }: Props = $props();

	let open = $state(false);
	let detailsEl = $state<HTMLDetailsElement | null>(null);
	let placement = $state<DropdownPlacement>({ end: true, top: false, maxHeight: 380 });
	let callyReady = $state(false);

	// cally touches `document` at import time; load only in the browser
	onMount(() => {
		void import('cally').then(() => {
			callyReady = true;
		});
	});

	const panelStyle = $derived(
		`max-height: ${placement.maxHeight}px; --wash-dropdown-max-h: ${placement.maxHeight}px`
	);

	function onToggle() {
		if (!detailsEl?.open) {
			open = false;
			return;
		}
		open = true;
		placement = measureDropdownPlacement(detailsEl, {
			panelWidth: 280,
			panelHeight: 380
		});
	}

	function setRange(next: string) {
		value = next;
		onchange?.(next);
	}

	function onCalendarChange(e: Event) {
		const t = e.currentTarget as HTMLElement & { value?: string };
		setRange(t.value ?? '');
	}
</script>

<details
	bind:this={detailsEl}
	bind:open
	class="{dropdownPlacementClassName(placement, 'relative w-full max-w-[9.5rem]')} dropdown-no-hover"
	{@attach closeDetailsOnOutside()}
	ontoggle={onToggle}
>
	<summary
		class="btn btn-ghost btn-xs border-base-300 h-7 min-h-7 w-full cursor-pointer justify-start border px-2 font-normal [&::-webkit-details-marker]:hidden"
		aria-label="Filter {label} by date range"
	>
		<span class="truncate text-xs">{rangeLabel(value)}</span>
	</summary>
	<div
		class="dropdown-content {DROPDOWN_PANEL_Z} {placement.top
			? 'mb-1'
			: 'mt-1'} border-ink-border bg-base-100 rounded-box border p-1 shadow-[var(--shadow-paper-md)] {DROPDOWN_PANEL_OVERFLOW}"
		style={panelStyle}
	>
		{#if callyReady}
			<calendar-range
				class="cally bg-base-100"
				value={value.includes('/') ? value : ''}
				onchange={onCalendarChange}
			>
				<!-- Cally named slots (web component API) -->
				<svg
					aria-label="Previous"
					class="fill-current size-4"
					{...{ slot: 'previous' }}
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
				>
					<path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5"></path>
				</svg>
				<svg
					aria-label="Next"
					class="fill-current size-4"
					{...{ slot: 'next' }}
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
				>
					<path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5"></path>
				</svg>
				<calendar-month></calendar-month>
			</calendar-range>
		{/if}
		<div class="border-ink-border/60 flex justify-end gap-1 border-t p-1">
			<button
				type="button"
				class="btn btn-ghost btn-xs cursor-pointer"
				onclick={() => {
					setRange('');
					open = false;
				}}
			>
				Clear
			</button>
		</div>
	</div>
</details>
