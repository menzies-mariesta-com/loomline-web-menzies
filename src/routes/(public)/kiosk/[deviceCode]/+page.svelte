<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { bindSubmitting } from '#lib/tool/form-submit';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Kiosk | {data.businessName}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="mx-auto max-w-2xl py-8">
	<h1 class="mb-2 text-center text-3xl font-bold">{data.businessName}</h1>
	<p class="mb-6 text-center opacity-70">Select a service to take a number</p>

	{#if form?.success && form.number}
		<div class="alert alert-success mb-6 flex-col items-center text-center">
			<span class="text-4xl font-bold">{form.number}</span>
			<span>{form.message}</span>
			{#if form.token}
				<a class="btn btn-sm cursor-pointer" href={resolve(`/t/${form.token}`)}>View ticket / QR</a>
			{/if}
		</div>
	{:else if form?.message}
		<div class="alert alert-error mb-4"><span>{form.message}</span></div>
	{/if}

	<div class="grid gap-3 sm:grid-cols-2">
		{#each data.queues as q}
			<form method="POST" action="?/issue" use:enhance={bindSubmitting((v) => (submitting = v))}>
				<input type="hidden" name="queueId" value={q.id} />
				<button
					type="submit"
					class="btn btn-primary btn-lg h-auto min-h-24 w-full flex-col gap-1 py-4"
					class:loading={submitting}
					disabled={submitting}
					aria-busy={submitting}
					class:cursor-pointer={!submitting}
					class:cursor-not-allowed={submitting}
					class:btn-disabled={submitting}
				>
					<span class="text-xl">{q.service?.name ?? q.name}</span>
					<span class="text-xs font-normal opacity-80">{q.name}</span>
				</button>
			</form>
		{/each}
	</div>
</div>
