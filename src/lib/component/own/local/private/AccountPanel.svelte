<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import {
		Building2,
		CircleCheck,
		CircleX,
		KeyRound,
		LogOut,
		Shield,
		UserRound
	} from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import PageHeader from '#lib/component/own/local/private/PageHeader.svelte';
	import { bindSubmitting } from '#lib/tool/form-submit';
	import { shortDateTime } from '#lib/util/format';
	import { m } from '#lib/paraglide/messages';

	type Membership = {
		id: string;
		role: string;
		business: { id: string; name: string; imageUrl: string | null } | null;
	};

	type Profile = {
		id: string;
		name: string;
		email: string;
		emailVerified: boolean;
		image: string | null;
		createdAt: Date | string;
		updatedAt: Date | string;
	};

	type SessionInfo = {
		createdAt: Date | string;
		expiresAt: Date | string;
		updatedAt: Date | string;
		ipAddress: string | null;
		userAgent: string | null;
	} | null;

	type AccountForm = {
		message?: string;
		success?: boolean;
		name?: string;
		image?: string;
	} | null;

	type Props = {
		profile: Profile;
		sessionInfo: SessionInfo;
		hasPassword: boolean;
		memberships: Membership[];
		platformAdmin: boolean;
		form: AccountForm;
	};

	let { profile, sessionInfo, hasPassword, memberships, platformAdmin, form }: Props = $props();

	let savingProfile = $state(false);
	let savingPassword = $state(false);
	let signingOut = $state(false);
	let dismissedMessage = $state<string | null>(null);
	let passwordFormKey = $state(0);

	const initialProfile = untrack(() => ({
		name: typeof form?.name === 'string' ? form.name : profile.name,
		image: typeof form?.image === 'string' ? form.image : (profile.image ?? '')
	}));

	let name = $state(initialProfile.name);
	let image = $state(initialProfile.image);

	const showToast = $derived(!!form?.message && form.message !== dismissedMessage);

	function roleLabel(role: string): string {
		return role.replace(/_/g, ' ');
	}
