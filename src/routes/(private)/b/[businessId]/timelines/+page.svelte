<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		CircleCheck,
		CircleX,
		ListOrdered,
		Pencil,
		Plus,
		RefreshCw,
		Trash2
	} from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';

	let { data, form } = $props();

	type TimelineRow = (typeof data.timelines)[number];

	let creating = $state(false);
	let editing = $state(false);
	let deleting = $state(false);
	let stepBusy = $state(false);
	let refreshing = $state(false);
	let createDialog = $state<HTMLDialogElement | null>(null);
	let editDialog = $state<HTMLDialogElement | null>(null);
	let deleteDialog = $state<HTMLDialogElement | null>(null);
	let stepsDialog = $state<HTMLDialogElement | null>(null);
	let editRow = $state<TimelineRow | null>(null);
	let deleteRow = $state<TimelineRow | null>(null);
	let stepsRow = $state<TimelineRow | null>(null);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let nameFilter = $state('');
	let toastGone = $state(false);

	let createServiceId = $state('');
	let editServiceId = $state('');
	let editActive = $state('true');
	let addStepDestId = $state('');

	const serviceOptions = $derived(data.services.map((s) => ({ value: s.id, label: s.name })));
	const destOptions = $derived(data.destinations.map((d) => ({ value: d.id, label: d.name })));
	const activeOptions = [
		{ value: 'true', label: 'active' },
		{ value: 'false', label: 'inactive' }
	];

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);
	const filtered = $derived(
		data.timelines.filter((t) => {
			const q = nameFilter.trim().toLowerCase();
			return (
				!q ||
				t.name.toLowerCase().includes(q) ||
				(t.service?.name ?? '').toLowerCase().includes(q)
			);
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

	const sortedSteps = $derived(
		stepsRow ? [...stepsRow.steps].sort((a, b) => a.stepOrder - b.stepOrder) : []
	);

	$effect(() => {
		if (form?.message) toastGone = false;
	});
	$effect(() => {
		nameFilter;
		page = 1;
	});
	$effect(() => {
		if (!bodyEl || pageSizeChoice !== 'auto') return;
		const ro = new ResizeObserver(() => {
			autoPageSize = Math.max(3, Math.floor(((bodyEl?.clientHeight ?? 0) - 72) / 44));
		});
		ro.observe(bodyEl);
		return () => ro.disconnect();
	});
	$effect(() => {
		if (!stepsRow) return;
		const fresh = data.timelines.find((t) => t.id === stepsRow?.id);
		if (fresh) stepsRow = fresh;
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
		createServiceId = data.services[0]?.id ?? '';
		createDialog?.showModal();
	}

	function openEdit(row: TimelineRow) {
		editRow = row;
		editServiceId = row.serviceId;
		editActive = row.isActive ? 'true' : 'false';
		editDialog?.showModal();
	}

	function openDelete(row: TimelineRow) {
		deleteRow = row;
		deleteDialog?.showModal();
	}

	function openSteps(row: TimelineRow) {
		stepsRow = row;
		addStepDestId = data.destinations[0]?.id ?? '';
		stepsDialog?.showModal();
	}
</script>

<svelte:head>
	<title>Timelines | {data.business.name}</title>
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
			<button
				type="button"
				class="btn btn-ghost btn-xs cursor-pointer"
				onclick={() => (toastGone = true)}>Dismiss</button
			>
		</div>
	</div>
{/if}

<div class="flex min-h-0 flex-1 flex-col">
	<DataTableShell title="Timelines" bind:bodyEl footerSummary={footerSummary}>
		{#snippet headerActions()}
			<div class="tooltip tooltip-bottom tooltip-secondary" data-tip="Refresh">
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
			</div>
			<div class="tooltip tooltip-left tooltip-primary" data-tip="Add">
				<button
					type="button"
					class="btn btn-ghost btn-square btn-sm btn-primary cursor-pointer"
					aria-label="Add"
					onclick={openCreate}
				>
					<Plus class="size-4" aria-hidden="true" />
				</button>
			</div>
		{/snippet}

		<table class="table table-zebra w-full [&_tbody_tr]:hover:bg-primary/40">
			<thead class="bg-base-100 sticky top-0 z-10">
				<tr>
					<th>Actions</th>
					<th>No</th>
					<th>Name</th>
					<th>Service</th>
					<th>Steps</th>
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
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
				</tr>
			</thead>
			<tbody>
				{#if pageRows.length === 0}
					<tr>
						<td colspan="8" class="text-ink-muted py-10 text-center text-sm">
							No timelines match these filters.
						</td>
					</tr>
				{:else}
					{#each pageRows as t, i (t.id)}
						<tr>
							<td>
								<div class="flex items-center gap-0.5">
									<div class="tooltip tooltip-primary tooltip-right" data-tip="Steps">
										<button
											type="button"
											class="btn btn-ghost btn-square btn-xs btn-primary cursor-pointer"
											aria-label="Steps"
											onclick={() => openSteps(t)}
										>
											<ListOrdered class="size-3.5" aria-hidden="true" />
										</button>
									</div>
									<div class="tooltip tooltip-secondary tooltip-right" data-tip="Edit">
										<button
											type="button"
											class="btn btn-ghost btn-square btn-xs btn-secondary cursor-pointer"
											aria-label="Edit"
											onclick={() => openEdit(t)}
										>
											<Pencil class="size-3.5" aria-hidden="true" />
										</button>
									</div>
									<div class="tooltip tooltip-error tooltip-right" data-tip="Delete">
										<button
											type="button"
											class="btn btn-ghost btn-square btn-xs btn-error cursor-pointer"
											aria-label="Delete"
											onclick={() => openDelete(t)}
										>
											<Trash2 class="size-3.5" aria-hidden="true" />
										</button>
									</div>
								</div>
							</td>
							<td>{(safePage - 1) * pageSize + i + 1}</td>
							<td class="font-medium">{t.name}</td>
							<td>{t.service?.name ?? '-'}</td>
							<td>{t.steps.length}</td>
							<td>
								<span
									class={t.isActive
										? washRecipes.badgeSoft('success')
										: washRecipes.badgeSoft('warning')}
									>{t.isActive ? 'active' : 'inactive'}</span
								>
							</td>
							<td>{shortDateTime(t.createdAt)}</td>
							<td>{shortDateTime(t.updatedAt)}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>

		{#snippet footerStart()}
			<SearchSelect
				id="timelines-page-size"
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
		<h2 class="card-title text-primary mb-4 font-bold">Add timeline</h2>
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
			<label class="form-control w-full" for="tl-service">
				<span class="label-text mb-1"
					>Service<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
					></span
				>
				<SearchSelect
					id="tl-service"
					name="serviceId"
					options={serviceOptions}
					bind:value={createServiceId}
					required
				/>
			</label>
			<label class="form-control w-full" for="tl-name">
				<span class="label-text mb-1"
					>Name<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
					></span
				>
				<input id="tl-name" name="name" class="input input-bordered w-full cursor-text" required />
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

<dialog bind:this={editDialog} class="modal">
	<div class="modal-box w-11/12 border-base-300 max-w-lg border bg-base-100 shadow-sm">
		<h2 class="card-title text-secondary mb-4 font-bold">Edit timeline</h2>
		{#if editRow}
			<form
				method="POST"
				action="?/update"
				class="space-y-3"
				use:enhance={bindSubmitting(
					(v) => (editing = v),
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') editDialog?.close();
					}
				)}
			>
				<input type="hidden" name="id" value={editRow.id} />
				<label class="form-control w-full" for="edit-tl-service">
					<span class="label-text mb-1"
						>Service<span class="text-error align-top text-sm leading-none" aria-hidden="true"
							>*</span
						></span
					>
					<SearchSelect
						id="edit-tl-service"
						name="serviceId"
						options={serviceOptions}
						bind:value={editServiceId}
						required
					/>
				</label>
				<label class="form-control w-full" for="edit-tl-name">
					<span class="label-text mb-1"
						>Name<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
						></span
					>
					<input
						id="edit-tl-name"
						name="name"
						class="input input-bordered w-full cursor-text"
						value={editRow.name}
						required
					/>
				</label>
				<label class="form-control w-full" for="edit-tl-active">
					<span class="label-text mb-1">Status</span>
					<SearchSelect
						id="edit-tl-active"
						name="isActive"
						options={activeOptions}
						bind:value={editActive}
					/>
				</label>
				<div class="modal-action">
					<button type="button" class="btn cursor-pointer" onclick={() => editDialog?.close()}
						>Cancel</button
					>
					<button
						type="submit"
						class="btn btn-secondary"
						class:loading={editing}
						class:btn-disabled={editing}
						class:cursor-pointer={!editing}
						class:cursor-not-allowed={editing}
						disabled={editing}
						aria-busy={editing}>Save</button
					>
				</div>
			</form>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop"><button class="cursor-pointer">close</button></form>
</dialog>

<dialog bind:this={deleteDialog} class="modal">
	<div class="modal-box w-11/12 border-base-300 max-w-md border bg-base-100 shadow-sm">
		<h2 class="card-title text-error mb-2 font-bold">Delete timeline</h2>
		<p class="text-sm opacity-70">Delete <strong>{deleteRow?.name}</strong> and its steps?</p>
		{#if deleteRow}
			<form
				method="POST"
				action="?/delete"
				class="modal-action"
				use:enhance={bindSubmitting(
					(v) => (deleting = v),
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') deleteDialog?.close();
					}
				)}
			>
				<input type="hidden" name="id" value={deleteRow.id} />
				<button type="button" class="btn cursor-pointer" onclick={() => deleteDialog?.close()}
					>Cancel</button
				>
				<button
					type="submit"
					class="btn btn-error"
					class:loading={deleting}
					class:btn-disabled={deleting}
					class:cursor-pointer={!deleting}
					class:cursor-not-allowed={deleting}
					disabled={deleting}
					aria-busy={deleting}>Delete</button
				>
			</form>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop"><button class="cursor-pointer">close</button></form>
</dialog>

<dialog bind:this={stepsDialog} class="modal">
	<div class="modal-box w-11/12 border-base-300 max-w-2xl border bg-base-100 shadow-sm">
		<h2 class="card-title text-primary mb-4 font-bold">
			Steps: {stepsRow?.name ?? ''}
		</h2>
		{#if stepsRow}
			<div class="wash-modal-body">
				<div class="mb-4 overflow-x-auto">
					<table class="table table-zebra table-sm [&_tbody_tr]:hover:bg-primary/40">
						<thead>
							<tr>
								<th>Actions</th>
								<th>Order</th>
								<th>Destination</th>
								<th>SLA (min)</th>
							</tr>
						</thead>
						<tbody>
							{#each sortedSteps as step (step.id)}
								<tr>
									<td>
										<form
											method="POST"
											action="?/deleteStep"
											use:enhance={bindSubmitting((v) => (stepBusy = v))}
										>
											<input type="hidden" name="id" value={step.id} />
											<div class="tooltip tooltip-error tooltip-right" data-tip="Remove">
												<button
													type="submit"
													class="btn btn-ghost btn-square btn-xs btn-error"
													class:loading={stepBusy}
													class:cursor-pointer={!stepBusy}
													class:cursor-not-allowed={stepBusy}
													disabled={stepBusy}
													aria-busy={stepBusy}
													aria-label="Remove"
												>
													{#if !stepBusy}
														<Trash2 class="size-3.5" aria-hidden="true" />
													{/if}
												</button>
											</div>
										</form>
									</td>
									<td>
										<form
											method="POST"
											action="?/updateStep"
											class="flex flex-wrap items-center gap-1"
											use:enhance={bindSubmitting((v) => (stepBusy = v))}
										>
											<input type="hidden" name="id" value={step.id} />
											<input type="hidden" name="destinationId" value={step.destinationId} />
											<input
												name="stepOrder"
												type="number"
												class="input input-xs input-bordered w-16 cursor-text"
												value={step.stepOrder}
											/>
											<input
												name="slaMinutes"
												type="number"
												class="input input-xs input-bordered w-20 cursor-text"
												value={step.slaMinutes ?? ''}
												placeholder="SLA"
											/>
											<button
												type="submit"
												class="btn btn-xs btn-secondary min-w-16"
												class:loading={stepBusy}
												disabled={stepBusy}
												aria-busy={stepBusy}
												class:cursor-pointer={!stepBusy}
												class:cursor-not-allowed={stepBusy}>Save</button
											>
										</form>
									</td>
									<td>{step.destination?.name ?? '-'}</td>
									<td>{step.slaMinutes ?? '-'}</td>
								</tr>
							{:else}
								<tr>
									<td colspan="4" class="opacity-60">No steps yet.</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<form
					method="POST"
					action="?/addStep"
					class="border-base-300 space-y-3 border-t pt-3"
					use:enhance={bindSubmitting((v) => (stepBusy = v))}
				>
					<input type="hidden" name="timelineId" value={stepsRow.id} />
					<p class="text-sm font-semibold">Add step</p>
					<div class="grid gap-2 sm:grid-cols-3">
						<label class="form-control" for="step-order">
							<span class="label-text mb-1"
								>Order<span class="text-error align-top text-sm leading-none" aria-hidden="true"
									>*</span
								></span
							>
							<input
								id="step-order"
								name="stepOrder"
								type="number"
								class="input input-bordered cursor-text"
								value={(sortedSteps.at(-1)?.stepOrder ?? 0) + 1}
								required
							/>
						</label>
						<label class="form-control" for="step-dest">
							<span class="label-text mb-1"
								>Destination<span
									class="text-error align-top text-sm leading-none"
									aria-hidden="true">*</span
								></span
							>
							<SearchSelect
								id="step-dest"
								name="destinationId"
								options={destOptions}
								bind:value={addStepDestId}
								required
							/>
						</label>
						<label class="form-control" for="step-sla">
							<span class="label-text mb-1">SLA minutes</span>
							<input
								id="step-sla"
								name="slaMinutes"
								type="number"
								class="input input-bordered cursor-text"
							/>
						</label>
					</div>
					<button
						type="submit"
						class="btn btn-primary btn-sm"
						class:loading={stepBusy}
						class:btn-disabled={stepBusy}
						class:cursor-pointer={!stepBusy}
						class:cursor-not-allowed={stepBusy}
						disabled={stepBusy}
						aria-busy={stepBusy}>Add step</button
					>
				</form>
			</div>
		{/if}
		<div class="modal-action">
			<button type="button" class="btn cursor-pointer" onclick={() => stepsDialog?.close()}
				>Close</button
			>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop"><button class="cursor-pointer">close</button></form>
</dialog>
