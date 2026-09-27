<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { CircleCheck, CircleX, Monitor } from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import KpiStat from '#lib/component/own/local/private/KpiStat.svelte';
	import WashChart from '#lib/component/own/local/private/WashChart.svelte';
	import {
		areaSeriesOptions,
		barSeriesOptions,
		donutSeriesOptions,
		dualLineOptions,
		horizontalBarOptions
	} from '#lib/component/own/local/private/chart-options';

	let { data, form } = $props();

	let setupBusy = $state(false);
	let toastGone = $state(false);

	$effect(() => {
		if (form?.message) toastGone = false;
	});

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
</script>

<svelte:head>
	<title>{data.brand.name} | Loomline</title>
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

<header class="mb-6 flex flex-wrap items-center gap-4">
	{#if data.brand.imageUrl}
		<img
			src={data.brand.imageUrl}
			alt=""
			class="border-base-300 size-14 rounded-box border object-cover"
			width="56"
			height="56"
		/>
	{:else}
		<div
			class="border-base-300 bg-base-200 text-primary flex size-14 items-center justify-center rounded-box border text-xl font-bold"
			aria-hidden="true"
		>
			{data.brand.name.slice(0, 1).toUpperCase()}
		</div>
	{/if}
	<div class="min-w-0 flex-1">
		<h1 class="card-title text-primary text-2xl font-bold">{data.brand.name}</h1>
		<p class="text-base-content/65 mt-0.5 text-sm">
			{#if data.isCounterAgent}
				Ticket calling desk
			{:else if data.canAnalytics}
				Operations analytics
			{:else if data.isStaff}
				Live queue console
			{:else}
				Guest workspace
			{/if}
		</p>
	</div>
	{#if !data.isStaff}
		<a href={`/b/${data.business.id}/guest`} class="btn btn-primary cursor-pointer">Open guest desk</a>
	{:else if data.isCounterAgent}
		<a href={`/b/${data.business.id}/agent`} class="btn btn-primary cursor-pointer">Agent console</a>
	{:else if data.canAnalytics}
		<div class="flex flex-wrap items-center gap-2">
			<div class="join">
				{#each [1, 7, 30] as d}
					<a
						class="btn btn-sm join-item cursor-pointer"
						class:btn-active={data.days === d}
						href={resolve(`/b/${data.business.id}?days=${d}`)}>{d}d</a
					>
				{/each}
			</div>
			<a
				class="btn btn-sm btn-outline cursor-pointer"
				href={resolve(`/api/export/analytics?businessId=${data.business.id}&days=${data.days}`)}
				>Export CSV</a
			>
			<a href={`/b/${data.business.id}/agent`} class="btn btn-primary btn-sm cursor-pointer"
				>Agent console</a
			>
		</div>
	{:else}
		<a href={`/b/${data.business.id}/agent`} class="btn btn-primary cursor-pointer">Agent console</a>
	{/if}
</header>

{#if data.needsSetup && data.canSetup}
	<section class="border-base-300 mb-6 rounded-box border bg-base-100 p-4 shadow-sm">
		<h2 class="card-title text-secondary mb-1 font-bold">Finish setup</h2>
		<p class="text-base-content/70 mb-3 text-sm">
			Create your first department to organize counters and start serving tickets.
		</p>
		<div class="flex flex-wrap gap-2">
			<a href={`/b/${data.business.id}/departments`} class="btn btn-secondary cursor-pointer"
				>Add department</a
			>
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
				<a href={`/b/${data.business.id}/sites`} class="btn btn-outline cursor-pointer"
					>Create a site first</a
				>
			{/if}
		</div>
	</section>
{/if}

{#snippet liveTicketsCard(showViewAll: boolean)}
	<section
		class="border-base-300 w-full min-w-0 overflow-hidden rounded-box border bg-base-100 {washRecipes.tableChrome}"
		aria-label="Live tickets"
	>
		<div
			class="border-base-300 bg-base-100 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
		>
			<div class="min-w-0 flex-1">
				<h2 class="text-base-content text-base leading-tight font-bold">Live tickets</h2>
				<p class="text-base-content/60 mt-0.5 text-xs">
					Waiting, called, serving, and held right now.
				</p>
			</div>
			{#if showViewAll}
				<a
					href={`/b/${data.business.id}/tickets`}
					class="link link-primary shrink-0 cursor-pointer text-sm">View all</a
				>
			{/if}
		</div>

		{#if data.activeTickets.length === 0}
			<div
				class="text-base-content/60 flex min-h-32 items-center justify-center px-4 py-10 text-center text-sm sm:px-5"
			>
				No active tickets.
			</div>
		{:else}
			<div class="w-full min-w-0 overflow-x-auto">
				<table class="table table-zebra w-full [&_tbody_tr]:hover:bg-primary/40">
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

{#if data.isCounterAgent}
	<div class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
		<KpiStat label="Open counters" value={data.openCounterCount} />
		<KpiStat label="Waiting" value={data.kpi.waiting} />
		<KpiStat label="Called" value={data.kpi.called} />
		<KpiStat label="Serving" value={data.kpi.serving} />
		<KpiStat label="Held" value={data.kpi.held} />
	</div>

	<section class="mb-6 space-y-4">
		<h2 class="text-base font-bold">Counters</h2>
		{#if data.departments.length === 0}
			<p class="text-base-content/60 text-sm">No departments yet.</p>
		{:else}
			{#each data.departments as dept}
				<div class="border-base-300 rounded-box border bg-base-100 p-4 shadow-sm">
					<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
						<h3 class="font-semibold">{dept.name}</h3>
						<span class="text-xs opacity-60"
							>{dept.site?.name ?? 'Site'} · {dept.code} · {dept.status}</span
						>
					</div>
					{#if dept.counters.length === 0}
						<p class="text-sm opacity-60">No counters in this department.</p>
					{:else}
						<div class="flex flex-wrap gap-2">
							{#each dept.counters as c}
								<a
									href={`/b/${data.business.id}/agent?counterId=${c.id}`}
									class="btn btn-sm cursor-pointer {counterStatusClass(c.status)}"
									aria-label="Open agent at {c.label}"
								>
									<Monitor class="size-4" aria-hidden="true" />
									{c.label}
									<span class="badge badge-xs badge-ghost">{c.status}</span>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</section>

	{@render liveTicketsCard(false)}
{:else if data.canAnalytics && analytics}
	{#key data.days}
		<section class="mb-6" aria-label="Key metrics">
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
		</section>

		<section class="mb-6" aria-label="Ticket volume">
			<h2 class="mb-2 text-base font-bold">Ticket volume</h2>
			<p class="text-base-content/60 mb-3 text-sm">Daily issued tickets in the selected window.</p>
			{#if volumeChart}
				<WashChart options={volumeChart} height={280} title="Daily volume" />
			{/if}
		</section>

		<div class="mb-6 grid gap-6 lg:grid-cols-2">
			<section aria-label="Status mix">
				<h2 class="mb-2 text-base font-bold">By status</h2>
				<p class="text-base-content/60 mb-3 text-sm">Share of tickets by lifecycle status.</p>
				{#if statusChart}
					<WashChart options={statusChart} height={300} title="Status mix" />
				{:else}
					<p class="text-base-content/60 text-sm">No tickets in this window.</p>
				{/if}
			</section>

			<section aria-label="Source mix">
				<h2 class="mb-2 text-base font-bold">Channel mix</h2>
				<p class="text-base-content/60 mb-3 text-sm">Where tickets were issued from.</p>
				{#if sourceChart}
					<WashChart options={sourceChart} height={300} title="Sources" />
				{:else}
					<p class="text-base-content/60 text-sm">No source data yet.</p>
				{/if}
			</section>
		</div>

		<div class="mb-6 grid gap-6 lg:grid-cols-2">
			<section aria-label="By queue">
				<h2 class="mb-2 text-base font-bold">By queue</h2>
				<p class="text-base-content/60 mb-3 text-sm">Ticket load across queues.</p>
				{#if queueChart}
					<WashChart options={queueChart} height={320} title="Queues" />
				{:else}
					<p class="text-base-content/60 text-sm">No queue activity yet.</p>
				{/if}
			</section>

			<section aria-label="By service">
				<h2 class="mb-2 text-base font-bold">By service</h2>
				<p class="text-base-content/60 mb-3 text-sm">Demand by service offering.</p>
				{#if serviceChart}
					<WashChart options={serviceChart} height={320} title="Services" />
				{:else}
					<p class="text-base-content/60 text-sm">No service activity yet.</p>
				{/if}
			</section>
		</div>

		<section class="mb-6" aria-label="Wait and serve times">
			<h2 class="mb-2 text-base font-bold">Wait and serve times</h2>
			<p class="text-base-content/60 mb-3 text-sm">
				Average wait and serve duration by day (minutes).
			</p>
			{#if waitChart}
				<WashChart options={waitChart} height={280} title="Timing trend" />
			{/if}
		</section>

		<div class="mb-6 grid gap-6 lg:grid-cols-2">
			<section aria-label="Outcomes">
				<h2 class="mb-2 text-base font-bold">Served vs no-show</h2>
				<p class="text-base-content/60 mb-3 text-sm">Completed tickets compared with no-shows.</p>
				{#if outcomeChart}
					<WashChart options={outcomeChart} height={280} title="Outcomes" />
				{/if}
			</section>

			<section aria-label="Peak hours">
				<h2 class="mb-2 text-base font-bold">Peak hours</h2>
				<p class="text-base-content/60 mb-3 text-sm">Busiest issue hours (UTC).</p>
				{#if peakChart}
					<WashChart options={peakChart} height={280} title="Hourly demand" />
				{:else}
					<p class="text-base-content/60 text-sm">No hourly data yet.</p>
				{/if}
			</section>
		</div>

		{#if analytics.devices.length > 0}
			<section class="mb-6" aria-label="Device activity">
				<h2 class="mb-2 text-base font-bold">Device activity</h2>
				<p class="text-base-content/60 mb-3 text-sm">
					Display devices: {analytics.deviceActive} active, {analytics.deviceInactive} inactive.
				</p>
				<div class="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each analytics.devices as d}
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
			<section class="mb-6" aria-label="Sites">
				<h2 class="mb-2 text-base font-bold">Sites</h2>
				<p class="text-base-content/60 mb-3 text-sm">Ticket volume by site in this window.</p>
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
								{#each analytics.siteRollup as row, i}
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
	{/key}

	<section class="mb-2" aria-label="Live queue snapshot">
		<div class="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
			<KpiStat label="Open counters" value={data.openCounterCount} />
			<KpiStat label="Waiting" value={data.kpi.waiting} />
			<KpiStat label="Called" value={data.kpi.called} />
			<KpiStat label="Serving" value={data.kpi.serving} />
			<KpiStat label="Held" value={data.kpi.held} />
		</div>
		{@render liveTicketsCard(true)}
	</section>
{:else}
	{#if data.isStaff}
		<div class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
			<KpiStat label="Open counters" value={data.openCounterCount} />
			<KpiStat label="Waiting" value={data.kpi.waiting} />
			<KpiStat label="Called" value={data.kpi.called} />
			<KpiStat label="Serving" value={data.kpi.serving} />
			<KpiStat label="Held" value={data.kpi.held} />
		</div>
	{/if}

	{@render liveTicketsCard(false)}
{/if}
