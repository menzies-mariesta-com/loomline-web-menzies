<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { CircleCheck, CircleX, Plus, RefreshCw, Trash2 } from '@lucide/svelte';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import { inDateRange } from '#lib/util/date-range';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import { buildCrudRowActions } from '#lib/keyboard/table-actions';

	import DateRangeFilter from '#lib/component/own/local/private/data-table/DateRangeFilter.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import ToastDismissButton from '#lib/component/own/local/private/ToastDismissButton.svelte';
	import IconActionTip from '#lib/component/wash/tooltip/IconActionTip.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';
	import WashActionKbd from '#lib/component/own/local/keyboard/WashActionKbd.svelte';
	import ShortcutTarget from '#lib/component/own/local/keyboard/ShortcutTarget.svelte';
	import { registerDataTableHeaderShortcuts } from '#lib/keyboard/page-table-shortcuts';
	import { m } from '#lib/paraglide/messages';

	let { data, form } = $props();

	type AdminRow = (typeof data.admins)[number];

	let creating = $state(false);
	let deleting = $state(false);
	let refreshing = $state(false);
	let toastGone = $state(false);
	let createDialog = $state<HTMLDialogElement | null>(null);
	let deleteDialog = $state<HTMLDialogElement | null>(null);
	let deleteRow = $state<AdminRow | null>(null);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let nameFilter = $state('');
	let emailFilter = $state('');
	let createdRange = $state('');

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filtered = $derived(
		data.admins.filter((a) => {
			const name = a.user?.name ?? '';
			const email = a.user?.email ?? a.userId;
			const nameOk =
				!nameFilter.trim() || name.toLowerCase().includes(nameFilter.trim().toLowerCase());
			const emailOk =
				!emailFilter.trim() || email.toLowerCase().includes(emailFilter.trim().toLowerCase());
			const createdOk = inDateRange(a.createdAt, createdRange);
			return nameOk && emailOk && createdOk;
		})
	);

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const safePage = $derived(Math.min(page, totalPages));
	const pageRows = $derived(filtered.slice((safePage - 1) * pageSize, safePage * pageSize));
	let keyboardRowIndex = $state<number | null>(null);
	const tableRowActions = $derived(buildCrudRowActions({ onDelete: openDelete }));

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

	function openCreate() {
		createDialog?.showModal();
	}

	function closeCreate() {
		createDialog?.close();
	}

	function openDelete(row: AdminRow) {
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
			nameFilter = '';
			emailFilter = '';
			createdRange = '';
			page = 1;
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}

	$effect(() => {
		nameFilter;
		emailFilter;
		createdRange;
		page = 1;
	});

	$effect(() => {
		if (page > totalPages) page = totalPages;
	});

	$effect(() => {
		if (form?.message) toastGone = false;
		if (form?.success) {
			closeCreate();
			closeDelete();
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

	$effect(() => {
		const off = registerDataTableHeaderShortcuts('admin-team', {
			onRefresh: () => void handleRefresh(),
			refreshDisabled: () => refreshing,
			onNew: openCreate
		});
		return off;
	});
</script>

<svelte:head>
	<title>Team | NextUp Admin</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="flex min-h-0 flex-1 flex-col">
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

	<DataTableShell
		keyboardRows={pageRows}
		rowActions={tableRowActions}
		tableId="admin-team"
		bind:keyboardRowIndex
		title="Team"
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
					<th>Email</th>
					<th>Added</th>
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
					<th>
						<input
							type="text"
							class="input-bordered input w-full max-w-[10rem] cursor-text input-xs"
							placeholder="Filter…"
							aria-label="Filter by email"
							bind:value={emailFilter}
						/>
					</th>
					<th class="overflow-visible">
						<DateRangeFilter label="Added" bind:value={createdRange} />
					</th>
				</tr>
			</thead>
			<tbody>
				{#if pageRows.length === 0}
					<tr>
						<td colspan="5" class="text-ink-muted py-10 text-center text-sm">
							No platform admins match these filters.
						</td>
					</tr>
				{:else}
					{#each pageRows as admin, i (admin.id)}
						<tr
							data-kbd-row-id={admin.id}
							data-kbd-row-slot={String(i + 1)}
							data-kbd-row-focus={keyboardRowIndex === i ? 'true' : undefined}
						>
							<td>
								{#if admin.userId === data.currentUserId}
									<span class="text-ink-muted text-xs">You</span>
								{:else}
									<WashActionKbd key="d">
										<IconActionTip tip="Remove" tone="error">
											<button
												type="button"
												class="btn btn-square cursor-pointer btn-ghost btn-error btn-xs"
												aria-label="Remove"
												onclick={() => openDelete(admin)}
											>
												<Trash2 class="size-3.5" aria-hidden="true" />
											</button>
										</IconActionTip>
									</WashActionKbd>
								{/if}
							</td>
							<td>{(safePage - 1) * pageSize + i + 1}</td>
							<td class="font-medium">{admin.user?.name ?? '-'}</td>
							<td>{admin.user?.email ?? admin.userId}</td>
							<td class="text-ink-muted text-sm whitespace-nowrap"
								>{shortDateTime(admin.createdAt)}</td
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
					id="team-page-size"
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
					class="btn join-item btn-sm"
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
						class="btn join-item cursor-pointer btn-sm"
						class:btn-active={p === safePage}
						onclick={() => (page = p)}
					>
						{p}
					</button>
				{/each}
				<button
					type="button"
					class="btn join-item btn-sm"
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

<dialog bind:this={createDialog} class="modal">
	<div class="modal-box w-11/12 max-w-lg border border-base-300 bg-base-100 shadow-sm">
		<h2 class="card-title font-bold text-primary">Add platform admin</h2>
		<p class="text-ink-muted mt-1 text-sm">
			Existing accounts are linked. New emails get a credential account (default password unless you
			set one).
		</p>
		<form
			method="POST"
			action="?/addAdmin"
			class="mt-4 flex flex-col gap-3"
			use:enhance={bindSubmitting(
				(v) => (creating = v),
				async ({ result, update }) => {
					await update();
					if (result.type === 'success') closeCreate();
				}
			)}
		>
			<label class="form-control flex w-full flex-col" for="admin-email">
				<span class="label-text mb-1">
					Email<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span>
				</span>
				<input
					id="admin-email"
					name="email"
					type="email"
					autocomplete="email"
					class="input-bordered input w-full cursor-text"
					required
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="admin-name">
				<span class="label-text mb-1">Name</span>
				<input
					id="admin-name"
					name="name"
					class="input-bordered input w-full cursor-text"
					placeholder="Optional for new accounts"
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="admin-password">
				<span class="label-text mb-1">Temp password</span>
				<input
					id="admin-password"
					name="password"
					type="text"
					class="input-bordered input w-full cursor-text"
					placeholder="NextUpAdmin1! (new accounts only)"
				/>
			</label>
			<div class="modal-action mt-2 justify-end">
				<button
					type="button"
					class="btn btn-ghost"
					class:cursor-pointer={!creating}
					class:cursor-not-allowed={creating}
					onclick={closeCreate}
					disabled={creating}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-primary"
					class:cursor-pointer={!creating}
					class:cursor-not-allowed={creating}
					class:btn-disabled={creating}
					class:loading={creating}
					disabled={creating}
					aria-busy={creating}
				>
					{#if !creating}
						<Plus class="size-4" aria-hidden="true" />
					{/if}
					Add admin
				</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button type="submit" class="cursor-pointer" aria-label="Close">close</button>
	</form>
</dialog>

<dialog bind:this={deleteDialog} class="modal">
	<div class="modal-box w-11/12 max-w-md border border-base-300 bg-base-100 shadow-sm">
		<h2 class="card-title font-bold text-error">Remove platform admin</h2>
		{#if deleteRow}
			<p class="text-ink-muted mt-2 text-sm">
				Remove
				<span class="font-medium text-base-content"
					>{deleteRow.user?.email ?? deleteRow.userId}</span
				>
				from the platform team? Their user account stays; only platform admin access is revoked.
			</p>
			<form
				method="POST"
				action="?/removeAdmin"
				class="modal-action justify-end"
				use:enhance={bindSubmitting(
					(v) => (deleting = v),
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') closeDelete();
					}
				)}
			>
				<input type="hidden" name="id" value={deleteRow.id} />
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
					Remove
				</button>
			</form>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button type="submit" class="cursor-pointer" aria-label="Close">close</button>
	</form>
</dialog>
