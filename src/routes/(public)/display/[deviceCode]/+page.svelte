<script lang="ts">
	import { onMount } from 'svelte';
	import { Fullscreen, Minimize } from '@lucide/svelte';
	import {
		buildAnnounceSegments,
		speakAnnouncement,
		ticketCallAnnounceKey,
		unlockSpeechForUserGesture,
		type AnnounceVoiceConfig
	} from '#lib/util/voice';

	type DisplayTicket = {
		id: string;
		number: string;
		status: string;
		counterId?: string | null;
		queueId: string;
		priority?: number;
		sequence?: number;
		calledAt?: string | null;
	};

	type DisplaySnapshot = {
		nowServing: DisplayTicket[];
		waiting?: DisplayTicket[];
		missed?: DisplayTicket[];
		waitingByQueue?: Record<string, number>;
		queues?: { id: string; name: string }[];
		voice?: AnnounceVoiceConfig;
		updatedAt?: string;
	};

	let { data } = $props();
	let snapshot = $state(data.snapshot as DisplaySnapshot);

	$effect(() => {
		snapshot = data.snapshot as DisplaySnapshot;
	});
	let lastAnnouncedKey = $state('');
	let isFullscreen = $state(false);
	let reducedMotion = $state(false);
	let boardEl = $state<HTMLElement | null>(null);

	const boundQueueIds = $derived(data.boundQueueIds ?? []);

	const voiceConfig = $derived.by((): AnnounceVoiceConfig => {
		return (snapshot.voice ?? data.voiceConfig) as AnnounceVoiceConfig;
	});

	function inBoundQueues(t: DisplayTicket) {
		if (!boundQueueIds.length) return true;
		return boundQueueIds.includes(t.queueId);
	}

	const nowServing = $derived((snapshot.nowServing ?? []).filter(inBoundQueues));
	const upcoming = $derived((snapshot.waiting ?? []).filter(inBoundQueues).slice(0, 16));
	const missed = $derived((snapshot.missed ?? []).filter(inBoundQueues).slice(0, 12));

	function announce(number: string, counterLabel: string) {
		const cfg = voiceConfig;
		void speakAnnouncement({
			segments: buildAnnounceSegments({
				locales: cfg.announceLocales,
				templates: cfg.templates,
				vars: { number, counter: counterLabel || 'counter' },
				localeVoices: cfg.speech.localeVoices
			}),
			repeat: cfg.announceRepeat,
			repeatDelayMs: cfg.announceRepeatDelayMs,
			speech: cfg.speech
		});
	}

	function maybeAnnounce(json: DisplaySnapshot) {
		const list = (json.nowServing ?? []).filter(inBoundQueues);
		const top = list[0];
		if (!top || (top.status !== 'called' && top.status !== 'serving')) return;
		const key = ticketCallAnnounceKey(top);
		if (key === lastAnnouncedKey) return;
		lastAnnouncedKey = key;
		announce(top.number, data.counterMap[top.counterId ?? ''] ?? '');
	}

	async function refresh() {
		try {
			const res = await fetch(`/api/realtime/site/${data.siteId}?once=1`);
			if (!res.ok) return;
			const json = (await res.json()) as DisplaySnapshot;
			snapshot = json;
			maybeAnnounce(json);
		} catch {
			/* poll fallback soft-fail */
		}
	}

	async function enterFullscreen() {
		const el = boardEl ?? document.documentElement;
		if (!document.fullscreenElement && el.requestFullscreen) {
			try {
				await el.requestFullscreen();
			} catch {
				/* user gesture / browser policy */
			}
		}
	}

	async function exitFullscreen() {
		if (document.fullscreenElement) {
			try {
				await document.exitFullscreen();
			} catch {
				/* ignore */
			}
		}
	}

	async function toggleFullscreen(e?: Event) {
		e?.stopPropagation();
		unlockSpeechForUserGesture();
		if (document.fullscreenElement) await exitFullscreen();
		else await enterFullscreen();
	}

	function onBoardClick(e: MouseEvent) {
		unlockSpeechForUserGesture();
		const target = e.target as HTMLElement | null;
		if (target?.closest('[data-fs-control]')) return;
		if (!document.fullscreenElement) void enterFullscreen();
	}

	onMount(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mq.matches;
		const onMq = () => (reducedMotion = mq.matches);
		mq.addEventListener('change', onMq);

		const onFs = () => {
			isFullscreen = !!document.fullscreenElement;
		};
		document.addEventListener('fullscreenchange', onFs);
		onFs();

		maybeAnnounce(snapshot);

		const sse = new EventSource(`/api/realtime/site/${data.siteId}`);
		sse.onmessage = (ev) => {
			try {
				const json = JSON.parse(ev.data) as DisplaySnapshot;
				snapshot = json;
				maybeAnnounce(json);
			} catch {
				/* ignore */
			}
		};
		sse.onerror = () => {
			sse.close();
		};
		const poll = setInterval(refresh, 2000);
		return () => {
			mq.removeEventListener('change', onMq);
			document.removeEventListener('fullscreenchange', onFs);
			sse.close();
			clearInterval(poll);
			window.speechSynthesis?.cancel();
		};
	});
