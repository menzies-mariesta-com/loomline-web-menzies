<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Ban,
		CircleCheck,
		CircleX,
		Mail,
		Plus,
		RefreshCw,
		Trash2,
		UserPlus
	} from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import { inDateRange } from '#lib/util/date-range';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import DateRangeFilter from '#lib/component/own/local/private/data-table/DateRangeFilter.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';

	let { data, form } = $props();

	type InviteRow = (typeof data.invites)[number];

	const roleOptions = [
		{ value: 'business_owner', label: 'business_owner' },
		{ value: 'manager', label: 'manager' },
		{ value: 'counter_agent', label: 'counter_agent' },
		{ value: 'guest', label: 'guest' }
	];

	let toastGone = $state(false);
	let creating = $state(false);
	let provisioningId = $state<string | null>(null);
	let busyId = $state<string | null>(null);
	let deleting = $state(false);
	let refreshing = $state(false);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let emailFilter = $state('');
	let roleFilter = $state('');
	let statusFilter = $state('');
	let businessFilter = $state('');
	let expiresRange = $state('');
	let createdRange = $state('');
	let createDialog = $state<HTMLDialogElement | null>(null);
	let provisionDialog = $state<HTMLDialogElement | null>(null);
	let deleteDialog = $state<HTMLDialogElement | null>(null);
	let provisionInviteId = $state<string | null>(null);
	let provisionEmail = $state('');
	let deleteRow = $state<InviteRow | null>(null);
	let createBusinessId = $state('');
	let createRole = $state('manager');

	const businessOptions = $derived(
		data.businesses.map((b) => ({ value: b.id, label: b.name }))
	);

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filtered = $derived(
		data.invites.filter((inv) => {
			const emailOk =
				!emailFilter.trim() ||
				inv.email.toLowerCase().includes(emailFilter.trim().toLowerCase());
			const roleOk = !roleFilter || inv.role === roleFilter;
			const statusOk = !statusFilter || inv.status === statusFilter;
			const bizName = inv.business?.name ?? '';
			const bizOk =
				!businessFilter.trim() ||
				bizName.toLowerCase().includes(businessFilter.trim().toLowerCase());
			const expiresOk = inDateRange(inv.expiresAt, expiresRange);
			const createdOk = inDateRange(inv.createdAt, createdRange);
			return emailOk && roleOk && statusOk && bizOk && expiresOk && createdOk;
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
		if (status === 'accepted') return washRecipes.badgeSoft('success');
		if (status === 'revoked') return washRecipes.badgeSoft('error');
		if (status === 'expired') return 'badge badge-ghost';
		return 'badge badge-ghost';
	}

	function openCreate() {
		createBusinessId = data.businesses[0]?.id ?? '';
		createRole = 'manager';
		createDialog?.showModal();
	}

	function closeCreate() {
		createDialog?.close();
	}

	function openProvision(id: string, email: string) {
		provisionInviteId = id;
		provisionEmail = email;
		provisionDialog?.showModal();
	}

	function closeProvision() {
		provisionDialog?.close();
		provisionInviteId = null;
	}

	function openDelete(row: InviteRow) {
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
			roleFilter = '';
			statusFilter = '';
			businessFilter = '';
			expiresRange = '';
			createdRange = '';
			page = 1;
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}

	$effect(() => {
		emailFilter;
		roleFilter;
		statusFilter;
		businessFilter;
		expiresRange;
		createdRange;
		page = 1;
	});

	$effect(() => {
		if (page > totalPages) page = totalPages;
	});

	$effect(() => {
		if (form?.message) {
			toastGone = false;
			provisioningId = null;
			if (form.success) {
				closeCreate();
				closeProvision();
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
	<title>Invites | Loomline Admin</title>
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
				<button
					type="button"
					class="btn btn-ghost btn-xs cursor-pointer"
					onclick={() => (toastGone = true)}>Dismiss</button
				>
			</div>
		</div>
	{/if}

	<DataTableShell title="Invites" bind:bodyEl footerSummary={footerSummary}>
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
					<th>Email</th>
					<th>Role</th>
					<th>Business</th>
					<th>Status</th>
					<th>Expires</th>
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
							aria-label="Filter by email"
							bind:value={emailFilter}
						/>
					</th>
					<th>
						<SearchSelect
							id="filter-invite-role"
							name="filterRole"
							size="xs"
							bind:value={roleFilter}
							allowEmpty
							emptyLabel="All"
							options={[
								{ value: 'business_owner', label: 'business_owner' },
								{ value: 'manager', label: 'manager' },
								{ value: 'counter_agent', label: 'counter_agent' },
								{ value: 'guest', label: 'guest' }
							]}
							ariaLabel="Filter by role"
							class="max-w-[8rem]"
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
					<th>
						<SearchSelect
							id="filter-invite-status"
							name="filterStatus"
							size="xs"
							bind:value={statusFilter}
							allowEmpty
							emptyLabel="All"
							options={[
								{ value: 'pending', label: 'pending' },
								{ value: 'accepted', label: 'accepted' },
								{ value: 'revoked', label: 'revoked' },
								{ value: 'expired', label: 'expired' }
							]}
							ariaLabel="Filter by status"
							class="max-w-[7rem]"
						/>
					</th>
					<th class="overflow-visible">
						<DateRangeFilter label="Expires" bind:value={expiresRange} />
					</th>
					<th class="overflow-visible">
						<DateRangeFilter label="Created" bind:value={createdRange} />
					</th>
				</tr>
			</thead>
			<tbody>
				{#if pageRows.length === 0}
					<tr>
						<td colspan="8" class="text-ink-muted py-10 text-center text-sm">
							No invites match these filters.
						</td>
					</tr>
				{:else}
					{#each pageRows as inv, i (inv.id)}
						<tr>
							<td>
								<div class="flex items-center gap-0.5">
									{#if inv.status === 'pending'}
										<form
											method="POST"
											action="?/resendInvite"
											use:enhance={bindSubmitting(
												(v) => (busyId = v ? inv.id : null),
												async ({ update }) => {
													await update();
												}
											)}
										>
											<input type="hidden" name="inviteId" value={inv.id} />
											<div class="tooltip tooltip-secondary tooltip-right" data-tip="Resend">
												<button
													type="submit"
													class="btn btn-ghost btn-square btn-xs btn-secondary"
													class:cursor-pointer={busyId !== inv.id}
													class:cursor-not-allowed={busyId === inv.id}
													class:loading={busyId === inv.id}
													disabled={busyId === inv.id}
													aria-busy={busyId === inv.id}
													aria-label="Resend"
												>
													{#if busyId !== inv.id}
														<Mail class="size-3.5" aria-hidden="true" />
													{/if}
												</button>
											</div>
										</form>
										<div class="tooltip tooltip-secondary tooltip-right" data-tip="Provision">
											<button
												type="button"
												class="btn btn-ghost btn-square btn-xs btn-secondary cursor-pointer"
												aria-label="Provision"
												onclick={() => openProvision(inv.id, inv.email)}
											>
												<UserPlus class="size-3.5" aria-hidden="true" />
											</button>
										</div>
										<form
											method="POST"
											action="?/cancelInvite"
											use:enhance={bindSubmitting(
												(v) => (busyId = v ? inv.id : null),
												async ({ update }) => {
													await update();
												}
											)}
										>
											<input type="hidden" name="inviteId" value={inv.id} />
											<div class="tooltip tooltip-warning tooltip-right" data-tip="Cancel">
												<button
													type="submit"
													class="btn btn-ghost btn-square btn-xs btn-warning"
													class:cursor-pointer={busyId !== inv.id}
													class:cursor-not-allowed={busyId === inv.id}
													class:loading={busyId === inv.id}
													disabled={busyId === inv.id}
													aria-busy={busyId === inv.id}
													aria-label="Cancel"
												>
													{#if busyId !== inv.id}
														<Ban class="size-3.5" aria-hidden="true" />
													{/if}
												</button>
											</div>
										</form>
									{/if}
									<div class="tooltip tooltip-error tooltip-right" data-tip="Delete">
										<button
											type="button"
											class="btn btn-ghost btn-square btn-xs btn-error cursor-pointer"
											aria-label="Delete"
											onclick={() => openDelete(inv)}
										>
											<Trash2 class="size-3.5" aria-hidden="true" />
										</button>
									</div>
								</div>
							</td>
							<td>{(safePage - 1) * pageSize + i + 1}</td>
							<td class="font-medium">{inv.email}</td>
							<td class="text-sm">{inv.role}</td>
							<td>
								{#if inv.business}
									<a
										class="link link-primary cursor-pointer text-sm"
										href={resolve(`/b/${inv.business.id}`)}>{inv.business.name}</a
									>
								{:else}
									-
								{/if}
							</td>
							<td><span class={statusBadge(inv.status)}>{inv.status}</span></td>
							<td class="text-ink-muted whitespace-nowrap text-sm"
								>{shortDateTime(inv.expiresAt)}</td
							>
							<td class="text-ink-muted whitespace-nowrap text-sm"
								>{shortDateTime(inv.createdAt)}</td
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
					id="invites-page-size"
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
		<h2 class="card-title text-primary font-bold">Create invite</h2>
		<form
			method="POST"
			action="?/createInvite"
			class="mt-4 flex flex-col gap-3"
			use:enhance={bindSubmitting((v) => (creating = v), async ({ result, update }) => {
				await update();
				if (result.type === 'success') closeCreate();
			})}
		>
			<label class="form-control flex w-full flex-col" for="invite-email">
				<span class="label-text mb-1">
					Email<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span>
				</span>
				<input
					id="invite-email"
					name="email"
					type="email"
					autocomplete="email"
					class="input input-bordered w-full cursor-text"
					required
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="invite-business">
				<span class="label-text mb-1">
					Business<span class="text-error align-top text-sm leading-none" aria-hidden="true"
						>*</span
					>
				</span>
				<SearchSelect
					id="invite-business"
					name="businessId"
					options={businessOptions}
					bind:value={createBusinessId}
					required
					placeholder="Select business..."
					filterPlaceholder="Search businesses..."
					ariaLabel="Business"
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="invite-role">
				<span class="label-text mb-1">
					Role<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span>
				</span>
				<SearchSelect
					id="invite-role"
					name="role"
					options={roleOptions}
					bind:value={createRole}
					required
					placeholder="Select role..."
					filterPlaceholder="Search roles..."
					ariaLabel="Role"
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
					Create invite
				</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button type="submit" class="cursor-pointer" aria-label="Close">close</button>
	</form>
</dialog>

<dialog bind:this={provisionDialog} class="modal">
	<div class="modal-box w-11/12 border-base-300 max-w-md border bg-base-100 shadow-sm">
		<h2 class="card-title text-secondary font-bold">Provision owner</h2>
		{#if provisionInviteId}
			<p class="text-ink-muted mt-1 text-sm">{provisionEmail}</p>
			<form
				method="POST"
				action="?/provisionOwnerNow"
				class="mt-4 flex flex-col gap-3"
				use:enhance={bindSubmitting(
					(v) => (provisioningId = v ? provisionInviteId : null),
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') closeProvision();
					}
				)}
			>
				<input type="hidden" name="inviteId" value={provisionInviteId} />
				<label class="form-control flex w-full flex-col" for="provision-password">
					<span class="label-text mb-1">
						Temp password<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</span>
					<input
						id="provision-password"
						name="password"
						type="text"
						class="input input-bordered w-full cursor-text"
						value="OwnerPass1!"
						required
					/>
				</label>
				<div class="modal-action mt-2 justify-end">
					<button
						type="button"
						class="btn btn-ghost"
						class:cursor-pointer={provisioningId === null}
						class:cursor-not-allowed={provisioningId !== null}
						onclick={closeProvision}
						disabled={provisioningId !== null}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn btn-secondary"
						class:cursor-pointer={provisioningId === null}
						class:cursor-not-allowed={provisioningId !== null}
						class:btn-disabled={provisioningId !== null}
						class:loading={provisioningId !== null}
						disabled={provisioningId !== null}
						aria-busy={provisioningId !== null}
					>
						Provision now
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
		<h2 class="card-title text-error font-bold">Delete invite</h2>
		{#if deleteRow}
			<p class="text-ink-muted mt-2 text-sm">
				Permanently delete the invite for
				<span class="text-base-content font-medium">{deleteRow.email}</span>?
			</p>
			<form
				method="POST"
				action="?/deleteInvite"
				class="modal-action justify-end"
				use:enhance={bindSubmitting((v) => (deleting = v), async ({ result, update }) => {
					await update();
					if (result.type === 'success') closeDelete();
				})}
			>
				<input type="hidden" name="inviteId" value={deleteRow.id} />
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
