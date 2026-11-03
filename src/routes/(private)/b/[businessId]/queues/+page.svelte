<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { CircleCheck, CircleX, Plus, RefreshCw } from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import ToastDismissButton from '#lib/component/own/local/private/ToastDismissButton.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';

	let { data, form } = $props();

	let creating = $state(false);
	let refreshing = $state(false);
	let createDialog = $state<HTMLDialogElement | null>(null);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let nameFilter = $state('');
	let strategyFilter = $state('');
	let statusFilter = $state('');
	let toastGone = $state(false);

	let createSiteId = $state('');
	let createServiceId = $state('');
	let createStrategy = $state('fifo');

	const siteOptions = $derived(data.sites.map((s) => ({ value: s.id, label: s.name })));
	const serviceOptions = $derived(data.services.map((s) => ({ value: s.id, label: s.name })));
	const strategyOptions = [
		{ value: 'fifo', label: 'fifo' },
		{ value: 'priority', label: 'priority' },
		{ value: 'appointment_first', label: 'appointment_first' }
	];
	const statusOptions = [
		{ value: 'true', label: 'active' },
		{ value: 'false', label: 'inactive' }
	];

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filtered = $derived(
		data.queues.filter((q) => {
			const text = nameFilter.trim().toLowerCase();
			const nameOk =
				!text ||
				q.name.toLowerCase().includes(text) ||
				(q.site?.name ?? '').toLowerCase().includes(text) ||
				(q.service?.name ?? '').toLowerCase().includes(text);
			const strategyOk = !strategyFilter || q.strategy === strategyFilter;
			const statusOk =
				!statusFilter || (statusFilter === 'true' ? q.isActive : !q.isActive);
			return nameOk && strategyOk && statusOk;
		})
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
		if (form?.message) toastGone = false;
	});

	$effect(() => {
		nameFilter;
		strategyFilter;
		statusFilter;
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

	function openCreate() {
		createSiteId = data.sites[0]?.id ?? '';
		createServiceId = data.services[0]?.id ?? '';
		createStrategy = 'fifo';
		createDialog?.showModal();
	}
</script>

<svelte:head>
	<title>Queues | {data.business.name}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

{#if form?.message && !toastGone}
	<div class="toast toast-bottom toast-end z-[100]">
		<div
			class="alert shadow-lg"
			class:alert-success={form.success}
			class:alert-error={!form.success}
		>
			{#if form.success}
				<CircleCheck class="h-5 w-5 shrink-0" aria-hidden="true" />
			{:else}
				<CircleX class="h-5 w-5 shrink-0" aria-hidden="true" />
			{/if}
			<span>{form.message}</span>
			<ToastDismissButton onclick={() => (toastGone = true)} />
		</div>
	</div>
{/if}

<div class="flex min-h-0 flex-1 flex-col">
	<DataTableShell
		title="Queues"
		description="Queues bind a site and service for ticket machines and floor devices."
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
			<WashTooltip tooltipText="Add" className="tooltip-primary">
<button
					type="button"
					class="btn btn-ghost btn-square btn-sm btn-primary cursor-pointer"
					aria-label="Add"
					onclick={openCreate}
				>
					<Plus class="size-4" aria-hidden="true" />
				</button>
</WashTooltip>
		{/snippet}

		<table class="table table-zebra w-full [&_tbody_tr]:hover:bg-primary/40">
			<thead class="bg-base-100 sticky top-0 z-10">
				<tr>
					<th>Actions</th>
					<th>No</th>
					<th>Name</th>
					<th>Site</th>
					<th>Service</th>
					<th>Strategy</th>
					<th>SLA</th>
					<th>Status</th>
					<th>Created</th>
					<th>Updated</th>
				</tr>
				<tr class="font-normal">
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
					<th>
						<input
							type="text"
							class="input input-xs input-bordered w-full max-w-[10rem] cursor-text"
							placeholder="Filter…"
							aria-label="Filter by name"
							bind:value={nameFilter}
						/>
					</th>
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
					<th>
						<SearchSelect
							id="filter-queue-strategy"
							name="filterStrategy"
							size="xs"
							bind:value={strategyFilter}
							allowEmpty
							emptyLabel="All"
							options={strategyOptions}
							ariaLabel="Filter by strategy"
							class="max-w-[9rem]"
						/>
					</th>
					<th aria-hidden="true"></th>
					<th>
						<SearchSelect
							id="filter-queue-status"
							name="filterStatus"
							size="xs"
							bind:value={statusFilter}
							allowEmpty
							emptyLabel="All"
							options={statusOptions}
							ariaLabel="Filter by status"
							class="max-w-[7rem]"
						/>
					</th>
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
				</tr>
			</thead>
			<tbody>
				{#if pageRows.length === 0}
					<tr>
						<td colspan="10" class="text-ink-muted py-10 text-center text-sm">
							No queues match these filters.
						</td>
					</tr>
				{:else}
					{#each pageRows as q, i (q.id)}
						<tr>
							<td></td>
							<td>{(safePage - 1) * pageSize + i + 1}</td>
							<td class="font-medium">{q.name}</td>
							<td>{q.site?.name ?? '-'}</td>
							<td>{q.service?.name ?? '-'}</td>
							<td class="font-mono text-sm">{q.strategy}</td>
							<td class="text-sm">
								{q.slaMinutes}m
								<span class="text-ink-muted">/ almost@{q.almostYourTurnThreshold}</span>
							</td>
							<td>
								<span
									class={q.isActive
										? washRecipes.badgeSoft('success')
										: washRecipes.badgeSoft('warning')}>{q.isActive ? 'active' : 'inactive'}</span
								>
							</td>
							<td>{shortDateTime(q.createdAt)}</td>
							<td>{shortDateTime(q.updatedAt)}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>

		{#snippet footerStart()}
			<SearchSelect
				id="queues-page-size"
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
					class="btn btn-xs join-item cursor-pointer"
					disabled={safePage <= 1}
					onclick={() => (page = safePage - 1)}>Prev</button
				>
				{#each pageButtons as p}
					<button
						type="button"
						class="btn btn-xs join-item cursor-pointer"
						class:btn-active={p === safePage}
						onclick={() => (page = p)}>{p}</button
					>
				{/each}
				<button
					type="button"
					class="btn btn-xs join-item cursor-pointer"
					disabled={safePage >= totalPages}
					onclick={() => (page = safePage + 1)}>Next</button
				>
			</div>
		{/snippet}
	</DataTableShell>
</div>

<dialog bind:this={createDialog} class="modal">
	<div class="modal-box w-11/12 border-base-300 max-w-lg border bg-base-100 shadow-sm">
		<h2 class="card-title text-primary mb-4 font-bold">Add queue</h2>
		<form
			method="POST"
			action="?/create"
			class="space-y-3"
			use:enhance={bindSubmitting(
				(v) => (creating = v),
				async ({ result, update }) => {
					await update();
					if (result.type === 'success') createDialog?.close();
				}
			)}
		>
			<label class="form-control w-full" for="queue-name">
				<span class="label-text mb-1"
					>Name<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
					></span
				>
				<input
					id="queue-name"
					name="name"
					class="input input-bordered w-full cursor-text"
					required
				/>
			</label>
			<label class="form-control w-full" for="queue-site">
				<span class="label-text mb-1"
					>Site<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
					></span
				>
				<SearchSelect
					id="queue-site"
					name="siteId"
					options={siteOptions}
					bind:value={createSiteId}
					required
					placeholder="Select site"
				/>
			</label>
			<label class="form-control w-full" for="queue-service">
				<span class="label-text mb-1"
					>Service<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
					></span
				>
				<SearchSelect
					id="queue-service"
					name="serviceId"
					options={serviceOptions}
					bind:value={createServiceId}
					required
					placeholder="Select service"
				/>
			</label>
			<label class="form-control w-full" for="queue-strategy">
				<span class="label-text mb-1">Strategy</span>
				<SearchSelect
					id="queue-strategy"
					name="strategy"
					options={strategyOptions}
					bind:value={createStrategy}
				/>
			</label>
			<label class="form-control w-full" for="queue-sla">
				<span class="label-text mb-1">SLA minutes</span>
				<input
					id="queue-sla"
					name="slaMinutes"
					type="number"
					class="input input-bordered w-full cursor-text"
					value="30"
				/>
			</label>
			<label class="form-control w-full" for="queue-almost">
				<span class="label-text mb-1">Almost your turn threshold</span>
				<input
					id="queue-almost"
					name="almostYourTurnThreshold"
					type="number"
					class="input input-bordered w-full cursor-text"
					value="3"
				/>
			</label>
			<div class="modal-action">
				<button type="button" class="btn cursor-pointer" onclick={() => createDialog?.close()}
					>Cancel</button
				>
				<button
					type="submit"
					class="btn btn-primary"
					class:loading={creating}
					class:btn-disabled={creating}
					class:cursor-pointer={!creating}
					class:cursor-not-allowed={creating}
					disabled={creating}
					aria-busy={creating}>Create</button
				>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop"><button class="cursor-pointer">close</button></form>
</dialog>
