<script lang="ts">
	import AccountPanel from '#lib/component/own/local/private/AccountPanel.svelte';
	import ClientShell from '#lib/component/own/local/private/ClientShell.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Account | NextUp</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<!-- Fallback only: users with no business membership and not platform admin. -->
<ClientShell platformAdmin={data.platformAdmin}>
	<AccountPanel
		profile={data.profile}
		sessionInfo={data.sessionInfo}
		hasPassword={data.hasPassword}
		memberships={data.memberships}
		platformAdmin={data.platformAdmin}
		{form}
	/>
</ClientShell>
