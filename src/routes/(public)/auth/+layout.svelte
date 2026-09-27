<script lang="ts">
	let { children } = $props();
</script>

<!-- Transparent shell: root washShell page-wash + paper-grain shows through. -->
<div class="flex min-h-dvh w-full items-center justify-center p-5">
	<div class="w-full">
		{@render children?.()}
	</div>
</div>
