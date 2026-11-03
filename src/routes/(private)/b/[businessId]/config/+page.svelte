<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import {
		ArrowDown,
		ArrowUp,
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
		DEFAULT_VOICE_TEMPLATE,
		normalizeAnnounceLocales,
		normalizeAnnounceRepeat
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
		const templates = (voice?.templates ?? {}) as Record<string, string>;
		const fromColumn = normalizeAnnounceLocales(
			voice?.announceLocales,
			voice?.locale ?? 'en'
		);
		return {
			announceLocales: fromColumn,
			announceRepeat: normalizeAnnounceRepeat(voice?.announceRepeat ?? 1),
			nowServing: templates.now_serving ?? DEFAULT_VOICE_TEMPLATE
		};
	});

	let savingMessaging = $state(false);
	let savingVoice = $state(false);
	let dismissedMessage = $state<string | null>(null);
	let announceLocales = $state<string[]>([...initial.announceLocales]);
	let announceRepeat = $state(initial.announceRepeat);
	let nowServing = $state(initial.nowServing);
	let localeToAdd = $state('');

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
		localeToAdd = '';
	}

	function removeLocale(index: number) {
		if (announceLocales.length <= 1) return;
		announceLocales = announceLocales.filter((_, i) => i !== index);
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
	<div class="toast toast-bottom toast-end z-[100]">
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
		class="border-base-300 rounded-box border bg-base-100 p-4 shadow-sm sm:p-5 {washRecipes.paneCard}"
	>
		<div class="mb-4 flex items-start gap-3">
			<div
				class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-box"
				aria-hidden="true"
			>
				<MessageSquare class="size-5" />
			</div>
			<div class="min-w-0">
				<h2 class="card-title text-primary font-bold">Messaging & signup</h2>
				<p class="text-base-content/65 mt-1 text-sm">
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
					class="border-base-300 hover:bg-base-200/50 flex cursor-pointer items-start gap-3 rounded-box border p-3 transition-colors"
				>
					<input
						type="checkbox"
						name="smsEnabled"
						class="checkbox checkbox-primary mt-0.5 shrink-0 cursor-pointer"
						checked={msg.smsEnabled !== false}
					/>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2 font-medium">
							<MessagesSquare class="text-base-content/50 size-4 shrink-0" aria-hidden="true" />
							SMS notifications
						</span>
						<span class="text-base-content/60 mt-0.5 block text-sm"
							>Text guests when their ticket is called or updated.</span
						>
					</span>
				</label>

				<label
					class="border-base-300 hover:bg-base-200/50 flex cursor-pointer items-start gap-3 rounded-box border p-3 transition-colors"
				>
					<input
						type="checkbox"
						name="telegramEnabled"
						class="checkbox checkbox-primary mt-0.5 shrink-0 cursor-pointer"
						checked={!!msg.telegramEnabled || !!msg.whatsappEnabled}
					/>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2 font-medium">
							<svg class="text-base-content/50 size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true"
								><path fill="currentColor" d={siTelegram.path} /></svg
							>
							Telegram notifications
						</span>
						<span class="text-base-content/60 mt-0.5 block text-sm"
							>Send ticket updates on Telegram when the channel is configured.</span
						>
					</span>
				</label>

				<label
					class="border-base-300 hover:bg-base-200/50 flex cursor-pointer items-start gap-3 rounded-box border p-3 transition-colors"
				>
					<input
						type="checkbox"
						name="viberEnabled"
						class="checkbox checkbox-primary mt-0.5 shrink-0 cursor-pointer"
						checked={!!msg.viberEnabled}
					/>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2 font-medium">
							<svg class="text-base-content/50 size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true"
								><path fill="currentColor" d={siViber.path} /></svg
							>
							Viber notifications
						</span>
						<span class="text-base-content/60 mt-0.5 block text-sm"
							>Reach guests on Viber for call and wait updates.</span
						>
					</span>
				</label>

				<label
					class="border-base-300 hover:bg-base-200/50 flex cursor-pointer items-start gap-3 rounded-box border p-3 transition-colors"
				>
					<input
						type="checkbox"
						name="discordEnabled"
						class="checkbox checkbox-primary mt-0.5 shrink-0 cursor-pointer"
						checked={!!msg.discordEnabled}
					/>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2 font-medium">
							<svg class="text-base-content/50 size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true"
								><path fill="currentColor" d={siDiscord.path} /></svg
							>
							Discord notifications
						</span>
						<span class="text-base-content/60 mt-0.5 block text-sm"
							>Post ticket updates to Discord when a bot webhook is configured.</span
						>
					</span>
				</label>

				<label
					class="border-base-300 hover:bg-base-200/50 flex cursor-pointer items-start gap-3 rounded-box border p-3 transition-colors"
				>
					<input
						type="checkbox"
						name="emailEnabled"
						class="checkbox checkbox-primary mt-0.5 shrink-0 cursor-pointer"
						checked={msg.emailEnabled !== false}
					/>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2 font-medium">
							<Mail class="text-base-content/50 size-4 shrink-0" aria-hidden="true" />
							Email
						</span>
						<span class="text-base-content/60 mt-0.5 block text-sm"
							>Email confirmations and status updates to guests who share an address.</span
						>
					</span>
				</label>

				<label
					class="border-base-300 hover:bg-base-200/50 flex cursor-pointer items-start gap-3 rounded-box border p-3 transition-colors"
				>
					<input
						type="checkbox"
						name="publicSignupEnabled"
						class="checkbox checkbox-primary mt-0.5 shrink-0 cursor-pointer"
						checked={data.business.publicSignupEnabled}
					/>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2 font-medium">
							<UserPlus class="text-base-content/50 size-4 shrink-0" aria-hidden="true" />
							Guest self-signup
						</span>
						<span class="text-base-content/60 mt-0.5 block text-sm"
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
		class="border-base-300 rounded-box border bg-base-100 p-4 shadow-sm sm:p-5 {washRecipes.paneCard}"
	>
		<div class="mb-4 flex items-start gap-3">
			<div
				class="bg-secondary/10 text-secondary flex size-10 shrink-0 items-center justify-center rounded-box"
				aria-hidden="true"
			>
				<Volume2 class="size-5" />
			</div>
			<div class="min-w-0">
				<h2 class="card-title text-secondary font-bold">Voice announcements</h2>
				<p class="text-base-content/65 mt-1 text-sm">
					Choose which languages to speak for each ticket, how many times to repeat the sequence,
					and the now-serving phrase.
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

			<div class="form-control w-full">
				<span class="label-text mb-1">
					Announcement languages<span
						class="text-error align-top text-sm leading-none"
						aria-hidden="true">*</span
					>
				</span>
				<p class="text-base-content/55 mb-2 text-xs">
					Spoken in this order for every ticket call. Add more than one language when the floor
					needs multi-language announce.
				</p>

				<ul class="border-base-300 divide-base-300 divide-y overflow-hidden rounded-box border">
					{#each announceLocales as code, index (code)}
						<li class="bg-base-100 flex items-center gap-2 px-3 py-2">
							<span class="text-base-content/45 w-6 shrink-0 text-center text-sm tabular-nums"
								>{index + 1}</span
							>
							<Globe class="text-base-content/40 size-4 shrink-0" aria-hidden="true" />
							<span class="min-w-0 flex-1 truncate text-sm font-medium">{localeLabel(code)}</span>
							<div class="flex shrink-0 items-center gap-0.5">
								<WashTooltip tooltipText="Move up" className="tooltip-secondary">
									<button
										type="button"
										class="btn btn-ghost btn-square btn-xs cursor-pointer"
										class:btn-disabled={index === 0}
										class:cursor-not-allowed={index === 0}
										disabled={index === 0}
										aria-label="Move up"
										onclick={() => moveLocale(index, -1)}
									>
										<ArrowUp class="size-3.5" aria-hidden="true" />
									</button>
								</WashTooltip>
								<WashTooltip tooltipText="Move down" className="tooltip-secondary">
									<button
										type="button"
										class="btn btn-ghost btn-square btn-xs cursor-pointer"
										class:btn-disabled={index >= announceLocales.length - 1}
										class:cursor-not-allowed={index >= announceLocales.length - 1}
										disabled={index >= announceLocales.length - 1}
										aria-label="Move down"
										onclick={() => moveLocale(index, 1)}
									>
										<ArrowDown class="size-3.5" aria-hidden="true" />
									</button>
								</WashTooltip>
								<WashTooltip tooltipText="Remove" className="tooltip-error">
									<button
										type="button"
										class="btn btn-ghost btn-square btn-xs btn-error cursor-pointer"
										class:btn-disabled={announceLocales.length <= 1}
										class:cursor-not-allowed={announceLocales.length <= 1}
										disabled={announceLocales.length <= 1}
										aria-label="Remove"
										onclick={() => removeLocale(index)}
									>
										<Trash2 class="size-3.5" aria-hidden="true" />
									</button>
								</WashTooltip>
							</div>
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
							class="btn btn-outline btn-secondary shrink-0 cursor-pointer"
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
					<p class="text-base-content/55 mt-2 text-xs">All available languages are already listed.</p>
				{/if}
			</div>

			<label class="form-control w-full" for="voice-announce-repeat">
				<span class="label-text mb-1">
					Announce frequency<span
						class="text-error align-top text-sm leading-none"
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
					class="input input-bordered w-full max-w-xs cursor-text"
					bind:value={announceRepeat}
					required
				/>
				<span class="text-base-content/55 mt-1.5 text-xs">
					How many times to play the full language sequence each time a ticket is called (1-10).
				</span>
			</label>

			<label class="form-control w-full" for="voice-now-serving">
				<span class="label-text mb-1">
					Now serving template<span
						class="text-error align-top text-sm leading-none"
						aria-hidden="true">*</span
					>
				</span>
				<input
					id="voice-now-serving"
					name="nowServing"
					class="input input-bordered w-full cursor-text"
					bind:value={nowServing}
					required
					placeholder="Now serving {'{number}'} at counter {'{counter}'}"
				/>
				<span class="text-base-content/55 mt-1.5 text-xs">
					Use {'{number}'} for the ticket and {'{counter}'} for the counter label. Example: Now
					serving A42 at counter 3.
				</span>
			</label>

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
