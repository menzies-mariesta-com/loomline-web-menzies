<script lang="ts">
	import { onMount } from 'svelte';
	import { Check, Moon, Palette, Sun } from '@lucide/svelte';
	import { closeDetailsOnOutside } from '#lib/attachments/close-details-on-outside';
	import { m } from '#lib/paraglide/messages';
	import {
		applyTheme,
		readStoredMode,
		readStoredTheme,
		THEME_CHANGE_EVENT,
		watercolorThemes,
		type ThemeChangeDetail,
		type ThemeMode,
		type WatercolorThemeId
	} from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	type Props = {
		/** Match ClientShell (`sm`) or AdminShell (`md`) header controls. */
		size?: 'sm' | 'md';
	};

	let { size = 'md' }: Props = $props();

	let open = $state(false);
	let pigment = $state<WatercolorThemeId>('mineral');
	let mode = $state<ThemeMode>('light');

	const summaryClass = $derived(
		size === 'sm'
			? 'btn btn-ghost btn-square btn-sm btn-secondary cursor-pointer list-none [&::-webkit-details-marker]:hidden'
			: 'btn btn-ghost btn-square btn-secondary cursor-pointer list-none [&::-webkit-details-marker]:hidden'
	);

	onMount(() => {
		pigment = readStoredTheme();
		mode = readStoredMode();

		function onThemeChange(event: Event) {
			const detail = (event as CustomEvent<ThemeChangeDetail>).detail;
			if (!detail) return;
			pigment = detail.pigment;
			mode = detail.mode;
		}

		window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
		return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
	});

	function setMode(next: ThemeMode) {
		mode = next;
		applyTheme(pigment, next);
	}

	function setPigment(next: WatercolorThemeId) {
		pigment = next;
		applyTheme(next, mode);
		open = false;
	}
</script>

<div class="tooltip tooltip-bottom tooltip-secondary" data-tip={m.common_appearance()}>
	<details class="dropdown dropdown-end" bind:open {@attach closeDetailsOnOutside()}>
		<summary class={summaryClass} aria-label={m.common_appearance()} aria-expanded={open}>
			<Palette class="size-4" aria-hidden="true" />
		</summary>
		<div
			class="dropdown-content border-ink-border bg-base-100 z-[60] mt-2 w-72 max-w-[min(100vw-1rem,18rem)] rounded-box border p-3 shadow-lg"
		>
			<p class="text-base-content/60 mb-2 text-xs font-semibold uppercase tracking-wide">{m.common_mode()}</p>
			<div class="join mb-3 w-full">
				<button
					type="button"
					class="btn join-item flex-1 cursor-pointer gap-1"
					class:btn-primary={mode === 'light'}
					onclick={() => setMode('light')}
				>
					<Sun class="size-4" aria-hidden="true" />
					{m.common_light()}
				</button>
				<button
					type="button"
					class="btn join-item flex-1 cursor-pointer gap-1"
					class:btn-primary={mode === 'dark'}
					onclick={() => setMode('dark')}
				>
					<Moon class="size-4" aria-hidden="true" />
					{m.common_dark()}
				</button>
			</div>

			<p class="text-base-content/60 mb-2 text-xs font-semibold uppercase tracking-wide">
				{m.common_pigment()}
			</p>
			<div class="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto pe-1">
				{#each watercolorThemes as theme (theme.id)}
					<button
						type="button"
						class="btn btn-sm relative h-auto min-h-0 cursor-pointer flex-col gap-1 py-2 capitalize"
						class:btn-primary={pigment === theme.id}
						class:btn-ghost={pigment !== theme.id}
						aria-pressed={pigment === theme.id}
						onclick={() => setPigment(theme.id)}
					>
						<span
							class="border-ink-border/40 size-4 shrink-0 rounded-full border"
							style="background:{theme.swatch}"
							aria-hidden="true"
						></span>
						<span class="truncate text-[10px] leading-tight">{theme.label}</span>
						{#if pigment === theme.id}
							<Check
								class="absolute right-1 top-1 size-3 text-primary-content"
								aria-hidden="true"
							/>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</details>
</div>
