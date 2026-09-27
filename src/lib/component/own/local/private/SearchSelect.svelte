<script lang="ts">
	import { ChevronDown, Search } from '@lucide/svelte';
	import { closeDetailsOnOutside } from '#lib/attachments/close-details-on-outside';

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
		/** When true, empty value is allowed. */
		allowEmpty?: boolean;
		emptyLabel?: string;
		ariaLabel?: string;
		/** Use monospace for trigger/option text (e.g. timezones). */
		mono?: boolean;
		/** Soft Wash trigger density: md (forms), sm/xs (table filters / compact). */
		size?: 'md' | 'sm' | 'xs';
		class?: string;
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
		class: className = ''
	}: Props = $props();

	let open = $state(false);
	let filter = $state('');
	let highlight = $state(0);
	let panelRoot = $state<HTMLDetailsElement | null>(null);

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
			'input input-bordered flex w-full cursor-pointer items-center justify-between gap-2 [&::-webkit-details-marker]:hidden',
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

	function setFilter(next: string) {
		filter = next;
		highlight = 0;
	}

	function selectValue(next: string) {
		value = next;
		open = false;
		filter = '';
		highlight = 0;
	}

	function selectEmpty() {
		value = '';
		open = false;
		filter = '';
		highlight = 0;
	}

	function pickRow(row: Row) {
		if (row.kind === 'empty') selectEmpty();
		else selectValue(row.option.value);
	}

	function onToggle(e: Event) {
		const el = e.currentTarget as HTMLDetailsElement;
		panelRoot = el;
		if (!el.open) {
			filter = '';
			highlight = 0;
			return;
		}
		queueMicrotask(() => {
			el.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
		});
	}

	function scrollHighlightIntoView() {
		queueMicrotask(() => {
			panelRoot
				?.querySelector<HTMLElement>(`[data-idx="${highlight}"]`)
				?.scrollIntoView({ block: 'nearest' });
		});
	}

	function onFilterKeydown(e: KeyboardEvent) {
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
</script>

<div class="relative w-full">
	<input type="hidden" {name} {value} {required} />
	<details
		class="dropdown w-full"
		bind:open
		{@attach closeDetailsOnOutside()}
		ontoggle={onToggle}
	>
		<summary
			{id}
			class={triggerClass}
			class:cursor-not-allowed={disabled}
			class:opacity-60={disabled}
			aria-haspopup="listbox"
			aria-expanded={open}
			aria-controls={`${id}-listbox`}
			aria-disabled={disabled}
			aria-label={ariaLabel}
			onclick={(e) => {
				if (disabled) e.preventDefault();
			}}
		>
			<span class="truncate text-sm" class:font-mono={mono}>{selectedLabel}</span>
			<ChevronDown class="size-4 shrink-0 opacity-60" aria-hidden="true" />
		</summary>
		{#if open && !disabled}
			<div
				class="dropdown-content bg-base-100 rounded-box border-base-300 absolute inset-x-0 z-[100] mt-1 w-full min-w-full border p-2 shadow-lg"
				role="presentation"
			>
				<div class="{filterInputClass} mb-2 flex w-full items-center gap-2">
					<Search class="size-4 shrink-0 opacity-50" aria-hidden="true" />
					<input
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
							<span class="cursor-default text-sm opacity-60">No matches</span>
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
	</details>
</div>
