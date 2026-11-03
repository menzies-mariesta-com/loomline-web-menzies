<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { RefreshCw } from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { shortDateTime } from '#lib/util/format';
	import { inDateRange } from '#lib/util/date-range';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import DateRangeFilter from '#lib/component/own/local/private/data-table/DateRangeFilter.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';

	let { data } = $props();

	let refreshing = $state(false);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let summaryFilter = $state('');
	let kindFilter = $state('');
	let statusFilter = $state('');
	let createdRange = $state('');

	const kindOptions = [
		{ value: 'audit', label: 'audit' },
		{ value: 'ticket', label: 'ticket' },
		{ value: 'notification', label: 'notification' }
	];

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filtered = $derived(
		data.logs.filter((row) => {
			const q = summaryFilter.trim().toLowerCase();
			const summaryOk =
				!q ||
				row.summary.toLowerCase().includes(q) ||
				row.detail.toLowerCase().includes(q);
			const kindOk = !kindFilter || row.kind === kindFilter;
			const statusOk = !statusFilter || row.status === statusFilter;
			const createdOk = inDateRange(row.createdAt, createdRange);
			return summaryOk && kindOk && statusOk && createdOk;
		})
	);

	const statusOptions = $derived(
		[...new Set(data.logs.map((r) => r.status))].sort().map((value) => ({ value, label: value }))
	);

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const safePage = $derived(Math.min(page, totalPages));
	const pageRows = $derived(filtered.slice((safePage - 1) * pageSize, safePage * pageSize));
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
		summaryFilter;
		kindFilter;
		statusFilter;
		createdRange;
		page = 1;
	});

	$effect(() => {
		if (page > totalPages) page = totalPages;
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
		if (refreshing) return;
		refreshing = true;
		try {
			summaryFilter = '';
			kindFilter = '';
			statusFilter = '';
			createdRange = '';
			page = 1;
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}

	function kindBadge(kind: string) {
		if (kind === 'audit') return washRecipes.badgeSoft('secondary');
		if (kind === 'ticket') return washRecipes.badgeSoft('info');
		if (kind === 'notification') return washRecipes.badgeSoft('warning');
		return 'badge badge-ghost';
	}

	function statusBadge(status: string) {
		if (status === 'sent' || status === 'recorded') return washRecipes.badgeSoft('success');
		if (status === 'pending' || status === 'event') return washRecipes.badgeSoft('info');
		if (status === 'failed') return washRecipes.badgeSoft('error');
		return 'badge badge-ghost';
	}
</script>

<svelte:head>
	<title>Logs | {data.business.name}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="flex min-h-0 flex-1 flex-col">
	<DataTableShell
		title="Logs"
		description="Audit actions, ticket events, and notification outbox for this business (latest 400)."
		bind:bodyEl
		footerSummary={footerSummary}
	>
		{#snippet headerActions()}
			<WashTooltip tooltipText="Refresh" className="tooltip-secondary">
<button
					type="button"
					class="btn btn-ghost btn-square btn-sm btn-secondary"
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
</WashTooltip>
		{/snippet}

		<table class="table table-zebra w-full [&_tbody_tr]:hover:bg-primary/40">
			<thead class="bg-base-100 sticky top-0 z-10">
				<tr>
					<th>Actions</th>
					<th>No</th>
					<th>Summary</th>
					<th>Kind</th>
					<th>Status</th>
					<th>Detail</th>
					<th>Created</th>
				</tr>
				<tr class="font-normal">
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
					<th>
						<input
							type="text"
							class="input input-xs input-bordered w-full max-w-[12rem] cursor-text"
							placeholder="Filter…"
							aria-label="Filter by summary or detail"
							bind:value={summaryFilter}
						/>
					</th>
					<th>
						<SearchSelect
							id="filter-log-kind"
							name="filterKind"
							size="xs"
							bind:value={kindFilter}
							allowEmpty
							emptyLabel="All"
							options={kindOptions}
							ariaLabel="Filter by kind"
							class="max-w-[8rem]"
						/>
					</th>
					<th>
						<SearchSelect
							id="filter-log-status"
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
					<th aria-hidden="true"></th>
					<th class="overflow-visible">
						<DateRangeFilter label="Created" bind:value={createdRange} />
					</th>
				</tr>
			</thead>
			<tbody>
				{#if pageRows.length === 0}
					<tr>
						<td colspan="7" class="text-ink-muted py-10 text-center text-sm">
							No logs match these filters.
						</td>
					</tr>
				{:else}
					{#each pageRows as row, i (row.id)}
						<tr>
							<td>
								<span class="text-ink-muted text-xs">-</span>
							</td>
							<td>{(safePage - 1) * pageSize + i + 1}</td>
							<td class="font-medium">{row.summary}</td>
							<td><span class={kindBadge(row.kind)}>{row.kind}</span></td>
							<td><span class={statusBadge(row.status)}>{row.status}</span></td>
							<td class="text-ink-muted max-w-[18rem] truncate text-sm" title={row.detail}
								>{row.detail}</td
							>
							<td class="text-ink-muted whitespace-nowrap text-sm"
								>{shortDateTime(row.createdAt)}</td
							>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>

		{#snippet footerStart()}
			<label class="text-ink-muted flex min-w-0 items-center gap-1.5 text-xs">
				<span>Per page</span>
				<SearchSelect
					id="logs-page-size"
					name="pageSize"
					size="sm"
					bind:value={pageSizeChoice}
					options={[
						{ value: 'auto', label: 'auto' },
						{ value: '5', label: '5' },
						{ value: '10', label: '10' },
						{ value: '25', label: '25' },
						{ value: '50', label: '50' }
					]}
					ariaLabel="Rows per page"
					class="w-auto min-w-[5rem]"
				/>
			</label>
		{/snippet}

		{#snippet paginator()}
			<div class="join">
				<button
					type="button"
					class="btn btn-sm join-item"
					class:cursor-pointer={safePage > 1}
					class:cursor-not-allowed={safePage <= 1}
					disabled={safePage <= 1}
					onclick={() => (page = safePage - 1)}
				>
					Prev
				</button>
				{#each pageButtons as p (p)}
					<button
						type="button"
						class="btn btn-sm join-item cursor-pointer"
						class:btn-active={p === safePage}
						onclick={() => (page = p)}
					>
						{p}
					</button>
				{/each}
				<button
					type="button"
					class="btn btn-sm join-item"
					class:cursor-pointer={safePage < totalPages}
					class:cursor-not-allowed={safePage >= totalPages}
					disabled={safePage >= totalPages}
					onclick={() => (page = safePage + 1)}
				>
					Next
				</button>
			</div>
		{/snippet}
	</DataTableShell>
</div>
