<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	const industries = $derived([
		{
			title: m.home_industries_hospitals_title(),
			body: m.home_industries_hospitals_body()
		},
		{
			title: m.home_industries_banking_title(),
			body: m.home_industries_banking_body()
		},
		{
			title: m.home_industries_other_title(),
			body: m.home_industries_other_body()
		}
	]);
</script>

<section id="industries" class="scroll-mt-24 px-4 py-20 sm:px-6" aria-labelledby="industries-heading">
	<div class="mx-auto max-w-6xl">
		<p class="text-sm font-medium tracking-wide text-[var(--loom-teal)] uppercase">{m.home_industries_eyebrow()}</p>
		<h2
			id="industries-heading"
			class="mt-2 max-w-xl text-3xl font-semibold text-[var(--loom-ink)] sm:text-4xl"
		>
			{m.home_industries_heading()}
		</h2>
		<p class="mt-3 max-w-lg text-[var(--loom-ink)]/70">
			{m.home_industries_lead()}
		</p>
		<ul class="mt-12 grid gap-6 md:grid-cols-3">
			{#each industries as item}
				<li
					class="rounded-2xl border border-[var(--loom-ink)]/10 bg-white/50 p-6 backdrop-blur-sm"
				>
					<h3 class="text-lg font-semibold text-[var(--loom-ink)]">{item.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-[var(--loom-ink)]/70">{item.body}</p>
				</li>
			{/each}
		</ul>
	</div>
</section>
