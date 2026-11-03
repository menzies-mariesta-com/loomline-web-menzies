<script lang="ts">
	import {
		resolveHorizontalTooltipSide,
		stripTooltipPlacementClasses,
		type HorizontalTooltipSide
	} from '#lib/util/tooltip-placement.util.svelte';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
		tooltipText: string;
		className?: string;
		placement?: 'auto' | HorizontalTooltipSide;
	};

	let { children, tooltipText, className = '', placement = 'auto' }: Props = $props();

	let rootEl = $state<HTMLDivElement | null>(null);
	let side = $state<HorizontalTooltipSide>('right');

	const styleClass = $derived(stripTooltipPlacementClasses(className));
	const effectiveSide = $derived(placement === 'auto' ? side : placement);
	const sideClass = $derived(effectiveSide === 'left' ? 'tooltip-left' : 'tooltip-right');

	function updateSide() {
		if (placement !== 'auto' || !rootEl) return;
		side = resolveHorizontalTooltipSide(rootEl);
	}

	onMount(() => {
		updateSide();
		const onResize = () => updateSide();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});
</script>

<div
	bind:this={rootEl}
	class="tooltip relative z-0 hover:z-[100] focus-within:z-[100] {sideClass} {styleClass}"
	class:tooltip-left={effectiveSide === 'left'}
	class:tooltip-right={effectiveSide === 'right'}
	data-tip={tooltipText}
	data-tooltip-side={effectiveSide}
	role="group"
	onmouseenter={updateSide}
	onfocusin={updateSide}
>
	{@render children()}
</div>
