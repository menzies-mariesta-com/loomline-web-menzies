<script lang="ts">
	import type { TableRowActionsMap } from '#lib/keyboard/types';
	import { getHelpModeContext } from '#lib/keyboard/help-mode.svelte';
	import {
		handleTableChordKey,
		resetTableChordState,
		setActiveTableChordHandler,
		tableChordState
	} from '#lib/keyboard/table-chord-bridge';

	type Row = { id: string };

	type Props = {
		rows: Row[];
		rowActions: TableRowActionsMap<Row>;
		tableId?: string;
		keyboardRowIndex?: number | null;
	};

	let {
		rows,
		rowActions,
		tableId = 'default',
		keyboardRowIndex = $bindable(null)
	}: Props = $props();

	const help = getHelpModeContext();

	const actionKeys = $derived(new Set(Object.values(rowActions).map((a) => a.key.toLowerCase())));

	$effect(() => {
		const currentRows = rows;
		const actions = rowActions;

		setActiveTableChordHandler((e) => {
			if (!help.helpModeActive) return false;
			if (e.ctrlKey || e.metaKey || e.altKey) return false;

			const consumed = handleTableChordKey({
				key: e.key,
				rowCount: currentRows.length,
				state: tableChordState,
				actionKeys: actionKeys,
				onAction: (rowIndex, actionKey) => {
					const row = currentRows[rowIndex];
					if (!row) return;
					keyboardRowIndex = rowIndex;
					const action = actions[actionKey];
					action?.run(row, rowIndex);
				}
			});

			if (consumed && tableChordState.pendingRowIndex != null) {
				keyboardRowIndex = tableChordState.pendingRowIndex;
			}
			return consumed;
		});

		return () => {
			setActiveTableChordHandler(null);
			resetTableChordState();
		};
	});

	$effect(() => {
		if (!help.helpModeActive) {
			keyboardRowIndex = null;
			resetTableChordState();
		}
	});
</script>
