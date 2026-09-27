<script lang="ts">
	import { onMount } from 'svelte';
	import { Check } from '@lucide/svelte';
	import { closeDetailsOnOutside } from '#lib/attachments/close-details-on-outside';
	import { m } from '#lib/paraglide/messages';
	import {
		getLocale,
		locales,
		setLocale,
		type Locale
	} from '#lib/paraglide/runtime';

	type Props = {
		/** Match ClientShell (`sm`) or AdminShell (`md`) header controls. */
		size?: 'sm' | 'md';
	};

	let { size = 'md' }: Props = $props();

	/** Endonyms stay fixed so speakers can always find their language. */
	const LOCALE_LABELS: Record<Locale, string> = {
		en: 'English',
		my: 'မြန်မာ',
		ja: '日本語'
	};

	/** Regional flags (emoji). English uses US consistently. */
	const LOCALE_FLAGS: Record<Locale, string> = {
		en: '🇺🇸',
		my: '🇲🇲',
		ja: '🇯🇵'
	};

	let open = $state(false);
	let current = $state<Locale>('en');

	const summaryClass = $derived(
		size === 'sm'
			? 'btn btn-ghost btn-square btn-sm btn-secondary cursor-pointer list-none [&::-webkit-details-marker]:hidden'
			: 'btn btn-ghost btn-square btn-secondary cursor-pointer list-none [&::-webkit-details-marker]:hidden'
	);

	onMount(() => {
		try {
			current = getLocale();
		} catch {
			current = 'en';
		}
	});

	function choose(locale: Locale) {
		if (locale === current) {
			open = false;
			return;
		}
		open = false;
		current = locale;
		setLocale(locale);
	}
</script>

<div class="tooltip tooltip-bottom tooltip-secondary" data-tip={m.common_language()}>
	<details class="dropdown dropdown-end" bind:open {@attach closeDetailsOnOutside()}>
		<summary class={summaryClass} aria-label={m.common_language()} aria-expanded={open}>
			<span class="text-base leading-none" aria-hidden="true">{LOCALE_FLAGS[current]}</span>
		</summary>
		<ul
			class="dropdown-content menu border-ink-border bg-base-100 z-[60] mt-2 w-44 rounded-box border p-2 shadow-lg"
			role="listbox"
			aria-label={m.common_language()}
		>
			{#each locales as locale (locale)}
				<li>
					<button
						type="button"
						role="option"
						class="flex cursor-pointer items-center gap-2"
						class:active={current === locale}
						aria-selected={current === locale}
						onclick={() => choose(locale)}
					>
						<span class="flex flex-1 items-center gap-2 text-start">
							<span class="text-base leading-none" aria-hidden="true">{LOCALE_FLAGS[locale]}</span>
							<span>{LOCALE_LABELS[locale]}</span>
						</span>
						{#if current === locale}
							<Check class="size-4 shrink-0 text-primary" aria-hidden="true" />
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	</details>
</div>
