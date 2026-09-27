<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages';

	let solid = $state(false);

	onMount(() => {
		const onScroll = () => {
			solid = window.scrollY > 24;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<header
	class="fixed inset-x-0 top-0 z-50 transition-[background,box-shadow,backdrop-filter] duration-300 {solid
		? 'bg-base-100/90 shadow-sm backdrop-blur-md'
		: 'bg-transparent'}"
>
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
		<a href={resolve('/')} class="font-display text-xl font-semibold tracking-tight text-[var(--loom-ink)] cursor-pointer">
			{m.brand_loomline()}
		</a>
		<nav class="flex items-center gap-1 sm:gap-3">
			<a
				href="{resolve('/')}#how-it-works"
				class="btn btn-ghost btn-sm hidden cursor-pointer sm:inline-flex">{m.common_how_it_works()}</a
			>
			<a href="{resolve('/')}#business-model" class="btn btn-ghost btn-sm hidden cursor-pointer md:inline-flex"
				>{m.common_business_model()}</a
			>
			<a href={resolve('/pricing')} class="btn btn-ghost btn-sm cursor-pointer">{m.common_pricing()}</a>
			<a href={resolve('/auth/login')} class="btn btn-primary btn-sm cursor-pointer">{m.common_sign_in()}</a>
		</nav>
	</div>
</header>
