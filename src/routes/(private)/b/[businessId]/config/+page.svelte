<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount, untrack } from 'svelte';
	import {
		ArrowDown,
		ArrowUp,
		ChevronDown,
		CircleCheck,
		CircleX,
		Globe,
		Mail,
		MessageSquare,
		MessagesSquare,
		Plus,
		Trash2,
		UserPlus,
		Volume2
	} from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { siDiscord, siTelegram, siViber } from 'simple-icons';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import PageHeader from '#lib/component/own/local/private/PageHeader.svelte';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import ToastDismissButton from '#lib/component/own/local/private/ToastDismissButton.svelte';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';
	import {
		buildAnnounceVoiceConfig,
		defaultAnnounceTemplateForLocale,
		listBrowserVoicesForLocale,
		normalizeLocaleTemplates
	} from '#lib/util/voice';

	let { data, form } = $props();

	type MessagingFlags = {
		smsEnabled?: boolean;
		telegramEnabled?: boolean;
		viberEnabled?: boolean;
		discordEnabled?: boolean;
		emailEnabled?: boolean;
		/** Legacy flag; migrated away on save. */
		whatsappEnabled?: boolean;
	};

	const msg = $derived((data.business.messagingConfig ?? {}) as MessagingFlags);

	const baseLocaleOptions = [
		{ value: 'en', label: 'English (en)' },
		{ value: 'my', label: 'Myanmar (my)' },
		{ value: 'ja', label: 'Japanese (ja)' },
		{ value: 'zh', label: 'Chinese (zh)' },
		{ value: 'th', label: 'Thai (th)' },
		{ value: 'hi', label: 'Hindi (hi)' }
	];

	const initial = untrack(() => {
		const voice = data.voices[0];
		const cfg = buildAnnounceVoiceConfig(voice);
		const merged = normalizeLocaleTemplates(voice?.templates ?? undefined);
		const localeTemplates: Record<string, string> = {};
		for (const code of cfg.announceLocales) {
			localeTemplates[code] = merged[code] ?? defaultAnnounceTemplateForLocale(code);
		}
		return {
			announceLocales: cfg.announceLocales,
			announceRepeat: cfg.announceRepeat,
			announceRepeatDelaySec: cfg.announceRepeatDelayMs / 1000,
			localeTemplates,
			speechRate: cfg.speech.rate,
			speechPitch: cfg.speech.pitch,
			speechVolume: cfg.speech.volume,
			localeVoices: { ...cfg.speech.localeVoices }
		};
	});

	let savingMessaging = $state(false);
	let savingVoice = $state(false);
	let dismissedMessage = $state<string | null>(null);
	let announceLocales = $state<string[]>([...initial.announceLocales]);
	let announceRepeat = $state(initial.announceRepeat);
	let announceRepeatDelaySec = $state(initial.announceRepeatDelaySec);
	let localeTemplates = $state<Record<string, string>>({ ...initial.localeTemplates });
	let speechRate = $state(initial.speechRate);
	let speechPitch = $state(initial.speechPitch);
	let speechVolume = $state(initial.speechVolume);
	let localeVoices = $state<Record<string, string>>({ ...initial.localeVoices });
	let localeToAdd = $state('');
	let browserVoices = $state<SpeechSynthesisVoice[]>([]);

	onMount(() => {
		if (typeof window === 'undefined' || !window.speechSynthesis) return;
		const synth = window.speechSynthesis;
		const refresh = () => {
			browserVoices = synth.getVoices();
		};
		refresh();
		synth.addEventListener('voiceschanged', refresh);
		return () => synth.removeEventListener('voiceschanged', refresh);
	});

	const localeTemplatesJson = $derived(
		JSON.stringify(
			Object.fromEntries(
				announceLocales.map((code) => [
					code,
					(localeTemplates[code] ?? defaultAnnounceTemplateForLocale(code)).trim()
				])
			)
		)
	);

	const speechSettingsJson = $derived(
		JSON.stringify({
			rate: speechRate,
			pitch: speechPitch,
			volume: speechVolume,
			localeVoices
		})
	);

	function voicesForLocale(code: string) {
		return listBrowserVoicesForLocale(code, browserVoices);
	}

	function setLocaleVoice(code: string, voiceUri: string) {
		if (!voiceUri) {
			const { [code]: _, ...rest } = localeVoices;
			localeVoices = rest;
			return;
		}
		localeVoices = { ...localeVoices, [code]: voiceUri };
	}

	function setLocaleTemplate(code: string, value: string) {
		localeTemplates = { ...localeTemplates, [code]: value };
	}

	const localeLabel = (code: string) =>
		baseLocaleOptions.find((o) => o.value === code)?.label ?? code;

	const addableLocaleOptions = $derived(
		baseLocaleOptions.filter((o) => !announceLocales.includes(o.value))
	);

	const showToast = $derived(!!form?.message && form.message !== dismissedMessage);

	function addLocale() {
		const next = localeToAdd.trim();
		if (!next) return;
		if (announceLocales.includes(next)) {
			localeToAdd = '';
			return;
		}
		announceLocales = [...announceLocales, next];
		localeTemplates = {
			...localeTemplates,
			[next]: defaultAnnounceTemplateForLocale(next)
		};
		localeToAdd = '';
	}

	function removeLocale(index: number) {
		if (announceLocales.length <= 1) return;
		const code = announceLocales[index]!;
		announceLocales = announceLocales.filter((_, i) => i !== index);
		const { [code]: _, ...restTemplates } = localeTemplates;
		localeTemplates = restTemplates;
		const { [code]: __, ...restVoices } = localeVoices;
		localeVoices = restVoices;
	}

	function moveLocale(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= announceLocales.length) return;
		const next = [...announceLocales];
		const [item] = next.splice(index, 1);
		next.splice(target, 0, item!);
		announceLocales = next;
	}
