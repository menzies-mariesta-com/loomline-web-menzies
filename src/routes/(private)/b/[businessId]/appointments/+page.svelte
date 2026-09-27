<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		Ban,
		CircleCheck,
		CircleX,
		Plus,
		RefreshCw,
		UserCheck
	} from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';

	let { data, form } = $props();

	type ApptRow = (typeof data.appointments)[number];

	let creating = $state(false);
	let checkingInId = $state<string | null>(null);
	let cancellingId = $state<string | null>(null);
	let refreshing = $state(false);
	let createDialog = $state<HTMLDialogElement | null>(null);
	let cancelDialog = $state<HTMLDialogElement | null>(null);
	let cancelRow = $state<ApptRow | null>(null);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let guestFilter = $state('');
	let statusFilter = $state('');
	let toastGone = $state(false);
	let createSiteId = $state('');
	let createServiceId = $state('');
	let createStartsAt = $state('');
	let createGuestName = $state('');
	let createPhone = $state('');
	let createDuration = $state('30');

	const siteOptions = $derived(data.sites.map((s) => ({ value: s.id, label: s.name })));
	const serviceOptions = $derived(data.services.map((s) => ({ value: s.id, label: s.name })));
	const statusOptions = [
		{ value: 'scheduled', label: 'scheduled' },
		{ value: 'checked_in', label: 'checked_in' },
		{ value: 'converted', label: 'converted' },
		{ value: 'cancelled', label: 'cancelled' },
		{ value: 'no_show', label: 'no_show' },
		{ value: 'completed', label: 'completed' }
	];

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filtered = $derived(
		data.appointments.filter((a) => {
			const q = guestFilter.trim().toLowerCase();
			const guestLabel = (a.guestName ?? a.phone ?? '').toLowerCase();
			const siteName = (a.site?.name ?? '').toLowerCase();
			const serviceName = (a.service?.name ?? '').toLowerCase();
			const guestOk =
				!q ||
				guestLabel.includes(q) ||
				siteName.includes(q) ||
				serviceName.includes(q);
			const statusOk = !statusFilter || a.status === statusFilter;
			return guestOk && statusOk;
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
		guestFilter;
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
		createStartsAt = '';
		createGuestName = '';
		createPhone = '';
		createDuration = '30';
		createDialog?.showModal();
	}

	function openCancel(row: ApptRow) {
		cancelRow = row;
		cancelDialog?.showModal();
	}

	function statusBadge(status: string) {
		if (status === 'scheduled') return washRecipes.badgeSoft('info');
		if (status === 'converted' || status === 'completed' || status === 'checked_in') {
			return washRecipes.badgeSoft('success');
		}
		if (status === 'cancelled' || status === 'no_show') return washRecipes.badgeSoft('error');
		return 'badge badge-ghost';
	}

	function guestLabel(a: ApptRow) {
		return a.guestName ?? a.phone ?? '-';
	}
</script>

<svelte:head>
	<title>Appointments | {data.business.name}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

{#if form?.message && !toastGone}
	<div class="toast toast-bottom toast-end z-[100]">
		<div
			class="alert shadow-lg"
			class:alert-success={form.success !== false}
			class:alert-error={form.success === false}
		>
			{#if form.success !== false}
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
	<DataTableShell title="Appointments" bind:bodyEl footerSummary={footerSummary}>
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
			<div class="tooltip tooltip-left tooltip-primary" data-tip="Book">
				<button
					type="button"
					class="btn btn-ghost btn-square btn-sm btn-primary cursor-pointer"
					aria-label="Book"
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
					<th>Guest</th>
					<th>Site</th>
					<th>Service</th>
					<th>Starts</th>
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
							aria-label="Filter by guest"
							bind:value={guestFilter}
						/>
					</th>
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
					<th aria-hidden="true"></th>
					<th>
						<SearchSelect
							id="filter-appt-status"
							name="filterStatus"
							size="xs"
							bind:value={statusFilter}
							allowEmpty
							emptyLabel="All"
							options={statusOptions}
							ariaLabel="Filter by status"
							class="max-w-[8rem]"
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
							No appointments match these filters.
						</td>
					</tr>
				{:else}
					{#each pageRows as a, i (a.id)}
						<tr>
							<td>
								<div class="flex items-center gap-0.5">
									{#if a.status === 'scheduled'}
										<form
											method="POST"
											action="?/checkIn"
											use:enhance={bindSubmitting((v) => {
												checkingInId = v ? a.id : null;
											})}
										>
											<input type="hidden" name="id" value={a.id} />
											<div class="tooltip tooltip-primary tooltip-right" data-tip="Check in">
												<button
													type="submit"
													class="btn btn-ghost btn-square btn-xs btn-primary"
													class:loading={checkingInId === a.id}
													disabled={checkingInId === a.id || cancellingId === a.id}
													aria-busy={checkingInId === a.id}
													aria-label="Check in"
													class:cursor-pointer={checkingInId !== a.id}
													class:cursor-not-allowed={checkingInId === a.id}
												>
													{#if checkingInId !== a.id}
														<UserCheck class="size-3.5" aria-hidden="true" />
													{/if}
												</button>
											</div>
										</form>
										<div class="tooltip tooltip-error tooltip-right" data-tip="Cancel">
											<button
												type="button"
												class="btn btn-ghost btn-square btn-xs btn-error cursor-pointer"
												aria-label="Cancel"
												onclick={() => openCancel(a)}
											>
												<Ban class="size-3.5" aria-hidden="true" />
											</button>
										</div>
									{/if}
								</div>
							</td>
							<td>{(safePage - 1) * pageSize + i + 1}</td>
							<td class="font-medium">{guestLabel(a)}</td>
							<td>{a.site?.name ?? '-'}</td>
							<td>{a.service?.name ?? '-'}</td>
							<td>{shortDateTime(a.startsAt)}</td>
							<td><span class={statusBadge(a.status)}>{a.status}</span></td>
							<td>{shortDateTime(a.createdAt)}</td>
							<td>{shortDateTime(a.updatedAt)}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>

		{#snippet footerStart()}
			<SearchSelect
				id="appointments-page-size"
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
		<h2 class="card-title text-primary mb-4 font-bold">Book appointment</h2>
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
			<label class="form-control w-full" for="appt-site">
				<span class="label-text mb-1"
					>Site<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
					></span
				>
				<SearchSelect
					id="appt-site"
					name="siteId"
					options={siteOptions}
					bind:value={createSiteId}
					required
					placeholder="Select site"
					ariaLabel="Site"
				/>
			</label>
			<label class="form-control w-full" for="appt-service">
				<span class="label-text mb-1"
					>Service<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
					></span
				>
				<SearchSelect
					id="appt-service"
					name="serviceId"
					options={serviceOptions}
					bind:value={createServiceId}
					required
					placeholder="Select service"
					ariaLabel="Service"
				/>
			</label>
			<label class="form-control w-full" for="appt-starts">
				<span class="label-text mb-1"
					>Starts<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span
					></span
				>
				<input
					id="appt-starts"
					name="startsAt"
					type="datetime-local"
					class="input input-bordered w-full cursor-text"
					bind:value={createStartsAt}
					required
				/>
			</label>
			<label class="form-control w-full" for="appt-guest">
				<span class="label-text mb-1">Guest name</span>
				<input
					id="appt-guest"
					name="guestName"
					class="input input-bordered w-full cursor-text"
					bind:value={createGuestName}
					placeholder="Optional"
				/>
			</label>
			<label class="form-control w-full" for="appt-phone">
				<span class="label-text mb-1">Phone</span>
				<input
					id="appt-phone"
					name="phone"
					class="input input-bordered w-full cursor-text"
					bind:value={createPhone}
					placeholder="Optional"
				/>
			</label>
			<label class="form-control w-full" for="appt-duration">
				<span class="label-text mb-1">Duration (minutes)</span>
				<input
					id="appt-duration"
					name="durationMinutes"
					type="number"
					class="input input-bordered w-full cursor-text"
					bind:value={createDuration}
					min="5"
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
					aria-busy={creating}>Book</button
				>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop"><button class="cursor-pointer">close</button></form>
</dialog>

<dialog bind:this={cancelDialog} class="modal">
	<div class="modal-box w-11/12 border-base-300 max-w-md border bg-base-100 shadow-sm">
		<h2 class="card-title text-error mb-2 font-bold">Cancel appointment</h2>
		<p class="text-sm opacity-70">
			Cancel appointment for <strong>{cancelRow ? guestLabel(cancelRow) : ''}</strong
			>{#if cancelRow}
				{' '}at {shortDateTime(cancelRow.startsAt)}{/if}?
		</p>
		{#if cancelRow}
			<form
				method="POST"
				action="?/cancel"
				class="modal-action"
				use:enhance={bindSubmitting(
					(v) => {
						cancellingId = v ? cancelRow?.id ?? null : null;
					},
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') cancelDialog?.close();
					}
				)}
			>
				<input type="hidden" name="id" value={cancelRow.id} />
				<button type="button" class="btn cursor-pointer" onclick={() => cancelDialog?.close()}
					>Keep</button
				>
				<button
					type="submit"
					class="btn btn-error"
					class:loading={cancellingId === cancelRow.id}
					class:btn-disabled={cancellingId === cancelRow.id}
					class:cursor-pointer={cancellingId !== cancelRow.id}
					class:cursor-not-allowed={cancellingId === cancelRow.id}
					disabled={cancellingId === cancelRow.id}
					aria-busy={cancellingId === cancelRow.id}>Cancel appointment</button
				>
			</form>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop"><button class="cursor-pointer">close</button></form>
</dialog>
