<script lang="ts">
	import { ChevronDown, Search } from '@lucide/svelte';
	import { floatingPanelPortal } from '#lib/attachments/floating-panel-portal';

	type SearchSelectOption = {
		value: string;
		label: string;
	};

	type Props = {
		id: string;
		name: string;
		options: SearchSelectOption[];
		value?: string;
		required?: boolean;
		placeholder?: string;
		filterPlaceholder?: string;
		disabled?: boolean;
		allowEmpty?: boolean;
		emptyLabel?: string;
		ariaLabel?: string;
		mono?: boolean;
		size?: 'md' | 'sm' | 'xs';
		class?: string;
		onSelect?: (value: string) => void;
	};

	let {
		id,
		name,
		options,
		value = $bindable(''),
		required = false,
		placeholder = 'Select...',
		filterPlaceholder = 'Search...',
		disabled = false,
		allowEmpty = false,
		emptyLabel = 'None',
		ariaLabel = 'Select option',
		mono = false,
		size = 'md',
		class: className = '',
		onSelect
	}: Props = $props();

	let open = $state(false);
	let filter = $state('');
	let highlight = $state(0);
	let rootEl = $state<HTMLDivElement | null>(null);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let filterInput = $state<HTMLInputElement | null>(null);

	type Row = { kind: 'empty' } | { kind: 'option'; option: SearchSelectOption };

	const rows = $derived.by((): Row[] => {
		const q = filter.trim().toLowerCase();
		const matched = !q
			? options
			: options.filter(
					(o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
				);
		const out: Row[] = [];
		if (allowEmpty && (!q || emptyLabel.toLowerCase().includes(q))) {
			out.push({ kind: 'empty' });
		}
		for (const option of matched) out.push({ kind: 'option', option });
		return out;
	});

	const selectedLabel = $derived.by(() => {
		if (!value) return allowEmpty ? emptyLabel : placeholder;
		const hit = options.find((o) => o.value === value);
		return hit?.label ?? value;
	});

	const triggerClass = $derived.by(() => {
		const density =
			size === 'xs' ? 'input-xs min-h-8 py-1' : size === 'sm' ? 'input-sm min-h-9' : 'min-h-10';
		return [
			'input input-bordered flex w-full cursor-pointer items-center justify-between gap-2 text-left',
			density,
			!value ? 'text-base-content/50' : '',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const filterInputClass = $derived(
		size === 'md' ? 'input input-sm input-bordered' : 'input input-xs input-bordered'
	);

	const portalOpts = $derived({
		getAnchor: () => triggerEl,
		getOpen: () => open && !disabled,
		minWidth: 200
	});

	function closePanel() {
		open = false;
		filter = '';
		highlight = 0;
	}

	function openPanel() {
		if (disabled) return;
		open = true;
		filter = '';
		highlight = 0;
		queueMicrotask(() => filterInput?.focus());
	}

	function togglePanel() {
		if (open) closePanel();
		else openPanel();
	}

	function setFilter(next: string) {
		filter = next;
		highlight = 0;
	}

	function selectValue(next: string) {
		value = next;
		closePanel();
		onSelect?.(next);
	}

	function selectEmpty() {
		value = '';
		closePanel();
	}

	function pickRow(row: Row) {
		if (row.kind === 'empty') selectEmpty();
		else selectValue(row.option.value);
	}

	function scrollHighlightIntoView() {
		queueMicrotask(() => {
			document
				.getElementById(`${id}-listbox`)
				?.querySelector<HTMLElement>(`[data-idx="${highlight}"]`)
				?.scrollIntoView({ block: 'nearest' });
		});
	}

	function onFilterKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			closePanel();
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (rows.length === 0) return;
			highlight = Math.min(highlight + 1, rows.length - 1);
			scrollHighlightIntoView();
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (rows.length === 0) return;
			highlight = Math.max(highlight - 1, 0);
			scrollHighlightIntoView();
			return;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			const row = rows[highlight];
			if (row) pickRow(row);
		}
	}

	$effect(() => {
		if (!open) return;
		function onPointerDown(e: PointerEvent) {
			const t = e.target;
			if (t instanceof Node && rootEl?.contains(t)) return;
			const panel = document.getElementById(`${id}-panel`);
			if (t instanceof Node && panel?.contains(t)) return;
			closePanel();
		}
		document.addEventListener('pointerdown', onPointerDown, true);
		return () => document.removeEventListener('pointerdown', onPointerDown, true);
	});
</script>

<div bind:this={rootEl} class="relative w-full">
	<input type="hidden" {name} {value} {required} />
	<button
		bind:this={triggerEl}
		type="button"
		{id}
		class={triggerClass}
		class:cursor-not-allowed={disabled}
		class:opacity-60={disabled}
		disabled={disabled}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls={open ? `${id}-listbox` : undefined}
		aria-label={ariaLabel}
		onclick={togglePanel}
	>
		<span class="truncate text-sm" class:font-mono={mono}>{selectedLabel}</span>
		<ChevronDown
			class="size-4 shrink-0 opacity-60 transition-transform {open ? 'rotate-180' : ''}"
			aria-hidden="true"
		/>
	</button>

	{#if open && !disabled}
		<div
			id="{id}-panel"
			class="border-base-300 bg-base-100 rounded-box border p-2 shadow-lg"
			role="presentation"
			{@attach floatingPanelPortal(portalOpts)}
		>
			<div class="{filterInputClass} mb-2 flex w-full items-center gap-2">
				<Search class="size-4 shrink-0 opacity-50" aria-hidden="true" />
				<input
					bind:this={filterInput}
					type="search"
					class="grow cursor-text bg-transparent outline-none"
					placeholder={filterPlaceholder}
					value={filter}
					oninput={(e) => setFilter(e.currentTarget.value)}
					onkeydown={onFilterKeydown}
					autocomplete="off"
					aria-label={filterPlaceholder}
					aria-autocomplete="list"
					aria-controls={`${id}-listbox`}
					aria-activedescendant={rows[highlight] ? `${id}-opt-${highlight}` : undefined}
				/>
			</div>
			<ul
				id={`${id}-listbox`}
				class="menu max-h-48 w-full flex-nowrap overflow-y-auto p-0"
				role="listbox"
				aria-label={ariaLabel}
			>
				{#if rows.length === 0}
					<li class="disabled">
						<span class="text-ink-muted cursor-default text-sm">No matches</span>
					</li>
				{:else}
					{#each rows as row, i (row.kind === 'empty' ? '__empty__' : row.option.value)}
						<li
							role="option"
							aria-selected={highlight === i}
							data-idx={i}
							id={`${id}-opt-${i}`}
						>
							<button
								type="button"
								class="cursor-pointer text-sm"
								class:font-mono={mono}
								class:bg-primary={highlight === i}
								class:text-primary-content={highlight === i}
								class:active={
									(row.kind === 'empty' && !value) ||
									(row.kind === 'option' && row.option.value === value)
								}
								onmouseenter={() => (highlight = i)}
								onclick={() => pickRow(row)}
							>
								{row.kind === 'empty' ? emptyLabel : row.option.label}
							</button>
						</li>
					{/each}
				{/if}
			</ul>
		</div>
	{/if}
</div>
