<script lang="ts">
	import BusinessTopShell from '#lib/component/own/local/private/BusinessTopShell.svelte';

	let { children, data } = $props();
</script>

<BusinessTopShell platformAdmin={data.platformAdmin}>
	{@render children()}
</BusinessTopShell>
