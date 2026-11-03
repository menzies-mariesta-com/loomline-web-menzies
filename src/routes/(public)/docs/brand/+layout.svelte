<script lang="ts">
	import DocsShell from '#lib/component/own/local/public/docs/DocsShell.svelte';

	let { data, children } = $props();
</script>

<DocsShell tree="brand" navGroups={data.navGroups} searchIndex={data.searchIndex}>
	{@render children()}
</DocsShell>
