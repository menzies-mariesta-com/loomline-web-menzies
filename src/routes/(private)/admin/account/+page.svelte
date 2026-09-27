<script lang="ts">
	import AccountPanel from '#lib/component/own/local/private/AccountPanel.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Account | Loomline</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<AccountPanel
	profile={data.profile}
	sessionInfo={data.sessionInfo}
	hasPassword={data.hasPassword}
	memberships={data.memberships}
	platformAdmin={data.platformAdmin}
	{form}
/>
