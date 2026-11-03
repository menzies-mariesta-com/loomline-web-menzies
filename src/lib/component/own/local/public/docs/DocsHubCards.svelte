<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { Building2, Code2, Palette, Handshake, Briefcase, ArrowRight } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages';

	let businessIcon = $state<HTMLElement | null>(null);
	let developerIcon = $state<HTMLElement | null>(null);
	let brandIcon = $state<HTMLElement | null>(null);
	let partnersIcon = $state<HTMLElement | null>(null);
	let investorsIcon = $state<HTMLElement | null>(null);
	let businessArt = $state<HTMLElement | null>(null);
	let developerArt = $state<HTMLElement | null>(null);
	let brandArt = $state<HTMLElement | null>(null);
	let partnersArt = $state<HTMLElement | null>(null);
	let investorsArt = $state<HTMLElement | null>(null);

	onMount(() => {
		const reduce =
			typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduce) return;

		let killed = false;
		void import('gsap').then(({ default: gsap }) => {
			if (killed) return;
			if (businessIcon) {
				gsap.to(businessIcon, {
					y: -4,
					duration: 1.6,
					yoyo: true,
					repeat: -1,
					ease: 'sine.inOut'
				});
			}
			if (developerIcon) {
				gsap.to(developerIcon, {
					rotate: 6,
					duration: 1.8,
					yoyo: true,
					repeat: -1,
					ease: 'sine.inOut'
				});
			}
			if (brandIcon) {
				gsap.to(brandIcon, {
					y: -3,
					rotate: -4,
					duration: 1.7,
					yoyo: true,
					repeat: -1,
					ease: 'sine.inOut'
				});
			}
			if (partnersIcon) {
				gsap.to(partnersIcon, {
					y: -3,
					duration: 1.65,
					yoyo: true,
					repeat: -1,
					ease: 'sine.inOut'
				});
			}
			if (investorsIcon) {
				gsap.to(investorsIcon, {
					y: -2,
					rotate: 3,
					duration: 1.75,
					yoyo: true,
					repeat: -1,
					ease: 'sine.inOut'
				});
			}
			if (businessArt) {
				gsap.fromTo(
					businessArt.querySelectorAll('[data-ticket]'),
					{ y: 8, opacity: 0.5 },
					{ y: 0, opacity: 1, stagger: 0.2, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
				);
			}
			if (developerArt) {
				gsap.fromTo(
					developerArt.querySelectorAll('[data-bar]'),
					{ scaleY: 0.4 },
					{
						scaleY: 1,
						stagger: 0.15,
						duration: 1,
						yoyo: true,
						repeat: -1,
						ease: 'sine.inOut',
						transformOrigin: 'bottom'
					}
				);
			}
			if (brandArt) {
				gsap.fromTo(
					brandArt.querySelectorAll('[data-swatch]'),
					{ scale: 0.85, opacity: 0.55 },
					{
						scale: 1,
						opacity: 1,
						stagger: 0.18,
						duration: 1.1,
						yoyo: true,
						repeat: -1,
						ease: 'sine.inOut'
					}
				);
			}
			if (partnersArt) {
				gsap.fromTo(
					partnersArt.querySelectorAll('[data-node]'),
					{ scale: 0.8, opacity: 0.5 },
					{
						scale: 1,
						opacity: 1,
						stagger: 0.2,
						duration: 1.15,
						yoyo: true,
						repeat: -1,
						ease: 'sine.inOut'
					}
				);
			}
			if (investorsArt) {
				gsap.fromTo(
					investorsArt.querySelectorAll('[data-rise]'),
					{ scaleY: 0.45, opacity: 0.55 },
					{
						scaleY: 1,
						opacity: 1,
						stagger: 0.16,
						duration: 1.05,
						yoyo: true,
						repeat: -1,
						ease: 'sine.inOut',
						transformOrigin: 'bottom'
					}
				);
			}
		});

		return () => {
			killed = true;
		};
	});
</script>