</script>

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
			<button
				type="button"
				class="btn btn-ghost btn-xs cursor-pointer"
				onclick={() => (dismissedMessage = form.message ?? null)}>{m.common_dismiss()}</button
			>
		</div>
	</div>
{/if}

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
	<PageHeader
		title={m.account_page_title()}
		subtitle={m.account_page_subtitle()}
	/>

	<section class="border-base-300 rounded-box border bg-base-100 p-4 shadow-sm sm:p-5 {washRecipes.paneCard}">
		<div class="mb-4 flex items-start gap-3">
			<div
				class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-box"
				aria-hidden="true"
			>
				{#if profile.image}
					<img src={profile.image} alt="" class="size-10 rounded-box object-cover" />
				{:else}
					<UserRound class="size-5" />
				{/if}
			</div>
			<div class="min-w-0">
				<h2 class="card-title text-primary font-bold">{m.account_personal_title()}</h2>
				<p class="text-base-content/65 mt-1 text-sm">
					{m.account_personal_lead()}
				</p>
			</div>
		</div>

		<form
			method="POST"
			action="?/updateProfile"
			class="space-y-4"
			use:enhance={bindSubmitting((v) => {
				savingProfile = v;
				if (v) dismissedMessage = null;
			})}
		>
			<fieldset class="fieldset">
				<label class="label" for="account-name">
					<span class="label-text">
						{m.common_name()}<span class="text-error align-top text-sm leading-none" aria-hidden="true">*</span>
					</span>
				</label>
				<input
					id="account-name"
					name="name"
					type="text"
					class="input input-bordered w-full cursor-text"
					bind:value={name}
					required
					autocomplete="name"
					placeholder={m.account_name_placeholder()}
				/>
			</fieldset>

			<fieldset class="fieldset">
				<label class="label" for="account-email">
					<span class="label-text">{m.common_email()}</span>
				</label>
				<input
					id="account-email"
					type="email"
					class="input input-bordered w-full cursor-not-allowed opacity-80"
					value={profile.email}
					readonly
					disabled
					autocomplete="email"
				/>
				<p class="text-base-content/55 mt-1 text-xs">
					{m.account_email_locked()}
					{#if profile.emailVerified}
						· {m.account_email_verified()}
					{:else}
						· {m.account_email_not_verified()}
					{/if}
				</p>
			</fieldset>

			<fieldset class="fieldset">
				<label class="label" for="account-image">
					<span class="label-text">{m.account_image_label()}</span>
				</label>
				<input
					id="account-image"
					name="image"
					type="text"
					class="input input-bordered w-full cursor-text"
					bind:value={image}
					autocomplete="off"
					placeholder={m.account_image_placeholder()}
				/>
				<p class="text-base-content/55 mt-1 text-xs">{m.account_image_hint()}</p>
			</fieldset>

			<div class="flex flex-wrap items-center gap-2 pt-1">
				<button
					type="submit"
					class="btn btn-primary"
					class:cursor-pointer={!savingProfile}
					class:cursor-not-allowed={savingProfile}
					class:btn-disabled={savingProfile}
					class:loading={savingProfile}
					disabled={savingProfile}
					aria-busy={savingProfile}
				>
					{m.account_save_profile()}
				</button>
			</div>
		</form>
	</section>

	<section class="border-base-300 rounded-box border bg-base-100 p-4 shadow-sm sm:p-5 {washRecipes.paneCard}">
		<div class="mb-4 flex items-start gap-3">
			<div
				class="bg-secondary/10 text-secondary flex size-10 shrink-0 items-center justify-center rounded-box"
				aria-hidden="true"
			>
				<KeyRound class="size-5" />
			</div>
			<div class="min-w-0">
				<h2 class="card-title text-secondary font-bold">{m.account_password_title()}</h2>
				<p class="text-base-content/65 mt-1 text-sm">
					{#if hasPassword}
						{m.account_password_lead_has()}
					{:else}
						{m.account_password_lead_none()}
					{/if}
				</p>
			</div>
		</div>

		{#if hasPassword}
			{#key passwordFormKey}
				<form
					method="POST"
					action="?/changePassword"
					class="space-y-4"
					use:enhance={bindSubmitting(
						(v) => {
							savingPassword = v;
							if (v) dismissedMessage = null;
						},
						async ({ result, update }) => {
							await update();
							if (result.type === 'success') passwordFormKey += 1;
						}
					)}
				>
					<fieldset class="fieldset">
						<label class="label" for="account-current-password">
							<span class="label-text">
								{m.account_current_password()}<span
									class="text-error align-top text-sm leading-none"
									aria-hidden="true">*</span
								>
							</span>
						</label>
						<input
							id="account-current-password"
							name="currentPassword"
							type="password"
							class="input input-bordered w-full cursor-text"
							required
							autocomplete="current-password"
						/>
					</fieldset>

					<fieldset class="fieldset">
						<label class="label" for="account-new-password">
							<span class="label-text">
								{m.account_new_password()}<span
									class="text-error align-top text-sm leading-none"
									aria-hidden="true">*</span
								>
							</span>
						</label>
						<input
							id="account-new-password"
							name="newPassword"
							type="password"
							class="input input-bordered w-full cursor-text"
							required
							minlength="8"
							autocomplete="new-password"
							placeholder={m.account_password_placeholder()}
						/>
					</fieldset>

					<fieldset class="fieldset">
						<label class="label" for="account-confirm-password">
							<span class="label-text">
								{m.account_confirm_password()}<span
									class="text-error align-top text-sm leading-none"
									aria-hidden="true">*</span
								>
							</span>
						</label>
						<input
							id="account-confirm-password"
							name="confirmPassword"
							type="password"
							class="input input-bordered w-full cursor-text"
							required
							minlength="8"
							autocomplete="new-password"
						/>
					</fieldset>

					<label
						class="border-base-300 hover:bg-base-200/50 flex cursor-pointer items-start gap-3 rounded-box border p-3 transition-colors"
					>
						<input
							type="checkbox"
							name="revokeOtherSessions"
							class="checkbox checkbox-primary mt-0.5 shrink-0 cursor-pointer"
						/>
						<span class="min-w-0 flex-1">
							<span class="font-medium">{m.account_revoke_sessions()}</span>
							<span class="text-base-content/60 mt-0.5 block text-sm"
								>{m.account_revoke_sessions_hint()}</span
							>
						</span>
					</label>

					<div class="flex flex-wrap items-center gap-2 pt-1">
						<button
							type="submit"
							class="btn btn-secondary"
							class:cursor-pointer={!savingPassword}
							class:cursor-not-allowed={savingPassword}
							class:btn-disabled={savingPassword}
							class:loading={savingPassword}
							disabled={savingPassword}
							aria-busy={savingPassword}
						>
							{m.account_update_password()}
						</button>
					</div>
				</form>
			{/key}
		{/if}
	</section>

	<section class="border-base-300 rounded-box border bg-base-100 p-4 shadow-sm sm:p-5 {washRecipes.paneCard}">
		<div class="mb-4 flex items-start gap-3">
			<div
				class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-box"
				aria-hidden="true"
			>
				<Shield class="size-5" />
			</div>
			<div class="min-w-0">
				<h2 class="card-title text-primary font-bold">{m.account_session_title()}</h2>
				<p class="text-base-content/65 mt-1 text-sm">
					{m.account_session_lead({ email: profile.email })}
				</p>
			</div>
		</div>

		<dl class="grid gap-3 text-sm sm:grid-cols-2">
			<div>
				<dt class="text-base-content/55">{m.account_signed_in_as()}</dt>
				<dd class="mt-0.5 font-medium break-all">{profile.name}</dd>
				<dd class="text-base-content/70 break-all">{profile.email}</dd>
			</div>
			{#if sessionInfo}
				<div>
					<dt class="text-base-content/55">{m.account_session_started()}</dt>
					<dd class="mt-0.5 font-medium">{shortDateTime(sessionInfo.createdAt)}</dd>
				</div>
				<div>
					<dt class="text-base-content/55">{m.account_last_activity()}</dt>
					<dd class="mt-0.5 font-medium">{shortDateTime(sessionInfo.updatedAt)}</dd>
				</div>
				<div>
					<dt class="text-base-content/55">{m.account_expires()}</dt>
					<dd class="mt-0.5 font-medium">{shortDateTime(sessionInfo.expiresAt)}</dd>
				</div>
				{#if sessionInfo.ipAddress}
					<div>
						<dt class="text-base-content/55">{m.account_ip()}</dt>
						<dd class="mt-0.5 font-medium">{sessionInfo.ipAddress}</dd>
					</div>
				{/if}
				{#if sessionInfo.userAgent}
					<div class="sm:col-span-2">
						<dt class="text-base-content/55">{m.account_device()}</dt>
						<dd class="mt-0.5 break-all font-medium opacity-80">{sessionInfo.userAgent}</dd>
					</div>
				{/if}
			{/if}
			<div>
				<dt class="text-base-content/55">{m.account_created()}</dt>
				<dd class="mt-0.5 font-medium">{shortDateTime(profile.createdAt)}</dd>
			</div>
			{#if platformAdmin}
				<div>
					<dt class="text-base-content/55">{m.account_platform_role()}</dt>
					<dd class="mt-0.5">
						<span class="badge badge-secondary badge-sm">{m.account_platform_admin()}</span>
					</dd>
				</div>
			{/if}
		</dl>

		<form
			method="POST"
			action="/auth/logout"
			class="mt-5"
			onsubmit={() => {
				signingOut = true;
			}}
		>
			<button
				type="submit"
				class="btn btn-error btn-outline gap-2"
				class:cursor-pointer={!signingOut}
				class:cursor-not-allowed={signingOut}
				class:btn-disabled={signingOut}
				class:loading={signingOut}
				disabled={signingOut}
				aria-busy={signingOut}
			>
				{#if !signingOut}
					<LogOut class="size-4" aria-hidden="true" />
				{/if}
				{m.common_sign_out()}
			</button>
		</form>
	</section>

	{#if memberships.length > 0 || platformAdmin}
		<section
			class="border-base-300 rounded-box border bg-base-100 p-4 shadow-sm sm:p-5 {washRecipes.paneCard}"
		>
			<div class="mb-4 flex items-start gap-3">
				<div
					class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-box"
					aria-hidden="true"
				>
					<Building2 class="size-5" />
				</div>
				<div class="min-w-0">
					<h2 class="card-title text-primary font-bold">{m.account_memberships_title()}</h2>
					<p class="text-base-content/65 mt-1 text-sm">
						{m.account_memberships_lead()}
					</p>
				</div>
			</div>

			{#if platformAdmin}
				<a
					href={resolve('/admin')}
					class="btn btn-outline btn-sm mb-3 w-fit cursor-pointer gap-2"
				>
					<Shield class="size-4" aria-hidden="true" />
					{m.account_open_admin()}
				</a>
			{/if}

			<ul class="menu bg-base-200 rounded-box w-full">
				{#each memberships as membership (membership.id)}
					{#if membership.business}
						<li>
							<a class="cursor-pointer" href={resolve(`/b/${membership.business.id}`)}>
								{#if membership.business.imageUrl}
									<img
										src={membership.business.imageUrl}
										alt=""
										class="size-6 rounded object-cover"
									/>
								{:else}
									<span
										class="bg-primary/15 text-primary flex size-6 items-center justify-center rounded text-xs font-semibold"
										aria-hidden="true"
									>
										{membership.business.name.trim()[0]?.toUpperCase() ?? 'B'}
									</span>
								{/if}
								<span class="flex-1">{membership.business.name}</span>
								<span class="badge badge-sm">{roleLabel(membership.role)}</span>
							</a>
						</li>
					{/if}
				{:else}
					{#if !platformAdmin}
						<li class="disabled opacity-60"><span>{m.account_no_memberships()}</span></li>
					{/if}
				{/each}
			</ul>

			<a href={resolve('/workspaces')} class="link link-primary mt-3 inline-block cursor-pointer text-sm"
				>{m.account_all_workspaces()}</a
			>
		</section>
	{/if}
</div>
