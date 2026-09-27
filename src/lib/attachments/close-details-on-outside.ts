/** Close a `<details>` on outside pointerdown and Escape. */
export function closeDetailsOnOutside() {
	return (node: HTMLDetailsElement) => {
		function onPointerDown(e: PointerEvent) {
			if (!node.open) return;
			if (e.target instanceof Node && node.contains(e.target)) return;
			node.open = false;
		}

		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== 'Escape' || !node.open) return;
			node.open = false;
		}

		document.addEventListener('pointerdown', onPointerDown, true);
		document.addEventListener('keydown', onKeyDown, true);

		return () => {
			document.removeEventListener('pointerdown', onPointerDown, true);
			document.removeEventListener('keydown', onKeyDown, true);
		};
	};
}
