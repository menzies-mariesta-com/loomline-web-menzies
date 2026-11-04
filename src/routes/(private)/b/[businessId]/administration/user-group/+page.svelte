<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { m } from '#lib/paraglide/messages';

	let { data } = $props();

	let newGroupName = $state('');
	let editingGroupId = $state<string | null>(null);
	let selectedPageIds = $state<string[]>([]);
	let busy = $state(false);
	let errorMessage = $state('');

	async function apiPost(body: Record<string, unknown>) {
		const res = await fetch(`/api/b/${data.businessId}/administration/user-group`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		const payload = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(payload.error ?? 'Request failed');
	}

	async function createGroup() {
		busy = true;
		errorMessage = '';
		try {
			await apiPost({ mode: 'create', name: newGroupName });
			newGroupName = '';
			await invalidateAll();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Failed';
		} finally {
			busy = false;
		}
	}

	function openPages(groupId: string, pageIds: string[]) {
		editingGroupId = groupId;
		selectedPageIds = [...pageIds];
	}

	async function savePages() {
		if (!editingGroupId) return;
		busy = true;
		errorMessage = '';
		try {
			await apiPost({
				mode: 'set_pages',
				userGroupId: editingGroupId,
				pageIds: selectedPageIds
			});
			editingGroupId = null;
			await invalidateAll();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Failed';
		} finally {
			busy = false;
		}
	}

	function togglePage(pageId: string) {
		if (selectedPageIds.includes(pageId)) {
			selectedPageIds = selectedPageIds.filter((id) => id !== pageId);
		} else {
			selectedPageIds = [...selectedPageIds, pageId];
		}
	}
</script>

<div class="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-6">
	<h1 class="text-2xl font-semibold">{m.nav_user_groups()}</h1>
	{#if errorMessage}
		<p class="text-sm text-error">{errorMessage}</p>
	{/if}

	<div class="card border border-base-300 shadow-sm">
		<div class="card-body flex flex-wrap gap-3">
			<label class="flex min-w-48 flex-1 flex-col gap-1 text-sm">
				<span>New group name</span>
				<input class="input-bordered input w-full" bind:value={newGroupName} />
			</label>
			<button type="button" class="btn self-end btn-primary" disabled={busy} onclick={createGroup}>
				Add group
			</button>
		</div>
	</div>

	{#each data.groups as group (group.id)}
		<div class="card border border-base-300 shadow-sm">
			<div class="card-body flex flex-col gap-3">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<span class="font-medium">
						{group.name}
						{#if group.isSystem}
							<span class="text-xs opacity-60">(system)</span>
						{/if}
					</span>
					<button
						type="button"
						class="btn btn-outline btn-sm"
						onclick={() =>
							openPages(
								group.id,
								group.pageLinks.map((l) => l.pageId)
							)}
					>
						Edit page access
					</button>
				</div>
				<p class="text-sm opacity-70">
					{group.pageLinks.length} page{group.pageLinks.length === 1 ? '' : 's'} assigned
				</p>
			</div>
		</div>
	{/each}

	{#if editingGroupId}
		<div class="card border border-base-300 shadow-sm">
			<div class="card-body flex flex-col gap-4">
				<h2 class="font-medium">Page access</h2>
				<div class="grid max-h-64 gap-2 overflow-auto sm:grid-cols-2">
					{#each data.pages as pg (pg.id)}
						<label class="flex cursor-pointer items-center gap-2 text-sm">
							<input
								type="checkbox"
								class="checkbox checkbox-sm"
								checked={selectedPageIds.includes(pg.id)}
								onchange={() => togglePage(pg.id)}
							/>
							<span>{pg.label}</span>
						</label>
					{/each}
				</div>
				<div class="flex gap-2">
					<button type="button" class="btn btn-primary" disabled={busy} onclick={savePages}>
						Save pages
					</button>
					<button type="button" class="btn btn-ghost" onclick={() => (editingGroupId = null)}>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
