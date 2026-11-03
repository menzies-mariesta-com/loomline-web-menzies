<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Ban,
		CircleCheck,
		CircleX,
		ExternalLink,
		KeyRound,
		Monitor,
		Pencil,
		Plus,
		Power,
		RefreshCw,
		Tablet,
		Trash2
	} from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import ToastDismissButton from '#lib/component/own/local/private/ToastDismissButton.svelte';
	import IconActionTip from '#lib/component/wash/tooltip/IconActionTip.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';

	let { data, form } = $props();

	type DeviceRow = (typeof data.devices)[number];

	let creating = $state(false);
	let editing = $state(false);
	let deleting = $state(false);
	let revokingId = $state<string | null>(null);
	let regeneratingId = $state<string | null>(null);
	let refreshing = $state(false);
	let createDialog = $state<HTMLDialogElement | null>(null);
	let editDialog = $state<HTMLDialogElement | null>(null);
	let deleteDialog = $state<HTMLDialogElement | null>(null);
	let editRow = $state<DeviceRow | null>(null);
	let deleteRow = $state<DeviceRow | null>(null);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let nameFilter = $state('');
	let typeFilter = $state('');
	let statusFilter = $state('');
	let toastGone = $state(false);

	let createSiteId = $state('');
	let createType = $state('tv');
	let createQueueIds = $state<string[]>([]);
	let createCounterId = $state('');
	let createStationEmail = $state('');
	let editSiteId = $state('');
	let editType = $state('tv');
	let editActive = $state('true');
	let editQueueIds = $state<string[]>([]);
	let editCounterId = $state('');
	let editStationEmail = $state('');

	const siteOptions = $derived(data.sites.map((s) => ({ value: s.id, label: s.name })));
	const counterOptions = $derived(
		data.counters.map((c) => ({ value: c.id, label: c.label }))
	);
	const typeOptions = [
		{ value: 'tv', label: 'TV' },
		{ value: 'kiosk', label: 'Kiosk' },
		{ value: 'agent', label: 'Agent' }
	];
	const statusOptions = [
		{ value: 'true', label: 'active' },
		{ value: 'false', label: 'revoked' }
	];

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filtered = $derived(
		data.devices.filter((d) => {
			const q = nameFilter.trim().toLowerCase();
			const nameOk =
				!q ||
				d.name.toLowerCase().includes(q) ||
				d.pairingCode.toLowerCase().includes(q) ||
				(d.site?.name ?? '').toLowerCase().includes(q) ||
				(d.agentUser?.email ?? '').toLowerCase().includes(q);
			const typeOk = !typeFilter || d.type === typeFilter;
			const statusOk =
				!statusFilter ||
				(statusFilter === 'true' ? d.isActive : !d.isActive);
			return nameOk && typeOk && statusOk;
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
		typeFilter;
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
		createType = 'tv';
		createQueueIds = [];
		createCounterId = '';
		createStationEmail = '';
		createDialog?.showModal();
	}

	function openEdit(row: DeviceRow) {
		editRow = row;
		editSiteId = row.siteId;
		editType = row.type;
		editActive = row.isActive ? 'true' : 'false';
		editQueueIds = [...(row.boundQueueIds ?? [])];
		editCounterId = row.boundCounterIds?.[0] ?? '';
		editStationEmail = row.agentUser?.email ?? '';
		editDialog?.showModal();
	}

	function openDelete(row: DeviceRow) {
		deleteRow = row;
		deleteDialog?.showModal();
	}

	function toggleQueue(list: string[], id: string, on: boolean) {
		if (on) return list.includes(id) ? list : [...list, id];
		return list.filter((x) => x !== id);
	}

	function typeLabel(type: string) {
		if (type === 'tv') return 'TV';
		if (type === 'kiosk') return 'Kiosk';
		if (type === 'agent') return 'Agent';
		return type;
	}
</script>

<svelte:head>
	<title>Devices | {data.business.name}</title>
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
		title="Devices"
		description="Pair TV and kiosk floor displays with a code. Agent desks use a dedicated station login (counter agent), not a public pairing link."
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
			<WashTooltip tooltipText="Pair device" className="tooltip-primary">
<button
					type="button"
					class="btn btn-ghost btn-square btn-sm btn-primary cursor-pointer"
					aria-label="Pair device"
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
					<th>Type</th>
					<th>Site</th>
					<th>Code / Station</th>
					<th>Queues</th>
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
					<th>
						<SearchSelect
							id="filter-device-type"
							name="filterType"
							size="xs"
							bind:value={typeFilter}
							allowEmpty
							emptyLabel="All"
							options={typeOptions}
							ariaLabel="Filter by type"
							class="max-w-[7rem]"
						/>
					</th>
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
					<th>
						<SearchSelect
							id="filter-device-status"
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
							No devices match these filters.
						</td>
					</tr>
				{:else}
					{#each pageRows as d, i (d.id)}
						<tr>
							<td>
								<div class="flex flex-wrap items-center gap-0.5">
									{#if d.type === 'tv'}
										<IconActionTip tip="Open TV" tone="primary">
<a
												class="btn btn-ghost btn-square btn-xs btn-primary cursor-pointer"
												href={resolve(`/display/${d.pairingCode}`)}
												target="_blank"
												rel="noopener noreferrer"
												aria-label="Open TV"
											>
												<Monitor class="size-3.5" aria-hidden="true" />
											</a>
										</IconActionTip>

									{/if}
									{#if d.type === 'kiosk'}
										<IconActionTip tip="Open kiosk" tone="primary">
<a
												class="btn btn-ghost btn-square btn-xs btn-primary cursor-pointer"
												href={resolve(`/kiosk/${d.pairingCode}`)}
												target="_blank"
												rel="noopener noreferrer"
												aria-label="Open kiosk"
											>
												<Tablet class="size-3.5" aria-hidden="true" />
											</a>
										</IconActionTip>

									{/if}
									<IconActionTip tip="Edit" tone="secondary">
<button
											type="button"
											class="btn btn-ghost btn-square btn-xs btn-secondary cursor-pointer"
											aria-label="Edit"
											onclick={() => openEdit(d)}
										>
											<Pencil class="size-3.5" aria-hidden="true" />
										</button>
									</IconActionTip>

									{#if d.type !== 'agent'}
										<form
											method="POST"
											action="?/regenerateCode"
											use:enhance={bindSubmitting((v) => (regeneratingId = v ? d.id : null))}
										>
											<input type="hidden" name="id" value={d.id} />
											<IconActionTip tip="New pairing code" tone="secondary">
<button
													type="submit"
													class="btn btn-ghost btn-square btn-xs btn-secondary"
													class:cursor-pointer={regeneratingId !== d.id}
													class:cursor-not-allowed={regeneratingId === d.id}
													class:btn-disabled={regeneratingId === d.id}
													class:loading={regeneratingId === d.id}
													aria-label="New pairing code"
													aria-busy={regeneratingId === d.id}
													disabled={regeneratingId === d.id}
												>
													{#if regeneratingId !== d.id}
														<KeyRound class="size-3.5" aria-hidden="true" />
													{/if}
												</button>
											</IconActionTip>

										</form>
									{/if}
									{#if d.isActive}
										<form
											method="POST"
											action="?/revoke"
											use:enhance={bindSubmitting((v) => (revokingId = v ? d.id : null))}
										>
											<input type="hidden" name="id" value={d.id} />
											<IconActionTip tip="Revoke" tone="error">
<button
													type="submit"
													class="btn btn-ghost btn-square btn-xs btn-error"
													class:cursor-pointer={revokingId !== d.id}
													class:cursor-not-allowed={revokingId === d.id}
													class:btn-disabled={revokingId === d.id}
													class:loading={revokingId === d.id}
													aria-label="Revoke"
													aria-busy={revokingId === d.id}
													disabled={revokingId === d.id}
												>
													{#if revokingId !== d.id}
														<Ban class="size-3.5" aria-hidden="true" />
													{/if}
												</button>
											</IconActionTip>

										</form>
									{:else}
										<form
											method="POST"
											action="?/reactivate"
											use:enhance={bindSubmitting((v) => (revokingId = v ? d.id : null))}
										>
											<input type="hidden" name="id" value={d.id} />
											<IconActionTip tip="Reactivate" tone="success">
<button
													type="submit"
													class="btn btn-ghost btn-square btn-xs btn-success"
													class:cursor-pointer={revokingId !== d.id}
													class:cursor-not-allowed={revokingId === d.id}
													class:btn-disabled={revokingId === d.id}
													class:loading={revokingId === d.id}
													aria-label="Reactivate"
													aria-busy={revokingId === d.id}
													disabled={revokingId === d.id}
												>
													{#if revokingId !== d.id}
														<Power class="size-3.5" aria-hidden="true" />
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
											onclick={() => openDelete(d)}
										>
											<Trash2 class="size-3.5" aria-hidden="true" />
										</button>
									</IconActionTip>

								</div>
							</td>
							<td>{(safePage - 1) * pageSize + i + 1}</td>
							<td class="font-medium">{d.name}</td>
							<td>
								<span class="badge badge-ghost gap-1">
									{#if d.type === 'tv'}
										<Monitor class="size-3" aria-hidden="true" />
									{:else if d.type === 'kiosk'}
										<Tablet class="size-3" aria-hidden="true" />
									{:else}
										<ExternalLink class="size-3" aria-hidden="true" />
									{/if}
									{typeLabel(d.type)}
								</span>
							</td>
							<td>{d.site?.name ?? '-'}</td>
							<td class="max-w-[12rem] truncate text-sm">
								{#if d.type === 'agent'}
									{#if d.agentUser?.email}
										<span class="block truncate" title={d.agentUser.email}
											>{d.agentUser.email}</span
										>
										{#if d.counterLabels.length}
											<span class="text-ink-muted text-xs"
												>{d.counterLabels.join(', ')}</span
											>
										{/if}
									{:else}
										<span class="text-warning text-xs">No station account</span>
									{/if}
								{:else}
									<span class="font-mono">{d.pairingCode}</span>
								{/if}
							</td>
							<td class="max-w-[10rem] truncate text-sm">
								{d.queueNames.length ? d.queueNames.join(', ') : '-'}
							</td>
							<td>
								<span
									class={d.isActive
										? washRecipes.badgeSoft('success')
										: washRecipes.badgeSoft('error')}
									>{d.isActive ? 'active' : 'revoked'}</span
								>
							</td>
							<td>{shortDateTime(d.createdAt)}</td>
							<td>{shortDateTime(d.updatedAt)}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>

		{#snippet footerStart()}
			<SearchSelect
				id="devices-page-size"
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
		<h2 class="card-title text-primary mb-4 font-bold">
			{createType === 'agent' ? 'Create agent station' : 'Pair device'}
		</h2>
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
			<label class="form-control w-full" for="device-name">
				<span class="label-text mb-1"
					>Name<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
					></span
				>
				<input
					id="device-name"
					name="name"
					class="input input-bordered w-full cursor-text"
					required
				/>
			</label>
			<label class="form-control w-full" for="device-site">
				<span class="label-text mb-1"
					>Site<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
					></span
				>
				<SearchSelect
					id="device-site"
					name="siteId"
					options={siteOptions}
					bind:value={createSiteId}
					required
					placeholder="Select site"
				/>
			</label>
			<label class="form-control w-full" for="device-type">
				<span class="label-text mb-1"
					>Type<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
					></span
				>
				<SearchSelect
					id="device-type"
					name="type"
					options={typeOptions}
					bind:value={createType}
					required
				/>
			</label>
			{#if createType === 'agent'}
				<fieldset class="border-base-300 rounded-box border p-3">
					<legend class="px-1 text-sm font-medium">Station account</legend>
					<p class="text-ink-muted mb-2 text-xs">
						Creates a counter agent login for this desk. They only see ticket calling after sign-in.
					</p>
					<label class="form-control w-full" for="device-station-email">
						<span class="label-text mb-1"
							>Email<span
								class="text-error align-top text-sm leading-none"
								aria-hidden="true">*</span
							></span
						>
						<input
							id="device-station-email"
							name="stationEmail"
							type="email"
							class="input input-bordered w-full cursor-text"
							autocomplete="off"
							bind:value={createStationEmail}
							required
						/>
					</label>
					<label class="form-control mt-2 w-full" for="device-station-password">
						<span class="label-text mb-1"
							>Password<span
								class="text-error align-top text-sm leading-none"
								aria-hidden="true">*</span
							></span
						>
						<input
							id="device-station-password"
							name="stationPassword"
							type="password"
							class="input input-bordered w-full cursor-text"
							autocomplete="new-password"
							minlength="8"
							required
						/>
					</label>
					<label class="form-control mt-2 w-full" for="device-counter">
						<span class="label-text mb-1">Bound counter (optional)</span>
						<SearchSelect
							id="device-counter"
							name="counterId"
							options={counterOptions}
							bind:value={createCounterId}
							allowEmpty
							emptyLabel="None"
							placeholder="Select counter"
						/>
					</label>
				</fieldset>
			{/if}
			{#if createType !== 'agent'}
				<fieldset class="border-base-300 rounded-box border p-3">
					<legend class="px-1 text-sm font-medium">Bound queues (optional)</legend>
					<div class="flex max-h-40 flex-col gap-1 overflow-y-auto">
						{#each data.queues as q}
							<label class="flex cursor-pointer items-center gap-2 text-sm">
								<input
									type="checkbox"
									name="queueIds"
									value={q.id}
									class="checkbox checkbox-sm"
									checked={createQueueIds.includes(q.id)}
									onchange={(e) => {
										createQueueIds = toggleQueue(
											createQueueIds,
											q.id,
											(e.currentTarget as HTMLInputElement).checked
										);
									}}
								/>
								{q.name}
							</label>
						{/each}
						{#if data.queues.length === 0}
							<p class="text-ink-muted text-xs">No queues yet.</p>
						{/if}
					</div>
				</fieldset>
			{/if}
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
					aria-busy={creating}>{createType === 'agent' ? 'Create station' : 'Pair device'}</button
				>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop"><button class="cursor-pointer">close</button></form>
</dialog>

<dialog bind:this={editDialog} class="modal">
	<div class="modal-box w-11/12 border-base-300 max-w-lg border bg-base-100 shadow-sm">
		<h2 class="card-title text-secondary mb-4 font-bold">Edit device</h2>
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
				<label class="form-control w-full" for="edit-device-name">
					<span class="label-text mb-1"
						>Name<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
						></span
					>
					<input
						id="edit-device-name"
						name="name"
						class="input input-bordered w-full cursor-text"
						value={editRow.name}
						required
					/>
				</label>
				<label class="form-control w-full" for="edit-device-site">
					<span class="label-text mb-1"
						>Site<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
						></span
					>
					<SearchSelect
						id="edit-device-site"
						name="siteId"
						options={siteOptions}
						bind:value={editSiteId}
						required
					/>
				</label>
				<label class="form-control w-full" for="edit-device-type">
					<span class="label-text mb-1"
						>Type<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
						></span
					>
					<SearchSelect
						id="edit-device-type"
						name="type"
						options={typeOptions}
						bind:value={editType}
						required
					/>
				</label>
				<label class="form-control w-full" for="edit-device-status">
					<span class="label-text mb-1">Status</span>
					<SearchSelect
						id="edit-device-status"
						name="isActive"
						options={statusOptions}
						bind:value={editActive}
					/>
				</label>
				{#if editType === 'agent'}
					<fieldset class="border-base-300 rounded-box border p-3">
						<legend class="px-1 text-sm font-medium">Station account</legend>
						{#if editRow.agentUser?.email}
							<p class="text-ink-muted mb-2 text-xs">
								Linked: <span class="font-medium text-base-content">{editRow.agentUser.email}</span>
								. Leave password blank to keep the current password.
							</p>
						{:else}
							<p class="text-warning mb-2 text-xs">
								No station account yet. Email and password are required.
							</p>
						{/if}
						<label class="form-control w-full" for="edit-device-station-email">
							<span class="label-text mb-1"
								>Email{#if !editRow.agentUserId}<span
										class="text-error align-top text-sm leading-none"
										aria-hidden="true">*</span
									>{/if}</span
							>
							<input
								id="edit-device-station-email"
								name="stationEmail"
								type="email"
								class="input input-bordered w-full cursor-text"
								autocomplete="off"
								bind:value={editStationEmail}
								required={!editRow.agentUserId}
							/>
						</label>
						<label class="form-control mt-2 w-full" for="edit-device-station-password">
							<span class="label-text mb-1"
								>Password{#if !editRow.agentUserId}<span
										class="text-error align-top text-sm leading-none"
										aria-hidden="true">*</span
									>{/if}</span
							>
							<input
								id="edit-device-station-password"
								name="stationPassword"
								type="password"
								class="input input-bordered w-full cursor-text"
								autocomplete="new-password"
								minlength="8"
								required={!editRow.agentUserId}
								placeholder={editRow.agentUserId ? 'Leave blank to keep' : ''}
							/>
						</label>
						<label class="form-control mt-2 w-full" for="edit-device-counter">
							<span class="label-text mb-1">Bound counter (optional)</span>
							<SearchSelect
								id="edit-device-counter"
								name="counterId"
								options={counterOptions}
								bind:value={editCounterId}
								allowEmpty
								emptyLabel="None"
								placeholder="Select counter"
							/>
						</label>
					</fieldset>
				{:else}
					<p class="text-ink-muted font-mono text-xs">
						Pairing code: {editRow.pairingCode} (use New pairing code in the row to rotate)
					</p>
					<fieldset class="border-base-300 rounded-box border p-3">
						<legend class="px-1 text-sm font-medium">Bound queues (optional)</legend>
						<div class="flex max-h-40 flex-col gap-1 overflow-y-auto">
							{#each data.queues as q}
								<label class="flex cursor-pointer items-center gap-2 text-sm">
									<input
										type="checkbox"
										name="queueIds"
										value={q.id}
										class="checkbox checkbox-sm"
										checked={editQueueIds.includes(q.id)}
										onchange={(e) => {
											editQueueIds = toggleQueue(
												editQueueIds,
												q.id,
												(e.currentTarget as HTMLInputElement).checked
											);
										}}
									/>
									{q.name}
								</label>
							{/each}
							{#if data.queues.length === 0}
								<p class="text-ink-muted text-xs">No queues yet.</p>
							{/if}
						</div>
					</fieldset>
				{/if}
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
		<h2 class="card-title text-error mb-2 font-bold">Delete device</h2>
		<p class="text-sm opacity-70">
			Delete <strong>{deleteRow?.name}</strong>? Pairing code
			<span class="font-mono">{deleteRow?.pairingCode}</span> will stop working.
		</p>
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
