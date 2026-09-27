<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		CircleCheck,
		CircleX,
		MailPlus,
		RefreshCw,
		UserPlus,
		Users
	} from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';

	let { data, form } = $props();

	type MemberRow = (typeof data.members)[number];
	type InviteRow = (typeof data.invites)[number];
	type ListView = 'members' | 'invites';

	const roleOptions = [
		{ value: 'manager', label: 'Manager' },
		{ value: 'counter_agent', label: 'Counter agent' },
		{ value: 'guest', label: 'Guest' },
		{ value: 'business_owner', label: 'Owner' }
	];

	const roleFilterOptions = [
		{ value: 'business_owner', label: 'Owner' },
		{ value: 'manager', label: 'Manager' },
		{ value: 'counter_agent', label: 'Counter agent' },
		{ value: 'guest', label: 'Guest' }
	];

	const memberStatusFilterOptions = [
		{ value: 'active', label: 'Active' },
		{ value: 'invited', label: 'Invited' },
		{ value: 'suspended', label: 'Suspended' },
		{ value: 'revoked', label: 'Revoked' }
	];

	const inviteStatusFilterOptions = [
		{ value: 'pending', label: 'Pending' },
		{ value: 'accepted', label: 'Accepted' },
		{ value: 'expired', label: 'Expired' },
		{ value: 'revoked', label: 'Revoked' }
	];

	let listView = $state<ListView>('members');
	let toastGone = $state(false);
	let inviting = $state(false);
	let provisioning = $state(false);
	let refreshing = $state(false);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let nameFilter = $state('');
	let emailFilter = $state('');
	let roleFilter = $state('');
	let statusFilter = $state('');
	let inviteEmailFilter = $state('');
	let inviteRoleFilter = $state('');
	let inviteStatusFilter = $state('pending');
	let inviteRole = $state('manager');
	let inviteDialog = $state<HTMLDialogElement | null>(null);
	let provisionDialog = $state<HTMLDialogElement | null>(null);
	let provisionRow = $state<InviteRow | null>(null);

	const pendingInviteCount = $derived(
		data.invites.filter((inv) => inv.status === 'pending').length
	);

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filteredMembers = $derived(
		data.members.filter((m) => {
			const name = m.user?.name ?? '';
			const email = m.user?.email ?? m.userId;
			const q = nameFilter.trim().toLowerCase();
			const nameOk =
				!q || name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
			const emailOk =
				!emailFilter.trim() || email.toLowerCase().includes(emailFilter.trim().toLowerCase());
			const roleOk = !roleFilter || m.role === roleFilter;
			const statusOk = !statusFilter || m.status === statusFilter;
			return nameOk && emailOk && roleOk && statusOk;
		})
	);

	const filteredInvites = $derived(
		data.invites.filter((inv) => {
			const emailOk =
				!inviteEmailFilter.trim() ||
				inv.email.toLowerCase().includes(inviteEmailFilter.trim().toLowerCase());
			const roleOk = !inviteRoleFilter || inv.role === inviteRoleFilter;
			const statusOk = !inviteStatusFilter || inv.status === inviteStatusFilter;
			return emailOk && roleOk && statusOk;
		})
	);

	const filtered = $derived(listView === 'members' ? filteredMembers : filteredInvites);
	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const safePage = $derived(Math.min(page, totalPages));
	const pageMembers = $derived(
		filteredMembers.slice((safePage - 1) * pageSize, safePage * pageSize) as MemberRow[]
	);
	const pageInvites = $derived(
		filteredInvites.slice((safePage - 1) * pageSize, safePage * pageSize) as InviteRow[]
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

	const shellDescription = $derived(
		listView === 'members'
			? 'People with access to this business. Invite colleagues to collaborate on queues and counters.'
			: 'Email invites waiting to join. Provision creates an account immediately with a temp password.'
	);

	function roleLabel(role: string): string {
		switch (role) {
			case 'business_owner':
				return 'Owner';
			case 'manager':
				return 'Manager';
			case 'counter_agent':
				return 'Counter agent';
			case 'guest':
				return 'Guest';
			case 'platform_admin':
				return 'Platform admin';
			default:
				return role;
		}
	}

	function roleBadgeClass(role: string): string {
		switch (role) {
			case 'business_owner':
				return washRecipes.badgeSoft('primary');
			case 'manager':
				return washRecipes.badgeSoft('secondary');
			case 'counter_agent':
				return washRecipes.badgeSoft('info');
			case 'guest':
				return 'badge badge-ghost';
			default:
				return 'badge badge-ghost';
		}
	}

	function memberStatusBadge(status: string): string {
		if (status === 'active') return washRecipes.badgeSoft('success');
		if (status === 'invited') return washRecipes.badgeSoft('warning');
		if (status === 'suspended') return washRecipes.badgeSoft('warning');
		if (status === 'revoked') return washRecipes.badgeSoft('error');
		return 'badge badge-ghost';
	}

	function memberStatusLabel(status: string): string {
		switch (status) {
			case 'active':
				return 'Active';
			case 'invited':
				return 'Invited';
			case 'suspended':
				return 'Suspended';
			case 'revoked':
				return 'Revoked';
			default:
				return status;
		}
	}

	function inviteStatusBadge(status: string): string {
		if (status === 'pending') return washRecipes.badgeSoft('warning');
		if (status === 'accepted') return washRecipes.badgeSoft('success');
		if (status === 'revoked') return washRecipes.badgeSoft('error');
		if (status === 'expired') return 'badge badge-ghost';
		return 'badge badge-ghost';
	}

	function inviteStatusLabel(status: string): string {
		switch (status) {
			case 'pending':
				return 'Pending';
			case 'accepted':
				return 'Accepted';
			case 'expired':
				return 'Expired';
			case 'revoked':
				return 'Revoked';
			default:
				return status;
		}
	}

	function setListView(next: ListView) {
		listView = next;
		page = 1;
	}

	function openInvite() {
		inviteRole = 'manager';
		inviteDialog?.showModal();
	}

	function closeInvite() {
		inviteDialog?.close();
	}

	function openProvision(row: InviteRow) {
		provisionRow = row;
		provisionDialog?.showModal();
	}

	function closeProvision() {
		provisionDialog?.close();
		provisionRow = null;
	}

	async function handleRefresh() {
		if (refreshing) return;
		refreshing = true;
		try {
			nameFilter = '';
			emailFilter = '';
			roleFilter = '';
			statusFilter = '';
			inviteEmailFilter = '';
			inviteRoleFilter = '';
			inviteStatusFilter = listView === 'invites' ? 'pending' : '';
			page = 1;
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}

	$effect(() => {
		nameFilter;
		emailFilter;
		roleFilter;
		statusFilter;
		inviteEmailFilter;
		inviteRoleFilter;
		inviteStatusFilter;
		listView;
		page = 1;
	});

	$effect(() => {
		if (page > totalPages) page = totalPages;
	});

	$effect(() => {
		if (form?.message) {
			toastGone = false;
			if (form.success) {
				closeInvite();
				closeProvision();
				if (
					typeof form.message === 'string' &&
					/^invite\b/i.test(form.message.trim())
				) {
					listView = 'invites';
					inviteStatusFilter = 'pending';
				}
			}
		}
	});

	$effect(() => {
		if (!bodyEl || pageSizeChoice !== 'auto') return;
		const ro = new ResizeObserver(() => {
			const h = bodyEl?.clientHeight ?? 320;
			autoPageSize = Math.max(3, Math.floor((h - 72) / 44));
		});
		ro.observe(bodyEl);
		return () => ro.disconnect();
	});
</script>

<svelte:head>
	<title>Team | {data.business.name}</title>
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

<div class="flex min-h-0 flex-1 flex-col gap-3">
	<div class="flex flex-wrap items-center gap-2 px-0.5">
		<div role="tablist" class="tabs tabs-box tabs-sm">
			<button
				type="button"
				role="tab"
				class="tab gap-1.5 cursor-pointer"
				class:tab-active={listView === 'members'}
				aria-selected={listView === 'members'}
				onclick={() => setListView('members')}
			>
				<Users class="size-3.5" aria-hidden="true" />
				Members
				<span class="text-ink-muted font-mono text-[0.65rem]">{data.members.length}</span>
			</button>
			<button
				type="button"
				role="tab"
				class="tab gap-1.5 cursor-pointer"
				class:tab-active={listView === 'invites'}
				aria-selected={listView === 'invites'}
				onclick={() => setListView('invites')}
			>
				<MailPlus class="size-3.5" aria-hidden="true" />
				Invites
				{#if pendingInviteCount > 0}
					<span class={washRecipes.badgeSoft('warning')}>{pendingInviteCount}</span>
				{:else}
					<span class="text-ink-muted font-mono text-[0.65rem]">{data.invites.length}</span>
				{/if}
			</button>
		</div>
	</div>

	<DataTableShell
		title="Team"
		description={shellDescription}
		bind:bodyEl
		footerSummary={footerSummary}
	>
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
			<div class="tooltip tooltip-left tooltip-primary" data-tip="Invite">
				<button
					type="button"
					class="btn btn-ghost btn-square btn-sm btn-primary cursor-pointer"
					aria-label="Invite"
					onclick={openInvite}
				>
					<UserPlus class="size-4" aria-hidden="true" />
				</button>
			</div>
		{/snippet}

		{#if listView === 'members'}
			<table class="table table-zebra w-full [&_tbody_tr]:hover:bg-primary/40">
				<thead class="bg-base-100 sticky top-0 z-10">
					<tr>
						<th>No</th>
						<th>Name</th>
						<th>Email</th>
						<th>Role</th>
						<th>Status</th>
						<th>Joined</th>
					</tr>
					<tr class="font-normal">
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
								class="input input-xs input-bordered w-full max-w-[10rem] cursor-text"
								placeholder="Filter…"
								aria-label="Filter by email"
								bind:value={emailFilter}
							/>
						</th>
						<th>
							<SearchSelect
								id="filter-member-role"
								name="filterMemberRole"
								size="xs"
								bind:value={roleFilter}
								allowEmpty
								emptyLabel="All"
								options={roleFilterOptions}
								ariaLabel="Filter by role"
								class="max-w-[9rem]"
							/>
						</th>
						<th>
							<SearchSelect
								id="filter-member-status"
								name="filterMemberStatus"
								size="xs"
								bind:value={statusFilter}
								allowEmpty
								emptyLabel="All"
								options={memberStatusFilterOptions}
								ariaLabel="Filter by status"
								class="max-w-[8rem]"
							/>
						</th>
						<th aria-hidden="true"></th>
					</tr>
				</thead>
				<tbody>
					{#if pageMembers.length === 0}
						<tr>
							<td colspan="6" class="py-12 text-center">
								{#if data.members.length === 0}
									<div class="mx-auto flex max-w-sm flex-col items-center gap-3">
										<span
											class="bg-primary/10 text-primary inline-flex size-12 items-center justify-center rounded-full"
											aria-hidden="true"
										>
											<Users class="size-6" />
										</span>
										<p class="text-base-content text-sm font-medium">No team members yet</p>
										<p class="text-ink-muted text-xs">
											Invite a manager or counter agent so they can help run the queue.
										</p>
										<button
											type="button"
											class="btn btn-primary btn-sm cursor-pointer"
											onclick={openInvite}
										>
											<UserPlus class="size-4" aria-hidden="true" />
											Invite teammate
										</button>
									</div>
								{:else}
									<p class="text-ink-muted text-sm">No members match these filters.</p>
								{/if}
							</td>
						</tr>
					{:else}
						{#each pageMembers as m, i (m.id)}
							<tr>
								<td>{(safePage - 1) * pageSize + i + 1}</td>
								<td class="font-medium">{m.user?.name ?? '-'}</td>
								<td class="text-sm">{m.user?.email ?? m.userId}</td>
								<td>
									<span class={roleBadgeClass(m.role)}>{roleLabel(m.role)}</span>
								</td>
								<td>
									<span class={memberStatusBadge(m.status)}>{memberStatusLabel(m.status)}</span>
								</td>
								<td class="text-ink-muted whitespace-nowrap text-sm"
									>{shortDateTime(m.createdAt)}</td
								>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		{:else}
			<table class="table table-zebra w-full [&_tbody_tr]:hover:bg-primary/40">
				<thead class="bg-base-100 sticky top-0 z-10">
					<tr>
						<th>Actions</th>
						<th>No</th>
						<th>Email</th>
						<th>Role</th>
						<th>Status</th>
						<th>Expires</th>
						<th>Sent</th>
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
								bind:value={inviteEmailFilter}
							/>
						</th>
						<th>
							<SearchSelect
								id="filter-invite-role"
								name="filterInviteRole"
								size="xs"
								bind:value={inviteRoleFilter}
								allowEmpty
								emptyLabel="All"
								options={roleFilterOptions}
								ariaLabel="Filter by role"
								class="max-w-[9rem]"
							/>
						</th>
						<th>
							<SearchSelect
								id="filter-invite-status"
								name="filterInviteStatus"
								size="xs"
								bind:value={inviteStatusFilter}
								allowEmpty
								emptyLabel="All"
								options={inviteStatusFilterOptions}
								ariaLabel="Filter by status"
								class="max-w-[8rem]"
							/>
						</th>
						<th aria-hidden="true"></th>
						<th aria-hidden="true"></th>
					</tr>
				</thead>
				<tbody>
					{#if pageInvites.length === 0}
						<tr>
							<td colspan="7" class="py-12 text-center">
								{#if data.invites.length === 0}
									<div class="mx-auto flex max-w-sm flex-col items-center gap-3">
										<span
											class="bg-secondary/10 text-secondary inline-flex size-12 items-center justify-center rounded-full"
											aria-hidden="true"
										>
											<MailPlus class="size-6" />
										</span>
										<p class="text-base-content text-sm font-medium">No invites yet</p>
										<p class="text-ink-muted text-xs">
											Send an email invite. They get a link to set a password and join.
										</p>
										<button
											type="button"
											class="btn btn-primary btn-sm cursor-pointer"
											onclick={openInvite}
										>
											<UserPlus class="size-4" aria-hidden="true" />
											Send invite
										</button>
									</div>
								{:else}
									<p class="text-ink-muted text-sm">No invites match these filters.</p>
								{/if}
							</td>
						</tr>
					{:else}
						{#each pageInvites as inv, i (inv.id)}
							<tr>
								<td>
									{#if inv.status === 'pending'}
										<div class="tooltip tooltip-secondary tooltip-right" data-tip="Provision">
											<button
												type="button"
												class="btn btn-ghost btn-square btn-xs btn-secondary cursor-pointer"
												aria-label="Provision"
												onclick={() => openProvision(inv)}
											>
												<UserPlus class="size-3.5" aria-hidden="true" />
											</button>
										</div>
									{:else}
										<span class="text-ink-muted text-xs">-</span>
									{/if}
								</td>
								<td>{(safePage - 1) * pageSize + i + 1}</td>
								<td class="font-medium">{inv.email}</td>
								<td>
									<span class={roleBadgeClass(inv.role)}>{roleLabel(inv.role)}</span>
								</td>
								<td>
									<span class={inviteStatusBadge(inv.status)}
										>{inviteStatusLabel(inv.status)}</span
									>
								</td>
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
		{/if}

		{#snippet footerStart()}
			<label class="text-ink-muted flex min-w-0 items-center gap-1.5 text-xs">
				<span>Per page</span>
				<SearchSelect
					id="team-page-size"
					name="pageSize"
					size="sm"
					bind:value={pageSizeChoice}
					options={[
						{ value: 'auto', label: 'Auto' },
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

<dialog bind:this={inviteDialog} class="modal">
	<div class="modal-box w-11/12 border-base-300 max-w-lg border bg-base-100 shadow-sm">
		<h2 class="card-title text-primary font-bold">Invite teammate</h2>
		<p class="text-ink-muted mt-1 text-sm">
			We email a join link. They set a password and appear under Members once accepted.
		</p>
		<form
			method="POST"
			action="?/invite"
			class="mt-4 flex flex-col gap-3"
			use:enhance={bindSubmitting((v) => (inviting = v), async ({ result, update }) => {
				await update();
				if (result.type === 'success') closeInvite();
			})}
		>
			<label class="form-control flex w-full flex-col" for="team-invite-email">
				<span class="label-text mb-1">
					Email<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span>
				</span>
				<input
					id="team-invite-email"
					name="email"
					type="email"
					autocomplete="email"
					class="input input-bordered w-full cursor-text"
					placeholder="colleague@example.com"
					required
				/>
			</label>
			<label class="form-control flex w-full flex-col" for="team-invite-role">
				<span class="label-text mb-1">
					Role<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span>
				</span>
				<SearchSelect
					id="team-invite-role"
					name="role"
					options={roleOptions}
					bind:value={inviteRole}
					required
					placeholder="Select role…"
					filterPlaceholder="Search roles…"
					ariaLabel="Role"
				/>
			</label>
			<div class="modal-action mt-2 justify-end">
				<button
					type="button"
					class="btn btn-ghost"
					class:cursor-pointer={!inviting}
					class:cursor-not-allowed={inviting}
					onclick={closeInvite}
					disabled={inviting}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-primary"
					class:cursor-pointer={!inviting}
					class:cursor-not-allowed={inviting}
					class:btn-disabled={inviting}
					class:loading={inviting}
					disabled={inviting}
					aria-busy={inviting}
				>
					{#if !inviting}
						<MailPlus class="size-4" aria-hidden="true" />
					{/if}
					Send invite
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
		<h2 class="card-title text-secondary font-bold">Provision account</h2>
		{#if provisionRow}
			<p class="text-ink-muted mt-1 text-sm">
				Create or link an account for
				<span class="text-base-content font-medium">{provisionRow.email}</span>
				as {roleLabel(provisionRow.role).toLowerCase()}, then mark the invite accepted.
			</p>
			<form
				method="POST"
				action="?/provision"
				class="mt-4 flex flex-col gap-3"
				use:enhance={bindSubmitting((v) => (provisioning = v), async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						closeProvision();
						listView = 'members';
					}
				})}
			>
				<input type="hidden" name="inviteId" value={provisionRow.id} />
				<label class="form-control flex w-full flex-col" for="team-provision-password">
					<span class="label-text mb-1">
						Temp password<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</span>
					<input
						id="team-provision-password"
						name="password"
						type="text"
						class="input input-bordered w-full cursor-text"
						value="TempPass1!"
						required
					/>
				</label>
				<div class="modal-action mt-2 justify-end">
					<button
						type="button"
						class="btn btn-ghost"
						class:cursor-pointer={!provisioning}
						class:cursor-not-allowed={provisioning}
						onclick={closeProvision}
						disabled={provisioning}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn btn-secondary"
						class:cursor-pointer={!provisioning}
						class:cursor-not-allowed={provisioning}
						class:btn-disabled={provisioning}
						class:loading={provisioning}
						disabled={provisioning}
						aria-busy={provisioning}
					>
						{#if !provisioning}
							<UserPlus class="size-4" aria-hidden="true" />
						{/if}
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