</script>

<svelte:head>
	<title>Display | {data.businessName}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={boardEl}
	class="loom-display text-[var(--loom-ink)] flex h-dvh min-h-[100dvh] cursor-pointer flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6"
	class:loom-display--motion={!reducedMotion}
	onclick={onBoardClick}
>
	<header class="mb-4 flex shrink-0 items-center justify-between gap-4 sm:mb-5">
		<div class="flex min-w-0 items-center gap-3 sm:gap-4">
			{#if data.businessImageUrl}
				<img
					src={data.businessImageUrl}
					alt=""
					class="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-[var(--loom-mint-deep)]/60 sm:h-14 sm:w-14 lg:h-16 lg:w-16"
					width="64"
					height="64"
				/>
			{:else}
				<div
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--loom-mint)]/80 text-lg font-semibold text-[var(--loom-teal)] ring-1 ring-[var(--loom-mint-deep)]/50 sm:h-14 sm:w-14 sm:text-xl lg:h-16 lg:w-16 lg:text-2xl"
					aria-hidden="true"
				>
					{data.businessName.slice(0, 1).toUpperCase()}
				</div>
			{/if}
			<div class="min-w-0">
				<p class="font-display truncate text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
					{data.businessName}
				</p>
				<p class="text-xs tracking-wide text-[var(--loom-teal)]/80 uppercase sm:text-sm">
					Live display
				</p>
			</div>
		</div>

		<div class="flex shrink-0 items-center gap-3 sm:gap-4">
			<p
				class="font-display max-w-[40vw] truncate text-right text-xl font-semibold tracking-tight text-[var(--loom-teal)] sm:max-w-none sm:text-2xl lg:text-3xl"
			>
				{data.departmentName}
			</p>
			<div class="tooltip tooltip-left tooltip-primary" data-tip={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
				<button
					type="button"
					data-fs-control
					class="btn btn-ghost btn-square btn-primary cursor-pointer"
					aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
					onclick={toggleFullscreen}
				>
					{#if isFullscreen}
						<Minimize class="size-5" aria-hidden="true" />
					{:else}
						<Fullscreen class="size-5" aria-hidden="true" />
					{/if}
				</button>
			</div>
		</div>
	</header>

	<div
		class="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr] lg:gap-5 xl:gap-6"
	>
		<!-- Now serving -->
		<section
			class="loom-display-card flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--loom-mint-deep)]/50 bg-base-100/55 p-4 shadow-sm backdrop-blur-[2px] sm:p-5 lg:p-6"
			aria-labelledby="now-serving-heading"
		>
			<h2
				id="now-serving-heading"
				class="font-display mb-3 shrink-0 text-lg font-semibold tracking-tight text-[var(--loom-teal)] sm:mb-4 sm:text-xl lg:text-2xl"
			>
				Now serving
			</h2>
			<div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
				{#if nowServing.length}
					<ul class="loom-ticket-grid loom-ticket-grid--serving">
						{#each nowServing as t (t.id)}
							<li
								class="loom-serving-tile flex flex-col items-center justify-center rounded-2xl border-2 border-[var(--loom-teal)]/35 bg-[var(--loom-mint)]/35 px-3 py-5 text-center sm:px-4 sm:py-6"
							>
								<span
									class="font-display text-4xl leading-none font-semibold tracking-tight text-[var(--loom-ink)] sm:text-5xl lg:text-6xl xl:text-7xl"
								>
									{t.number}
								</span>
								<span
									class="mt-2 text-sm font-medium text-[var(--loom-teal)] sm:mt-3 sm:text-base lg:text-lg"
								>
									{data.counterMap[t.counterId ?? ''] ??
										(t.status === 'serving' ? 'Serving' : 'Called')}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<div
						class="flex h-full min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--loom-mint-deep)]/70 bg-[var(--loom-mint)]/15 px-4 text-center"
					>
						<p class="text-base text-[var(--loom-ink)]/55 sm:text-lg lg:text-xl">
							No ticket serving
						</p>
					</div>
				{/if}
			</div>
		</section>

		<!-- Upcoming + Missed -->
		<div class="grid min-h-0 grid-rows-2 gap-4 lg:gap-5">
			<section
				class="loom-display-card flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--loom-mint-deep)]/50 bg-base-100/55 p-4 shadow-sm backdrop-blur-[2px] sm:p-5"
				aria-labelledby="upcoming-heading"
			>
				<h2
					id="upcoming-heading"
					class="font-display mb-3 shrink-0 text-base font-semibold tracking-tight text-[var(--loom-teal)] sm:text-lg lg:text-xl"
				>
					Upcoming
				</h2>
				<div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
					{#if upcoming.length}
						<ul class="loom-ticket-grid loom-ticket-grid--chip">
							{#each upcoming as t (t.id)}
								<li
									class="font-display rounded-xl bg-[var(--loom-mint)]/50 px-2.5 py-2 text-center text-lg font-semibold tracking-tight text-[var(--loom-ink)] ring-1 ring-[var(--loom-mint-deep)]/40 sm:px-3 sm:py-2.5 sm:text-xl lg:text-2xl"
								>
									{t.number}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-sm text-[var(--loom-ink)]/50 sm:text-base">No tickets waiting</p>
					{/if}
				</div>
			</section>

			<section
				class="loom-display-card flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--loom-coral)]/25 bg-base-100/55 p-4 shadow-sm backdrop-blur-[2px] sm:p-5"
				aria-labelledby="missed-heading"
			>
				<h2
					id="missed-heading"
					class="font-display mb-3 shrink-0 text-base font-semibold tracking-tight text-[var(--loom-coral)] sm:text-lg lg:text-xl"
				>
					Missed
				</h2>
				<div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
					{#if missed.length}
						<ul class="loom-ticket-grid loom-ticket-grid--chip">
							{#each missed as t (t.id)}
								<li
									class="font-display rounded-xl bg-[var(--loom-coral)]/10 px-2.5 py-2 text-center text-base font-semibold tracking-tight text-[var(--loom-ink)]/75 ring-1 ring-[var(--loom-coral)]/25 sm:px-3 sm:py-2.5 sm:text-lg lg:text-xl"
								>
									{t.number}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-sm text-[var(--loom-ink)]/50 sm:text-base">No missed tickets</p>
					{/if}
				</div>
			</section>
		</div>
	</div>
</div>

<style>
	/*
	 Soft Wash board wash: solid light base under mint radials.
	 Browsers paint :fullscreen black by default; without a solid base the
	 translucent gradients wash dark over that backdrop.
	*/
	.loom-display {
		/*
		 TV board is always a light Soft Wash surface. Pin marketing tokens so a
		 site-wide *-dark pigment does not flip ticket numbers to light-on-light.
		 */
		--loom-ink: #1c2a28;
		--loom-teal: #3d7a6f;
		--loom-mint: #d8eee6;
		--loom-mint-deep: #b8ddd0;
		--loom-coral: #e07a5f;
		--loom-navy: #2c3e50;
		--loom-board-bg: color-mix(in oklab, var(--loom-mint) 28%, #f7f4ef);
		background-color: var(--loom-board-bg);
		background-image:
			radial-gradient(
				ellipse 80% 50% at 10% 0%,
				color-mix(in oklab, var(--loom-mint) 55%, transparent),
				transparent 55%
			),
			radial-gradient(
				ellipse 60% 40% at 90% 100%,
				color-mix(in oklab, var(--loom-mint-deep) 35%, transparent),
				transparent 50%
			);
		background-repeat: no-repeat;
		color: var(--loom-ink);
		color-scheme: light;
	}

	.loom-display--motion .loom-serving-tile {
		transition:
			border-color 0.35s ease,
			background-color 0.35s ease,
			transform 0.35s ease;
	}

	@media (prefers-reduced-motion: reduce) {
		.loom-display--motion .loom-serving-tile {
			transition: none;
		}
	}

	/* Cap at 5 columns: min track width is at least 1/5 of the row. */
	.loom-ticket-grid {
		--loom-ticket-gap: 0.75rem;
		--loom-ticket-min: 7.5rem;
		display: grid;
		gap: var(--loom-ticket-gap);
		grid-template-columns: repeat(
			auto-fill,
			minmax(max(var(--loom-ticket-min), calc((100% - 4 * var(--loom-ticket-gap)) / 5)), 1fr)
		);
		align-content: start;
	}

	.loom-ticket-grid--serving {
		--loom-ticket-gap: 0.875rem;
		--loom-ticket-min: 9rem;
	}

	.loom-ticket-grid--chip {
		--loom-ticket-gap: 0.5rem;
		--loom-ticket-min: 5.5rem;
	}

	@media (min-width: 640px) {
		.loom-ticket-grid--serving {
			--loom-ticket-gap: 1rem;
			--loom-ticket-min: 10rem;
		}

		.loom-ticket-grid--chip {
			--loom-ticket-gap: 0.625rem;
			--loom-ticket-min: 6.25rem;
		}
	}

	.loom-display:fullscreen,
	.loom-display:-webkit-full-screen {
		width: 100%;
		height: 100%;
		cursor: default;
		/* Defeat UA black fullscreen backdrop; keep Soft Wash light board. */
		background-color: var(--loom-board-bg) !important;
		background-image:
			radial-gradient(
				ellipse 80% 50% at 10% 0%,
				color-mix(in oklab, var(--loom-mint) 55%, transparent),
				transparent 55%
			),
			radial-gradient(
				ellipse 60% 40% at 90% 100%,
				color-mix(in oklab, var(--loom-mint-deep) 35%, transparent),
				transparent 50%
			) !important;
		color: var(--loom-ink);
		color-scheme: light;
	}
</style>
