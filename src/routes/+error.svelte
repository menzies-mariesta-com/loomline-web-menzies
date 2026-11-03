<script lang="ts">
	import { page } from '$app/state';
	import ErrorPage from '#lib/component/own/local/public/error/ErrorPage.svelte';
</script>

<ErrorPage status={page.status} />
