<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Ban, CircleCheck, CircleX, Plus, Power, RefreshCw } from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import ToastDismissButton from '#lib/component/own/local/private/ToastDismissButton.svelte';
	import IconActionTip from '#lib/component/wash/tooltip/IconActionTip.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';

	let { data, form } = $props();

	let creating = $state(false);
	let toggleBusyId = $state<string | null>(null);
	let refreshing = $state(false);
	let createDialog = $state<HTMLDialogElement | null>(null);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let nameFilter = $state('');
	let statusFilter = $state('');
	let toastGone = $state(false);

	const statusOptions = [
		{ value: 'true', label: 'active' },
		{ value: 'false', label: 'off' }
	];

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filtered = $derived(
		data.services.filter((s) => {
			const q = nameFilter.trim().toLowerCase();
			const nameOk =
				!q ||
				s.name.toLowerCase().includes(q) ||
				s.codePrefix.toLowerCase().includes(q);
			const statusOk =
				!statusFilter ||
				(statusFilter === 'true' ? s.isActive : !s.isActive);
			return nameOk && statusOk;
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
		createDialog?.showModal();
	}
</script>

<svelte:head>
	<title>Services | {data.business.name}</title>
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
	<DataTableShell title="Services" bind:bodyEl footerSummary={footerSummary}>
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
					<th>Prefix</th>
					<th>Est. min</th>
					<th>Priority</th>
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
					<th aria-hidden="true"></th>
					<th>
						<SearchSelect
							id="filter-service-status"
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
						<td colspan="9" class="text-ink-muted py-10 text-center text-sm">
							No services match these filters.
						</td>
					</tr>
				{:else}
					{#each pageRows as s, i (s.id)}
						<tr>
							<td>
								<div class="flex items-center gap-0.5">
									<form
										method="POST"
										action="?/toggle"
										use:enhance={bindSubmitting((v) => (toggleBusyId = v ? s.id : null))}
									>
										<input type="hidden" name="id" value={s.id} />
										<input type="hidden" name="isActive" value={String(s.isActive)} />
										{#if s.isActive}
											<IconActionTip tip="Disable" tone="error">
<button
													type="submit"
													class="btn btn-ghost btn-square btn-xs btn-error"
													class:cursor-pointer={toggleBusyId !== s.id}
													class:cursor-not-allowed={toggleBusyId === s.id}
													class:btn-disabled={toggleBusyId === s.id}
													class:loading={toggleBusyId === s.id}
													aria-label="Disable"
													aria-busy={toggleBusyId === s.id}
													disabled={toggleBusyId === s.id}
												>
													{#if toggleBusyId !== s.id}
														<Ban class="size-3.5" aria-hidden="true" />
													{/if}
												</button>
											</IconActionTip>

										{:else}
											<IconActionTip tip="Enable" tone="success">
<button
													type="submit"
													class="btn btn-ghost btn-square btn-xs btn-success"
													class:cursor-pointer={toggleBusyId !== s.id}
													class:cursor-not-allowed={toggleBusyId === s.id}
													class:btn-disabled={toggleBusyId === s.id}
													class:loading={toggleBusyId === s.id}
													aria-label="Enable"
													aria-busy={toggleBusyId === s.id}
													disabled={toggleBusyId === s.id}
												>
													{#if toggleBusyId !== s.id}
														<Power class="size-3.5" aria-hidden="true" />
													{/if}
												</button>
											</IconActionTip>

										{/if}
									</form>
								</div>
							</td>
							<td>{(safePage - 1) * pageSize + i + 1}</td>
							<td class="font-medium">{s.name}</td>
							<td class="font-mono text-sm">{s.codePrefix}</td>
							<td>{s.estimatedMinutes}</td>
							<td>{s.priorityWeight}</td>
							<td>
								<span
									class={s.isActive
										? washRecipes.badgeSoft('success')
										: washRecipes.badgeSoft('warning')}>{s.isActive ? 'active' : 'off'}</span
								>
							</td>
							<td>{shortDateTime(s.createdAt)}</td>
							<td>{shortDateTime(s.updatedAt)}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>

		{#snippet footerStart()}
			<SearchSelect
				id="services-page-size"
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
		<h2 class="card-title text-primary mb-4 font-bold">Add service</h2>
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
			<label class="form-control w-full" for="svc-name">
				<span class="label-text mb-1"
					>Name<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
					></span
				>
				<input
					id="svc-name"
					name="name"
					class="input input-bordered w-full cursor-text"
					required
				/>
			</label>
			<label class="form-control w-full" for="svc-prefix">
				<span class="label-text mb-1">Code prefix</span>
				<input
					id="svc-prefix"
					name="codePrefix"
					class="input input-bordered w-full cursor-text font-mono"
					value="A"
				/>
			</label>
			<label class="form-control w-full" for="svc-est">
				<span class="label-text mb-1">Estimated minutes</span>
				<input
					id="svc-est"
					name="estimatedMinutes"
					type="number"
					class="input input-bordered w-full cursor-text"
					value="10"
				/>
			</label>
			<label class="form-control w-full" for="svc-priority">
				<span class="label-text mb-1">Priority weight</span>
				<input
					id="svc-priority"
					name="priorityWeight"
					type="number"
					class="input input-bordered w-full cursor-text"
					value="0"
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
