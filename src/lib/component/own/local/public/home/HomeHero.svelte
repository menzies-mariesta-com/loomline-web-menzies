<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import MenziesLink from '#lib/component/own/local/public/MenziesLink.svelte';
	import QueueHeroScene from './QueueHeroScene.svelte';
</script>

<section
	class="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-32"
	aria-labelledby="hero-heading"
>
	<div class="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] lg:gap-10">
		<div class="relative z-10 max-w-xl">
			<MenziesLink class="font-display text-primary text-lg font-semibold tracking-tight sm:text-md" />
			<h1
				id="hero-heading"
				class="mt-4 text-3xl leading-tight font-semibold text-[var(--loom-ink)] sm:text-4xl lg:text-[2.75rem]"
			>
				{m.home_hero_headline()}
			</h1>
			<p class="mt-4 max-w-md text-base leading-relaxed text-[var(--loom-ink)]/75 sm:text-lg">
				{m.home_hero_body()}
			</p>
			<div class="mt-8 flex flex-wrap gap-3">
				<a href={resolve('/auth/login')} class="btn btn-primary cursor-pointer">{m.common_sign_in()}</a>
				<a href="#how-it-works" class="btn btn-outline cursor-pointer">{m.home_hero_cta_how()}</a>
			</div>
		</div>
		<div class="relative w-full min-w-0 lg:justify-self-stretch">
			<QueueHeroScene />
		</div>
	</div>
</section>
