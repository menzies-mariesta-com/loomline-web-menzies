/** Click a row action button exposed for keyboard help (matches aria-label). */
export function clickRowActionButton(rowId: string, ariaLabel: string): void {
	const row = document.querySelector(`tr[data-kbd-row-id="${CSS.escape(rowId)}"]`);
	if (!row) return;
	const btn = row.querySelector<HTMLButtonElement>(
		`button[aria-label="${CSS.escape(ariaLabel)}"]:not([disabled])`
	);
	if (btn) {
		btn.click();
		return;
	}
	const link = row.querySelector<HTMLAnchorElement>(
		`a[aria-label="${CSS.escape(ariaLabel)}"]`
	);
	link?.click();
}
