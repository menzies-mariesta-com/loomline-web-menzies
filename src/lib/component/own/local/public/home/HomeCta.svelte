<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
</script>

<section class="px-4 py-20 sm:px-6" aria-labelledby="cta-heading">
	<div class="mx-auto max-w-3xl text-center">
		<h2 id="cta-heading" class="text-3xl font-semibold text-[var(--loom-ink)] sm:text-4xl">
			{m.home_cta_heading()}
		</h2>
		<p class="mx-auto mt-3 max-w-md text-[var(--loom-ink)]/70">
			{m.home_cta_body()}
		</p>
		<div class="mt-8 flex flex-wrap justify-center gap-3">
			<a href={resolve('/auth/login')} class="btn btn-primary btn-lg cursor-pointer">{m.common_sign_in()}</a>
			<a href="#business-model" class="btn btn-ghost btn-lg cursor-pointer">{m.home_cta_review_model()}</a>
		</div>
	</div>
</section>
