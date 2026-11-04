<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { shortDateTime } from '#lib/util/format';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';

	let { data, form } = $props();
	let queueId = $state('');
	let bookSiteId = $state('');
	let bookServiceId = $state('');

	$effect(() => {
		if (!queueId && data.queues[0]) queueId = data.queues[0].id;
		if (!bookSiteId && data.sites[0]) bookSiteId = data.sites[0].id;
		if (!bookServiceId && data.services[0]) bookServiceId = data.services[0].id;
	});
</script>

<svelte:head>
	<title>Guest portal | {data.business.name}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<h2 class="mb-3 card-title font-bold text-primary">Guest portal</h2>
{#if form?.message}
	<div class="mb-3 alert alert-success">
		<span>{form.message}</span>
		{#if form.token}
			<a class="link cursor-pointer" href={resolve(`/t/${form.token}`)}>Open ticket</a>
		{/if}
	</div>
{/if}

<form method="POST" action="?/takeNumber" class="mb-6 flex flex-wrap gap-2" use:enhance>
	<div class="min-w-[12rem] flex-1">
		<SearchSelect
			id="guest-queueId"
			name="queueId"
			bind:value={queueId}
			required
			options={data.queues.map((q) => ({ value: q.id, label: q.name }))}
			placeholder="Select queue"
			ariaLabel="Queue"
		/>
	</div>
	<input name="phone" class="input-bordered input cursor-text" placeholder="Phone for SMS" />
	<button type="submit" class="btn cursor-pointer btn-primary">Take number</button>
</form>

<form method="POST" action="?/book" class="mb-6 flex flex-wrap gap-2" use:enhance>
	<div class="min-w-[10rem] flex-1">
		<SearchSelect
			id="guest-siteId"
			name="siteId"
			bind:value={bookSiteId}
			required
			options={data.sites.map((s) => ({ value: s.id, label: s.name }))}
			placeholder="Select site"
			ariaLabel="Site"
		/>
	</div>
	<div class="min-w-[10rem] flex-1">
		<SearchSelect
			id="guest-serviceId"
			name="serviceId"
			bind:value={bookServiceId}
			required
			options={data.services.map((s) => ({ value: s.id, label: s.name }))}
			placeholder="Select service"
			ariaLabel="Service"
		/>
	</div>
	<input name="startsAt" type="datetime-local" class="input-bordered input cursor-text" required />
	<input name="phone" class="input-bordered input cursor-text" placeholder="Phone" />
	<button type="submit" class="btn cursor-pointer btn-secondary">Book appointment</button>
</form>

<h3 class="font-semibold">My tickets</h3>
<ul class="mb-4 list-disc pl-5">
	{#each data.myTickets as t}
		<li>
			{t.number} · {t.status} ·
			<a class="link cursor-pointer" href={resolve(`/t/${t.publicToken}`)}>QR</a>
		</li>
	{/each}
</ul>

<h3 class="font-semibold">My appointments</h3>
<ul class="list-disc pl-5">
	{#each data.myAppts as a}
		<li>{shortDateTime(a.startsAt)} · {a.status}</li>
	{/each}
</ul>
