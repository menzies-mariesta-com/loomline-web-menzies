<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { CircleCheck, CircleX, Pencil, Plus, RefreshCw } from '@lucide/svelte';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import { inDateRange } from '#lib/util/date-range';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import DateRangeFilter from '#lib/component/own/local/private/data-table/DateRangeFilter.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import ToastDismissButton from '#lib/component/own/local/private/ToastDismissButton.svelte';
	import IconActionTip from '#lib/component/wash/tooltip/IconActionTip.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';

	type TemplateRow = {
		id: string;
		name: string;
		slug: string;
		description: string | null;
		version: string;
		config: Record<string, unknown> | null;
		createdAt: Date;
		updatedAt: Date;
	};

	const queueStrategyOptions = [
		{ value: 'fifo', label: 'FIFO' },
		{ value: 'priority', label: 'Priority' },
		{ value: 'appointment_first', label: 'Appointment first' }
	];

	let { data, form } = $props();

	let creating = $state(false);
	let editing = $state(false);
	let refreshing = $state(false);
	let createDialog = $state<HTMLDialogElement | null>(null);
	let editDialog = $state<HTMLDialogElement | null>(null);
	let editRow = $state<TemplateRow | null>(null);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let nameFilter = $state('');
	let slugFilter = $state('');
	let createdRange = $state('');
	let updatedRange = $state('');
	let toastGone = $state(false);
	let createQueueStrategy = $state('fifo');
	let editQueueStrategy = $state('fifo');

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filtered = $derived(
		data.templates.filter((t) => {
			const nameOk =
				!nameFilter.trim() || t.name.toLowerCase().includes(nameFilter.trim().toLowerCase());
			const slugOk =
				!slugFilter.trim() || t.slug.toLowerCase().includes(slugFilter.trim().toLowerCase());
			const createdOk = inDateRange(t.createdAt, createdRange);
			const updatedOk = inDateRange(t.updatedAt, updatedRange);
			return nameOk && slugOk && createdOk && updatedOk;
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

	function queueStrategyFromConfig(config: Record<string, unknown> | null | undefined): string {
		const v = config?.queueStrategyDefault;
		if (v === 'priority' || v === 'appointment_first' || v === 'fifo') return v;
		return 'fifo';
	}

	function openCreate() {
		createQueueStrategy = 'fifo';
		createDialog?.showModal();
	}
	function closeCreate() {
		createDialog?.close();
	}
	function openEdit(row: TemplateRow) {
		editRow = row;
		editQueueStrategy = queueStrategyFromConfig(row.config);
		editDialog?.showModal();
	}
	function closeEdit() {
		editDialog?.close();
		editRow = null;
	}

	async function handleRefresh() {
		if (refreshing) return;
		refreshing = true;
		try {
			nameFilter = '';
			slugFilter = '';
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
		slugFilter;
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
	<title>Templates | NextUp Admin</title>
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

	<DataTableShell title="Templates" bind:bodyEl footerSummary={footerSummary}>
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
					<th>Slug</th>
					<th>Version</th>
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
					<th>
						<input
							type="text"
							class="input input-xs input-bordered w-full max-w-[8rem] cursor-text"
							placeholder="Filter…"
							aria-label="Filter by slug"
							bind:value={slugFilter}
						/>
					</th>
					<th aria-hidden="true"></th>
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
							No templates match these filters.
						</td>
					</tr>
				{:else}
					{#each pageRows as t, i (t.id)}
						<tr>
							<td>
								<IconActionTip tip="Edit" tone="secondary">
<button
										type="button"
										class="btn btn-ghost btn-square btn-xs btn-secondary cursor-pointer"
										aria-label="Edit"
										onclick={() => openEdit(t)}
									>
										<Pencil class="size-3.5" aria-hidden="true" />
									</button>
								</IconActionTip>

							</td>
							<td>{(safePage - 1) * pageSize + i + 1}</td>
							<td>
								<div class="font-medium">{t.name}</div>
								{#if t.description}
									<div class="text-ink-muted text-xs">{t.description}</div>
								{/if}
							</td>
							<td><code class="text-xs">{t.slug}</code></td>
							<td>{t.version}</td>
							<td class="text-ink-muted whitespace-nowrap text-sm"
								>{shortDateTime(t.createdAt)}</td
							>
							<td class="text-ink-muted whitespace-nowrap text-sm"
								>{shortDateTime(t.updatedAt)}</td
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
					id="templates-page-size"
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

<dialog bind:this={createDialog} class="modal">
	<div class="modal-box w-11/12 border-base-300 max-w-lg border bg-base-100 shadow-sm">
		<h2 class="card-title text-primary font-bold">Add template</h2>
		<form
			method="POST"
			action="?/createTemplate"
			class="mt-4 flex flex-col gap-3"
			use:enhance={bindSubmitting((v) => (creating = v), async ({ result, update }) => {
				await update();
				if (result.type === 'success') closeCreate();
			})}
		>
			<label class="form-control flex w-full flex-col" for="tpl-name">
				<span class="label-text mb-1">
					Name<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span>
				</span>
				<input
					id="tpl-name"
					name="name"
					class="input input-bordered w-full cursor-text"
					required
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="tpl-slug">
				<span class="label-text mb-1">
					Slug<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span>
				</span>
				<input
					id="tpl-slug"
					name="slug"
					class="input input-bordered w-full cursor-text"
					placeholder="clinic-queue"
					required
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="tpl-description">
				<span class="label-text mb-1">Description</span>
				<textarea
					id="tpl-description"
					name="description"
					class="textarea textarea-bordered w-full cursor-text"
					rows="2"
				></textarea>
			</label>
			<label class="form-control flex w-full flex-col" for="tpl-version">
				<span class="label-text mb-1">Version</span>
				<input
					id="tpl-version"
					name="version"
					class="input input-bordered w-full cursor-text"
					value="1.0.0"
					placeholder="1.0.0"
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="tpl-queue">
				<span class="label-text mb-1">Default queue strategy</span>
				<SearchSelect
					id="tpl-queue"
					name="queueStrategy"
					options={queueStrategyOptions}
					bind:value={createQueueStrategy}
					placeholder="Select strategy..."
					filterPlaceholder="Search strategy..."
					ariaLabel="Default queue strategy"
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
					Create template
				</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button type="submit" class="cursor-pointer" aria-label="Close">close</button>
	</form>
</dialog>

<dialog bind:this={editDialog} class="modal">
	<div class="modal-box w-11/12 border-base-300 max-w-lg border bg-base-100 shadow-sm">
		<h2 class="card-title text-secondary font-bold">Edit template</h2>
		{#if editRow}
			<form
				method="POST"
				action="?/updateTemplate"
				class="mt-4 flex flex-col gap-3"
				use:enhance={bindSubmitting((v) => (editing = v), async ({ result, update }) => {
					await update();
					if (result.type === 'success') closeEdit();
				})}
			>
				<input type="hidden" name="id" value={editRow.id} />
				<label class="form-control flex w-full flex-col" for="edit-tpl-name">
					<span class="label-text mb-1">
						Name<span class="text-error align-top text-sm leading-none" aria-hidden="true"
							>*</span
						>
					</span>
					<input
						id="edit-tpl-name"
						name="name"
						class="input input-bordered w-full cursor-text"
						value={editRow.name}
						required
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-tpl-slug">
					<span class="label-text mb-1">
						Slug<span class="text-error align-top text-sm leading-none" aria-hidden="true"
							>*</span
						>
					</span>
					<input
						id="edit-tpl-slug"
						name="slug"
						class="input input-bordered w-full cursor-text"
						value={editRow.slug}
						required
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-tpl-description">
					<span class="label-text mb-1">Description</span>
					<textarea
						id="edit-tpl-description"
						name="description"
						class="textarea textarea-bordered w-full cursor-text"
						rows="2">{editRow.description ?? ''}</textarea
					>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-tpl-version">
					<span class="label-text mb-1">Version</span>
					<input
						id="edit-tpl-version"
						name="version"
						class="input input-bordered w-full cursor-text"
						value={editRow.version}
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-tpl-queue">
					<span class="label-text mb-1">Default queue strategy</span>
					<SearchSelect
						id="edit-tpl-queue"
						name="queueStrategy"
						options={queueStrategyOptions}
						bind:value={editQueueStrategy}
						placeholder="Select strategy..."
						filterPlaceholder="Search strategy..."
						ariaLabel="Default queue strategy"
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
