<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { CircleCheck, CircleX, Pencil, Plus, RefreshCw, Trash2 } from '@lucide/svelte';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import { inDateRange } from '#lib/util/date-range';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import { buildCrudRowActions } from '#lib/keyboard/table-actions';

	import DateRangeFilter from '#lib/component/own/local/private/data-table/DateRangeFilter.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import TimezoneSearchSelect from '#lib/component/own/local/private/TimezoneSearchSelect.svelte';
	import ToastDismissButton from '#lib/component/own/local/private/ToastDismissButton.svelte';
	import { dateFormatOptions } from '#lib/util/date-formats';
	import { timeFormatOptions } from '#lib/util/time-formats';
	import { listCurrencyOptions } from '#lib/util/currencies';
	import IconActionTip from '#lib/component/wash/tooltip/IconActionTip.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';
	import WashActionKbd from '#lib/component/own/local/keyboard/WashActionKbd.svelte';
	import ShortcutTarget from '#lib/component/own/local/keyboard/ShortcutTarget.svelte';
	import { registerDataTableHeaderShortcuts } from '#lib/keyboard/page-table-shortcuts';
	import { m } from '#lib/paraglide/messages';

	type ConfigRow = {
		id: string;
		name: string;
		timezone: string;
		locale: string;
		dateFormat: string;
		timeFormat: string;
		currency: string;
		createdAt: Date;
		updatedAt: Date;
	};

	let { data, form } = $props();

	let creating = $state(false);
	let editing = $state(false);
	let deleting = $state(false);
	let refreshing = $state(false);
	let createDialog = $state<HTMLDialogElement | null>(null);
	let editDialog = $state<HTMLDialogElement | null>(null);
	let deleteDialog = $state<HTMLDialogElement | null>(null);
	let editRow = $state<ConfigRow | null>(null);
	let deleteRow = $state<ConfigRow | null>(null);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let nameFilter = $state('');
	let timezoneFilter = $state('');
	let localeFilter = $state('');
	let createdRange = $state('');
	let updatedRange = $state('');
	let toastGone = $state(false);
	let createTimezone = $state('Asia/Yangon');
	let createDateFormat = $state('MMM d, yyyy');
	let createTimeFormat = $state('HH:mm');
	let createCurrency = $state('MMK');
	let editTimezone = $state('Asia/Yangon');
	let editDateFormat = $state('MMM d, yyyy');
	let editTimeFormat = $state('HH:mm');
	let editCurrency = $state('MMK');

	const currencyOptions = listCurrencyOptions();
	const createDateOptions = $derived(dateFormatOptions(createDateFormat));
	const createTimeOptions = $derived(timeFormatOptions(createTimeFormat));
	const editDateOptions = $derived(dateFormatOptions(editDateFormat));
	const editTimeOptions = $derived(timeFormatOptions(editTimeFormat));
	const editCurrencyOptions = $derived(listCurrencyOptions(editCurrency));

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filtered = $derived(
		data.configs.filter((c) => {
			const nameOk =
				!nameFilter.trim() || c.name.toLowerCase().includes(nameFilter.trim().toLowerCase());
			const tzOk =
				!timezoneFilter.trim() ||
				c.timezone.toLowerCase().includes(timezoneFilter.trim().toLowerCase());
			const localeOk =
				!localeFilter.trim() || c.locale.toLowerCase().includes(localeFilter.trim().toLowerCase());
			const createdOk = inDateRange(c.createdAt, createdRange);
			const updatedOk = inDateRange(c.updatedAt, updatedRange);
			return nameOk && tzOk && localeOk && createdOk && updatedOk;
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

	function openCreate() {
		createTimezone = 'Asia/Yangon';
		createDateFormat = 'MMM d, yyyy';
		createTimeFormat = 'HH:mm';
		createCurrency = 'MMK';
		createDialog?.showModal();
	}
	function closeCreate() {
		createDialog?.close();
	}
	function openEdit(row: ConfigRow) {
		editRow = row;
		editTimezone = row.timezone;
		editDateFormat = row.dateFormat;
		editTimeFormat = row.timeFormat;
		editCurrency = row.currency;
		editDialog?.showModal();
	}
	function closeEdit() {
		editDialog?.close();
		editRow = null;
	}
	function openDelete(row: ConfigRow) {
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
			timezoneFilter = '';
			localeFilter = '';
			createdRange = '';
			updatedRange = '';
			page = 1;
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}

	$effect(() => {
		nameFilter;
		timezoneFilter;
		localeFilter;
		createdRange;
		updatedRange;
		page = 1;
	});

	$effect(() => {
		if (page > totalPages) page = totalPages;
	});

	$effect(() => {
		if (form?.message) toastGone = false;
		if (form?.success) {
			closeCreate();
			closeEdit();
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
		const off = registerDataTableHeaderShortcuts('admin-config', {
			onRefresh: () => void handleRefresh(),
			refreshDisabled: () => refreshing,
			onNew: openCreate
		});
		return off;
	});
</script>

<svelte:head>
	<title>Config | NextUp Admin</title>
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
		tableId="admin-config"
		bind:keyboardRowIndex
		title="Config"
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
					<th>Timezone</th>
					<th>Language</th>
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
					<th>
						<input
							type="text"
							class="input-bordered input w-full max-w-[8rem] cursor-text input-xs"
							placeholder="Filter…"
							aria-label="Filter by timezone"
							bind:value={timezoneFilter}
						/>
					</th>
					<th>
						<input
							type="text"
							class="input-bordered input w-full max-w-[6rem] cursor-text input-xs"
							placeholder="Filter…"
							aria-label="Filter by language"
							bind:value={localeFilter}
						/>
					</th>
					<th class="overflow-visible">
						<DateRangeFilter label="Created" bind:value={createdRange} />
					</th>
					<th class="overflow-visible">
						<DateRangeFilter label="Updated" bind:value={updatedRange} />
					</th>
				</tr>
			</thead>
			<tbody>
				{#if pageRows.length === 0}
					<tr>
						<td colspan="7" class="text-ink-muted py-10 text-center text-sm">
							No configs match these filters.
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
								<div class="flex items-center gap-0.5">
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
							<td>
								<div class="font-medium">{c.name}</div>
								<div class="text-ink-muted text-xs">
									{c.dateFormat} · {c.timeFormat} · {c.currency}
								</div>
							</td>
							<td class="font-mono text-xs">{c.timezone}</td>
							<td>{c.locale}</td>
							<td class="text-ink-muted text-sm whitespace-nowrap">{shortDateTime(c.createdAt)}</td>
							<td class="text-ink-muted text-sm whitespace-nowrap">{shortDateTime(c.updatedAt)}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>

		{#snippet footerStart()}
			<label class="text-ink-muted flex min-w-0 items-center gap-1.5 text-xs">
				<span>Per page</span>
				<SearchSelect
					id="config-page-size"
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
		<h2 class="card-title font-bold text-primary">Add config</h2>
		<form
			method="POST"
			action="?/createConfig"
			class="mt-4 flex flex-col gap-3"
			use:enhance={bindSubmitting(
				(v) => (creating = v),
				async ({ result, update }) => {
					await update();
					if (result.type === 'success') closeCreate();
				}
			)}
		>
			<label class="form-control flex w-full flex-col" for="cfg-name">
				<span class="label-text mb-1">
					Name<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span>
				</span>
				<input id="cfg-name" name="name" class="input-bordered input w-full cursor-text" required />
			</label>
			<label class="form-control flex w-full flex-col" for="cfg-tz">
				<span class="label-text mb-1">
					Timezone<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span
					>
				</span>
				<TimezoneSearchSelect
					id="cfg-tz"
					name="timezone"
					bind:value={createTimezone}
					required
					placeholder="Asia/Yangon"
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="cfg-locale">
				<span class="label-text mb-1">
					Language<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span
					>
				</span>
				<input
					id="cfg-locale"
					name="locale"
					class="input-bordered input w-full cursor-text"
					value="en"
					required
					placeholder="en or en-US"
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="cfg-date">
				<span class="label-text mb-1">Date format</span>
				<SearchSelect
					id="cfg-date"
					name="dateFormat"
					options={createDateOptions}
					bind:value={createDateFormat}
					placeholder="Search date format..."
					filterPlaceholder="Search date format..."
					ariaLabel="Date format"
					mono
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="cfg-time">
				<span class="label-text mb-1">Time format</span>
				<SearchSelect
					id="cfg-time"
					name="timeFormat"
					options={createTimeOptions}
					bind:value={createTimeFormat}
					placeholder="Search time format..."
					filterPlaceholder="Search time format..."
					ariaLabel="Time format"
					mono
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="cfg-currency">
				<span class="label-text mb-1">Currency</span>
				<SearchSelect
					id="cfg-currency"
					name="currency"
					options={currencyOptions}
					bind:value={createCurrency}
					placeholder="Search currency..."
					filterPlaceholder="Search currency..."
					ariaLabel="Currency"
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
					Create config
				</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button type="submit" class="cursor-pointer" aria-label="Close">close</button>
	</form>
</dialog>

<dialog bind:this={editDialog} class="modal">
	<div class="modal-box w-11/12 max-w-lg border border-base-300 bg-base-100 shadow-sm">
		<h2 class="card-title font-bold text-secondary">Edit config</h2>
		{#if editRow}
			<form
				method="POST"
				action="?/updateConfig"
				class="mt-4 flex flex-col gap-3"
				use:enhance={bindSubmitting(
					(v) => (editing = v),
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') closeEdit();
					}
				)}
			>
				<input type="hidden" name="id" value={editRow.id} />
				<label class="form-control flex w-full flex-col" for="edit-cfg-name">
					<span class="label-text mb-1">
						Name<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span>
					</span>
					<input
						id="edit-cfg-name"
						name="name"
						class="input-bordered input w-full cursor-text"
						value={editRow.name}
						required
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-cfg-tz">
					<span class="label-text mb-1">
						Timezone<span class="align-top text-sm leading-none text-error" aria-hidden="true"
							>*</span
						>
					</span>
					<TimezoneSearchSelect
						id="edit-cfg-tz"
						name="timezone"
						bind:value={editTimezone}
						required
						placeholder="Asia/Yangon"
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-cfg-locale">
					<span class="label-text mb-1">
						Language<span class="align-top text-sm leading-none text-error" aria-hidden="true"
							>*</span
						>
					</span>
					<input
						id="edit-cfg-locale"
						name="locale"
						class="input-bordered input w-full cursor-text"
						value={editRow.locale}
						required
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-cfg-date">
					<span class="label-text mb-1">Date format</span>
					<SearchSelect
						id="edit-cfg-date"
						name="dateFormat"
						options={editDateOptions}
						bind:value={editDateFormat}
						placeholder="Search date format..."
						filterPlaceholder="Search date format..."
						ariaLabel="Date format"
						mono
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-cfg-time">
					<span class="label-text mb-1">Time format</span>
					<SearchSelect
						id="edit-cfg-time"
						name="timeFormat"
						options={editTimeOptions}
						bind:value={editTimeFormat}
						placeholder="Search time format..."
						filterPlaceholder="Search time format..."
						ariaLabel="Time format"
						mono
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-cfg-currency">
					<span class="label-text mb-1">Currency</span>
					<SearchSelect
						id="edit-cfg-currency"
						name="currency"
						options={editCurrencyOptions}
						bind:value={editCurrency}
						placeholder="Search currency..."
						filterPlaceholder="Search currency..."
						ariaLabel="Currency"
					/>
				</label>
				<div class="modal-action mt-2 justify-end">
					<button
						type="button"
						class="btn btn-ghost"
						class:cursor-pointer={!editing}
						class:cursor-not-allowed={editing}
						onclick={closeEdit}
						disabled={editing}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn btn-secondary"
						class:cursor-pointer={!editing}
						class:cursor-not-allowed={editing}
						class:btn-disabled={editing}
						class:loading={editing}
						disabled={editing}
						aria-busy={editing}
					>
						Save changes
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
	<div class="modal-box w-11/12 max-w-md border border-base-300 bg-base-100 shadow-sm">
		<h2 class="card-title font-bold text-error">Delete config</h2>
		{#if deleteRow}
			<p class="text-ink-muted mt-2 text-sm">
				Delete <span class="font-medium text-base-content">{deleteRow.name}</span>? Businesses using
				it keep their copied timezone and locale.
			</p>
			<form
				method="POST"
				action="?/deleteConfig"
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
					Delete
				</button>
			</form>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button type="submit" class="cursor-pointer" aria-label="Close">close</button>
	</form>
</dialog>
