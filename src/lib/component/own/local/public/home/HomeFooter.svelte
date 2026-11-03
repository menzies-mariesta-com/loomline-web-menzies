<script lang="ts">
	import { resolve } from '$app/paths';
	import appIcon from '#lib/asset/image/app-icon-ticket.svg';
	import { m } from '#lib/paraglide/messages';
	import MenziesLink from '#lib/component/own/local/public/MenziesLink.svelte';
</script>

<footer class="border-t border-[var(--loom-ink)]/10 px-4 py-12 sm:px-6">
	<div
		class="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between"
	>
		<div>
			<p class="font-display flex items-center gap-2 text-xl font-semibold text-[var(--loom-ink)]">
				<img src={appIcon} alt="" width="32" height="32" class="size-8 shrink-0" aria-hidden="true" />
				{m.brand_nextup()}
			</p>
			<p class="mt-2 max-w-xs text-sm text-[var(--loom-ink)]/65">
				{m.home_footer_tagline()}
			</p>
		</div>
		<div class="flex flex-wrap gap-4 text-sm">
			<a href="{resolve('/')}#how-it-works" class="link link-hover cursor-pointer">{m.common_how_it_works()}</a>
			<a href="{resolve('/')}#business-model" class="link link-hover cursor-pointer">{m.common_business_model()}</a>
			<a href={resolve('/pricing')} class="link link-hover cursor-pointer">{m.common_pricing()}</a>
			<a href={resolve('/docs')} class="link link-hover cursor-pointer">{m.common_docs()}</a>
			<a href={resolve('/auth/login')} class="link link-hover cursor-pointer">{m.common_sign_in()}</a>
			<a href={resolve('/privacy')} class="link link-hover cursor-pointer">{m.common_privacy()}</a>
			<a href={resolve('/terms')} class="link link-hover cursor-pointer">{m.common_terms()}</a>
		</div>
	</div>
	<p class="mx-auto mt-10 max-w-6xl text-xs text-[var(--loom-ink)]/55">
		{m.home_footer_copyright_before({ year: String(new Date().getFullYear()) })}<MenziesLink />{m.home_footer_copyright_after()}
	</p>
</footer>
