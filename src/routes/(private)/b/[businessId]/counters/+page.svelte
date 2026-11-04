<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		CircleCheck,
		CircleX,
		DoorClosed,
		DoorOpen,
		Pause,
		Pencil,
		Plus,
		RefreshCw,
		Trash2
	} from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import { buildCrudRowActions } from '#lib/keyboard/table-actions';

	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import ToastDismissButton from '#lib/component/own/local/private/ToastDismissButton.svelte';
	import IconActionTip from '#lib/component/wash/tooltip/IconActionTip.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';
	import WashActionKbd from '#lib/component/own/local/keyboard/WashActionKbd.svelte';
	import ShortcutTarget from '#lib/component/own/local/keyboard/ShortcutTarget.svelte';
	import { registerDataTableHeaderShortcuts } from '#lib/keyboard/page-table-shortcuts';
	import { m } from '#lib/paraglide/messages';

	let { data, form } = $props();

	type CounterRow = (typeof data.counters)[number];

	let creating = $state(false);
	let editing = $state(false);
	let deleting = $state(false);
	let statusBusy = $state<string | null>(null);
	let refreshing = $state(false);
	let createDialog = $state<HTMLDialogElement | null>(null);
	let editDialog = $state<HTMLDialogElement | null>(null);
	let deleteDialog = $state<HTMLDialogElement | null>(null);
	let editRow = $state<CounterRow | null>(null);
	let deleteRow = $state<CounterRow | null>(null);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let nameFilter = $state('');
	let statusFilter = $state('');
	let toastGone = $state(false);

	let createSiteId = $state('');
	let createDeptId = $state('');
	let createServiceIds = $state<string[]>([]);
	let editSiteId = $state('');
	let editDeptId = $state('');
	let editServiceIds = $state<string[]>([]);

	const siteOptions = $derived(data.sites.map((s) => ({ value: s.id, label: s.name })));
	const createDeptOptions = $derived(
		data.departments
			.filter((d) => !createSiteId || d.siteId === createSiteId)
			.map((d) => ({ value: d.id, label: d.name }))
	);
	const editDeptOptions = $derived(
		data.departments
			.filter((d) => !editSiteId || d.siteId === editSiteId)
			.map((d) => ({ value: d.id, label: d.name }))
	);

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);
	const filtered = $derived(
		data.counters.filter((c) => {
			const q = nameFilter.trim().toLowerCase();
			const nameOk =
				!q ||
				c.label.toLowerCase().includes(q) ||
				(c.department?.name ?? '').toLowerCase().includes(q);
			const statusOk = !statusFilter || c.status === statusFilter;
			return nameOk && statusOk;
		})
	);
	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const safePage = $derived(Math.min(page, totalPages));
	const pageRows = $derived(filtered.slice((safePage - 1) * pageSize, safePage * pageSize));
	let keyboardRowIndex = $state<number | null>(null);
	const tableRowActions = $derived(buildCrudRowActions({ onEdit: openEdit, onDelete: openDelete }));

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
			autoPageSize = Math.max(3, Math.floor(((bodyEl?.clientHeight ?? 0) - 72) / 44));
		});
		ro.observe(bodyEl);
		return () => ro.disconnect();
	});
	$effect(() => {
		createSiteId;
		if (createDeptId && !createDeptOptions.some((d) => d.value === createDeptId)) {
			createDeptId = createDeptOptions[0]?.value ?? '';
		}
	});
	$effect(() => {
		editSiteId;
		if (editDeptId && !editDeptOptions.some((d) => d.value === editDeptId)) {
			editDeptId = editDeptOptions[0]?.value ?? '';
		}
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
		createDeptId =
			data.departments.find((d) => d.siteId === createSiteId)?.id ?? data.departments[0]?.id ?? '';
		createServiceIds = [];
		createDialog?.showModal();
	}

	function openEdit(row: CounterRow) {
		editRow = row;
		editSiteId = row.siteId;
		editDeptId = row.departmentId ?? '';
		editServiceIds = row.services.map((s) => s.serviceId);
		editDialog?.showModal();
	}

	function openDelete(row: CounterRow) {
		deleteRow = row;
		deleteDialog?.showModal();
	}

	function toggleService(list: string[], id: string, on: boolean) {
		if (on) return list.includes(id) ? list : [...list, id];
		return list.filter((x) => x !== id);
	}

	$effect(() => {
		const off = registerDataTableHeaderShortcuts('counters', {
			onRefresh: () => void handleRefresh(),
			refreshDisabled: () => refreshing,
			onNew: openCreate
		});
		return off;
	});
</script>

<svelte:head>
	<title>Counters | {data.business.name}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

{#if form?.message && !toastGone}
	<div class="toast toast-end toast-bottom z-[100]">
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
		keyboardRows={pageRows}
		rowActions={tableRowActions}
		tableId="counters"
		bind:keyboardRowIndex
		title="Counters"
		bind:bodyEl
		{footerSummary}
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
			<WashTooltip tooltipText="Add" className="tooltip-primary">
				<ShortcutTarget keys={['N']} label={m.keyboard_action_new()}>
					<button
						type="button"
						class="btn btn-square cursor-pointer btn-ghost btn-primary btn-sm"
						aria-label="Add"
						onclick={openCreate}
					>
						<Plus class="size-4" aria-hidden="true" />
					</button>
				</ShortcutTarget>
			</WashTooltip>
		{/snippet}

		<table class="table w-full table-zebra [&_tbody_tr]:hover:bg-primary/40">
			<thead class="sticky top-0 z-10 bg-base-100">
				<tr>
					<th>Actions</th>
					<th>No</th>
					<th>Name</th>
					<th>Department</th>
					<th>Services</th>
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
							class="input-bordered input w-full max-w-[10rem] cursor-text input-xs"
							placeholder="Filter…"
							aria-label="Filter by name"
							bind:value={nameFilter}
						/>
					</th>
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
					<th>
						<SearchSelect
							id="filter-counter-status"
							name="filterStatus"
							size="xs"
							bind:value={statusFilter}
							allowEmpty
							emptyLabel="All"
							options={[
								{ value: 'open', label: 'open' },
								{ value: 'paused', label: 'paused' },
								{ value: 'closed', label: 'closed' }
							]}
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
						<td colspan="8" class="text-ink-muted py-10 text-center text-sm">
							No counters match these filters.
						</td>
					</tr>
				{:else}
					{#each pageRows as c, i (c.id)}
						<tr
							data-kbd-row-id={c.id}
							data-kbd-row-slot={String(i + 1)}
							data-kbd-row-focus={keyboardRowIndex === i ? 'true' : undefined}
						>
							<td>
								<div class="flex flex-wrap items-center gap-0.5">
									<WashActionKbd key="e">
										<IconActionTip tip="Edit" tone="secondary">
											<button
												type="button"
												class="btn btn-square cursor-pointer btn-ghost btn-secondary btn-xs"
												aria-label="Edit"
												onclick={() => openEdit(c)}
											>
												<Pencil class="size-3.5" aria-hidden="true" />
											</button>
										</IconActionTip>
									</WashActionKbd>

									{#each [{ st: 'open', tip: 'Set open', tone: 'success', Icon: DoorOpen }, { st: 'paused', tip: 'Set paused', tone: 'warning', Icon: Pause }, { st: 'closed', tip: 'Set closed', tone: 'secondary', Icon: DoorClosed }] as { st, tip, tone, Icon }}
										<form
											method="POST"
											action="?/setStatus"
											use:enhance={bindSubmitting((v) => (statusBusy = v ? c.id : null))}
										>
											<input type="hidden" name="id" value={c.id} />
											<input type="hidden" name="status" value={st} />
											<IconActionTip {tip} {tone}>
												<button
													type="submit"
													class="btn btn-square cursor-pointer btn-ghost btn-xs"
													class:btn-primary={c.status === st}
													class:loading={statusBusy === c.id}
													class:cursor-not-allowed={statusBusy === c.id}
													disabled={statusBusy === c.id}
													aria-busy={statusBusy === c.id}
													aria-label={tip}
												>
													{#if statusBusy !== c.id}
														<Icon class="size-3.5" aria-hidden="true" />
													{/if}
												</button>
											</IconActionTip>
										</form>
									{/each}
									<WashActionKbd key="d">
										<IconActionTip tip="Delete" tone="error">
											<button
												type="button"
												class="btn btn-square cursor-pointer btn-ghost btn-error btn-xs"
												aria-label="Delete"
												onclick={() => openDelete(c)}
											>
												<Trash2 class="size-3.5" aria-hidden="true" />
											</button>
										</IconActionTip>
									</WashActionKbd>
								</div>
							</td>
							<td>{(safePage - 1) * pageSize + i + 1}</td>
							<td class="font-medium">{c.label}</td>
							<td>{c.department?.name ?? '-'}</td>
							<td class="max-w-[12rem] truncate text-sm">
								{c.services
									.map((s) => s.service?.name)
									.filter(Boolean)
									.join(', ') || '-'}
							</td>
							<td>
								<span
									class={c.status === 'open'
										? washRecipes.badgeSoft('success')
										: c.status === 'paused'
											? washRecipes.badgeSoft('warning')
											: 'badge badge-ghost'}>{c.status}</span
								>
							</td>
							<td>{shortDateTime(c.createdAt)}</td>
							<td>{shortDateTime(c.updatedAt)}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>

		{#snippet footerStart()}
			<SearchSelect
				id="counters-page-size"
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

<dialog bind:this={createDialog} class="modal">
	<div class="modal-box w-11/12 max-w-lg border border-base-300 bg-base-100 shadow-sm">
		<h2 class="mb-4 card-title font-bold text-primary">Add counter</h2>
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
			<label class="form-control w-full" for="c-label">
				<span class="label-text mb-1"
					>Label<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span
					></span
				>
				<input id="c-label" name="label" class="input-bordered input w-full cursor-text" required />
			</label>
			<label class="form-control w-full" for="c-site">
				<span class="label-text mb-1"
					>Site<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span
					></span
				>
				<SearchSelect
					id="c-site"
					name="siteId"
					options={siteOptions}
					bind:value={createSiteId}
					required
				/>
			</label>
			<label class="form-control w-full" for="c-dept">
				<span class="label-text mb-1"
					>Department<span class="align-top text-sm leading-none text-error" aria-hidden="true"
						>*</span
					></span
				>
				<SearchSelect
					id="c-dept"
					name="departmentId"
					options={createDeptOptions}
					bind:value={createDeptId}
					required
				/>
			</label>
			<fieldset class="rounded-box border border-base-300 p-3">
				<legend class="px-1 text-sm font-medium">Services (optional)</legend>
				<div class="flex max-h-40 flex-col gap-1 overflow-y-auto">
					{#each data.services as s}
						<label class="flex cursor-pointer items-center gap-2 text-sm">
							<input
								type="checkbox"
								name="serviceIds"
								value={s.id}
								class="checkbox checkbox-sm"
								checked={createServiceIds.includes(s.id)}
								onchange={(e) => {
									createServiceIds = toggleService(
										createServiceIds,
										s.id,
										(e.currentTarget as HTMLInputElement).checked
									);
								}}
							/>
							{s.name}
						</label>
					{/each}
				</div>
			</fieldset>
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
	<div class="modal-box w-11/12 max-w-lg border border-base-300 bg-base-100 shadow-sm">
		<h2 class="mb-4 card-title font-bold text-secondary">Edit counter</h2>
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
				<label class="form-control w-full" for="edit-c-label">
					<span class="label-text mb-1"
						>Label<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span
						></span
					>
					<input
						id="edit-c-label"
						name="label"
						class="input-bordered input w-full cursor-text"
						value={editRow.label}
						required
					/>
				</label>
				<label class="form-control w-full" for="edit-c-site">
					<span class="label-text mb-1"
						>Site<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span
						></span
					>
					<SearchSelect
						id="edit-c-site"
						name="siteId"
						options={siteOptions}
						bind:value={editSiteId}
						required
					/>
				</label>
				<label class="form-control w-full" for="edit-c-dept">
					<span class="label-text mb-1"
						>Department<span class="align-top text-sm leading-none text-error" aria-hidden="true"
							>*</span
						></span
					>
					<SearchSelect
						id="edit-c-dept"
						name="departmentId"
						options={editDeptOptions}
						bind:value={editDeptId}
						required
					/>
				</label>
				<fieldset class="rounded-box border border-base-300 p-3">
					<legend class="px-1 text-sm font-medium">Services (optional)</legend>
					<div class="flex max-h-40 flex-col gap-1 overflow-y-auto">
						{#each data.services as s}
							<label class="flex cursor-pointer items-center gap-2 text-sm">
								<input
									type="checkbox"
									name="serviceIds"
									value={s.id}
									class="checkbox checkbox-sm"
									checked={editServiceIds.includes(s.id)}
									onchange={(e) => {
										editServiceIds = toggleService(
											editServiceIds,
											s.id,
											(e.currentTarget as HTMLInputElement).checked
										);
									}}
								/>
								{s.name}
							</label>
						{/each}
					</div>
				</fieldset>
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
	<div class="modal-box w-11/12 max-w-md border border-base-300 bg-base-100 shadow-sm">
		<h2 class="mb-2 card-title font-bold text-error">Delete counter</h2>
		<p class="text-sm opacity-70">Delete <strong>{deleteRow?.label}</strong>?</p>
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
