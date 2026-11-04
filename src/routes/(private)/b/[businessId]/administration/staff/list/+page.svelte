<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { UserPlus } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages';

	let { data, form } = $props();
</script>

<div class="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-2xl font-semibold">{m.nav_staff_list()}</h1>
		<button
			type="button"
			class="btn gap-2 btn-primary"
			onclick={() => goto(`/b/${data.businessId}/administration/staff/registration`)}
		>
			<UserPlus class="size-4" />
			{m.nav_staff_registration()}
		</button>
	</div>

	{#if form?.message}
		<p class="text-sm {form.success === false ? 'text-error' : 'text-success'}">{form.message}</p>
	{/if}

	<div class="card border border-base-300 shadow-sm">
		<div class="card-body overflow-x-auto">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>Name</th>
						<th>Email</th>
						<th>Role</th>
						<th>Status</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.members as member (member.id)}
						<tr>
							<td>{member.user?.name ?? '—'}</td>
							<td>{member.user?.email ?? '—'}</td>
							<td>{member.role.replaceAll('_', ' ')}</td>
							<td>{member.status}</td>
							<td>
								<button
									type="button"
									class="btn btn-ghost btn-xs"
									onclick={() =>
										goto(
											`/b/${data.businessId}/administration/staff/registration?membershipId=${member.id}`
										)}
								>
									Edit
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div class="card border border-base-300 shadow-sm">
		<div class="card-body flex flex-col gap-4">
			<h2 class="font-medium">Email invite (legacy)</h2>
			<form method="POST" action="?/invite" use:enhance class="flex flex-wrap gap-3">
				<input
					class="input-bordered input min-w-48 flex-1"
					type="email"
					name="email"
					placeholder="Email"
					required
				/>
				<select class="select-bordered select" name="role">
					<option value="manager">Manager</option>
					<option value="counter_agent">Counter agent</option>
					<option value="guest">Guest</option>
				</select>
				<button type="submit" class="btn btn-outline">Send invite</button>
			</form>
			{#if data.invites.filter((i) => i.status === 'pending').length > 0}
				<ul class="text-sm opacity-80">
					{#each data.invites.filter((i) => i.status === 'pending') as inv (inv.id)}
						<li>{inv.email} — {inv.role} (pending)</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>
