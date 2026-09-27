export type IndustryPackConfig = {
	services: Array<{
		name: string;
		codePrefix: string;
		estimatedMinutes: number;
		priorityWeight: number;
		industryTags: string[];
	}>;
	ticketNumberFormat: string;
	voiceScripts: Record<string, string>;
	appointmentTypes: Array<{ name: string; durationMinutes: number }>;
	uiLabels: Record<string, string>;
	queueStrategyDefault: 'fifo' | 'priority' | 'appointment_first';
};

/** Minimal pack config for v1 create. Safe for applyIndustryPackToBusiness (site + counters only). */
export function emptyIndustryPackConfig(
	queueStrategyDefault: IndustryPackConfig['queueStrategyDefault'] = 'fifo'
): IndustryPackConfig {
	return {
		services: [],
		ticketNumberFormat: '{PREFIX}{NNN}',
		voiceScripts: {},
		appointmentTypes: [],
		uiLabels: { counter: 'Counter' },
		queueStrategyDefault
	};
}

export function normalizeQueueStrategy(
	raw: string
): IndustryPackConfig['queueStrategyDefault'] {
	if (raw === 'priority' || raw === 'appointment_first') return raw;
	return 'fifo';
}
