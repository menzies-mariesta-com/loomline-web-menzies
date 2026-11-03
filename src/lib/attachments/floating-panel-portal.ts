/** Paint floating panels on `document.body` so overflow/z-index in page chrome cannot clip them. */

export const FLOATING_PANEL_Z = '250';

export type FloatingPanelPortalOptions = {
	getAnchor: () => HTMLElement | null;
	getOpen: () => boolean;
	/** Min width when anchor is narrower (px). */
	minWidth?: number;
	gapPx?: number;
};

function positionPanel(node: HTMLElement, opts: FloatingPanelPortalOptions) {
	if (!opts.getOpen()) return;
	const anchor = opts.getAnchor();
	if (!anchor) return;
	const r = anchor.getBoundingClientRect();
	const minW = opts.minWidth ?? 160;
	const width = Math.max(r.width, minW);
	let left = r.left;
	left = Math.min(left, window.innerWidth - width - 8);
	left = Math.max(8, left);
	node.style.position = 'fixed';
	node.style.top = `${r.bottom + (opts.gapPx ?? 4)}px`;
	node.style.left = `${left}px`;
	node.style.width = `${width}px`;
	node.style.zIndex = FLOATING_PANEL_Z;
	node.style.maxWidth = 'min(24rem, calc(100vw - 1rem))';
}

export function floatingPanelPortal(initial: FloatingPanelPortalOptions) {
	let opts = initial;
	return (node: HTMLElement) => {
		document.body.appendChild(node);
		const sync = () => positionPanel(node, opts);
		sync();
		const onMove = () => sync();
		window.addEventListener('scroll', onMove, true);
		window.addEventListener('resize', onMove);
		const ro = new ResizeObserver(onMove);
		const anchor = opts.getAnchor();
		if (anchor) ro.observe(anchor);
		return () => {
			node.remove();
			window.removeEventListener('scroll', onMove, true);
			window.removeEventListener('resize', onMove);
			ro.disconnect();
		};
	};
}

export function syncFloatingPanelPosition(
	node: HTMLElement,
	opts: FloatingPanelPortalOptions
) {
	positionPanel(node, opts);
}

export function clampFloatingPanelLeft(preferredLeft: number, panelWidth: number) {
	const maxLeft = Math.max(8, window.innerWidth - panelWidth - 8);
	return Math.min(Math.max(8, preferredLeft), maxLeft);
}
