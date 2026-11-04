<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ExternalLink, RefreshCw } from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { shortDateTime } from '#lib/util/format';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import { buildCrudRowActions } from '#lib/keyboard/table-actions';
	import { clickRowActionButton } from '#lib/keyboard/click-row-action';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import IconActionTip from '#lib/component/wash/tooltip/IconActionTip.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';
	import WashActionKbd from '#lib/component/own/local/keyboard/WashActionKbd.svelte';
	import ShortcutTarget from '#lib/component/own/local/keyboard/ShortcutTarget.svelte';
	import { registerDataTableHeaderShortcuts } from '#lib/keyboard/page-table-shortcuts';
	import { m } from '#lib/paraglide/messages';

	let { data } = $props();

	let refreshing = $state(false);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let numberFilter = $state('');
	let statusFilter = $state('');
	let sourceFilter = $state('');

	const statusOptions = [
		{ value: 'issued', label: 'issued' },
		{ value: 'waiting', label: 'waiting' },
		{ value: 'called', label: 'called' },
		{ value: 'serving', label: 'serving' },
		{ value: 'held', label: 'held' },
		{ value: 'completed', label: 'completed' },
		{ value: 'no_show', label: 'no_show' },
		{ value: 'cancelled', label: 'cancelled' },
		{ value: 'transferred', label: 'transferred' }
	];

	const sourceOptions = [
		{ value: 'kiosk', label: 'kiosk' },
		{ value: 'web', label: 'web' },
		{ value: 'qr', label: 'qr' },
		{ value: 'appointment', label: 'appointment' },
		{ value: 'agent', label: 'agent' },
		{ value: 'api', label: 'api' }
	];

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filtered = $derived(
		data.tickets.filter((t) => {
			const q = numberFilter.trim().toLowerCase();
			const numberOk = !q || t.number.toLowerCase().includes(q);
			const statusOk = !statusFilter || t.status === statusFilter;
			const sourceOk = !sourceFilter || t.source === sourceFilter;
			return numberOk && statusOk && sourceOk;
		})
	);

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const safePage = $derived(Math.min(page, totalPages));
	const pageRows = $derived(filtered.slice((safePage - 1) * pageSize, safePage * pageSize));

	let keyboardRowIndex = $state<number | null>(null);
	const tableRowActions = $derived(
		buildCrudRowActions({
			onView: (row) => clickRowActionButton(row.id, 'Open guest view')
		})
	);
	const showingFrom = $derived(filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1);
	const showingTo = $derived(Math.min(safePage * pageSize, filtered.length));
	const footerSummary = $derived(
		filtered.length === 0
			? 'Showing 0-0 of 0'
			: `Showing ${showingFrom}-${showingTo} of ${filtered.length}`
	);
	const pageButtons = $derived(
		Array.from({ length: totalPages }, (_, i) => i + 1).slice(
			Math.max(0, safePage - 3),
			Math.max(0, safePage - 3) + 5
		)
	);

	$effect(() => {
		numberFilter;
		statusFilter;
		sourceFilter;
		page = 1;
	});

	$effect(() => {
		if (!bodyEl || pageSizeChoice !== 'auto') return;
		const ro = new ResizeObserver(() => {
			const h = bodyEl?.clientHeight ?? 0;
			autoPageSize = Math.max(3, Math.floor((h - 72) / 44));
		});
		ro.observe(bodyEl);
		return () => ro.disconnect();
	});

	async function handleRefresh() {
		refreshing = true;
		try {
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}

	function statusBadge(status: string) {
		if (status === 'completed') return washRecipes.badgeSoft('success');
		if (status === 'serving' || status === 'called') return washRecipes.badgeSoft('info');
		if (status === 'waiting' || status === 'held') return washRecipes.badgeSoft('warning');
		if (status === 'no_show' || status === 'cancelled') return washRecipes.badgeSoft('error');
		return 'badge badge-ghost';
	}

	$effect(() => {
		const off = registerDataTableHeaderShortcuts('tickets', {
			onRefresh: () => void handleRefresh(),
			refreshDisabled: () => refreshing
		});
		return off;
	});
</script>

<svelte:head>
	<title>Tickets | {data.business.name}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="flex min-h-0 flex-1 flex-col">
	<DataTableShell
		title="Tickets"
		description="Recent tickets for this business (latest 200)."
		bind:bodyEl
		{footerSummary}
		keyboardRows={pageRows}
		rowActions={tableRowActions}
		tableId="tickets"
		bind:keyboardRowIndex
	>
		{#snippet headerActions()}
			<WashTooltip tooltipText="Refresh" className="tooltip-secondary">
				<ShortcutTarget keys={['R']} label={m.keyboard_action_refresh()}>
					<button
						type="button"
						class="btn btn-square btn-ghost btn-secondary btn-sm"
						class:cursor-pointer={!refreshing}
						class:cursor-not-allowed={refreshing}
						class:btn-disabled={refreshing}
						class:loading={refreshing}
						aria-label="Refresh"
						aria-busy={refreshing}
						disabled={refreshing}
						onclick={() => void handleRefresh()}
					>
						{#if !refreshing}
							<RefreshCw class="size-4" aria-hidden="true" />
						{/if}
					</button>
				</ShortcutTarget>
			</WashTooltip>
		{/snippet}

		<table class="table w-full table-zebra [&_tbody_tr]:hover:bg-primary/40">
			<thead class="sticky top-0 z-10 bg-base-100">
				<tr>
					<th>Actions</th>
					<th>No</th>
					<th>Number</th>
					<th>Status</th>
					<th>Source</th>
					<th>Priority</th>
					<th>Created</th>
					<th>Updated</th>
				</tr>
				<tr class="font-normal">
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
					<th>
						<input
							type="text"
							class="input-bordered input w-full max-w-[8rem] cursor-text font-mono input-xs"
							placeholder="Filter…"
							aria-label="Filter by number"
							bind:value={numberFilter}
						/>
					</th>
					<th>
						<SearchSelect
							id="filter-ticket-status"
							name="filterStatus"
							size="xs"
							bind:value={statusFilter}
							allowEmpty
							emptyLabel="All"
							options={statusOptions}
							ariaLabel="Filter by status"
							class="max-w-[8rem]"
						/>
					</th>
					<th>
						<SearchSelect
							id="filter-ticket-source"
							name="filterSource"
							size="xs"
							bind:value={sourceFilter}
							allowEmpty
							emptyLabel="All"
							options={sourceOptions}
							ariaLabel="Filter by source"
							class="max-w-[8rem]"
						/>
					</th>
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
				</tr>
			</thead>
			<tbody>
				{#if pageRows.length === 0}
					<tr>
						<td colspan="8" class="text-ink-muted py-10 text-center text-sm">
							No tickets match these filters.
						</td>
					</tr>
				{:else}
					{#each pageRows as t, i (t.id)}
						<tr
							data-kbd-row-id={t.id}
							data-kbd-row-slot={String(i + 1)}
							data-kbd-row-focus={keyboardRowIndex === i ? 'true' : undefined}
						>
							<td>
								<div class="flex items-center gap-0.5">
									<WashActionKbd key="v">
										<IconActionTip tip="Open guest view" tone="primary">
											<a
												class="btn btn-square cursor-pointer btn-ghost btn-primary btn-xs"
												href={resolve(`/t/${t.publicToken}`)}
												target="_blank"
												rel="noopener noreferrer"
												aria-label="Open guest view"
											>
												<ExternalLink class="size-3.5" aria-hidden="true" />
											</a>
										</IconActionTip>
									</WashActionKbd>
								</div>
							</td>
							<td>{(safePage - 1) * pageSize + i + 1}</td>
							<td class="font-mono font-bold">{t.number}</td>
							<td>
								<span class={statusBadge(t.status)}>{t.status}</span>
							</td>
							<td>{t.source}</td>
							<td>{t.priority}</td>
							<td>{shortDateTime(t.createdAt)}</td>
							<td>{shortDateTime(t.updatedAt)}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>

		{#snippet footerStart()}
			<SearchSelect
				id="tickets-page-size"
				name="pageSize"
				size="xs"
				bind:value={pageSizeChoice}
				options={[
					{ value: 'auto', label: 'Auto' },
					{ value: '5', label: '5' },
					{ value: '10', label: '10' },
					{ value: '25', label: '25' }
				]}
				ariaLabel="Rows per page"
				class="w-auto min-w-[5rem]"
			/>
		{/snippet}
		{#snippet paginator()}
			<div class="join">
				<button
					type="button"
					class="btn join-item cursor-pointer btn-xs"
					disabled={safePage <= 1}
					onclick={() => (page = safePage - 1)}>Prev</button
				>
				{#each pageButtons as p}
					<button
						type="button"
						class="btn join-item cursor-pointer btn-xs"
						class:btn-active={p === safePage}
						onclick={() => (page = p)}>{p}</button
					>
				{/each}
				<button
					type="button"
					class="btn join-item cursor-pointer btn-xs"
					disabled={safePage >= totalPages}
					onclick={() => (page = safePage + 1)}>Next</button
				>
			</div>
		{/snippet}
	</DataTableShell>
</div>
