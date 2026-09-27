/** Apex chart option builders for Loomline admin dashboards. */

const washColors = [
	'var(--color-primary)',
	'var(--color-secondary)',
	'var(--color-accent)',
	'var(--color-info)',
	'var(--color-success)',
	'var(--color-warning)',
	'var(--color-error)',
	'var(--color-neutral)'
];

const grid = {
	borderColor: 'color-mix(in oklab, var(--color-base-content) 12%, transparent)'
};

export type ChartOptions = {
	chart?: Record<string, unknown>;
	series?: unknown;
	[key: string]: unknown;
};

export function areaSeriesOptions(categories: string[], data: number[], name = 'Tickets'): ChartOptions {
	return {
		chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
		stroke: { curve: 'smooth', width: 2 },
		fill: {
			type: 'gradient',
			gradient: { shadeIntensity: 0.35, opacityFrom: 0.45, opacityTo: 0.05 }
		},
		colors: washColors.slice(0, 1),
		dataLabels: { enabled: false },
		xaxis: { categories },
		yaxis: { labels: { formatter: (v: number) => `${Math.round(v)}` } },
		legend: { show: false },
		grid,
		series: [{ name, data }]
	};
}

export function barSeriesOptions(categories: string[], data: number[], name = 'Count'): ChartOptions {
	return {
		chart: { type: 'bar', toolbar: { show: false } },
		plotOptions: { bar: { borderRadius: 4, columnWidth: '55%', horizontal: false } },
		colors: washColors.slice(0, 1),
		dataLabels: { enabled: false },
		xaxis: { categories },
		yaxis: { labels: { formatter: (v: number) => `${Math.round(v)}` } },
		legend: { show: false },
		grid,
		series: [{ name, data }]
	};
}

export function horizontalBarOptions(
	categories: string[],
	data: number[],
	name = 'Tickets'
): ChartOptions {
	return {
		chart: { type: 'bar', toolbar: { show: false } },
		plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '60%' } },
		colors: washColors.slice(0, 1),
		dataLabels: { enabled: false },
		xaxis: { categories },
		yaxis: { labels: { formatter: (v: number) => `${Math.round(v)}` } },
		legend: { show: false },
		grid,
		series: [{ name, data }]
	};
}

export function donutSeriesOptions(labels: string[], series: number[]): ChartOptions {
	return {
		chart: { type: 'donut', toolbar: { show: false } },
		colors: washColors,
		labels,
		legend: { position: 'bottom' },
		dataLabels: { enabled: true },
		series
	};
}

export function sparklineBarOptions(categories: string[], data: number[], name: string): ChartOptions {
	return {
		chart: { type: 'bar', sparkline: { enabled: true }, toolbar: { show: false } },
		plotOptions: { bar: { borderRadius: 2, columnWidth: '60%' } },
		colors: washColors.slice(0, 1),
		series: [{ name, data }],
		xaxis: { categories },
		tooltip: { enabled: true }
	};
}

export function dualLineOptions(
	categories: string[],
	waitData: number[],
	serveData: number[]
): ChartOptions {
	return {
		chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
		stroke: { curve: 'smooth', width: 3 },
		colors: washColors.slice(0, 2),
		dataLabels: { enabled: false },
		xaxis: { categories },
		yaxis: { labels: { formatter: (v: number) => `${Math.round(v)}m` } },
		legend: { position: 'top' },
		grid,
		series: [
			{ name: 'Avg wait', data: waitData },
			{ name: 'Avg serve', data: serveData }
		]
	};
}
