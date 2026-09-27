<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';

	const who = $derived([
		{
			title: m.home_model_platform_title(),
			body: m.pricing_who_platform_body()
		},
		{
			title: m.home_model_business_title(),
			body: m.pricing_who_business_body()
		},
		{
			title: m.home_model_floor_title(),
			body: m.pricing_who_floor_body()
		},
		{
			title: m.home_model_guests_title(),
			body: m.pricing_who_guests_body()
		}
	]);

	const faqs = $derived([
		{
			q: m.pricing_faq_q1(),
			a: m.pricing_faq_a1()
		},
		{
			q: m.pricing_faq_q2(),
			a: m.pricing_faq_a2()
		},
		{
			q: m.pricing_faq_q3(),
			a: m.pricing_faq_a3()
		},
		{
			q: m.pricing_faq_q4(),
			a: m.pricing_faq_a4()
		}
	]);
</script>

<section
	id="who-its-for"
	class="scroll-mt-24 px-4 py-20 sm:px-6"
	aria-labelledby="who-heading"
>
	<div class="mx-auto max-w-6xl">
		<p class="text-sm font-medium tracking-wide text-[var(--loom-teal)] uppercase">{m.pricing_who_eyebrow()}</p>
		<h2 id="who-heading" class="mt-2 max-w-2xl text-3xl font-semibold text-[var(--loom-ink)] sm:text-4xl">
			{m.pricing_who_heading()}
		</h2>
		<p class="mt-3 max-w-xl text-[var(--loom-ink)]/70">
			{m.pricing_who_lead()}
		</p>
		<ol class="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
			{#each who as item, i (item.title)}
				<li class="relative">
					<span class="font-display text-3xl font-semibold text-[var(--loom-mint-deep)]"
						>{String(i + 1).padStart(2, '0')}</span
					>
					<h3 class="mt-2 text-lg font-semibold text-[var(--loom-ink)]">{item.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-[var(--loom-ink)]/70">{item.body}</p>
				</li>
			{/each}
		</ol>
	</div>
</section>

<section
	id="pricing-faq"
	class="scroll-mt-24 px-4 pb-20 sm:px-6 sm:pb-28"
	aria-labelledby="faq-heading"
>
	<div class="mx-auto max-w-3xl">
		<p class="text-sm font-medium tracking-wide text-[var(--loom-teal)] uppercase">{m.common_faq()}</p>
		<h2 id="faq-heading" class="mt-2 text-3xl font-semibold text-[var(--loom-ink)] sm:text-4xl">
			{m.pricing_faq_heading()}
		</h2>
		<div class="mt-8 divide-y divide-[var(--loom-ink)]/10 border-y border-[var(--loom-ink)]/10">
			{#each faqs as item (item.q)}
				<details class="group">
					<summary
						class="cursor-pointer list-none py-4 text-left text-base font-semibold text-[var(--loom-ink)] marker:content-none [&::-webkit-details-marker]:hidden"
					>
						<span class="flex items-center justify-between gap-3">
							{item.q}
							<span
								class="text-[var(--loom-teal)] transition-transform group-open:rotate-45"
								aria-hidden="true">+</span
							>
						</span>
					</summary>
					<p class="pb-4 text-sm leading-relaxed text-[var(--loom-ink)]/70">{item.a}</p>
				</details>
			{/each}
		</div>
		<p class="mt-10 text-center text-sm text-[var(--loom-ink)]/60">
			{m.pricing_faq_cta()}
			<a href={resolve('/auth/login')} class="link link-hover cursor-pointer text-[var(--loom-teal)]"
				>{m.common_sign_in()}</a
			>
			{m.pricing_faq_or_review()}
			<a
				href="{resolve('/')}#business-model"
				class="link link-hover cursor-pointer text-[var(--loom-teal)]">{m.pricing_faq_business_model_link()}</a
			>.
		</p>
	</div>
</section>