<div class="mx-auto grid max-w-5xl gap-6 px-4 pb-20 sm:px-6 md:grid-cols-2 md:gap-8">
	<a
		href={resolve('/docs/business/overview')}
		class="group flex cursor-pointer flex-col overflow-hidden rounded-box border border-ink-border/80 bg-base-100/80 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
	>
		<div
			bind:this={businessArt}
			class="relative flex h-40 items-end justify-center overflow-hidden bg-gradient-to-br from-primary/15 via-base-200/80 to-base-100 px-6 pt-6"
			aria-hidden="true"
		>
			<svg viewBox="0 0 280 120" class="h-full w-full max-w-xs" fill="none">
				<rect x="24" y="48" width="56" height="48" rx="8" class="fill-base-100 stroke-ink-border" stroke-width="1.5" data-ticket />
				<rect x="92" y="36" width="56" height="60" rx="8" class="fill-primary/25 stroke-primary/50" stroke-width="1.5" data-ticket />
				<rect x="160" y="52" width="56" height="44" rx="8" class="fill-base-100 stroke-ink-border" stroke-width="1.5" data-ticket />
				<circle cx="120" cy="28" r="10" class="fill-primary/40" />
			</svg>
			<span
				bind:this={businessIcon}
				class="absolute top-5 left-5 inline-flex size-12 items-center justify-center rounded-box border border-ink-border bg-base-100 text-primary shadow-sm"
			>
				<Building2 class="size-6" strokeWidth={2} />
			</span>
		</div>
		<div class="flex flex-1 flex-col gap-3 p-5 sm:p-6">
			<h2 class="font-display text-2xl font-semibold tracking-tight text-base-content">
				{m.docs_card_business_title()}
			</h2>
			<p class="text-sm leading-relaxed text-ink-muted">{m.docs_card_business_body()}</p>
			<span class="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
				{m.docs_card_open()}
				<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
			</span>
		</div>
	</a>

	<a
		href={resolve('/docs/developer/overview')}
		class="group flex cursor-pointer flex-col overflow-hidden rounded-box border border-ink-border/80 bg-base-100/80 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-secondary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
	>
		<div
			bind:this={developerArt}
			class="relative flex h-40 items-end justify-center overflow-hidden bg-gradient-to-br from-secondary/15 via-base-200/80 to-base-100 px-6 pt-6"
			aria-hidden="true"
		>
			<svg viewBox="0 0 280 120" class="h-full w-full max-w-xs" fill="none">
				<rect x="40" y="70" width="18" height="30" rx="3" class="fill-secondary/50" data-bar />
				<rect x="70" y="50" width="18" height="50" rx="3" class="fill-secondary/70" data-bar />
				<rect x="100" y="36" width="18" height="64" rx="3" class="fill-primary/60" data-bar />
				<rect x="130" y="58" width="18" height="42" rx="3" class="fill-secondary/55" data-bar />
				<rect x="160" y="44" width="18" height="56" rx="3" class="fill-primary/45" data-bar />
				<path d="M200 40 L220 60 L200 80" class="stroke-ink-border" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
				<path d="M236 40 L256 60 L236 80" class="stroke-primary" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			<span
				bind:this={developerIcon}
				class="absolute top-5 left-5 inline-flex size-12 items-center justify-center rounded-box border border-ink-border bg-base-100 text-secondary shadow-sm"
			>
				<Code2 class="size-6" strokeWidth={2} />
			</span>
		</div>
		<div class="flex flex-1 flex-col gap-3 p-5 sm:p-6">
			<h2 class="font-display text-2xl font-semibold tracking-tight text-base-content">
				{m.docs_card_developer_title()}
			</h2>
			<p class="text-sm leading-relaxed text-ink-muted">{m.docs_card_developer_body()}</p>
			<span class="mt-auto inline-flex items-center gap-1 text-sm font-medium text-secondary">
				{m.docs_card_open()}
				<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
			</span>
		</div>
	</a>

	<a
		href={resolve('/docs/brand/overview')}
		class="group flex cursor-pointer flex-col overflow-hidden rounded-box border border-ink-border/80 bg-base-100/80 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
	>
		<div
			bind:this={brandArt}
			class="relative flex h-40 items-end justify-center overflow-hidden bg-gradient-to-br from-accent/15 via-base-200/80 to-base-100 px-6 pt-6"
			aria-hidden="true"
		>
			<svg viewBox="0 0 280 120" class="h-full w-full max-w-xs" fill="none">
				<rect x="48" y="52" width="44" height="44" rx="10" class="fill-primary/35 stroke-primary/50" stroke-width="1.5" data-swatch />
				<rect x="108" y="40" width="44" height="56" rx="10" class="fill-[var(--loom-ink)]/80" data-swatch />
				<rect x="168" y="56" width="44" height="40" rx="10" class="fill-accent/50 stroke-accent/70" stroke-width="1.5" data-swatch />
				<text
					x="130"
					y="28"
					text-anchor="middle"
					class="fill-[var(--loom-ink)]"
					style="font-family: Fraunces, Georgia, serif; font-size: 18px; font-weight: 600; letter-spacing: -0.02em;"
				>
					NextUp
				</text>
			</svg>
			<span
				bind:this={brandIcon}
				class="absolute top-5 left-5 inline-flex size-12 items-center justify-center rounded-box border border-ink-border bg-base-100 text-accent shadow-sm"
			>
				<Palette class="size-6" strokeWidth={2} />
			</span>
		</div>
		<div class="flex flex-1 flex-col gap-3 p-5 sm:p-6">
			<h2 class="font-display text-2xl font-semibold tracking-tight text-base-content">
				{m.docs_card_brand_title()}
			</h2>
			<p class="text-sm leading-relaxed text-ink-muted">{m.docs_card_brand_body()}</p>
			<span class="mt-auto inline-flex items-center gap-1 text-sm font-medium text-accent">
				{m.docs_card_open()}
				<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
			</span>
		</div>
	</a>

	<a
		href={resolve('/docs/partners/overview')}
		class="group flex cursor-pointer flex-col overflow-hidden rounded-box border border-ink-border/80 bg-base-100/80 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-info/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info"
	>
		<div
			bind:this={partnersArt}
			class="relative flex h-40 items-end justify-center overflow-hidden bg-gradient-to-br from-info/15 via-base-200/80 to-base-100 px-6 pt-6"
			aria-hidden="true"
		>
			<svg viewBox="0 0 280 120" class="h-full w-full max-w-xs" fill="none">
				<circle cx="90" cy="64" r="22" class="fill-info/30 stroke-info/55" stroke-width="1.5" data-node />
				<circle cx="190" cy="64" r="22" class="fill-primary/25 stroke-primary/45" stroke-width="1.5" data-node />
				<path
					d="M112 64 H168"
					class="stroke-ink-border"
					stroke-width="2"
					stroke-linecap="round"
					stroke-dasharray="4 4"
				/>
				<circle cx="140" cy="40" r="10" class="fill-secondary/40" data-node />
			</svg>
			<span
				bind:this={partnersIcon}
				class="absolute top-5 left-5 inline-flex size-12 items-center justify-center rounded-box border border-ink-border bg-base-100 text-info shadow-sm"
			>
				<Handshake class="size-6" strokeWidth={2} />
			</span>
		</div>
		<div class="flex flex-1 flex-col gap-3 p-5 sm:p-6">
			<h2 class="font-display text-2xl font-semibold tracking-tight text-base-content">
				{m.docs_card_partners_title()}
			</h2>
			<p class="text-sm leading-relaxed text-ink-muted">{m.docs_card_partners_body()}</p>
			<span class="mt-auto inline-flex items-center gap-1 text-sm font-medium text-info">
				{m.docs_card_open()}
				<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
			</span>
		</div>
	</a>

	<a
		href={resolve('/docs/investors/overview')}
		class="group flex cursor-pointer flex-col overflow-hidden rounded-box border border-ink-border/80 bg-base-100/80 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-success/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
	>
		<div
			bind:this={investorsArt}
			class="relative flex h-40 items-end justify-center overflow-hidden bg-gradient-to-br from-success/15 via-base-200/80 to-base-100 px-6 pt-6"
			aria-hidden="true"
		>
			<svg viewBox="0 0 280 120" class="h-full w-full max-w-xs" fill="none">
				<rect x="56" y="72" width="28" height="24" rx="4" class="fill-success/40" data-rise />
				<rect x="100" y="52" width="28" height="44" rx="4" class="fill-success/55" data-rise />
				<rect x="144" y="36" width="28" height="60" rx="4" class="fill-primary/45" data-rise />
				<path
					d="M48 88 L92 64 L136 48 L200 28"
					class="stroke-success"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					fill="none"
				/>
				<circle cx="200" cy="28" r="6" class="fill-success/70" />
			</svg>
			<span
				bind:this={investorsIcon}
				class="absolute top-5 left-5 inline-flex size-12 items-center justify-center rounded-box border border-ink-border bg-base-100 text-success shadow-sm"
			>
				<Briefcase class="size-6" strokeWidth={2} />
			</span>
		</div>
		<div class="flex flex-1 flex-col gap-3 p-5 sm:p-6">
			<h2 class="font-display text-2xl font-semibold tracking-tight text-base-content">
				{m.docs_card_investors_title()}
			</h2>
			<p class="text-sm leading-relaxed text-ink-muted">{m.docs_card_investors_body()}</p>
			<span class="mt-auto inline-flex items-center gap-1 text-sm font-medium text-success">
				{m.docs_card_open()}
				<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
			</span>
		</div>
	</a>
</div>
