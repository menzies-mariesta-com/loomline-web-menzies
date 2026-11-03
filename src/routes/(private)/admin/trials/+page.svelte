<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		Check,
		CircleCheck,
		CircleX,
		RefreshCw,
		Trash2,
		X
	} from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import { inDateRange } from '#lib/util/date-range';
	import { trialDurationLabel } from '#lib/tool/plans';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import DateRangeFilter from '#lib/component/own/local/private/data-table/DateRangeFilter.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import ToastDismissButton from '#lib/component/own/local/private/ToastDismissButton.svelte';
	import IconActionTip from '#lib/component/wash/tooltip/IconActionTip.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';

	let { data, form } = $props();

	type RequestRow = (typeof data.requests)[number];

	let toastGone = $state(false);
	let refreshing = $state(false);
	let busyId = $state<string | null>(null);
	let deleting = $state(false);
	let approving = $state(false);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let emailFilter = $state('');
	let businessFilter = $state('');
	let statusFilter = $state('');
	let createdRange = $state('');
	let approveDialog = $state<HTMLDialogElement | null>(null);
	let deleteDialog = $state<HTMLDialogElement | null>(null);
	let approveRow = $state<RequestRow | null>(null);
	let deleteRow = $state<RequestRow | null>(null);
	let approveTemplateId = $state('');
	let approveConfigId = $state('');

	const templateOptions = $derived(
		data.templates.map((t) => ({ value: t.id, label: t.name }))
	);
	const configOptions = $derived(
		data.configs.map((c) => ({ value: c.id, label: `${c.name} (${c.timezone})` }))
	);

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filtered = $derived(
		data.requests.filter((r) => {
			const emailOk =
				!emailFilter.trim() ||
				r.email.toLowerCase().includes(emailFilter.trim().toLowerCase()) ||
				`${r.firstName} ${r.lastName}`.toLowerCase().includes(emailFilter.trim().toLowerCase());
			const bizOk =
				!businessFilter.trim() ||
				r.businessName.toLowerCase().includes(businessFilter.trim().toLowerCase());
			const statusOk = !statusFilter || r.status === statusFilter;
			const createdOk = inDateRange(r.createdAt, createdRange);
			return emailOk && bizOk && statusOk && createdOk;
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

	function statusBadge(status: string) {
		if (status === 'pending') return washRecipes.badgeSoft('warning');
		if (status === 'approved') return washRecipes.badgeSoft('success');
		if (status === 'rejected') return washRecipes.badgeSoft('error');
		return 'badge badge-ghost';
	}

	function openApprove(row: RequestRow) {
		approveRow = row;
		approveTemplateId = data.templates[0]?.id ?? '';
		approveConfigId = '';
		approveDialog?.showModal();
	}

	function closeApprove() {
		approveDialog?.close();
		approveRow = null;
	}

	function openDelete(row: RequestRow) {
		deleteRow = row;
		deleteDialog?.showModal();
	}

	function closeDelete() {
		deleteDialog?.close();
		deleteRow = null;
	}

	async function handleRefresh() {
		if (refreshing) return;
		refreshing = true;
		try {
			emailFilter = '';
			businessFilter = '';
			statusFilter = '';
			createdRange = '';
			page = 1;
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}

	$effect(() => {
		emailFilter;
		businessFilter;
		statusFilter;
		createdRange;
		page = 1;
	});

	$effect(() => {
		if (page > totalPages) page = totalPages;
	});

	$effect(() => {
		if (form?.message) {
			toastGone = false;
			if (form.success) {
				closeApprove();
				closeDelete();
			}
		}
	});

	$effect(() => {
		if (!bodyEl) return;
		const ro = new ResizeObserver(() => {
			const h = bodyEl?.clientHeight ?? 320;
			autoPageSize = Math.max(1, Math.floor(h / 48));
		});
		ro.observe(bodyEl);
		return () => ro.disconnect();
	});
</script>

<svelte:head>
	<title>Trials | NextUp Admin</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="flex min-h-0 flex-1 flex-col">
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

	<DataTableShell title="Trial requests" bind:bodyEl footerSummary={footerSummary}>
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
					<th>Contact</th>
					<th>Business</th>
					<th>Duration</th>
					<th>Status</th>
					<th>Created</th>
				</tr>
				<tr class="font-normal">
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
					<th>
						<input
							type="text"
							class="input input-xs input-bordered w-full max-w-[10rem] cursor-text"
							placeholder="Filter…"
							aria-label="Filter by contact"
							bind:value={emailFilter}
						/>
					</th>
					<th>
						<input
							type="text"
							class="input input-xs input-bordered w-full max-w-[8rem] cursor-text"
							placeholder="Filter…"
							aria-label="Filter by business"
							bind:value={businessFilter}
						/>
					</th>
					<th aria-hidden="true"></th>
					<th>
						<SearchSelect
							id="filter-trial-status"
							name="filterStatus"
							size="xs"
							bind:value={statusFilter}
							allowEmpty
							emptyLabel="All"
							options={[
								{ value: 'pending', label: 'pending' },
								{ value: 'approved', label: 'approved' },
								{ value: 'rejected', label: 'rejected' }
							]}
							ariaLabel="Filter by status"
							class="max-w-[7rem]"
						/>
					</th>
					<th class="overflow-visible">
						<DateRangeFilter label="Created" bind:value={createdRange} />
					</th>
				</tr>
			</thead>
			<tbody>
				{#if pageRows.length === 0}
					<tr>
						<td colspan="7" class="text-ink-muted py-10 text-center text-sm">
							No trial requests match these filters.
						</td>
					</tr>
				{:else}
					{#each pageRows as r, i (r.id)}
						<tr>
							<td>
								<div class="flex items-center gap-0.5">
									{#if r.status === 'pending'}
										<IconActionTip tip="Approve" tone="success">
<button
												type="button"
												class="btn btn-ghost btn-square btn-xs btn-success cursor-pointer"
												aria-label="Approve"
												onclick={() => openApprove(r)}
											>
												<Check class="size-3.5" aria-hidden="true" />
											</button>
										</IconActionTip>

										<form
											method="POST"
											action="?/rejectTrial"
											use:enhance={bindSubmitting(
												(v) => (busyId = v ? r.id : null),
												async ({ update }) => {
													await update();
												}
											)}
										>
											<input type="hidden" name="requestId" value={r.id} />
											<IconActionTip tip="Reject" tone="warning">
<button
													type="submit"
													class="btn btn-ghost btn-square btn-xs btn-warning"
													class:cursor-pointer={busyId !== r.id}
													class:cursor-not-allowed={busyId === r.id}
													class:loading={busyId === r.id}
													disabled={busyId === r.id}
													aria-busy={busyId === r.id}
													aria-label="Reject"
												>
													{#if busyId !== r.id}
														<X class="size-3.5" aria-hidden="true" />
													{/if}
												</button>
											</IconActionTip>

										</form>
									{/if}
									<IconActionTip tip="Delete" tone="error">
<button
											type="button"
											class="btn btn-ghost btn-square btn-xs btn-error cursor-pointer"
											aria-label="Delete"
											onclick={() => openDelete(r)}
										>
											<Trash2 class="size-3.5" aria-hidden="true" />
										</button>
									</IconActionTip>

								</div>
							</td>
							<td>{(safePage - 1) * pageSize + i + 1}</td>
							<td>
								<div class="font-medium">{r.firstName} {r.lastName}</div>
								<div class="text-ink-muted text-xs">{r.email}</div>
							</td>
							<td>
								<div class="font-medium">{r.businessName}</div>
								{#if r.businessWebsite}
									<div class="text-ink-muted truncate text-xs">{r.businessWebsite}</div>
								{/if}
							</td>
							<td>{trialDurationLabel(r.duration)}</td>
							<td><span class={statusBadge(r.status)}>{r.status}</span></td>
							<td class="text-ink-muted whitespace-nowrap text-sm"
								>{shortDateTime(r.createdAt)}</td
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
					id="trials-page-size"
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

<dialog bind:this={approveDialog} class="modal">
	<div class="modal-box w-11/12 border-base-300 max-w-lg border bg-base-100 shadow-sm">
		<h2 class="card-title text-primary font-bold">Approve trial</h2>
		{#if approveRow}
			<p class="text-ink-muted mt-1 text-sm">
				Create business <span class="text-base-content font-medium">{approveRow.businessName}</span>
				and invite owner <span class="text-base-content font-medium">{approveRow.email}</span>
				for {trialDurationLabel(approveRow.duration)}.
			</p>
			<form
				method="POST"
				action="?/approveTrial"
				class="mt-4 flex flex-col gap-3"
				use:enhance={bindSubmitting((v) => (approving = v), async ({ result, update }) => {
					await update();
					if (result.type === 'success') closeApprove();
				})}
			>
				<input type="hidden" name="requestId" value={approveRow.id} />
				<label class="form-control flex w-full flex-col" for="approve-template">
					<span class="label-text mb-1">
						Template<span class="text-error align-top text-sm leading-none" aria-hidden="true"
							>*</span
						>
					</span>
					<SearchSelect
						id="approve-template"
						name="industryPackId"
						options={templateOptions}
						bind:value={approveTemplateId}
						required
						placeholder="Select template..."
						filterPlaceholder="Search templates..."
						ariaLabel="Template"
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="approve-config">
					<span class="label-text mb-1">Config</span>
					<SearchSelect
						id="approve-config"
						name="configId"
						options={configOptions}
						bind:value={approveConfigId}
						allowEmpty
						emptyLabel="None"
						placeholder="Select config..."
						filterPlaceholder="Search configs..."
						ariaLabel="Config"
					/>
				</label>
				<div class="modal-action mt-2 justify-end">
					<button
						type="button"
						class="btn btn-ghost"
						class:cursor-pointer={!approving}
						class:cursor-not-allowed={approving}
						onclick={closeApprove}
						disabled={approving}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn btn-primary"
						class:cursor-pointer={!approving}
						class:cursor-not-allowed={approving}
						class:btn-disabled={approving}
						class:loading={approving}
						disabled={approving}
						aria-busy={approving}
					>
						Approve and invite
					</button>
				</div>
			</form>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button type="submit" class="cursor-pointer" aria-label="Close">close</button>
	</form>
</dialog>

<dialog bind:this={deleteDialog} class="modal">
	<div class="modal-box w-11/12 border-base-300 max-w-md border bg-base-100 shadow-sm">
		<h2 class="card-title text-error font-bold">Delete trial request</h2>
		{#if deleteRow}
			<p class="text-ink-muted mt-2 text-sm">
				Permanently delete the request from
				<span class="text-base-content font-medium">{deleteRow.email}</span>?
			</p>
			<form
				method="POST"
				action="?/deleteTrial"
				class="modal-action justify-end"
				use:enhance={bindSubmitting((v) => (deleting = v), async ({ result, update }) => {
					await update();
					if (result.type === 'success') closeDelete();
				})}
			>
				<input type="hidden" name="requestId" value={deleteRow.id} />
				<button
					type="button"
					class="btn btn-ghost"
					class:cursor-pointer={!deleting}
					class:cursor-not-allowed={deleting}
					onclick={closeDelete}
					disabled={deleting}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-error"
					class:cursor-pointer={!deleting}
					class:cursor-not-allowed={deleting}
					class:btn-disabled={deleting}
					class:loading={deleting}
					disabled={deleting}
					aria-busy={deleting}
				>
					Delete
				</button>
			</form>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button type="submit" class="cursor-pointer" aria-label="Close">close</button>
	</form>
</dialog>
