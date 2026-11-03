<script lang="ts">
	import { shortDateTime } from '#lib/util/format';
	import QRCode from './qr.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Ticket {data.ticket.number} | NextUp</title>
	<meta name="robots" content="noindex,nofollow" />
	<meta name="description" content="Track your NextUp queue ticket status." />
</svelte:head>

<div class="mx-auto max-w-lg py-6 text-center">
	<p class="text-sm opacity-70">{data.ticket.business?.name}</p>
	<h1 class="mt-2 text-5xl font-bold tracking-tight">{data.ticket.number}</h1>
	<p class="mt-2"><span class="badge badge-lg">{data.ticket.status}</span></p>
	{#if data.position}
		<p class="mt-4 text-lg">Position in queue: <strong>{data.position}</strong> of {data.waitingCount}</p>
	{/if}
	{#if data.counterLabel}
		<p class="mt-2">Counter: <strong>{data.counterLabel}</strong></p>
	{/if}
	<div class="mt-6 flex justify-center">
		<QRCode value={`/t/${data.ticket.publicToken}`} />
	</div>
	<p class="mt-4 text-xs opacity-60">Issued {shortDateTime(data.ticket.createdAt)}</p>
</div>
