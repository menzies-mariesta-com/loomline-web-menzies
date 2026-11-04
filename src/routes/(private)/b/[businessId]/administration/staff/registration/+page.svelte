<script lang="ts">
	import { goto } from '$app/navigation';
	import { m } from '#lib/paraglide/messages';

	let { data } = $props();

	const businessId = $derived(data.businessId);
	const editing = $derived(data.member != null);

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let role = $state('manager');
	let userGroupIds = $state<string[]>([]);
	let siteIds = $state<string[]>([]);
	let active = $state(true);
	let saving = $state(false);
	let errorMessage = $state('');

	$effect(() => {
		const member = data.member;
		name = member?.name ?? '';
		email = member?.email ?? '';
		password = '';
		role = member?.role ?? 'manager';
		userGroupIds = member?.userGroupIds ?? [];
		siteIds = member?.siteIds ?? [];
		active = member ? member.status === 'active' : true;
	});

	const roleOptions = $derived.by(() => {
		const opts = [
			{ value: 'manager', label: 'Manager' },
			{ value: 'counter_agent', label: 'Counter agent' },
			{ value: 'guest', label: 'Guest' }
		];
		if (data.canCreateAdmin) {
			opts.unshift({ value: 'business_admin', label: 'Admin (full access)' });
		}
		return opts;
	});

	function toggleGroup(id: string) {
		if (userGroupIds.includes(id)) {
			userGroupIds = userGroupIds.filter((x) => x !== id);
		} else {
			userGroupIds = [...userGroupIds, id];
		}
	}

	function toggleSite(id: string) {
		if (siteIds.includes(id)) {
			siteIds = siteIds.filter((x) => x !== id);
		} else {
			siteIds = [...siteIds, id];
		}
	}

	async function save() {
		saving = true;
		errorMessage = '';
		try {
			const res = await fetch(`/api/b/${businessId}/administration/staff/registration`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(
					editing
						? {
								mode: 'update',
								membershipId: data.member!.membershipId,
								name,
								email,
								password: password || undefined,
								role,
								userGroupIds,
								siteIds,
								active
							}
						: {
								mode: 'create',
								name,
								email,
								password,
								role,
								userGroupIds,
								siteIds,
								active
							}
				)
			});
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) {
				errorMessage = payload.error ?? payload.message ?? 'Save failed';
				return;
			}
			await goto(`/b/${businessId}/administration/staff/list`);
		} catch {
			errorMessage = 'Save failed';
		} finally {
			saving = false;
		}
	}
</script>

<div class="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-6">
	<h1 class="text-2xl font-semibold">{m.nav_staff_registration()}</h1>

	{#if errorMessage}
		<p class="text-sm text-error">{errorMessage}</p>
	{/if}

	<div class="grid gap-6 lg:grid-cols-2">
		<div class="card border border-base-300 shadow-sm">
			<div class="card-body flex flex-col gap-4">
				<h2 class="card-title text-base">Identity</h2>
				<label class="flex flex-col gap-1 text-sm">
					<span>Name</span>
					<input class="input-bordered input w-full" bind:value={name} />
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span>Email</span>
					<input class="input-bordered input w-full" type="email" bind:value={email} />
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span>{editing ? 'New password (optional)' : 'Password'}</span>
					<input class="input-bordered input w-full" type="password" bind:value={password} />
				</label>
			</div>
		</div>

		<div class="card border border-base-300 shadow-sm">
			<div class="card-body flex flex-col gap-4">
				<h2 class="card-title text-base">Role</h2>
				<label class="flex flex-col gap-1 text-sm">
					<span>Membership role</span>
					<select class="select-bordered select w-full" bind:value={role}>
						{#each roleOptions as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input type="checkbox" class="checkbox" bind:checked={active} id="staff-active" />
					<span class="text-sm">Active</span>
				</label>
			</div>
		</div>
	</div>

	<div class="card border border-base-300 shadow-sm">
		<div class="card-body flex flex-col gap-6 md:flex-row">
			<h2 class="sr-only card-title">Permissions</h2>
			<div class="min-w-0 flex-1">
				<span class="mb-2 block text-sm font-medium">User groups</span>
				<div
					class="flex max-h-40 flex-wrap gap-2 overflow-auto rounded-lg border-2 border-base-300 p-3"
				>
					{#each data.groups as group (group.id)}
						<button
							type="button"
							class="btn w-fit gap-2 btn-outline btn-sm"
							onclick={() => toggleGroup(group.id)}
						>
							<input
								type="checkbox"
								class="pointer-events-none checkbox checkbox-sm"
								checked={userGroupIds.includes(group.id)}
								tabindex="-1"
								aria-hidden="true"
							/>
							<span class="text-sm">{group.name}</span>
						</button>
					{/each}
				</div>
			</div>
			{#if data.sites.length > 0}
				<div class="min-w-0 flex-1">
					<span class="mb-2 block text-sm font-medium">Sites</span>
					<div
						class="flex max-h-40 flex-wrap gap-2 overflow-auto rounded-lg border-2 border-base-300 p-3"
					>
						{#each data.sites as s (s.id)}
							<button
								type="button"
								class="btn w-fit gap-2 btn-outline btn-sm"
								onclick={() => toggleSite(s.id)}
							>
								<input
									type="checkbox"
									class="pointer-events-none checkbox checkbox-sm"
									checked={siteIds.includes(s.id)}
									tabindex="-1"
									aria-hidden="true"
								/>
								<span class="text-sm">{s.name}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex gap-3">
		<button type="button" class="btn btn-primary" disabled={saving} onclick={save}>
			{editing ? 'Save changes' : 'Register staff'}
		</button>
		<button
			type="button"
			class="btn btn-ghost"
			onclick={() => goto(`/b/${businessId}/administration/staff/list`)}
		>
			Cancel
		</button>
	</div>
</div>
