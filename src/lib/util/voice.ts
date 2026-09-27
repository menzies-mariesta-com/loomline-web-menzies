export function renderVoiceTemplate(
	template: string,
	vars: { number: string; counter: string }
): string {
	return template
		.replaceAll('{number}', vars.number)
		.replaceAll('{counter}', vars.counter);
}

export const DEFAULT_VOICE_TEMPLATE = 'Now serving {number} at counter {counter}';

/** BCP-47 tags for browser speechSynthesis by app locale code. */
export const SPEECH_LANG_BY_LOCALE: Record<string, string> = {
	en: 'en-US',
	my: 'my-MM',
	ja: 'ja-JP',
	zh: 'zh-CN',
	th: 'th-TH',
	hi: 'hi-IN'
};

export function speechLangForLocale(locale: string): string {
	const trimmed = locale.trim();
	if (!trimmed) return 'en-US';
	const base = trimmed.toLowerCase().split(/[-_]/)[0] ?? 'en';
	return SPEECH_LANG_BY_LOCALE[base] ?? (trimmed.includes('-') ? trimmed : `${base}-${base.toUpperCase()}`);
}

export function normalizeAnnounceLocales(raw: unknown, fallback = 'en'): string[] {
	const list = Array.isArray(raw)
		? raw.map((v) => String(v).trim()).filter(Boolean)
		: typeof raw === 'string'
			? raw
					.split(',')
					.map((v) => v.trim())
					.filter(Boolean)
			: [];
	const seen = new Set<string>();
	const out: string[] = [];
	for (const loc of list) {
		const key = loc.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(loc);
	}
	return out.length ? out : [fallback];
}

export function normalizeAnnounceRepeat(raw: unknown, fallback = 1): number {
	const n = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(1, Math.min(10, Math.floor(n)));
}

function speakOnce(text: string, lang: string): Promise<void> {
	return new Promise((resolve) => {
		if (typeof window === 'undefined' || !window.speechSynthesis) {
			resolve();
			return;
		}
		const u = new SpeechSynthesisUtterance(text);
		u.lang = lang;
		u.onend = () => resolve();
		u.onerror = () => resolve();
		window.speechSynthesis.speak(u);
	});
}

/** Speak template text across ordered locales, repeating the full sequence `repeat` times. */
export async function speakAnnouncement(opts: {
	text: string;
	locales: string[];
	repeat?: number;
}): Promise<void> {
	if (typeof window === 'undefined' || !window.speechSynthesis) return;
	window.speechSynthesis.cancel();
	const locales = normalizeAnnounceLocales(opts.locales);
	const repeat = normalizeAnnounceRepeat(opts.repeat ?? 1);
	for (let r = 0; r < repeat; r++) {
		for (const locale of locales) {
			await speakOnce(opts.text, speechLangForLocale(locale));
		}
	}
}
