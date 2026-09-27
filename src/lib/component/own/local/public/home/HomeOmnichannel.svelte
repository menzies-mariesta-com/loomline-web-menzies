<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	const features = $derived([
		m.home_omni_f1(),
		m.home_omni_f2(),
		m.home_omni_f3(),
		m.home_omni_f4(),
		m.home_omni_f5(),
		m.home_omni_f6()
	]);
</script>

<section id="omnichannel" class="scroll-mt-24 px-4 py-20 sm:px-6" aria-labelledby="omni-heading">
	<div
		class="mx-auto max-w-6xl rounded-[2rem] bg-[var(--loom-navy)] px-6 py-14 text-[var(--loom-mint)] sm:px-12"
	>
		<p class="text-sm font-medium tracking-wide text-[var(--loom-mint-deep)] uppercase">
			{m.home_omni_eyebrow()}
		</p>
		<h2 id="omni-heading" class="mt-2 max-w-xl text-3xl font-semibold sm:text-4xl">
			{m.home_omni_heading()}
		</h2>
		<p class="mt-3 max-w-lg text-[var(--loom-mint)]/75">
			{m.home_omni_lead()}
		</p>
		<ul class="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as f}
				<li class="flex items-start gap-2 text-sm">
					<span class="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--loom-coral)]" aria-hidden="true"
					></span>
					<span>{f}</span>
				</li>
			{/each}
		</ul>
	</div>
</section>
