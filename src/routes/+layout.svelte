<script lang="ts">
	import type { Path } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { locales, localizeHref } from '#lib/paraglide/runtime';
	import {
		initWash,
		washRecipes
	} from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import '#lib/asset/style/app.css';

	let { children } = $props();

	/** Full-bleed Wash shell (no nested washPanel): auth, marketing, errors, TV/kiosk, private apps. */
	const isChromeFree = $derived.by(() => {
		if (page.error) return true;
		const path = page.url.pathname;
		return (
			path.startsWith('/auth') ||
			path === '/' ||
			path === '/pricing' ||
			path === '/privacy' ||
			path === '/terms' ||
			path.startsWith('/docs') ||
			path.startsWith('/display') ||
			path.startsWith('/kiosk') ||
			path.startsWith('/t/') ||
			path.startsWith('/demo') ||
			path.startsWith('/admin') ||
			path.startsWith('/workspaces') ||
			path.startsWith('/account') ||
			path.startsWith('/b/') ||
			path.startsWith('/app') ||
			path.startsWith('/platform')
		);
	});

	onMount(() => {
		// Do not pass defaultPigment/defaultMode: those override localStorage and wipe
		// the user's Soft Wash choice on every reload. Package falls back to mineral/light.
		initWash();
	});
</script>

{#if isChromeFree}
	<!-- Auth, marketing, public TV/kiosk, and private shells: Wash atmosphere only. -->
	<div class={washRecipes.washShell}>
		{@render children()}
	</div>
{:else}
	<div class={washRecipes.washShell}>
		<main class={washRecipes.washShellMain}>
			<article class={washRecipes.washPanel}>
				{@render children()}
			</article>
		</main>
	</div>
{/if}

<div style="display:none">
	{#each locales as locale (locale)}
		<a
			href={resolve(localizeHref(page.url.pathname, { locale }) as Path)}
		>{locale}</a>
	{/each}
</div>
