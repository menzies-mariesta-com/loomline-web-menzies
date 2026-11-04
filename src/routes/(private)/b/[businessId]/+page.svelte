<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		CalendarDays,
		CircleCheck,
		CircleX,
		Headset,
		ListOrdered,
		MapPin,
		Monitor,
		Settings2,
		Tablet,
		Ticket,
		Users
	} from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import KpiStat from '#lib/component/own/local/private/KpiStat.svelte';
	import PageHeader from '#lib/component/own/local/private/PageHeader.svelte';
	import WashChart from '#lib/component/own/local/private/WashChart.svelte';
	import {
		areaSeriesOptions,
		barSeriesOptions,
		donutSeriesOptions,
		dualLineOptions,
		horizontalBarOptions
	} from '#lib/component/own/local/private/chart-options';
	import ToastDismissButton from '#lib/component/own/local/private/ToastDismissButton.svelte';

	let { data, form } = $props();

	let setupBusy = $state(false);
	let toastGone = $state(false);

	$effect(() => {
		if (form?.message) toastGone = false;
	});

	const base = $derived(`/b/${data.business.id}`);

	function counterStatusClass(status: string) {
		if (status === 'open') return 'btn-success';
		if (status === 'paused') return 'btn-warning';
		return 'btn-ghost';
	}

	function msToMin(ms: number) {
		return Math.round(ms / 60_000);
	}

	function titleCase(value: string) {
		return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function statusBadge(status: string) {
		if (status === 'completed') return washRecipes.badgeSoft('success');
		if (status === 'serving' || status === 'called') return washRecipes.badgeSoft('info');
		if (status === 'waiting' || status === 'held') return washRecipes.badgeSoft('warning');
		if (status === 'no_show' || status === 'cancelled') return washRecipes.badgeSoft('error');
		return 'badge badge-ghost';
	}

	const analytics = $derived(data.analytics);
	const inv = $derived(data.inventory);

	const volumeChart = $derived(
		analytics
			? areaSeriesOptions(
					analytics.dailyVolume.map((d) => d.label),
					analytics.dailyVolume.map((d) => d.count),
					'Tickets'
				)
			: null
	);

	const statusChart = $derived(
		analytics && analytics.byStatus.length
			? donutSeriesOptions(
					analytics.byStatus.map((s) => titleCase(s.status)),
					analytics.byStatus.map((s) => s.count)
				)
			: null
	);

	const queueChart = $derived(
		analytics && analytics.byQueue.length
			? horizontalBarOptions(
					analytics.byQueue.map((q) => q.name),
					analytics.byQueue.map((q) => q.count),
					'Tickets'
				)
			: null
	);

	const serviceChart = $derived(
		analytics && analytics.byService.length
			? barSeriesOptions(
					analytics.byService.map((s) => s.name),
					analytics.byService.map((s) => s.count),
					'Tickets'
				)
			: null
	);

	const waitChart = $derived(
		analytics
			? dualLineOptions(
					analytics.waitTrend.map((d) => d.label),
					analytics.waitTrend.map((d) => d.avgWaitMin),
					analytics.waitTrend.map((d) => d.avgServeMin)
				)
			: null
	);

	const sourceChart = $derived(
		analytics && analytics.bySource.length
			? donutSeriesOptions(
					analytics.bySource.map((s) => titleCase(s.source)),
					analytics.bySource.map((s) => s.count)
				)
			: null
	);

	const outcomeChart = $derived(
		analytics
			? barSeriesOptions(
					['Completed', 'No show'],
					[analytics.completed, analytics.noShow],
					'Tickets'
				)
			: null
	);

	const peakChart = $derived(
		analytics && analytics.peakHours.length
			? barSeriesOptions(
					analytics.peakHours
						.slice()
						.sort((a, b) => a.hour - b.hour)
						.map((p) => `${String(p.hour).padStart(2, '0')}:00`),
					analytics.peakHours
						.slice()
						.sort((a, b) => a.hour - b.hour)
						.map((p) => p.count),
					'Tickets'
				)
			: null
	);

	const deviceChart = $derived(
		analytics && analytics.devices.length
			? barSeriesOptions(
					analytics.devices.map((d) => titleCase(d.type)),
					analytics.devices.map((d) => d.active + d.inactive),
					'Devices'
				)
			: null
	);

	const quickActions = $derived.by(() => {
		const items: {
			href: string;
			label: string;
			hint: string;
			icon: typeof Headset;
		}[] = [];

		if (data.isCounterAgent) {
			items.push({
				href: `${base}/agent`,
				label: 'Agent console',
				hint: 'Call and serve tickets',
				icon: Headset
			});
			return items;
		}

		if (!data.isStaff) {
			items.push({
				href: `${base}/guest`,
				label: 'Guest desk',
				hint: 'Issue or track tickets',
				icon: Ticket
			});
			return items;
		}

		items.push(
			{
				href: `${base}/agent`,
				label: 'Agent console',
				hint: 'Call and serve',
				icon: Headset
			},
			{
				href: `${base}/queues`,
				label: 'Queues',
				hint: `${inv.queuesActive} active`,
				icon: ListOrdered
			},
			{
				href: `${base}/tickets`,
				label: 'Tickets',
				hint: `${data.kpi.waiting} waiting`,
				icon: Ticket
			},
			{
				href: `${base}/devices`,
				label: 'Devices',
				hint: `${inv.devicesActive} active`,
				icon: Tablet
			},
			{
				href: `${base}/appointments`,
				label: 'Appointments',
				hint: `${inv.appointmentsToday} today`,
				icon: CalendarDays
			},
			{
				href: `${base}/sites`,
				label: 'Sites',
				hint: `${inv.sitesOpen} open`,
				icon: MapPin
			}
		);

		if (data.canSetup) {
			items.push(
				{
					href: `${base}/team`,
					label: 'Team',
					hint: `${inv.team} members`,
					icon: Users
				},
				{
					href: `${base}/config`,
					label: 'Config',
					hint: 'Business settings',
					icon: Settings2
				}
			);
		}

		return items;
	});

	const subtitle = $derived(
		data.isCounterAgent
			? 'Ticket calling desk and live floor status.'
			: data.canAnalytics
				? 'Floor operations, live queues, and period analytics.'
				: data.isStaff
					? 'Live queue console and floor shortcuts.'
					: 'Guest workspace for this business.'
	);
</script>

<svelte:head>
	<title>Overview | {data.brand.name} | NextUp</title>
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

<div class="flex flex-col gap-6">
	<PageHeader title="Overview" {subtitle}>
		{#snippet actions()}
			<div class="flex flex-wrap items-center gap-3">
				{#if !data.isStaff}
					<a href={`${base}/guest`} class="btn cursor-pointer btn-primary">Open guest desk</a>
				{:else if data.isCounterAgent}
					<a href={`${base}/agent`} class="btn cursor-pointer btn-primary">Agent console</a>
				{:else if data.canAnalytics}
					<div class="join">
						{#each [1, 7, 30] as d (d)}
							<a
								class="btn join-item cursor-pointer btn-sm"
								class:btn-active={data.days === d}
								href={resolve(`/b/${data.business.id}?days=${d}`)}>{d}d</a
							>
						{/each}
					</div>
					<a
						class="btn cursor-pointer btn-outline btn-sm"
						href={resolve(`/api/export/analytics?businessId=${data.business.id}&days=${data.days}`)}
						>Export CSV</a
					>
					<a href={`${base}/agent`} class="btn cursor-pointer btn-primary btn-sm">Agent console</a>
				{:else}
					<a href={`${base}/agent`} class="btn cursor-pointer btn-primary">Agent console</a>
				{/if}
			</div>
		{/snippet}
	</PageHeader>

	{#if data.needsSetup && data.canSetup}
		<section
			class="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm {washRecipes.paneCard}"
		>
			<h2 class="mb-1 card-title font-bold text-secondary">Finish setup</h2>
			<p class="mb-3 text-sm text-base-content/70">
				Create your first department to organize counters and start serving tickets.
			</p>
			<div class="flex flex-wrap gap-2">
				<a href={`${base}/departments`} class="btn cursor-pointer btn-secondary">Add department</a>
				{#if data.sites.length > 0}
					<form
						method="POST"
						action="?/createDefaultDepartment"
						use:enhance={bindSubmitting((v: boolean) => (setupBusy = v))}
					>
						<button
							type="submit"
							class="btn btn-outline"
							class:loading={setupBusy}
							class:btn-disabled={setupBusy}
							class:cursor-pointer={!setupBusy}
							class:cursor-not-allowed={setupBusy}
							disabled={setupBusy}
							aria-busy={setupBusy}
						>
							Create General
						</button>
					</form>
				{:else}
					<a href={`${base}/sites`} class="btn cursor-pointer btn-outline">Create a site first</a>
				{/if}
			</div>
		</section>
	{/if}

	{#if data.canSetup && inv.devicesActive === 0}
		<section
			class="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm {washRecipes.paneCard}"
		>
			<h2 class="mb-1 card-title font-bold text-info">Open the floor</h2>
			<p class="mb-3 text-sm text-base-content/70">
				TVs and kiosks are registered under Devices (pairing links). Counters in setup do not appear
				on a display until someone issues a ticket and an agent presses Call next.
			</p>
			<a href={`${base}/devices`} class="btn cursor-pointer btn-info">Add TV &amp; kiosk</a>
		</section>
	{/if}

	{#if data.canSetup}
		<section aria-label="Floor inventory">
			<h2 class="mb-3 text-base font-bold">Floor inventory</h2>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
				<KpiStat
					label="Sites"
					value={inv.sites}
					hint={`${inv.sitesOpen} open`}
					href={`${base}/sites`}
				/>
				<KpiStat
					label="Queues"
					value={inv.queuesActive}
					hint={`${inv.queues} total`}
					href={`${base}/queues`}
				/>
				<KpiStat
					label="Devices"
					value={inv.devicesActive}
					hint={`${inv.devicesInactive} inactive`}
					href={`${base}/devices`}
				/>
				<KpiStat
					label="Open counters"
					value={inv.openCounters}
					hint={`${inv.counters} total`}
					href={`${base}/counters`}
				/>
				<KpiStat label="Team" value={inv.team} href={`${base}/team`} />
				<KpiStat
					label="Appointments"
					value={inv.appointmentsToday}
					hint="Scheduled today"
					href={`${base}/appointments`}
				/>
			</div>
		</section>
	{/if}

	{#if data.isStaff}
		<section aria-label="Live queue">
			<h2 class="mb-3 text-base font-bold">Live queue</h2>
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{#if data.canSetup}
					<KpiStat label="Waiting" value={data.kpi.waiting} href={`${base}/tickets`} />
					<KpiStat label="Called" value={data.kpi.called} href={`${base}/tickets`} />
					<KpiStat label="Serving" value={data.kpi.serving} href={`${base}/tickets`} />
					<KpiStat label="Held" value={data.kpi.held} href={`${base}/tickets`} />
				{:else}
					<KpiStat label="Waiting" value={data.kpi.waiting} />
					<KpiStat label="Called" value={data.kpi.called} />
					<KpiStat label="Serving" value={data.kpi.serving} />
					<KpiStat label="Held" value={data.kpi.held} />
				{/if}
			</div>
		</section>
	{/if}

	{#if quickActions.length > 0}
		<section aria-label="Quick actions">
			<h2 class="mb-3 text-base font-bold">Quick actions</h2>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each quickActions as action (action.href)}
					{@const Icon = action.icon}
					<a
						href={action.href}
						class="flex cursor-pointer items-start gap-3 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm transition-colors hover:bg-primary/5 {washRecipes.paneCard}"
					>
						<span
							class="flex size-10 shrink-0 items-center justify-center rounded-box bg-primary/10 text-primary"
							aria-hidden="true"
						>
							<Icon class="size-5" />
						</span>
						<span class="min-w-0">
							<span class="block font-semibold text-base-content">{action.label}</span>
							<span class="mt-0.5 block text-xs text-base-content/60">{action.hint}</span>
						</span>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if data.isCounterAgent}
		<section class="space-y-4" aria-label="Counters">
			<h2 class="text-base font-bold">Counters</h2>
			{#if data.departments.length === 0}
				<p class="text-sm text-base-content/60">No departments yet.</p>
			{:else}
				{#each data.departments as dept (dept.id)}
					<div
						class="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm {washRecipes.paneCard}"
					>
						<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
							<h3 class="font-semibold">{dept.name}</h3>
							<span class="text-ink-muted text-xs"
								>{dept.site?.name ?? 'Site'} · {dept.code} · {dept.status}</span
							>
						</div>
						{#if dept.counters.length === 0}
							<p class="text-ink-muted text-sm">No counters in this department.</p>
						{:else}
							<div class="flex flex-wrap gap-2">
								{#each dept.counters as c (c.id)}
									<a
										href={`${base}/agent?counterId=${c.id}`}
										class="btn cursor-pointer btn-sm {counterStatusClass(c.status)}"
										aria-label="Open agent at {c.label}"
									>
										<Monitor class="size-4" aria-hidden="true" />
										{c.label}
										<span class="badge badge-ghost badge-xs">{c.status}</span>
									</a>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</section>
	{/if}

	{#snippet liveTicketsCard(showViewAll: boolean)}
		<section
			class="w-full min-w-0 overflow-hidden rounded-box border border-base-300 bg-base-100 {washRecipes.tableChrome}"
			aria-label="Live tickets"
		>
			<div
				class="flex shrink-0 items-center justify-between gap-3 border-b border-base-300 bg-base-100 px-4 py-3 sm:px-5"
			>
				<div class="min-w-0 flex-1">
					<h2 class="text-base leading-tight font-bold text-base-content">Live tickets</h2>
					<p class="mt-0.5 text-xs text-base-content/60">
						Waiting, called, serving, and held right now.
					</p>
				</div>
				{#if showViewAll}
					<a href={`${base}/tickets`} class="shrink-0 link cursor-pointer text-sm link-primary"
						>View all</a
					>
				{/if}
			</div>

			{#if data.activeTickets.length === 0}
				<div
					class="flex min-h-32 items-center justify-center px-4 py-10 text-center text-sm text-base-content/60 sm:px-5"
				>
					No active tickets.
				</div>
			{:else}
				<div class="w-full min-w-0 overflow-x-auto">
					<table class="table w-full table-zebra [&_tbody_tr]:hover:bg-primary/40">
						<thead class="bg-base-100">
							<tr>
								<th class="w-14">No</th>
								<th>Number</th>
								<th>Status</th>
								<th>Source</th>
								<th>Updated</th>
							</tr>
						</thead>
						<tbody>
							{#each data.activeTickets as t, i (t.id)}
								<tr>
									<td>{i + 1}</td>
									<td class="font-mono font-semibold tracking-wide">{t.number}</td>
									<td>
										<span class={statusBadge(t.status)}>{t.status}</span>
									</td>
									<td>{titleCase(t.source)}</td>
									<td class="whitespace-nowrap">{shortDateTime(t.updatedAt)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{/snippet}

	{#snippet recentActivityCard()}
		<section
			class="w-full min-w-0 overflow-hidden rounded-box border border-base-300 bg-base-100 {washRecipes.tableChrome}"
			aria-label="Recent activity"
		>
			<div
				class="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-base-300 bg-base-100 px-4 py-3 sm:px-5"
			>
				<div class="min-w-0">
					<h2 class="text-base leading-tight font-bold text-base-content">Recent activity</h2>
					<p class="mt-0.5 text-xs text-base-content/60">Latest ticket events on this floor.</p>
				</div>
				{#if data.canSetup}
					<a class="link cursor-pointer text-sm link-primary" href={`${base}/logs`}>View all logs</a
					>
				{/if}
			</div>

			{#if data.recentEvents.length === 0}
				<div
					class="flex min-h-32 items-center justify-center px-4 py-10 text-center text-sm text-base-content/60 sm:px-5"
				>
					No recent activity yet.
				</div>
			{:else}
				<ul class="divide-y divide-base-300">
					{#each data.recentEvents as event (event.id)}
						<li class="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
							<div class="min-w-0">
								<p class="font-mono text-sm font-semibold tracking-wide">{event.ticketNumber}</p>
								<p class="mt-0.5 text-xs text-base-content/70">{titleCase(event.type)}</p>
							</div>
							<time class="text-ink-muted shrink-0 text-xs whitespace-nowrap"
								>{shortDateTime(event.createdAt)}</time
							>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/snippet}

	{#if data.isStaff}
		<section class="grid gap-6 lg:grid-cols-2" aria-label="Live floor">
			{@render liveTicketsCard(data.canSetup)}
			{@render recentActivityCard()}
		</section>
	{:else}
		{@render liveTicketsCard(false)}
	{/if}

	{#if data.canAnalytics && analytics}
		{#key data.days}
			<section aria-label="Period analytics" class="flex flex-col gap-6">
				<div class="flex flex-wrap items-end justify-between gap-2">
					<div>
						<h2 class="text-base font-bold">Period analytics</h2>
						<p class="text-sm text-base-content/60">
							{analytics.days} day window across tickets, queues, and devices.
						</p>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					<KpiStat label="Today" value={analytics.ticketsToday} hint="Tickets issued" />
					<KpiStat label="This week" value={analytics.ticketsWeek} hint="Last 7 days" />
					<KpiStat
						label="Period"
						value={analytics.ticketsPeriod}
						hint={`${analytics.days} day window`}
					/>
					<KpiStat label="Completed" value={analytics.completed} />
					<KpiStat label="No show" value={analytics.noShow} />
					<KpiStat
						label="Avg wait"
						value={`${msToMin(analytics.avgWaitMs)}m`}
						hint={`Serve ${msToMin(analytics.avgServeMs)}m`}
					/>
				</div>

				<section aria-label="Ticket volume">
					<h3 class="mb-2 text-sm font-bold">Ticket volume</h3>
					<p class="mb-3 text-sm text-base-content/60">
						Daily issued tickets in the selected window.
					</p>
					{#if volumeChart}
						<WashChart options={volumeChart} height={280} title="Daily volume" />
					{/if}
				</section>

				<div class="grid gap-6 lg:grid-cols-2">
					<section aria-label="Status mix">
						<h3 class="mb-2 text-sm font-bold">By status</h3>
						<p class="mb-3 text-sm text-base-content/60">Share of tickets by lifecycle status.</p>
						{#if statusChart}
							<WashChart options={statusChart} height={300} title="Status mix" />
						{:else}
							<p class="text-sm text-base-content/60">No tickets in this window.</p>
						{/if}
					</section>

					<section aria-label="Source mix">
						<h3 class="mb-2 text-sm font-bold">Channel mix</h3>
						<p class="mb-3 text-sm text-base-content/60">Where tickets were issued from.</p>
						{#if sourceChart}
							<WashChart options={sourceChart} height={300} title="Sources" />
						{:else}
							<p class="text-sm text-base-content/60">No source data yet.</p>
						{/if}
					</section>
				</div>

				<div class="grid gap-6 lg:grid-cols-2">
					<section aria-label="By queue">
						<h3 class="mb-2 text-sm font-bold">By queue</h3>
						<p class="mb-3 text-sm text-base-content/60">Ticket load across queues.</p>
						{#if queueChart}
							<WashChart options={queueChart} height={320} title="Queues" />
						{:else}
							<p class="text-sm text-base-content/60">No queue activity yet.</p>
						{/if}
					</section>

					<section aria-label="By service">
						<h3 class="mb-2 text-sm font-bold">By service</h3>
						<p class="mb-3 text-sm text-base-content/60">Demand by service offering.</p>
						{#if serviceChart}
							<WashChart options={serviceChart} height={320} title="Services" />
						{:else}
							<p class="text-sm text-base-content/60">No service activity yet.</p>
						{/if}
					</section>
				</div>

				<section aria-label="Wait and serve times">
					<h3 class="mb-2 text-sm font-bold">Wait and serve times</h3>
					<p class="mb-3 text-sm text-base-content/60">
						Average wait and serve duration by day (minutes).
					</p>
					{#if waitChart}
						<WashChart options={waitChart} height={280} title="Timing trend" />
					{/if}
				</section>

				<div class="grid gap-6 lg:grid-cols-2">
					<section aria-label="Outcomes">
						<h3 class="mb-2 text-sm font-bold">Served vs no-show</h3>
						<p class="mb-3 text-sm text-base-content/60">
							Completed tickets compared with no-shows.
						</p>
						{#if outcomeChart}
							<WashChart options={outcomeChart} height={280} title="Outcomes" />
						{/if}
					</section>

					<section aria-label="Peak hours">
						<h3 class="mb-2 text-sm font-bold">Peak hours</h3>
						<p class="mb-3 text-sm text-base-content/60">Busiest issue hours (UTC).</p>
						{#if peakChart}
							<WashChart options={peakChart} height={280} title="Hourly demand" />
						{:else}
							<p class="text-sm text-base-content/60">No hourly data yet.</p>
						{/if}
					</section>
				</div>

				{#if analytics.devices.length > 0}
					<section aria-label="Device activity">
						<h3 class="mb-2 text-sm font-bold">Device activity</h3>
						<p class="mb-3 text-sm text-base-content/60">
							Display devices: {analytics.deviceActive} active, {analytics.deviceInactive} inactive.
						</p>
						<div class="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{#each analytics.devices as d (d.type)}
								<KpiStat
									label={titleCase(d.type)}
									value={d.active}
									hint={`${d.inactive} inactive`}
								/>
							{/each}
						</div>
						{#if deviceChart}
							<WashChart options={deviceChart} height={240} title="Devices by type" />
						{/if}
					</section>
				{/if}

				{#if analytics.siteRollup.length > 0}
					<section aria-label="Sites">
						<h3 class="mb-2 text-sm font-bold">Sites</h3>
						<p class="mb-3 text-sm text-base-content/60">Ticket volume by site in this window.</p>
						<div class="rounded-box border border-base-300 bg-base-100 {washRecipes.tableChrome}">
							<div class="overflow-x-auto">
								<table class="table table-zebra table-sm [&_tbody_tr]:hover:bg-primary/40">
									<thead>
										<tr>
											<th>No</th>
											<th>Site</th>
											<th>Tickets</th>
											<th>Completed</th>
										</tr>
									</thead>
									<tbody>
										{#each analytics.siteRollup as row, i (row.siteId)}
											<tr>
												<td>{i + 1}</td>
												<td>{row.name}</td>
												<td>{row.count}</td>
												<td>{row.completed}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					</section>
				{/if}
			</section>
		{/key}
	{/if}
</div>
