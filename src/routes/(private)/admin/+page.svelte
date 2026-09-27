<script lang="ts">
	import { resolve } from '$app/paths';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { ExternalLink, Layers } from '@lucide/svelte';
	import PageHeader from '#lib/component/own/local/private/PageHeader.svelte';
	import { shortDateTime } from '#lib/util/format';

	let { data } = $props();
</script>

<svelte:head>
	<title>Overview | Loomline Admin</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="flex flex-col gap-6">
	<PageHeader
		title="Overview"
		subtitle="Platform KPIs across all tenant businesses."
	/>

	<div class="stats stats-vertical border-base-300 bg-base-100 w-full shadow-sm sm:stats-horizontal border">
		<a href={resolve('/admin/businesses')} class="stat cursor-pointer hover:bg-primary/5">
			<div class="stat-title text-xs tracking-wide uppercase opacity-70">Businesses</div>
			<div class="stat-value text-primary text-2xl font-semibold">{data.kpis.businesses}</div>
			<div class="stat-desc">Manage tenants</div>
		</a>
		<a href={resolve('/admin/businesses')} class="stat cursor-pointer hover:bg-primary/5">
			<div class="stat-title text-xs tracking-wide uppercase opacity-70">Active memberships</div>
			<div class="stat-value text-2xl font-semibold">{data.kpis.memberships}</div>
			<div class="stat-desc">Across all businesses</div>
		</a>
		<a href={resolve('/admin/businesses')} class="stat cursor-pointer hover:bg-primary/5">
			<div class="stat-title text-xs tracking-wide uppercase opacity-70">Active tickets</div>
			<div class="stat-value text-2xl font-semibold">{data.kpis.activeTickets}</div>
			<div class="stat-desc">Waiting, called, serving, held</div>
		</a>
		<a href={resolve('/admin/invites')} class="stat cursor-pointer hover:bg-primary/5">
			<div class="stat-title text-xs tracking-wide uppercase opacity-70">Pending invites</div>
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
						<span class="opacity-70">{row.status}</span>
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
									<div class="tooltip tooltip-primary tooltip-right" data-tip="Open console">
										<a
											class="btn btn-ghost btn-square btn-primary btn-sm cursor-pointer"
											href={resolve(`/b/${b.id}`)}
											aria-label="Open console"
										>
											<ExternalLink class="size-4" aria-hidden="true" />
										</a>
									</div>
								</td>
								<td>{i + 1}</td>
								<td>
									<div class="font-medium">{b.name}</div>
									<div class="text-xs opacity-60">{b.slug}</div>
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
			<p class="flex items-center gap-2 px-4 py-8 text-sm opacity-60">
				<Layers class="size-4 shrink-0" aria-hidden="true" />
				No businesses yet. Create one under Businesses.
			</p>
		{/if}
	</section>
</div>
