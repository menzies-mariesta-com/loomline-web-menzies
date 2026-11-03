<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Eye, EyeOff } from '@lucide/svelte';
	import appIcon from '#lib/asset/image/app-icon-ticket.svg';
	import { m } from '#lib/paraglide/messages';
	import MenziesLink from '#lib/component/own/local/public/MenziesLink.svelte';
	import { bindSubmitting } from '#lib/tool/form-submit';

	let { data, form } = $props();
	let submitting = $state(false);
	let isPasswordVisible = $state(false);
	let rememberMe = $state(true);

	function togglePasswordVisibility() {
		isPasswordVisible = !isPasswordVisible;
	}
</script>

<svelte:head>
	<title>{m.auth_login_seo_title()}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<!-- Medora AuthSplitHero composition: brand + welcome copy | form card -->
<div class="hero min-h-[min(32rem,80vh)] w-full rounded-box">
	<div
		class="hero-content w-full max-w-5xl flex-col gap-8 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
	>
		<div class="max-w-md text-center lg:text-left">
			<p class="label-ink mb-2">
				<span
					class="font-[family-name:var(--font-display)] text-primary inline-flex cursor-pointer items-center justify-center gap-2 text-lg font-semibold tracking-tight whitespace-nowrap lg:justify-start"
				>
					<a href={resolve('/')} class="inline-flex shrink-0">
						<img src={appIcon} alt="" width="28" height="28" class="size-7 shrink-0" aria-hidden="true" />
					</a>
					<MenziesLink
						class="font-[family-name:var(--font-display)] text-primary text-lg font-semibold tracking-tight"
					/>
				</span>
			</p>
			<h1 class="font-display text-3xl font-bold md:text-4xl">{m.auth_login_welcome()}</h1>
			<p class="text-ink-muted py-4 text-sm md:text-base">
				{m.auth_login_lead()}
			</p>
		</div>

		<div class="w-full max-w-sm shrink-0">
			<form
				method="POST"
				class="w-full"
				use:enhance={bindSubmitting((v) => (submitting = v))}
			>
				<input type="hidden" name="redirectTo" value={data.redirectTo} />

				<div class="card border-base-300 w-full max-w-sm border shadow-sm">
					<div class="card-body gap-4">
						<div>
							<h2 class="card-title text-secondary font-bold">{m.auth_login_card_title()}</h2>
							<p class="text-ink-muted text-sm">{m.auth_login_card_lead()}</p>
						</div>

						{#if form?.message}
							<div class="alert alert-error">
								<span>{form.message}</span>
							</div>
						{/if}

						<fieldset class="fieldset">
							<label class="label" for="auth-login-email">
								<span class="label-text">
									{m.common_email()}<span
										class="text-error align-top text-sm leading-none"
										aria-hidden="true">*</span
									>
								</span>
							</label>
							<input
								id="auth-login-email"
								name="email"
								type="email"
								placeholder={m.common_email()}
								class="input input-bordered w-full cursor-text"
								required
								autocomplete="email"
								value={form?.email ?? ''}
							/>
						</fieldset>

						<fieldset class="fieldset">
							<label class="label" for="auth-login-password">
								<span class="label-text">
									{m.common_password()}<span
										class="text-error align-top text-sm leading-none"
										aria-hidden="true">*</span
									>
								</span>
							</label>
							<div class="join flex w-full">
								<input
									id="auth-login-password"
									name="password"
									type={isPasswordVisible ? 'text' : 'password'}
									placeholder={m.common_password()}
									class="input input-bordered join-item w-full cursor-text"
									required
									autocomplete="current-password"
								/>
								<button
									type="button"
									class="btn btn-square btn-secondary join-item tooltip tooltip-secondary tooltip-left cursor-pointer"
									data-tip={isPasswordVisible ? m.common_hide_password() : m.common_show_password()}
									aria-label={isPasswordVisible ? m.common_hide_password() : m.common_show_password()}
									onclick={togglePasswordVisibility}
								>
									{#if isPasswordVisible}
										<Eye class="size-4" aria-hidden="true" />
									{:else}
										<EyeOff class="size-4" aria-hidden="true" />
									{/if}
								</button>
							</div>
						</fieldset>

						<div class="flex items-center justify-between gap-2 text-sm">
							<label class="label cursor-pointer gap-2 py-0" for="auth-remember">
								<input
									id="auth-remember"
									type="checkbox"
									class="checkbox checkbox-sm cursor-pointer"
									bind:checked={rememberMe}
								/>
								<span class="label-text">{m.common_remember_me()}</span>
							</label>
						</div>

						<div class="card-actions mt-1 w-full flex-col gap-2">
							<button
								type="submit"
								class="btn btn-primary w-full"
								class:cursor-pointer={!submitting}
								class:cursor-not-allowed={submitting}
								class:btn-disabled={submitting}
								disabled={submitting}
								aria-busy={submitting}
							>
								{#if submitting}
									<span class="inline-flex items-center gap-2">
										<span class="loading loading-spinner loading-sm" aria-hidden="true"
										></span>
										<span>{m.common_signing_in()}</span>
									</span>
								{:else}
									{m.auth_login_submit()}
								{/if}
							</button>
						</div>
					</div>
				</div>
			</form>
		</div>
	</div>
</div>
