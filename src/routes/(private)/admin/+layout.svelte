<script lang="ts">
	import AdminShell from '#lib/component/own/local/private/AdminShell.svelte';

	let { children } = $props();
</script>

<AdminShell>
	{@render children()}
</AdminShell>
