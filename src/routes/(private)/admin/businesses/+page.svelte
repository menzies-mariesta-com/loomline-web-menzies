<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import {
		Ban,
		CircleCheck,
		CircleX,
		ExternalLink,
		Logs,
		Pencil,
		Plus,
		RefreshCw,
		Trash2
	} from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import { inDateRange } from '#lib/util/date-range';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import DateRangeFilter from '#lib/component/own/local/private/data-table/DateRangeFilter.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import TimezoneSearchSelect from '#lib/component/own/local/private/TimezoneSearchSelect.svelte';
	import ToastDismissButton from '#lib/component/own/local/private/ToastDismissButton.svelte';
	import { PAID_PLAN_OPTIONS, TRIAL_DURATION_OPTIONS, planKeyLabel } from '#lib/tool/plans';
	import IconActionTip from '#lib/component/wash/tooltip/IconActionTip.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';
	import ShortcutTarget from '#lib/component/own/local/keyboard/ShortcutTarget.svelte';
	import { registerDataTableHeaderShortcuts } from '#lib/keyboard/page-table-shortcuts';
	import { m } from '#lib/paraglide/messages';
	import { buildCrudRowActions } from '#lib/keyboard/table-actions';
	import WashActionKbd from '#lib/component/own/local/keyboard/WashActionKbd.svelte';

	const statusOptions = [
		{ value: 'active', label: 'active' },
		{ value: 'suspended', label: 'suspended' },
		{ value: 'pending', label: 'pending' },
		{ value: 'inactive', label: 'inactive' },
		{ value: 'trial_expired', label: 'trial_expired' }
	];

	const planOptions = PAID_PLAN_OPTIONS;
	const trialDurationOptions = TRIAL_DURATION_OPTIONS.map((o) => ({
		value: o.value,
		label: o.label
	}));
	const accessKindOptions = [
		{ value: 'plan', label: 'Paid plan (Cloud / On-premise)' },
		{ value: 'trial', label: 'Trial' }
	];

	let { data, form } = $props();

	type BusinessRow = (typeof data.businesses)[number];

	let creating = $state(false);
	let editing = $state(false);
	let deleting = $state(false);
	let refreshing = $state(false);
	let createDialog = $state<HTMLDialogElement | null>(null);
	let editDialog = $state<HTMLDialogElement | null>(null);
	let deleteDialog = $state<HTMLDialogElement | null>(null);
	let editRow = $state<BusinessRow | null>(null);
	let deleteRow = $state<BusinessRow | null>(null);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let nameFilter = $state('');
	let templateFilter = $state('');
	let configFilter = $state('');
	let statusFilter = $state('');
	let planFilter = $state('');
	let createdRange = $state('');
	let updatedRange = $state('');
	let toastGone = $state(false);
	let busyId = $state<string | null>(null);
	let imagePreview = $state<string | null>(null);
	let editImagePreview = $state<string | null>(null);
	let createTimezoneOverride = $state('');
	let createTemplateId = $state('');
	let createConfigId = $state('');
	let createAccessKind = $state('plan');
	let createPlanKey = $state('cloud_starter');
	let createTrialDuration = $state('7d');
	let editTimezone = $state('');
	let editTemplateId = $state('');
	let editConfigId = $state('');
	let editStatus = $state('active');
	let editAccessKind = $state('plan');
	let editPlanKey = $state('cloud_starter');
	let editTrialDuration = $state('7d');

	const templateOptions = $derived(data.templates.map((t) => ({ value: t.id, label: t.name })));
	const configOptions = $derived(
		data.configs.map((c) => ({ value: c.id, label: `${c.name} (${c.timezone})` }))
	);

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filtered = $derived(
		data.businesses.filter((b) => {
			const q = nameFilter.trim().toLowerCase();
			const nameOk = !q || b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
			const templateQ = templateFilter.trim().toLowerCase();
			const templateName = b.industryPack?.name ?? '';
			const templateOk = !templateQ || templateName.toLowerCase().includes(templateQ);
			const configQ = configFilter.trim().toLowerCase();
			const configName = b.config?.name ?? '';
			const configOk = !configQ || configName.toLowerCase().includes(configQ);
			const statusOk = !statusFilter || b.status === statusFilter;
			const planQ = planFilter.trim().toLowerCase();
			const planLabel = planKeyLabel(b.planKey).toLowerCase();
			const planOk =
				!planQ || (b.planKey ?? '').toLowerCase().includes(planQ) || planLabel.includes(planQ);
			const createdOk = inDateRange(b.createdAt, createdRange);
			const updatedOk = inDateRange(b.updatedAt, updatedRange);
			return nameOk && templateOk && configOk && statusOk && planOk && createdOk && updatedOk;
		})
	);

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const safePage = $derived(Math.min(page, totalPages));
	const pageRows = $derived(filtered.slice((safePage - 1) * pageSize, safePage * pageSize));

	let keyboardRowIndex = $state<number | null>(null);
	const tableRowActions = $derived(
		buildCrudRowActions({
			onEdit: openEdit,
			onDelete: openDelete,
			onView: (row) => void goto(`/b/${row.id}`)
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

	function statusBadge(status: string) {
		if (status === 'active') return washRecipes.badgeSoft('success');
		if (status === 'suspended') return washRecipes.badgeSoft('error');
		if (status === 'pending') return washRecipes.badgeSoft('warning');
		if (status === 'inactive' || status === 'trial_expired') return 'badge badge-ghost';
		return 'badge badge-ghost';
	}

	function openCreate() {
		createTimezoneOverride = '';
		createTemplateId = data.templates[0]?.id ?? '';
		createConfigId = '';
		createAccessKind = 'plan';
		createPlanKey = 'cloud_starter';
		createTrialDuration = '7d';
		createDialog?.showModal();
	}

	function closeCreate() {
		createDialog?.close();
		if (imagePreview) {
			URL.revokeObjectURL(imagePreview);
			imagePreview = null;
		}
	}

	function openEdit(row: BusinessRow) {
		editRow = row;
		editTimezone = row.timezone ?? '';
		editTemplateId = row.industryPackId ?? '';
		editConfigId = row.configId ?? '';
		editStatus = row.status;
		editAccessKind = row.planKey === 'trial' ? 'trial' : 'plan';
		editPlanKey = row.planKey && row.planKey !== 'trial' ? row.planKey : 'cloud_starter';
		editTrialDuration = row.trialDuration ?? '7d';
		if (editImagePreview) {
			URL.revokeObjectURL(editImagePreview);
			editImagePreview = null;
		}
		editDialog?.showModal();
	}

	function closeEdit() {
		editDialog?.close();
		editRow = null;
		if (editImagePreview) {
			URL.revokeObjectURL(editImagePreview);
			editImagePreview = null;
		}
	}

	function openDelete(row: BusinessRow) {
		deleteRow = row;
		deleteDialog?.showModal();
	}

	function closeDelete() {
		deleteDialog?.close();
		deleteRow = null;
	}

	function onImageChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (imagePreview) URL.revokeObjectURL(imagePreview);
		imagePreview = file ? URL.createObjectURL(file) : null;
	}

	function onEditImageChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (editImagePreview) URL.revokeObjectURL(editImagePreview);
		editImagePreview = file ? URL.createObjectURL(file) : null;
	}

	async function handleRefresh() {
		if (refreshing) return;
		refreshing = true;
		try {
			nameFilter = '';
			templateFilter = '';
			configFilter = '';
			statusFilter = '';
			planFilter = '';
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
		templateFilter;
		configFilter;
		statusFilter;
		planFilter;
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
		const off = registerDataTableHeaderShortcuts('admin-businesses', {
			onRefresh: () => void handleRefresh(),
			refreshDisabled: () => refreshing,
			onNew: openCreate
		});
		return off;
	});
</script>

<svelte:head>
	<title>Businesses | NextUp Admin</title>
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
		title="Businesses"
		bind:bodyEl
		{footerSummary}
		keyboardRows={pageRows}
		rowActions={tableRowActions}
		tableId="admin-businesses"
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
					<th>Plan</th>
					<th>Template</th>
					<th>Config</th>
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
							aria-label="Filter by name or slug"
							bind:value={nameFilter}
						/>
					</th>
					<th>
						<input
							type="text"
							class="input-bordered input w-full max-w-[8rem] cursor-text input-xs"
							placeholder="Filter…"
							aria-label="Filter by plan"
							bind:value={planFilter}
						/>
					</th>
					<th>
						<input
							type="text"
							class="input-bordered input w-full max-w-[8rem] cursor-text input-xs"
							placeholder="Filter…"
							aria-label="Filter by template"
							bind:value={templateFilter}
						/>
					</th>
					<th>
						<input
							type="text"
							class="input-bordered input w-full max-w-[8rem] cursor-text input-xs"
							placeholder="Filter…"
							aria-label="Filter by config"
							bind:value={configFilter}
						/>
					</th>
					<th>
						<SearchSelect
							id="filter-business-status"
							name="filterStatus"
							size="xs"
							bind:value={statusFilter}
							allowEmpty
							emptyLabel="All"
							options={[
								{ value: 'active', label: 'active' },
								{ value: 'suspended', label: 'suspended' },
								{ value: 'pending', label: 'pending' },
								{ value: 'inactive', label: 'inactive' },
								{ value: 'trial_expired', label: 'trial_expired' }
							]}
							ariaLabel="Filter by status"
							class="max-w-[7rem]"
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
						<td colspan="9" class="text-ink-muted py-10 text-center text-sm">
							No businesses match these filters.
						</td>
					</tr>
				{:else}
					{#each pageRows as b, i (b.id)}
						<tr
							data-kbd-row-id={b.id}
							data-kbd-row-slot={String(i + 1)}
							data-kbd-row-focus={keyboardRowIndex === i ? 'true' : undefined}
						>
							<td>
								<div class="flex items-center gap-0.5">
									<WashActionKbd key="e">
										<WashActionKbd key="e">
											<IconActionTip tip="Edit" tone="secondary">
												<button
													type="button"
													class="btn btn-square cursor-pointer btn-ghost btn-secondary btn-xs"
													aria-label="Edit"
													onclick={() => openEdit(b)}
												>
													<Pencil class="size-3.5" aria-hidden="true" />
												</button>
											</IconActionTip>
										</WashActionKbd>
									</WashActionKbd>

									<WashActionKbd key="d">
										<WashActionKbd key="d">
											<IconActionTip tip="Delete" tone="error">
												<button
													type="button"
													class="btn btn-square cursor-pointer btn-ghost btn-error btn-xs"
													aria-label="Delete"
													onclick={() => openDelete(b)}
												>
													<Trash2 class="size-3.5" aria-hidden="true" />
												</button>
											</IconActionTip>
										</WashActionKbd>
									</WashActionKbd>

									<WashActionKbd key="v">
										<IconActionTip tip="Open console" tone="primary">
											<a
												class="btn btn-square cursor-pointer btn-ghost btn-primary btn-xs"
												href={`/b/${b.id}`}
												aria-label="Open console"
											>
												<ExternalLink class="size-3.5" aria-hidden="true" />
											</a>
										</IconActionTip>
									</WashActionKbd>

									<IconActionTip tip="View logs" tone="info">
										<a
											class="btn btn-square cursor-pointer btn-ghost btn-info btn-xs"
											href={`/b/${b.id}/logs`}
											aria-label="View logs"
										>
											<Logs class="size-3.5" aria-hidden="true" />
										</a>
									</IconActionTip>

									{#if b.status === 'active'}
										<form
											method="POST"
											action="?/suspendBusiness"
											use:enhance={bindSubmitting(
												(v) => (busyId = v ? b.id : null),
												async ({ update }) => {
													await update();
												}
											)}
										>
											<input type="hidden" name="businessId" value={b.id} />
											<IconActionTip tip="Suspend" tone="warning">
												<button
													type="submit"
													class="btn btn-square btn-ghost btn-warning btn-xs"
													class:cursor-pointer={busyId !== b.id}
													class:cursor-not-allowed={busyId === b.id}
													class:loading={busyId === b.id}
													disabled={busyId === b.id}
													aria-busy={busyId === b.id}
													aria-label="Suspend"
												>
													{#if busyId !== b.id}
														<Ban class="size-3.5" aria-hidden="true" />
													{/if}
												</button>
											</IconActionTip>
										</form>
									{:else}
										<form
											method="POST"
											action="?/activateBusiness"
											use:enhance={bindSubmitting(
												(v) => (busyId = v ? b.id : null),
												async ({ update }) => {
													await update();
												}
											)}
										>
											<input type="hidden" name="businessId" value={b.id} />
											<IconActionTip tip="Activate" tone="success">
												<button
													type="submit"
													class="btn btn-square btn-ghost btn-success btn-xs"
													class:cursor-pointer={busyId !== b.id}
													class:cursor-not-allowed={busyId === b.id}
													class:loading={busyId === b.id}
													disabled={busyId === b.id}
													aria-busy={busyId === b.id}
													aria-label="Activate"
												>
													{#if busyId !== b.id}
														<CircleCheck class="size-3.5" aria-hidden="true" />
													{/if}
												</button>
											</IconActionTip>
										</form>
									{/if}
								</div>
							</td>
							<td>{(safePage - 1) * pageSize + i + 1}</td>
							<td>
								<div class="flex items-center gap-2">
									{#if b.imageUrl}
										<img
											src={b.imageUrl}
											alt=""
											class="size-8 shrink-0 rounded-md object-cover"
											width="32"
											height="32"
										/>
									{/if}
									<div class="min-w-0">
										<div class="font-medium">{b.name}</div>
										<div class="text-ink-muted text-xs">{b.slug}</div>
									</div>
								</div>
							</td>
							<td>
								<div class="min-w-0">
									<div class="text-sm">{planKeyLabel(b.planKey)}</div>
									{#if b.planKey === 'trial' && b.trialDuration}
										<div class="text-ink-muted text-xs">{b.trialDuration}</div>
									{/if}
								</div>
							</td>
							<td>{b.industryPack?.name ?? '-'}</td>
							<td>{b.config?.name ?? '-'}</td>
							<td><span class={statusBadge(b.status)}>{b.status}</span></td>
							<td class="text-ink-muted text-sm whitespace-nowrap">{shortDateTime(b.createdAt)}</td>
							<td class="text-ink-muted text-sm whitespace-nowrap">{shortDateTime(b.updatedAt)}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>

		{#snippet footerStart()}
			<label class="text-ink-muted flex min-w-0 items-center gap-1.5 text-xs">
				<span>Per page</span>
				<SearchSelect
					id="businesses-page-size"
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
		<h2 class="card-title font-bold text-primary">Add business</h2>
		<form
			method="POST"
			action="?/createBusiness"
			enctype="multipart/form-data"
			class="mt-4 flex flex-col gap-3"
			use:enhance={bindSubmitting(
				(v) => (creating = v),
				async ({ result, update }) => {
					await update();
					if (result.type === 'success') closeCreate();
				}
			)}
		>
			<label class="form-control flex w-full flex-col" for="biz-name">
				<span class="label-text mb-1">
					Name<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span>
				</span>
				<input id="biz-name" name="name" class="input-bordered input w-full cursor-text" required />
			</label>
			<label class="form-control flex w-full flex-col" for="biz-manager-email">
				<span class="label-text mb-1">
					Manager email<span class="align-top text-sm leading-none text-error" aria-hidden="true"
						>*</span
					>
				</span>
				<input
					id="biz-manager-email"
					name="managerEmail"
					type="email"
					autocomplete="email"
					class="input-bordered input w-full cursor-text"
					required
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="biz-access-kind">
				<span class="label-text mb-1">
					Access<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span>
				</span>
				<SearchSelect
					id="biz-access-kind"
					name="accessKind"
					options={accessKindOptions}
					bind:value={createAccessKind}
					required
					placeholder="Select access..."
					filterPlaceholder="Search..."
					ariaLabel="Access kind"
				/>
			</label>
			{#if createAccessKind === 'trial'}
				<label class="form-control flex w-full flex-col" for="biz-trial-duration">
					<span class="label-text mb-1">
						Trial duration<span class="align-top text-sm leading-none text-error" aria-hidden="true"
							>*</span
						>
					</span>
					<SearchSelect
						id="biz-trial-duration"
						name="trialDuration"
						options={trialDurationOptions}
						bind:value={createTrialDuration}
						required
						placeholder="Select duration..."
						filterPlaceholder="Search..."
						ariaLabel="Trial duration"
					/>
				</label>
			{:else}
				<label class="form-control flex w-full flex-col" for="biz-plan-key">
					<span class="label-text mb-1">
						Plan<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span>
					</span>
					<SearchSelect
						id="biz-plan-key"
						name="planKey"
						options={planOptions}
						bind:value={createPlanKey}
						required
						placeholder="Select plan..."
						filterPlaceholder="Search plans..."
						ariaLabel="Plan"
					/>
				</label>
			{/if}
			<label class="form-control flex w-full flex-col" for="biz-image">
				<span class="label-text mb-1">Organization image</span>
				<input
					id="biz-image"
					name="image"
					type="file"
					accept="image/jpeg,image/png,image/webp,image/gif"
					class="file-input-bordered file-input w-full cursor-pointer"
					onchange={onImageChange}
				/>
				{#if imagePreview}
					<img
						src={imagePreview}
						alt=""
						class="mt-2 size-16 rounded-md object-cover"
						width="64"
						height="64"
					/>
				{/if}
			</label>
			<label class="form-control flex w-full flex-col" for="biz-template">
				<span class="label-text mb-1">
					Template<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span
					>
				</span>
				<SearchSelect
					id="biz-template"
					name="industryPackId"
					options={templateOptions}
					bind:value={createTemplateId}
					required
					placeholder="Select template..."
					filterPlaceholder="Search templates..."
					ariaLabel="Template"
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="biz-config">
				<span class="label-text mb-1">Config</span>
				<SearchSelect
					id="biz-config"
					name="configId"
					options={configOptions}
					bind:value={createConfigId}
					allowEmpty
					emptyLabel="None"
					placeholder="Select config..."
					filterPlaceholder="Search configs..."
					ariaLabel="Config"
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="biz-tz">
				<span class="label-text mb-1">Timezone override</span>
				<TimezoneSearchSelect
					id="biz-tz"
					name="timezone"
					bind:value={createTimezoneOverride}
					allowEmpty
					emptyLabel="None (use config)"
					placeholder="Leave blank to use config"
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
					Create business
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
		<h2 class="card-title font-bold text-secondary">Edit business</h2>
		{#if editRow}
			<p class="text-ink-muted mt-1 text-sm">
				Slug <code class="text-xs">{editRow.slug}</code> is fixed. Manager invites are managed on Invites.
			</p>
			<form
				method="POST"
				action="?/updateBusiness"
				enctype="multipart/form-data"
				class="mt-4 flex flex-col gap-3"
				use:enhance={bindSubmitting(
					(v) => (editing = v),
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') closeEdit();
					}
				)}
			>
				<input type="hidden" name="businessId" value={editRow.id} />
				<label class="form-control flex w-full flex-col" for="edit-biz-name">
					<span class="label-text mb-1">
						Name<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span>
					</span>
					<input
						id="edit-biz-name"
						name="name"
						class="input-bordered input w-full cursor-text"
						value={editRow.name}
						required
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-biz-image">
					<span class="label-text mb-1">Organization image</span>
					<input
						id="edit-biz-image"
						name="image"
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif"
						class="file-input-bordered file-input w-full cursor-pointer"
						onchange={onEditImageChange}
					/>
					{#if editImagePreview}
						<img
							src={editImagePreview}
							alt=""
							class="mt-2 size-16 rounded-md object-cover"
							width="64"
							height="64"
						/>
					{:else if editRow.imageUrl}
						<img
							src={editRow.imageUrl}
							alt=""
							class="mt-2 size-16 rounded-md object-cover"
							width="64"
							height="64"
						/>
					{/if}
				</label>
				<label class="form-control flex w-full flex-col" for="edit-biz-template">
					<span class="label-text mb-1">Template</span>
					<SearchSelect
						id="edit-biz-template"
						name="industryPackId"
						options={templateOptions}
						bind:value={editTemplateId}
						allowEmpty
						emptyLabel="None"
						placeholder="Select template..."
						filterPlaceholder="Search templates..."
						ariaLabel="Template"
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-biz-config">
					<span class="label-text mb-1">Config</span>
					<SearchSelect
						id="edit-biz-config"
						name="configId"
						options={configOptions}
						bind:value={editConfigId}
						allowEmpty
						emptyLabel="None"
						placeholder="Select config..."
						filterPlaceholder="Search configs..."
						ariaLabel="Config"
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-biz-tz">
					<span class="label-text mb-1">Timezone</span>
					<TimezoneSearchSelect
						id="edit-biz-tz"
						name="timezone"
						bind:value={editTimezone}
						allowEmpty
						emptyLabel="Keep current"
						placeholder="Timezone"
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-biz-status">
					<span class="label-text mb-1">
						Status<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span
						>
					</span>
					<SearchSelect
						id="edit-biz-status"
						name="status"
						options={statusOptions}
						bind:value={editStatus}
						required
						placeholder="Select status..."
						filterPlaceholder="Search status..."
						ariaLabel="Status"
					/>
				</label>
				<label class="form-control flex w-full flex-col" for="edit-biz-access-kind">
					<span class="label-text mb-1">
						Access<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span
						>
					</span>
					<SearchSelect
						id="edit-biz-access-kind"
						name="accessKind"
						options={accessKindOptions}
						bind:value={editAccessKind}
						required
						placeholder="Select access..."
						filterPlaceholder="Search..."
						ariaLabel="Access kind"
					/>
				</label>
				{#if editAccessKind === 'trial'}
					<label class="form-control flex w-full flex-col" for="edit-biz-trial-duration">
						<span class="label-text mb-1">
							Trial duration<span
								class="align-top text-sm leading-none text-error"
								aria-hidden="true">*</span
							>
						</span>
						<SearchSelect
							id="edit-biz-trial-duration"
							name="trialDuration"
							options={trialDurationOptions}
							bind:value={editTrialDuration}
							required
							placeholder="Select duration..."
							filterPlaceholder="Search..."
							ariaLabel="Trial duration"
						/>
					</label>
				{:else}
					<label class="form-control flex w-full flex-col" for="edit-biz-plan">
						<span class="label-text mb-1">
							Plan<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span
							>
						</span>
						<SearchSelect
							id="edit-biz-plan"
							name="planKey"
							options={planOptions}
							bind:value={editPlanKey}
							required
							placeholder="Select plan..."
							filterPlaceholder="Search plans..."
							ariaLabel="Plan"
						/>
					</label>
				{/if}
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
		<h2 class="card-title font-bold text-error">Delete business</h2>
		{#if deleteRow}
			<p class="text-ink-muted mt-2 text-sm">
				Permanently delete <span class="font-medium text-base-content">{deleteRow.name}</span>?
				Memberships, sites, tickets, and related rows will be removed. Prefer Suspend to keep data.
			</p>
			<form
				method="POST"
				action="?/deleteBusiness"
				class="modal-action justify-end"
				use:enhance={bindSubmitting(
					(v) => (deleting = v),
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') closeDelete();
					}
				)}
			>
				<input type="hidden" name="businessId" value={deleteRow.id} />
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
