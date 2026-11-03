<script lang="ts">
	import { resolve } from '$app/paths';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { ExternalLink, Layers, Logs } from '@lucide/svelte';
	import PageHeader from '#lib/component/own/local/private/PageHeader.svelte';
	import { shortDateTime } from '#lib/util/format';
	import IconActionTip from '#lib/component/wash/tooltip/IconActionTip.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Overview | NextUp Admin</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="flex flex-col gap-6">
	<PageHeader
		title="Overview"
		subtitle="Platform KPIs across all tenant businesses."
	/>

	<div class="stats stats-vertical border-base-300 bg-base-100 w-full shadow-sm sm:stats-horizontal border">
		<a href={resolve('/admin/businesses')} class="stat cursor-pointer hover:bg-primary/5">
			<div class="stat-title text-ink-muted text-xs tracking-wide uppercase">Businesses</div>
			<div class="stat-value text-primary text-2xl font-semibold">{data.kpis.businesses}</div>
			<div class="stat-desc">Manage tenants</div>
		</a>
		<a href={resolve('/admin/businesses')} class="stat cursor-pointer hover:bg-primary/5">
			<div class="stat-title text-ink-muted text-xs tracking-wide uppercase">Active memberships</div>
			<div class="stat-value text-2xl font-semibold">{data.kpis.memberships}</div>
			<div class="stat-desc">Across all businesses</div>
		</a>
		<a href={resolve('/admin/businesses')} class="stat cursor-pointer hover:bg-primary/5">
			<div class="stat-title text-ink-muted text-xs tracking-wide uppercase">Active tickets</div>
			<div class="stat-value text-2xl font-semibold">{data.kpis.activeTickets}</div>
			<div class="stat-desc">Waiting, called, serving, held</div>
		</a>
		<a href={resolve('/admin/invites')} class="stat cursor-pointer hover:bg-primary/5">
			<div class="stat-title text-ink-muted text-xs tracking-wide uppercase">Pending invites</div>
			<div class="stat-value text-2xl font-semibold">{data.kpis.pendingInvites}</div>
			<div class="stat-desc">Owner invites</div>
		</a>
	</div>

	{#if data.statusBreakdown.length}
		<section class="border-base-300 rounded-box border bg-base-100 p-4 {washRecipes.paneCard}">
			<h2 class="card-title text-secondary mb-3 font-bold">Business status</h2>
			<div class="flex flex-wrap gap-2">
				{#each data.statusBreakdown as row (row.status)}
					<span class="badge badge-outline badge-lg gap-1.5">
						<span class="text-ink-muted">{row.status}</span>
						<span class="font-semibold">{row.n}</span>
					</span>
				{/each}
			</div>
		</section>
	{/if}

	<section class="border-base-300 rounded-box flex flex-col overflow-hidden border bg-base-100">
		<div class="border-base-300 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
			<h2 class="card-title text-secondary font-bold">Recent businesses</h2>
			<a class="link link-primary cursor-pointer text-sm" href={resolve('/admin/businesses')}
				>Manage all</a
			>
		</div>

		{#if data.recentBusinesses.length}
			<div class="overflow-x-auto">
				<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
					<thead>
						<tr>
							<th>Actions</th>
							<th>No</th>
							<th>Name</th>
							<th>Template</th>
							<th>Status</th>
							<th>Created</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentBusinesses as b, i (b.id)}
							<tr>
								<td class="whitespace-nowrap">
									<div class="flex items-center gap-0.5">
										<IconActionTip tip="Open console" tone="primary">
<a
												class="btn btn-ghost btn-square btn-primary btn-sm cursor-pointer"
												href={`/b/${b.id}`}
												aria-label="Open console"
											>
												<ExternalLink class="size-4" aria-hidden="true" />
											</a>
										</IconActionTip>

										<IconActionTip tip="View logs" tone="info">
<a
												class="btn btn-ghost btn-square btn-info btn-sm cursor-pointer"
												href={`/b/${b.id}/logs`}
												aria-label="View logs"
											>
												<Logs class="size-4" aria-hidden="true" />
											</a>
										</IconActionTip>

									</div>
								</td>
								<td>{i + 1}</td>
								<td>
									<div class="font-medium">{b.name}</div>
									<div class="text-ink-muted text-xs">{b.slug}</div>
								</td>
								<td>{b.industryPack?.name ?? '-'}</td>
								<td><span class="badge badge-outline">{b.status}</span></td>
								<td>{shortDateTime(b.createdAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-ink-muted flex items-center gap-2 px-4 py-8 text-sm">
				<Layers class="size-4 shrink-0" aria-hidden="true" />
				No businesses yet. Create one under Businesses.
			</p>
		{/if}
	</section>
</div>
