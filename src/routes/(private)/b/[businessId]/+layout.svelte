<script lang="ts">
	import ClientShell from '#lib/component/own/local/private/ClientShell.svelte';

	let { children, data } = $props();
</script>

<ClientShell platformAdmin={data.platformAdmin}>
	{@render children()}
</ClientShell>
