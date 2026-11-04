<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		Ban,
		CircleCheck,
		CirclePlay,
		CircleX,
		CornerDownRight,
		History,
		Megaphone,
		Pause,
		PhoneForwarded,
		Plus,
		RefreshCw,
		ArrowRightLeft,
		TicketPlus
	} from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import {
		agentActionHint,
		canCallTicket,
		canCompleteTicket,
		canHoldTicket,
		canMarkNoShow,
		canRecallTicket,
		canStartServing,
		isTerminalTicketStatus
	} from '#lib/tool/ticket-status';
	import { shortDateTime } from '#lib/util/format';
	import DataTableShell from '#lib/component/own/local/private/data-table/DataTableShell.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import ToastDismissButton from '#lib/component/own/local/private/ToastDismissButton.svelte';
	import IconActionTip from '#lib/component/wash/tooltip/IconActionTip.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';
	import ShortcutTarget from '#lib/component/own/local/keyboard/ShortcutTarget.svelte';
	import { registerDataTableHeaderShortcuts } from '#lib/keyboard/page-table-shortcuts';
	import { clickRowActionButton } from '#lib/keyboard/click-row-action';
	import { m } from '#lib/paraglide/messages';
	import WashActionKbd from '#lib/component/own/local/keyboard/WashActionKbd.svelte';

	let { data, form } = $props();

	type TicketRow = (typeof data.tickets)[number];

	type TimelineEvent = {
		id: string;
		type: string;
		createdAt: Date | string;
		payload?: unknown;
	};

	let busy = $state(false);
	let issuing = $state(false);
	let transferring = $state(false);
	let redirecting = $state(false);
	let refreshing = $state(false);
	let selectedQueue = $state('');
	let selectedCounter = $state('');
	let selectedTicketId = $state('');
	let toastGone = $state(false);
	let transferQueueId = $state('');
	let transferReason = $state('');
	let redirectDestId = $state('');
	let redirectReason = $state('');
	let issuePhone = $state('');
	let issuePriority = $state('0');
	let timelineEvents = $state<TimelineEvent[]>([]);
	let bodyEl = $state<HTMLDivElement | null>(null);
	let page = $state(1);
	let pageSizeChoice = $state('auto');
	let autoPageSize = $state(8);
	let numberFilter = $state('');
	let statusFilter = $state('');
	let issueDialog = $state<HTMLDialogElement | null>(null);
	let transferDialog = $state<HTMLDialogElement | null>(null);
	let redirectDialog = $state<HTMLDialogElement | null>(null);
	let actionTicket = $state<TicketRow | null>(null);

	const queueOptions = $derived(data.queues.map((q) => ({ value: q.id, label: q.name })));
	const counterOptions = $derived(
		data.counters.map((c) => ({
			value: c.id,
			label: `${c.label} (${c.status})${c.department ? ` · ${c.department.name}` : ''}`
		}))
	);
	const destOptions = $derived(
		data.destinations.map((d) => ({ value: d.id, label: `${d.name} (${d.type})` }))
	);

	const statusOptions = [
		{ value: 'issued', label: 'issued' },
		{ value: 'waiting', label: 'waiting' },
		{ value: 'called', label: 'called' },
		{ value: 'serving', label: 'serving' },
		{ value: 'held', label: 'held' },
		{ value: 'completed', label: 'completed' },
		{ value: 'no_show', label: 'no_show' },
		{ value: 'cancelled', label: 'cancelled' },
		{ value: 'transferred', label: 'transferred' }
	];

	const pageSize = $derived(
		pageSizeChoice === 'auto' ? autoPageSize : Math.max(1, Number(pageSizeChoice))
	);

	const filtered = $derived(
		data.tickets.filter((t) => {
			const q = numberFilter.trim().toLowerCase();
			const numberOk = !q || t.number.toLowerCase().includes(q);
			const statusOk = !statusFilter || t.status === statusFilter;
			return numberOk && statusOk;
		})
	);

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const safePage = $derived(Math.min(page, totalPages));
	const pageRows = $derived(filtered.slice((safePage - 1) * pageSize, safePage * pageSize));

	let keyboardRowIndex = $state<number | null>(null);
	const agentTableActions = $derived({
		c: {
			key: 'c',
			label: m.keyboard_action_call(),
			run: (row: TicketRow) => clickRowActionButton(row.id, 'Call ticket')
		},
		s: {
			key: 's',
			label: m.keyboard_action_serve(),
			run: (row: TicketRow) => clickRowActionButton(row.id, 'Serve')
		},
		h: {
			key: 'h',
			label: m.keyboard_action_hold(),
			run: (row: TicketRow) => clickRowActionButton(row.id, 'Hold')
		},
		f: {
			key: 'f',
			label: m.keyboard_action_complete(),
			run: (row: TicketRow) => clickRowActionButton(row.id, 'Done')
		}
	});
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

	const showFloorHint = $derived(
		data.tickets.length === 0 && !numberFilter.trim() && !statusFilter
	);

	onMount(() => {
		const id = setInterval(() => {
			if (document.visibilityState === 'visible') void invalidateAll();
		}, 8000);
		return () => clearInterval(id);
	});

	$effect(() => {
		if (!selectedQueue && data.queues[0]) selectedQueue = data.queues[0].id;
		if (!transferQueueId && data.queues[0]) transferQueueId = data.queues[0].id;
		if (!redirectDestId && data.destinations[0]) redirectDestId = data.destinations[0].id;
		if (!selectedCounter) {
			const pref = data.prefillCounterId
				? data.counters.find((c) => c.id === data.prefillCounterId)
				: null;
			selectedCounter = pref?.id ?? data.counters[0]?.id ?? '';
		}
	});

	$effect(() => {
		if (form?.message) toastGone = false;
		if (form?.events && Array.isArray(form.events)) {
			timelineEvents = form.events as TimelineEvent[];
			if (form.ticketId) selectedTicketId = String(form.ticketId);
		}
	});

	$effect(() => {
		numberFilter;
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

	function openIssue() {
		issuePhone = '';
		issuePriority = '0';
		issueDialog?.showModal();
	}

	function openTransfer(row: TicketRow) {
		actionTicket = row;
		transferQueueId = selectedQueue || data.queues[0]?.id || '';
		transferReason = '';
		transferDialog?.showModal();
	}

	function openRedirect(row: TicketRow) {
		actionTicket = row;
		redirectDestId = data.destinations[0]?.id ?? '';
		redirectReason = '';
		redirectDialog?.showModal();
	}

	function statusBadge(status: string) {
		if (status === 'completed') return washRecipes.badgeSoft('success');
		if (status === 'serving' || status === 'called') return washRecipes.badgeSoft('info');
		if (status === 'waiting' || status === 'held') return washRecipes.badgeSoft('warning');
		if (status === 'no_show' || status === 'cancelled') return washRecipes.badgeSoft('error');
		return 'badge badge-ghost';
	}

	$effect(() => {
		const off = registerDataTableHeaderShortcuts('agent-console', {
			onRefresh: () => void handleRefresh(),
			refreshDisabled: () => refreshing,
			onNew: openIssue,
			newLabel: m.keyboard_action_issue()
		});
		return off;
	});
</script>

<svelte:head>
	<title>Agent | {data.business.name}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

{#if form?.message && !toastGone}
	<div class="toast toast-end toast-bottom z-[100]">
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
			<ToastDismissButton onclick={() => (toastGone = true)} />
		</div>
	</div>
{/if}

<div class="flex min-h-0 flex-1 flex-col gap-3">
	{#if showFloorHint}
		<div class="alert alert-info shadow-sm">
			<span class="text-sm">
				Site, queue, and counter setup does not create tickets or open the TV. Add a
				<strong>TV</strong> and <strong>kiosk</strong> under Devices, issue a ticket (kiosk or
				<strong>Issue ticket</strong> here), pick queue + counter, then
				<strong>Call next</strong>. The TV shows numbers in <strong>Upcoming</strong> while waiting
				and
				<strong>Now serving</strong> after you call.
			</span>
		</div>
	{/if}
	<div
		class="flex shrink-0 flex-wrap items-end gap-2 overflow-visible rounded-box border border-base-300 bg-base-100 p-3 shadow-sm"
	>
		<div class="max-w-xs min-w-[10rem] flex-1">
			<label class="label py-0 pb-1" for="agent-queue">
				<span class="label-text text-xs">Queue</span>
			</label>
			<SearchSelect
				id="agent-queue"
				name="selectedQueue"
				bind:value={selectedQueue}
				options={queueOptions}
				placeholder="Select queue"
				ariaLabel="Queue"
			/>
		</div>
		<div class="max-w-sm min-w-[12rem] flex-1">
			<label class="label py-0 pb-1" for="agent-counter">
				<span class="label-text text-xs">Counter</span>
			</label>
			<SearchSelect
				id="agent-counter"
				name="selectedCounter"
				bind:value={selectedCounter}
				options={counterOptions}
				placeholder="Select counter"
				ariaLabel="Counter"
			/>
		</div>
		<form method="POST" action="?/callNext" use:enhance={bindSubmitting((v) => (busy = v))}>
			<input type="hidden" name="queueId" value={selectedQueue} />
			<input type="hidden" name="counterId" value={selectedCounter} />
			<button
				type="submit"
				class="btn btn-primary"
				class:loading={busy}
				disabled={busy}
				aria-busy={busy}
				class:cursor-pointer={!busy}
				class:cursor-not-allowed={busy}
				class:btn-disabled={busy}
			>
				<PhoneForwarded class="size-4" aria-hidden="true" />
				Call next
			</button>
		</form>
		<button type="button" class="btn cursor-pointer btn-secondary" onclick={openIssue}>
			<TicketPlus class="size-4" aria-hidden="true" />
			Issue ticket
		</button>
	</div>

	<div class="relative z-0 grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_18rem]">
		<div class="flex min-h-0 min-w-0 flex-1 flex-col">
			<DataTableShell
				title="Agent console"
				description={data.stationDeviceName
					? `Station: ${data.stationDeviceName}`
					: 'Call, serve, and move tickets for this floor.'}
				bind:bodyEl
				{footerSummary}
				keyboardRows={pageRows}
				rowActions={agentTableActions}
				tableId="agent-console"
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
					<WashTooltip tooltipText="Issue ticket" className="tooltip-primary">
						<ShortcutTarget keys={['N']} label={m.keyboard_action_issue()}>
							<button
								type="button"
								class="btn btn-square cursor-pointer btn-ghost btn-primary btn-sm"
								aria-label="Issue ticket"
								onclick={openIssue}
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
							<th>Number</th>
							<th>Status</th>
							<th>Priority</th>
							<th>Created</th>
							<th>Updated</th>
						</tr>
						<tr class="font-normal">
							<th aria-hidden="true"></th>
							<th aria-hidden="true"></th>
							<th>
								<input
									type="text"
									class="input-bordered input w-full max-w-[8rem] cursor-text font-mono input-xs"
									placeholder="Filter…"
									aria-label="Filter by number"
									bind:value={numberFilter}
								/>
							</th>
							<th>
								<SearchSelect
									id="filter-agent-status"
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
							<th aria-hidden="true"></th>
						</tr>
					</thead>
					<tbody>
						{#if pageRows.length === 0}
							<tr>
								<td colspan="7" class="text-ink-muted py-10 text-center text-sm">
									{#if showFloorHint}
										No tickets yet — issue one from the kiosk or use Issue ticket above.
									{:else}
										No tickets match these filters.
									{/if}
								</td>
							</tr>
						{:else}
							{#each pageRows as t, i (t.id)}
								<tr
									class="cursor-pointer {selectedTicketId === t.id ? 'bg-primary/10' : ''}"
									data-kbd-row-id={t.id}
									data-kbd-row-slot={String(i + 1)}
									data-kbd-row-focus={keyboardRowIndex === i ? 'true' : undefined}
									onclick={() => (selectedTicketId = t.id)}
								>
									<td onclick={(e) => e.stopPropagation()}>
										<div class="flex flex-wrap items-center gap-0.5">
											{#if canCallTicket(t.status)}
												<WashActionKbd key="c">
													<form
														method="POST"
														action="?/callTicket"
														use:enhance={bindSubmitting((v) => (busy = v))}
													>
														<input type="hidden" name="ticketId" value={t.id} />
														<input type="hidden" name="counterId" value={selectedCounter} />
														<IconActionTip tip="Call this ticket" tone="primary">
															<button
																type="submit"
																class="btn btn-square btn-ghost btn-primary btn-xs"
																class:loading={busy}
																disabled={busy || !selectedCounter}
																aria-busy={busy}
																aria-label="Call ticket"
																class:cursor-pointer={!busy && !!selectedCounter}
																class:cursor-not-allowed={busy || !selectedCounter}
															>
																{#if !busy}
																	<PhoneForwarded class="size-3.5" aria-hidden="true" />
																{/if}
															</button>
														</IconActionTip>
													</form>
												</WashActionKbd>
											{/if}
											<form
												method="POST"
												action="?/recall"
												use:enhance={bindSubmitting((v) => (busy = v))}
											>
												<input type="hidden" name="ticketId" value={t.id} />
												<IconActionTip
													tip={agentActionHint(t.status, 'recall') ?? 'Recall'}
													tone="secondary"
												>
													<button
														type="submit"
														class="btn btn-square btn-ghost btn-secondary btn-xs"
														class:loading={busy}
														disabled={busy || !canRecallTicket(t.status)}
														aria-busy={busy}
														aria-label="Recall"
														class:cursor-pointer={!busy && canRecallTicket(t.status)}
														class:cursor-not-allowed={busy || !canRecallTicket(t.status)}
													>
														{#if !busy}
															<Megaphone class="size-3.5" aria-hidden="true" />
														{/if}
													</button>
												</IconActionTip>
											</form>
											<WashActionKbd key="s">
												<form
													method="POST"
													action="?/serve"
													use:enhance={bindSubmitting((v) => (busy = v))}
												>
													<input type="hidden" name="ticketId" value={t.id} />
													<IconActionTip
														tip={agentActionHint(t.status, 'serve') ?? 'Start serving'}
														tone="primary"
													>
														<button
															type="submit"
															class="btn btn-square btn-ghost btn-primary btn-xs"
															class:loading={busy}
															disabled={busy || !canStartServing(t.status)}
															aria-busy={busy}
															aria-label="Serve"
															class:cursor-pointer={!busy && canStartServing(t.status)}
															class:cursor-not-allowed={busy || !canStartServing(t.status)}
														>
															{#if !busy}
																<CirclePlay class="size-3.5" aria-hidden="true" />
															{/if}
														</button>
													</IconActionTip>
												</form>
											</WashActionKbd>
											<WashActionKbd key="f">
												<form
													method="POST"
													action="?/complete"
													use:enhance={bindSubmitting((v) => (busy = v))}
												>
													<input type="hidden" name="ticketId" value={t.id} />
													<IconActionTip
														tip={agentActionHint(t.status, 'complete') ?? 'Done'}
														tone="success"
													>
														<button
															type="submit"
															class="btn btn-square btn-ghost btn-success btn-xs"
															class:loading={busy}
															disabled={busy || !canCompleteTicket(t.status)}
															aria-busy={busy}
															aria-label="Done"
															class:cursor-pointer={!busy && canCompleteTicket(t.status)}
															class:cursor-not-allowed={busy || !canCompleteTicket(t.status)}
														>
															{#if !busy}
																<CircleCheck class="size-3.5" aria-hidden="true" />
															{/if}
														</button>
													</IconActionTip>
												</form>
											</WashActionKbd>
											<form
												method="POST"
												action="?/noShow"
												use:enhance={bindSubmitting((v) => (busy = v))}
											>
												<input type="hidden" name="ticketId" value={t.id} />
												<IconActionTip tip="No-show" tone="error">
													<button
														type="submit"
														class="btn btn-square btn-ghost btn-error btn-xs"
														class:loading={busy}
														disabled={busy || !canMarkNoShow(t.status)}
														aria-busy={busy}
														aria-label="No-show"
														class:cursor-pointer={!busy && canMarkNoShow(t.status)}
														class:cursor-not-allowed={busy || !canMarkNoShow(t.status)}
													>
														{#if !busy}
															<Ban class="size-3.5" aria-hidden="true" />
														{/if}
													</button>
												</IconActionTip>
											</form>
											<WashActionKbd key="h">
												<form
													method="POST"
													action="?/hold"
													use:enhance={bindSubmitting((v) => (busy = v))}
												>
													<input type="hidden" name="ticketId" value={t.id} />
													<IconActionTip tip="Hold" tone="warning">
														<button
															type="submit"
															class="btn btn-square btn-ghost btn-warning btn-xs"
															class:loading={busy}
															disabled={busy || !canHoldTicket(t.status)}
															aria-busy={busy}
															aria-label="Hold"
															class:cursor-pointer={!busy && canHoldTicket(t.status)}
															class:cursor-not-allowed={busy || !canHoldTicket(t.status)}
														>
															{#if !busy}
																<Pause class="size-3.5" aria-hidden="true" />
															{/if}
														</button>
													</IconActionTip>
												</form>
											</WashActionKbd>
											{#if !isTerminalTicketStatus(t.status)}
												<IconActionTip tip="Transfer" tone="warning">
													<button
														type="button"
														class="btn btn-square cursor-pointer btn-ghost btn-warning btn-xs"
														aria-label="Transfer"
														onclick={() => openTransfer(t)}
													>
														<ArrowRightLeft class="size-3.5" aria-hidden="true" />
													</button>
												</IconActionTip>

												{#if data.destinations.length > 0}
													<IconActionTip tip="Redirect" tone="accent">
														<button
															type="button"
															class="btn btn-square cursor-pointer btn-ghost btn-accent btn-xs"
															aria-label="Redirect"
															onclick={() => openRedirect(t)}
														>
															<CornerDownRight class="size-3.5" aria-hidden="true" />
														</button>
													</IconActionTip>
												{/if}
											{/if}
											<form
												method="POST"
												action="?/timeline"
												use:enhance={bindSubmitting(
													(v) => (busy = v),
													async ({ result, update }) => {
														await update({ reset: false });
														if (
															result.type === 'success' &&
															result.data &&
															'events' in result.data
														) {
															timelineEvents = (result.data.events as TimelineEvent[]) ?? [];
															selectedTicketId = t.id;
														}
													}
												)}
											>
												<input type="hidden" name="ticketId" value={t.id} />
												<IconActionTip tip="Timeline" tone="info">
													<button
														type="submit"
														class="btn btn-square btn-ghost btn-info btn-xs"
														class:loading={busy}
														disabled={busy}
														aria-busy={busy}
														aria-label="Timeline"
														class:cursor-pointer={!busy}
														class:cursor-not-allowed={busy}
													>
														{#if !busy}
															<History class="size-3.5" aria-hidden="true" />
														{/if}
													</button>
												</IconActionTip>
											</form>
										</div>
									</td>
									<td>{(safePage - 1) * pageSize + i + 1}</td>
									<td class="font-mono font-bold">{t.number}</td>
									<td><span class={statusBadge(t.status)}>{t.status}</span></td>
									<td>{t.priority}</td>
									<td>{shortDateTime(t.createdAt)}</td>
									<td>{shortDateTime(t.updatedAt)}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>

				{#snippet footerStart()}
					<SearchSelect
						id="agent-page-size"
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

		<aside
			class="h-fit shrink-0 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm lg:sticky lg:top-0"
		>
			<h3 class="mb-2 font-bold">Ticket timeline</h3>
			{#if !selectedTicketId}
				<p class="text-sm opacity-60">Select a ticket or load its timeline.</p>
			{:else if timelineEvents.length === 0}
				<p class="text-sm opacity-60">No events loaded. Click Timeline on a row.</p>
			{:else}
				<ul class="max-h-[28rem] space-y-2 overflow-y-auto text-sm">
					{#each timelineEvents as ev (ev.id)}
						<li class="border-l-2 border-base-300 pl-2">
							<div class="font-medium">{ev.type}</div>
							<div class="text-xs opacity-60">{shortDateTime(ev.createdAt)}</div>
						</li>
					{/each}
				</ul>
			{/if}
		</aside>
	</div>
</div>

<dialog bind:this={issueDialog} class="modal">
	<div class="modal-box w-11/12 max-w-md border border-base-300 bg-base-100 shadow-sm">
		<h2 class="mb-4 card-title font-bold text-primary">Issue ticket</h2>
		<form
			method="POST"
			action="?/issue"
			class="space-y-3"
			use:enhance={bindSubmitting(
				(v) => (issuing = v),
				async ({ result, update }) => {
					await update();
					if (result.type === 'success') issueDialog?.close();
				}
			)}
		>
			<input type="hidden" name="queueId" value={selectedQueue} />
			<label class="form-control w-full" for="issue-phone">
				<span class="label-text mb-1">Phone (SMS)</span>
				<input
					id="issue-phone"
					name="phone"
					class="input-bordered input w-full cursor-text"
					bind:value={issuePhone}
					placeholder="Optional"
				/>
			</label>
			<label class="form-control w-full" for="issue-priority">
				<span class="label-text mb-1">VIP priority</span>
				<input
					id="issue-priority"
					name="priority"
					type="number"
					class="input-bordered input w-full cursor-text"
					bind:value={issuePriority}
				/>
			</label>
			<div class="modal-action">
				<button type="button" class="btn cursor-pointer" onclick={() => issueDialog?.close()}
					>Cancel</button
				>
				<button
					type="submit"
					class="btn btn-primary"
					class:loading={issuing}
					class:btn-disabled={issuing}
					class:cursor-pointer={!issuing}
					class:cursor-not-allowed={issuing}
					disabled={issuing}
					aria-busy={issuing}>Issue</button
				>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop"><button class="cursor-pointer">close</button></form>
</dialog>

<dialog bind:this={transferDialog} class="modal">
	<div class="modal-box w-11/12 max-w-md border border-base-300 bg-base-100 shadow-sm">
		<h2 class="mb-4 card-title font-bold text-warning">Transfer ticket</h2>
		{#if actionTicket}
			<p class="mb-3 text-sm opacity-70">
				Transfer <strong class="font-mono">{actionTicket.number}</strong> to another queue.
			</p>
			<form
				method="POST"
				action="?/transfer"
				class="space-y-3"
				use:enhance={bindSubmitting(
					(v) => (transferring = v),
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') transferDialog?.close();
					}
				)}
			>
				<input type="hidden" name="ticketId" value={actionTicket.id} />
				<label class="form-control w-full" for="transfer-queue">
					<span class="label-text mb-1"
						>Queue<span class="align-top text-sm leading-none text-error" aria-hidden="true">*</span
						></span
					>
					<SearchSelect
						id="transfer-queue"
						name="toQueueId"
						options={queueOptions}
						bind:value={transferQueueId}
						required
						placeholder="Select queue"
						ariaLabel="Transfer queue"
					/>
				</label>
				<label class="form-control w-full" for="transfer-reason">
					<span class="label-text mb-1">Reason</span>
					<input
						id="transfer-reason"
						name="reason"
						class="input-bordered input w-full cursor-text"
						bind:value={transferReason}
						placeholder="Optional"
					/>
				</label>
				<div class="modal-action">
					<button type="button" class="btn cursor-pointer" onclick={() => transferDialog?.close()}
						>Cancel</button
					>
					<button
						type="submit"
						class="btn btn-warning"
						class:loading={transferring}
						class:btn-disabled={transferring}
						class:cursor-pointer={!transferring}
						class:cursor-not-allowed={transferring}
						disabled={transferring}
						aria-busy={transferring}>Transfer</button
					>
				</div>
			</form>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop"><button class="cursor-pointer">close</button></form>
</dialog>

<dialog bind:this={redirectDialog} class="modal">
	<div class="modal-box w-11/12 max-w-md border border-base-300 bg-base-100 shadow-sm">
		<h2 class="mb-4 card-title font-bold text-accent">Redirect ticket</h2>
		{#if actionTicket}
			<p class="mb-3 text-sm opacity-70">
				Redirect <strong class="font-mono">{actionTicket.number}</strong> to a destination.
			</p>
			<form
				method="POST"
				action="?/redirect"
				class="space-y-3"
				use:enhance={bindSubmitting(
					(v) => (redirecting = v),
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') redirectDialog?.close();
					}
				)}
			>
				<input type="hidden" name="ticketId" value={actionTicket.id} />
				<label class="form-control w-full" for="redirect-dest">
					<span class="label-text mb-1"
						>Destination<span class="align-top text-sm leading-none text-error" aria-hidden="true"
							>*</span
						></span
					>
					<SearchSelect
						id="redirect-dest"
						name="destinationId"
						options={destOptions}
						bind:value={redirectDestId}
						required
						placeholder="Select destination"
						ariaLabel="Redirect destination"
					/>
				</label>
				<label class="form-control w-full" for="redirect-reason">
					<span class="label-text mb-1">Note</span>
					<input
						id="redirect-reason"
						name="reason"
						class="input-bordered input w-full cursor-text"
						bind:value={redirectReason}
						placeholder="Optional"
					/>
				</label>
				<div class="modal-action">
					<button type="button" class="btn cursor-pointer" onclick={() => redirectDialog?.close()}
						>Cancel</button
					>
					<button
						type="submit"
						class="btn btn-accent"
						class:loading={redirecting}
						class:btn-disabled={redirecting}
						class:cursor-pointer={!redirecting}
						class:cursor-not-allowed={redirecting}
						disabled={redirecting}
						aria-busy={redirecting}>Redirect</button
					>
				</div>
			</form>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop"><button class="cursor-pointer">close</button></form>
</dialog>
