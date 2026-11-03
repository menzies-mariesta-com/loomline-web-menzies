<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { CircleCheck, CircleX, Send } from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import SearchSelect from '#lib/component/own/local/private/SearchSelect.svelte';
	import ToastDismissButton from '#lib/component/own/local/private/ToastDismissButton.svelte';
	import { TRIAL_DURATION_OPTIONS } from '#lib/tool/plans';
	import { m } from '#lib/paraglide/messages';

	type FormState = {
		success?: boolean;
		message?: string;
		otpSent?: boolean;
	} | null;

	type Props = {
		form?: FormState;
	};

	let { form = null }: Props = $props();

	let submitting = $state(false);
	let sendingOtp = $state(false);
	let toastGone = $state(false);
	let duration = $state('7d');

	const durationOptions = TRIAL_DURATION_OPTIONS.map((o) => ({
		value: o.value,
		label: o.label
	}));

	const onEnhance: SubmitFunction = ({ action }) => {
		const isOtp = action.search.includes('sendTrialOtp');
		if (isOtp) sendingOtp = true;
		else submitting = true;
		return async ({ update }) => {
			try {
				await update();
			} finally {
				sendingOtp = false;
				submitting = false;
			}
		};
	};

	$effect(() => {
		if (form?.message) toastGone = false;
	});
</script>

<section
	id="request-trial"
	class="scroll-mt-24 px-4 py-16 sm:px-6"
	aria-labelledby="trial-request-heading"
>
	<div class="mx-auto max-w-6xl">
		<div class="{washRecipes.washPanel} border-base-300 w-full border p-6 sm:p-8">
			<h2
				id="trial-request-heading"
				class="card-title text-primary font-bold text-2xl sm:text-3xl"
			>
				{m.pricing_trial_title()}
			</h2>
			<p class="text-ink-muted mt-2 max-w-2xl text-sm sm:text-base">
				{m.pricing_trial_lead()}
			</p>

			{#if form?.message && !toastGone}
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
						<ToastDismissButton onclick={() => (toastGone = true)} />
					</div>
				</div>
			{/if}

			<form
				method="POST"
				action="?/requestTrial"
				class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2"
				use:enhance={onEnhance}
			>
				<label class="form-control flex w-full flex-col" for="trial-first-name">
					<span class="label-text mb-1">
						{m.pricing_trial_first_name()}<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</span>
					<input
						id="trial-first-name"
						name="firstName"
						autocomplete="given-name"
						class="input input-bordered w-full cursor-text"
						required
					/>
				</label>

				<label class="form-control flex w-full flex-col" for="trial-last-name">
					<span class="label-text mb-1">
						{m.pricing_trial_last_name()}<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</span>
					<input
						id="trial-last-name"
						name="lastName"
						autocomplete="family-name"
						class="input input-bordered w-full cursor-text"
						required
					/>
				</label>

				<label class="form-control flex w-full flex-col md:col-span-2" for="trial-business-name">
					<span class="label-text mb-1">
						{m.pricing_trial_business_name()}<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</span>
					<input
						id="trial-business-name"
						name="businessName"
						autocomplete="organization"
						class="input input-bordered w-full cursor-text"
						required
					/>
				</label>

				<label class="form-control flex w-full flex-col md:col-span-2" for="trial-website">
					<span class="label-text mb-1">{m.pricing_trial_website()}</span>
					<input
						id="trial-website"
						name="businessWebsite"
						type="url"
						autocomplete="url"
						placeholder="https://"
						class="input input-bordered w-full cursor-text"
					/>
				</label>

				<div class="form-control flex w-full flex-col md:col-span-2">
					<span class="label-text mb-1" id="trial-email-label">
						{m.pricing_trial_email()}<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</span>
					<div class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
						<input
							id="trial-email"
							name="email"
							type="email"
							autocomplete="email"
							aria-labelledby="trial-email-label"
							class="input input-bordered w-full flex-1 cursor-text"
							required
						/>
						<button
							type="submit"
							formaction="?/sendTrialOtp"
							formnovalidate
							class="btn btn-secondary shrink-0"
							class:cursor-pointer={!sendingOtp && !submitting}
							class:cursor-not-allowed={sendingOtp || submitting}
							class:btn-disabled={sendingOtp || submitting}
							class:loading={sendingOtp}
							disabled={sendingOtp || submitting}
							aria-busy={sendingOtp}
						>
							{#if !sendingOtp}
								<Send class="size-4" aria-hidden="true" />
							{/if}
							{m.pricing_trial_send_otp()}
						</button>
					</div>
					{#if form?.otpSent}
						<p class="text-success mt-1 text-xs">{m.pricing_trial_otp_hint()}</p>
					{/if}
				</div>

				<label class="form-control flex w-full flex-col" for="trial-otp">
					<span class="label-text mb-1">
						{m.pricing_trial_otp()}<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</span>
					<input
						id="trial-otp"
						name="otp"
						inputmode="numeric"
						autocomplete="one-time-code"
						pattern={"[0-9]{6}"}
						maxlength="6"
						placeholder="000000"
						class="input input-bordered w-full cursor-text font-mono tracking-widest"
						required
					/>
				</label>

				<label class="form-control flex w-full flex-col" for="trial-duration">
					<span class="label-text mb-1">
						{m.pricing_trial_duration()}<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</span>
					<SearchSelect
						id="trial-duration"
						name="duration"
						options={durationOptions}
						bind:value={duration}
						required
						placeholder={m.pricing_trial_duration_placeholder()}
						filterPlaceholder={m.common_search()}
						ariaLabel={m.pricing_trial_duration()}
					/>
				</label>

				<label class="form-control flex w-full flex-col md:col-span-2" for="trial-message">
					<span class="label-text mb-1">{m.pricing_trial_message()}</span>
					<textarea
						id="trial-message"
						name="message"
						rows="4"
						class="textarea textarea-bordered w-full cursor-text"
						placeholder={m.pricing_trial_message_placeholder()}
					></textarea>
				</label>

				<div class="md:col-span-2 flex flex-wrap items-center justify-end gap-3 pt-2">
					<button
						type="submit"
						class="btn btn-primary"
						class:cursor-pointer={!submitting && !sendingOtp}
						class:cursor-not-allowed={submitting || sendingOtp}
						class:btn-disabled={submitting || sendingOtp}
						class:loading={submitting}
						disabled={submitting || sendingOtp}
						aria-busy={submitting}
					>
						{m.pricing_trial_submit()}
					</button>
				</div>
			</form>
		</div>
	</div>
</section>
