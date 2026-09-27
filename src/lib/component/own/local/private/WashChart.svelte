<script lang="ts">
	import { onMount } from 'svelte';
	import type { ChartOptions } from './chart-options';
	import { areaSeriesOptions } from './chart-options';

	type Props = {
		options?: ChartOptions;
		height?: number | string;
		class?: string;
		title?: string;
	};

	let {
		options = areaSeriesOptions(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [0, 0, 0, 0, 0, 0, 0]),
		height = 280,
		class: className = '',
		title
	}: Props = $props();

	let host: HTMLDivElement | undefined = $state();
	let loadError = $state<string | null>(null);
	// ApexCharts instance (typed loosely; API is dynamic)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let chartApi: any = null;

	onMount(() => {
		let cancelled = false;

		void import('apexcharts')
			.then(({ default: ApexCharts }) => {
				if (cancelled || !host) return;
				const chart = new ApexCharts(host, {
					...options,
					chart: {
						...(options.chart ?? {}),
						height,
						width: '100%',
						fontFamily: 'inherit',
						background: 'transparent'
					}
				} as never);
				chartApi = chart;
				void chart.render();
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				loadError = err instanceof Error ? err.message : 'Failed to load charts';
				console.error('[WashChart]', err);
			});

		return () => {
			cancelled = true;
			chartApi?.destroy?.();
			chartApi = null;
		};
	});

	$effect(() => {
		const opts = options;
		const h = height;
		if (!chartApi) return;
		chartApi.updateOptions(
			{
				...opts,
				chart: {
					...(opts.chart ?? {}),
					height: h,
					width: '100%',
					fontFamily: 'inherit',
					background: 'transparent'
				}
			},
			true,
			true
		);
	});
</script>

<div
	class="wash-chart rounded-box border border-base-300 bg-base-100 p-3 shadow-sm {className}"
	style:min-height={typeof height === 'number' ? `${height + 24}px` : height}
>
	{#if title}
		<p class="mb-2 text-sm font-semibold text-base-content/80">{title}</p>
	{/if}
	{#if loadError}
		<p class="text-error text-sm">{loadError}</p>
	{:else}
		<div bind:this={host} class="h-full w-full min-h-[12rem]" role="img" aria-label={title ?? 'Chart'}></div>
	{/if}
</div>
