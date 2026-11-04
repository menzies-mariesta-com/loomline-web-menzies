<script lang="ts">
	import { resolve } from '$app/paths';
	import ClientShell from '#lib/component/own/local/private/ClientShell.svelte';
	import { m } from '#lib/paraglide/messages';
	import { ArrowRight, Shield } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{m.workspaces_title()} | {m.brand_nextup()}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<ClientShell platformAdmin={data.platformAdmin}>
	<div class="mx-auto flex w-full max-w-lg flex-col gap-4">
		<div>
			<h1 class="card-title font-bold text-primary">{m.workspaces_title()}</h1>
			<p class="text-ink-muted text-sm">{m.workspaces_pick_lead()}</p>
		</div>

		{#if data.platformAdmin}
			<a href={resolve('/admin')} class="btn w-fit cursor-pointer gap-2 btn-outline btn-sm">
				<Shield class="size-4" aria-hidden="true" />
				{m.common_nextup_admin()}
			</a>
		{/if}

		<ul class="menu w-full rounded-box bg-base-200">
			{#each data.memberships as membership (membership.id)}
				{#if membership.business}
					<li>
						<a class="cursor-pointer" href={resolve(`/b/${membership.business.id}`)}>
							<span class="flex-1">{membership.business.name}</span>
							<span class="badge badge-sm">{membership.role}</span>
							<ArrowRight class="size-4 opacity-50" aria-hidden="true" />
						</a>
					</li>
				{/if}
			{:else}
				<li class="text-ink-muted disabled"><span>{m.account_no_memberships()}</span></li>
			{/each}
		</ul>
	</div>
</ClientShell>