</script>

<svelte:head>
	<title>Config | {data.business.name}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

{#if showToast && form?.message}
	<div class="toast toast-end toast-bottom z-[100]">
		<div
			class="alert shadow-lg"
			class:alert-success={form.success}
			class:alert-error={!form.success}
		>
			{#if form.success}
				<CircleCheck class="h-5 w-5 shrink-0" aria-hidden="true" />
			{:else}
				<CircleX class="h-5 w-5 shrink-0" aria-hidden="true" />
			{/if}
			<span>{form.message}</span>
			<ToastDismissButton onclick={() => (dismissedMessage = form.message ?? null)} />
		</div>
	</div>
{/if}

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
	<PageHeader
		title="Config"
		subtitle="Control how guests hear from you and how the floor announces who is next."
	/>

	<section
		class="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5 {washRecipes.paneCard}"
	>
		<div class="mb-4 flex items-start gap-3">
			<div
				class="flex size-10 shrink-0 items-center justify-center rounded-box bg-primary/10 text-primary"
				aria-hidden="true"
			>
				<MessageSquare class="size-5" />
			</div>
			<div class="min-w-0">
				<h2 class="card-title font-bold text-primary">Messaging & signup</h2>
				<p class="mt-1 text-sm text-base-content/65">
					Choose which channels reach guests, and whether they can join with an invite code.
				</p>
			</div>
		</div>

		<form
			method="POST"
			action="?/saveMessaging"
			class="space-y-4"
			use:enhance={bindSubmitting((v) => {
				savingMessaging = v;
				if (v) dismissedMessage = null;
			})}
		>
			<div class="space-y-2">
				<label
					class="flex cursor-pointer items-start gap-3 rounded-box border border-base-300 p-3 transition-colors hover:bg-base-200/50"
				>
					<input
						type="checkbox"
						name="smsEnabled"
						class="checkbox mt-0.5 shrink-0 cursor-pointer checkbox-primary"
						checked={msg.smsEnabled !== false}
					/>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2 font-medium">
							<MessagesSquare class="size-4 shrink-0 text-base-content/50" aria-hidden="true" />
							SMS notifications
						</span>
						<span class="mt-0.5 block text-sm text-base-content/60"
							>Text guests when their ticket is called or updated.</span
						>
					</span>
				</label>

				<label
					class="flex cursor-pointer items-start gap-3 rounded-box border border-base-300 p-3 transition-colors hover:bg-base-200/50"
				>
					<input
						type="checkbox"
						name="telegramEnabled"
						class="checkbox mt-0.5 shrink-0 cursor-pointer checkbox-primary"
						checked={!!msg.telegramEnabled || !!msg.whatsappEnabled}
					/>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2 font-medium">
							<svg
								class="size-4 shrink-0 text-base-content/50"
								viewBox="0 0 24 24"
								aria-hidden="true"><path fill="currentColor" d={siTelegram.path} /></svg
							>
							Telegram notifications
						</span>
						<span class="mt-0.5 block text-sm text-base-content/60"
							>Send ticket updates on Telegram when the channel is configured.</span
						>
					</span>
				</label>

				<label
					class="flex cursor-pointer items-start gap-3 rounded-box border border-base-300 p-3 transition-colors hover:bg-base-200/50"
				>
					<input
						type="checkbox"
						name="viberEnabled"
						class="checkbox mt-0.5 shrink-0 cursor-pointer checkbox-primary"
						checked={!!msg.viberEnabled}
					/>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2 font-medium">
							<svg
								class="size-4 shrink-0 text-base-content/50"
								viewBox="0 0 24 24"
								aria-hidden="true"><path fill="currentColor" d={siViber.path} /></svg
							>
							Viber notifications
						</span>
						<span class="mt-0.5 block text-sm text-base-content/60"
							>Reach guests on Viber for call and wait updates.</span
						>
					</span>
				</label>

				<label
					class="flex cursor-pointer items-start gap-3 rounded-box border border-base-300 p-3 transition-colors hover:bg-base-200/50"
				>
					<input
						type="checkbox"
						name="discordEnabled"
						class="checkbox mt-0.5 shrink-0 cursor-pointer checkbox-primary"
						checked={!!msg.discordEnabled}
					/>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2 font-medium">
							<svg
								class="size-4 shrink-0 text-base-content/50"
								viewBox="0 0 24 24"
								aria-hidden="true"><path fill="currentColor" d={siDiscord.path} /></svg
							>
							Discord notifications
						</span>
						<span class="mt-0.5 block text-sm text-base-content/60"
							>Post ticket updates to Discord when a bot webhook is configured.</span
						>
					</span>
				</label>

				<label
					class="flex cursor-pointer items-start gap-3 rounded-box border border-base-300 p-3 transition-colors hover:bg-base-200/50"
				>
					<input
						type="checkbox"
						name="emailEnabled"
						class="checkbox mt-0.5 shrink-0 cursor-pointer checkbox-primary"
						checked={msg.emailEnabled !== false}
					/>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2 font-medium">
							<Mail class="size-4 shrink-0 text-base-content/50" aria-hidden="true" />
							Email
						</span>
						<span class="mt-0.5 block text-sm text-base-content/60"
							>Email confirmations and status updates to guests who share an address.</span
						>
					</span>
				</label>

				<label
					class="flex cursor-pointer items-start gap-3 rounded-box border border-base-300 p-3 transition-colors hover:bg-base-200/50"
				>
					<input
						type="checkbox"
						name="publicSignupEnabled"
						class="checkbox mt-0.5 shrink-0 cursor-pointer checkbox-primary"
						checked={data.business.publicSignupEnabled}
					/>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2 font-medium">
							<UserPlus class="size-4 shrink-0 text-base-content/50" aria-hidden="true" />
							Guest self-signup
						</span>
						<span class="mt-0.5 block text-sm text-base-content/60"
							>Allow guests to join this business with an invite code, without a staff invite.</span
						>
					</span>
				</label>
			</div>

			<div class="flex flex-wrap justify-end gap-2 pt-1">
				<button
					type="submit"
					class="btn btn-primary"
					class:loading={savingMessaging}
					class:btn-disabled={savingMessaging}
					class:cursor-pointer={!savingMessaging}
					class:cursor-not-allowed={savingMessaging}
					disabled={savingMessaging}
					aria-busy={savingMessaging}
				>
					Save messaging
				</button>
			</div>
		</form>
	</section>

	<section
		class="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5 {washRecipes.paneCard}"
	>
		<div class="mb-4 flex items-start gap-3">
			<div
				class="flex size-10 shrink-0 items-center justify-center rounded-box bg-secondary/10 text-secondary"
				aria-hidden="true"
			>
				<Volume2 class="size-5" />
			</div>
			<div class="min-w-0">
				<h2 class="card-title font-bold text-secondary">Voice announcements</h2>
				<p class="mt-1 text-sm text-base-content/65">
					Set language order, phrase per language, voice, tone, and how often the floor repeats the
					announcement.
				</p>
			</div>
		</div>

		<form
			method="POST"
			action="?/saveVoice"
			class="space-y-4"
			use:enhance={bindSubmitting((v) => {
				savingVoice = v;
				if (v) dismissedMessage = null;
			})}
		>
			<input type="hidden" name="announceLocales" value={announceLocales.join(',')} />
			<input type="hidden" name="localeTemplates" value={localeTemplatesJson} />
			<input type="hidden" name="speechSettings" value={speechSettingsJson} />

			<div class="form-control w-full">
				<span class="label-text mb-1">
					Announcement languages<span
						class="align-top text-sm leading-none text-error"
						aria-hidden="true">*</span
					>
				</span>
				<p class="mb-2 text-xs text-base-content/55">
					Spoken in this order for every ticket call. Add more than one language when the floor
					needs multi-language announce.
				</p>

				<ul class="divide-y divide-base-300 overflow-hidden rounded-box border border-base-300">
					{#each announceLocales as code, index (code)}
						<li class="bg-base-100">
							<details class="group">
								<summary
									class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden"
								>
									<span class="w-6 shrink-0 text-center text-sm text-base-content/45 tabular-nums"
										>{index + 1}</span
									>
									<Globe class="size-4 shrink-0 text-base-content/40" aria-hidden="true" />
									<span class="min-w-0 flex-1 truncate text-sm font-medium"
										>{localeLabel(code)}</span
									>
									<ChevronDown
										class="size-4 shrink-0 text-base-content/40 transition-transform group-open:rotate-180"
										aria-hidden="true"
									/>
									<div class="flex shrink-0 items-center gap-0.5" role="presentation">
										<WashTooltip tooltipText="Move up" className="tooltip-secondary">
											<button
												type="button"
												class="btn btn-square cursor-pointer btn-ghost btn-xs"
												class:btn-disabled={index === 0}
												class:cursor-not-allowed={index === 0}
												disabled={index === 0}
												aria-label="Move up"
												onclick={(e) => {
													e.preventDefault();
													moveLocale(index, -1);
												}}
											>
												<ArrowUp class="size-3.5" aria-hidden="true" />
											</button>
										</WashTooltip>
										<WashTooltip tooltipText="Move down" className="tooltip-secondary">
											<button
												type="button"
												class="btn btn-square cursor-pointer btn-ghost btn-xs"
												class:btn-disabled={index >= announceLocales.length - 1}
												class:cursor-not-allowed={index >= announceLocales.length - 1}
												disabled={index >= announceLocales.length - 1}
												aria-label="Move down"
												onclick={(e) => {
													e.preventDefault();
													moveLocale(index, 1);
												}}
											>
												<ArrowDown class="size-3.5" aria-hidden="true" />
											</button>
										</WashTooltip>
										<WashTooltip tooltipText="Remove" className="tooltip-error">
											<button
												type="button"
												class="btn btn-square cursor-pointer btn-ghost btn-error btn-xs"
												class:btn-disabled={announceLocales.length <= 1}
												class:cursor-not-allowed={announceLocales.length <= 1}
												disabled={announceLocales.length <= 1}
												aria-label="Remove"
												onclick={(e) => {
													e.preventDefault();
													removeLocale(index);
												}}
											>
												<Trash2 class="size-3.5" aria-hidden="true" />
											</button>
										</WashTooltip>
									</div>
								</summary>
								<div class="space-y-3 border-t border-base-300 px-3 py-3">
									<label class="form-control w-full" for="voice-template-{code}">
										<span class="label-text mb-1">Announcement text</span>
										<textarea
											id="voice-template-{code}"
											class="textarea-bordered textarea min-h-20 w-full cursor-text"
											value={localeTemplates[code] ?? defaultAnnounceTemplateForLocale(code)}
											oninput={(e) =>
												setLocaleTemplate(code, (e.currentTarget as HTMLTextAreaElement).value)}
											required></textarea>
										<span class="mt-1 text-xs text-base-content/55">
											Use {'{number}'} and {'{counter}'} in this language.
										</span>
									</label>
									<label class="form-control w-full" for="voice-uri-{code}">
										<span class="label-text mb-1">Voice</span>
										<select
											id="voice-uri-{code}"
											class="select-bordered select w-full cursor-pointer"
											value={localeVoices[code] ?? ''}
											onchange={(e) =>
												setLocaleVoice(code, (e.currentTarget as HTMLSelectElement).value)}
										>
											<option value="">System default for {localeLabel(code)}</option>
											{#each voicesForLocale(code) as v (v.voiceURI)}
												<option value={v.voiceURI}>{v.name} ({v.lang})</option>
											{/each}
										</select>
										{#if browserVoices.length === 0}
											<span class="mt-1 text-xs text-base-content/55">
												Voices load in this browser; the TV display uses its own installed voices.
											</span>
										{/if}
									</label>
								</div>
							</details>
						</li>
					{/each}
				</ul>

				{#if addableLocaleOptions.length}
					<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
						<label class="form-control min-w-0 flex-1" for="voice-locale-add">
							<span class="label-text mb-1">Add language</span>
							<SearchSelect
								id="voice-locale-add"
								name="localeToAdd"
								options={addableLocaleOptions}
								bind:value={localeToAdd}
								placeholder="Select language..."
								ariaLabel="Add announcement language"
								allowEmpty
								emptyLabel="Select language..."
							/>
						</label>
						<button
							type="button"
							class="btn shrink-0 cursor-pointer btn-outline btn-secondary"
							class:btn-disabled={!localeToAdd}
							class:cursor-not-allowed={!localeToAdd}
							disabled={!localeToAdd}
							onclick={addLocale}
						>
							<Plus class="size-4" aria-hidden="true" />
							Add
						</button>
					</div>
				{:else}
					<p class="mt-2 text-xs text-base-content/55">
						All available languages are already listed.
					</p>
				{/if}
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="form-control w-full" for="voice-announce-repeat">
					<span class="label-text mb-1">
						Announce frequency<span
							class="align-top text-sm leading-none text-error"
							aria-hidden="true">*</span
						>
					</span>
					<input
						id="voice-announce-repeat"
						name="announceRepeat"
						type="number"
						min="1"
						max="10"
						step="1"
						class="input-bordered input w-full max-w-xs cursor-text"
						bind:value={announceRepeat}
						required
					/>
				</label>

				<label class="form-control w-full" for="voice-announce-repeat-delay">
					<span class="label-text mb-1">Delay between repeats (seconds)</span>
					<input
						id="voice-announce-repeat-delay"
						name="announceRepeatDelaySec"
						type="number"
						min="0"
						max="60"
						step="0.5"
						class="input-bordered input w-full max-w-xs cursor-text"
						bind:value={announceRepeatDelaySec}
					/>
				</label>
			</div>

			<fieldset class="rounded-box border border-base-300 p-4">
				<legend class="px-1 text-sm font-medium text-base-content">Tone (all languages)</legend>
				<div class="mt-3 grid gap-4 sm:grid-cols-3">
					<label class="form-control w-full" for="voice-speech-rate">
						<span class="label-text mb-1">Speed — {speechRate.toFixed(2)}</span>
						<input
							id="voice-speech-rate"
							type="range"
							min="0.5"
							max="2"
							step="0.05"
							class="range range-secondary"
							bind:value={speechRate}
						/>
					</label>
					<label class="form-control w-full" for="voice-speech-pitch">
						<span class="label-text mb-1">Pitch — {speechPitch.toFixed(2)}</span>
						<input
							id="voice-speech-pitch"
							type="range"
							min="0.5"
							max="2"
							step="0.05"
							class="range range-secondary"
							bind:value={speechPitch}
						/>
					</label>
					<label class="form-control w-full" for="voice-speech-volume">
						<span class="label-text mb-1">Volume — {speechVolume.toFixed(2)}</span>
						<input
							id="voice-speech-volume"
							type="range"
							min="0.1"
							max="1"
							step="0.05"
							class="range range-secondary"
							bind:value={speechVolume}
						/>
					</label>
				</div>
			</fieldset>

			<div class="flex flex-wrap justify-end gap-2 pt-1">
				<button
					type="submit"
					class="btn btn-secondary"
					class:loading={savingVoice}
					class:btn-disabled={savingVoice}
					class:cursor-pointer={!savingVoice}
					class:cursor-not-allowed={savingVoice}
					disabled={savingVoice}
					aria-busy={savingVoice}
				>
					Save voice
				</button>
			</div>
		</form>
	</section>
</div>
