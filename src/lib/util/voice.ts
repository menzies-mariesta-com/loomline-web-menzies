export function renderVoiceTemplate(
	template: string,
	vars: { number: string; counter: string }
): string {
	return template
		.replaceAll('{number}', vars.number)
		.replaceAll('{counter}', vars.counter);
}

export const DEFAULT_VOICE_TEMPLATE = 'Now serving {number} at counter {counter}';

export const SUPPORTED_ANNOUNCE_LOCALES = ['en', 'my', 'ja', 'zh', 'th', 'hi'] as const;

/** Default spoken phrase per app locale (use {number} and {counter}). */
export const DEFAULT_TEMPLATE_BY_LOCALE: Record<string, string> = {
	en: 'Now serving {number} at counter {counter}',
	my: 'ယခု {number} နံပါတ်ကို {counter} တွင် ခေါ်နေပါသည်',
	ja: '番号 {number}、{counter} へお越しください',
	zh: '请 {number} 号到 {counter}',
	th: 'หมายเลข {number} กรุณามาที่ {counter}',
	hi: 'कृपया नंबर {number} {counter} पर आएं'
};

export function defaultAnnounceTemplateForLocale(locale: string): string {
	const base = locale.trim().toLowerCase().split(/[-_]/)[0] ?? 'en';
	return DEFAULT_TEMPLATE_BY_LOCALE[base] ?? DEFAULT_VOICE_TEMPLATE;
}

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

export function normalizeAnnounceRepeatDelayMs(raw: unknown, fallback = 2000): number {
	const n = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(0, Math.min(60_000, Math.floor(n)));
}

export type AnnounceSpeechSettings = {
	rate: number;
	pitch: number;
	volume: number;
	localeVoices: Record<string, string>;
};

export function normalizeSpeechSettings(raw: unknown): AnnounceSpeechSettings {
	const base: AnnounceSpeechSettings = {
		rate: 1,
		pitch: 1,
		volume: 1,
		localeVoices: {}
	};
	if (!raw || typeof raw !== 'object') return base;
	const o = raw as Record<string, unknown>;
	const clamp = (v: unknown, min: number, max: number, fb: number) => {
		const n = typeof v === 'number' ? v : Number(v);
		if (!Number.isFinite(n)) return fb;
		return Math.min(max, Math.max(min, n));
	};
	const localeVoices: Record<string, string> = {};
	if (o.localeVoices && typeof o.localeVoices === 'object') {
		for (const [k, v] of Object.entries(o.localeVoices as Record<string, unknown>)) {
			if (typeof v === 'string' && v.trim()) localeVoices[k] = v.trim();
		}
	}
	return {
		rate: clamp(o.rate, 0.5, 2, 1),
		pitch: clamp(o.pitch, 0.5, 2, 1),
		volume: clamp(o.volume, 0.1, 1, 1),
		localeVoices
	};
}

/** Merge DB templates with defaults; migrate legacy now_serving → en. */
export function normalizeLocaleTemplates(raw: Record<string, string> | null | undefined): Record<string, string> {
	const out = { ...DEFAULT_TEMPLATE_BY_LOCALE };
	if (!raw) return out;
	if (typeof raw.now_serving === 'string' && raw.now_serving.trim()) {
		out.en = raw.now_serving.trim();
	}
	for (const [key, value] of Object.entries(raw)) {
		if (key === 'now_serving' || typeof value !== 'string') continue;
		const trimmed = value.trim();
		if (trimmed) out[key] = trimmed;
	}
	return out;
}

export function resolveLocaleTemplate(
	templates: Record<string, string>,
	locale: string
): string {
	const base = locale.trim().toLowerCase().split(/[-_]/)[0] ?? locale;
	return (
		templates[locale]?.trim() ||
		templates[base]?.trim() ||
		defaultAnnounceTemplateForLocale(locale)
	);
}

export type AnnounceVoiceConfig = {
	announceLocales: string[];
	announceRepeat: number;
	announceRepeatDelayMs: number;
	templates: Record<string, string>;
	speech: AnnounceSpeechSettings;
};

export type VoiceProfileVoiceFields = {
	locale?: string | null;
	announceLocales?: string[] | null;
	announceRepeat?: number | null;
	announceRepeatDelayMs?: number | null;
	templates?: Record<string, string> | null;
	speechSettings?: unknown;
};

export function buildAnnounceVoiceConfig(
	voice: VoiceProfileVoiceFields | null | undefined
): AnnounceVoiceConfig {
	const announceLocales = normalizeAnnounceLocales(voice?.announceLocales, voice?.locale ?? 'en');
	return {
		announceLocales,
		announceRepeat: normalizeAnnounceRepeat(voice?.announceRepeat ?? 1),
		announceRepeatDelayMs: normalizeAnnounceRepeatDelayMs(voice?.announceRepeatDelayMs),
		templates: normalizeLocaleTemplates(voice?.templates ?? undefined),
		speech: normalizeSpeechSettings(voice?.speechSettings)
	};
}

export function buildAnnounceSegments(opts: {
	locales: string[];
	templates: Record<string, string>;
	vars: { number: string; counter: string };
	localeVoices?: Record<string, string>;
}): Array<{ locale: string; text: string; voiceUri?: string }> {
	return normalizeAnnounceLocales(opts.locales).map((locale) => ({
		locale,
		text: renderVoiceTemplate(resolveLocaleTemplate(opts.templates, locale), opts.vars),
		voiceUri: opts.localeVoices?.[locale]
	}));
}

/** Dedupes voice announce when the same ticket is called again (e.g. recall). */
export function ticketCallAnnounceKey(ticket: {
	id: string;
	calledAt?: Date | string | null;
}): string {
	const at =
		ticket.calledAt instanceof Date
			? ticket.calledAt.toISOString()
			: ticket.calledAt != null
				? String(ticket.calledAt)
				: '';
	return `${ticket.id}:${at}`;
}

const VOICES_READY_MS = 300;
const CANCEL_TO_SPEAK_MS = 50;

let speechUnlocked = false;

/** Call once after a user gesture (display tap / fullscreen) so Chrome allows TTS. */
export function unlockSpeechForUserGesture(): void {
	if (typeof window === 'undefined' || !window.speechSynthesis) return;
	speechUnlocked = true;
	const synth = window.speechSynthesis;
	synth.resume();
	synth.getVoices();
}

export function listBrowserVoicesForLocale(
	locale: string,
	voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice[] {
	const lang = speechLangForLocale(locale);
	const base = lang.split('-')[0]?.toLowerCase() ?? lang;
	return voices.filter((v) => {
		const vl = v.lang.replace('_', '-').toLowerCase();
		return vl === lang.toLowerCase() || vl.startsWith(`${base}-`) || vl.startsWith(base);
	});
}

function waitForSpeechVoices(): Promise<void> {
	if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve();
	const synth = window.speechSynthesis;
	if (synth.getVoices().length) return Promise.resolve();
	return new Promise((resolve) => {
		const done = () => {
			synth.removeEventListener('voiceschanged', done);
			resolve();
		};
		synth.addEventListener('voiceschanged', done);
		synth.getVoices();
		setTimeout(resolve, VOICES_READY_MS);
	});
}

function pickSpeechVoice(lang: string, voiceUri?: string): SpeechSynthesisVoice | undefined {
	const synth = window.speechSynthesis;
	const voices = synth.getVoices();
	if (!voices.length) return undefined;
	if (voiceUri) {
		const byUri = voices.find((v) => v.voiceURI === voiceUri);
		if (byUri) return byUri;
	}
	const want = lang.replace('_', '-').toLowerCase();
	const base = want.split('-')[0] ?? want;
	return (
		voices.find((v) => v.lang.replace('_', '-').toLowerCase() === want) ??
		voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(`${base}-`)) ??
		voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(base))
	);
}

function speakOnce(
	text: string,
	lang: string,
	opts: { voiceUri?: string; rate: number; pitch: number; volume: number }
): Promise<void> {
	return new Promise((resolve) => {
		if (typeof window === 'undefined' || !window.speechSynthesis) {
			resolve();
			return;
		}
		const synth = window.speechSynthesis;
		synth.resume();
		const u = new SpeechSynthesisUtterance(text);
		u.lang = lang;
		u.rate = opts.rate;
		u.pitch = opts.pitch;
		u.volume = opts.volume;
		const voice = pickSpeechVoice(lang, opts.voiceUri);
		if (voice) u.voice = voice;
		u.onend = () => resolve();
		u.onerror = () => resolve();
		synth.speak(u);
	});
}

function delay(ms: number): Promise<void> {
	return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
}

/** Speak each segment in order; repeat the full sequence with optional pause between repeats. */
export async function speakAnnouncement(opts: {
	segments: Array<{ locale: string; text: string; voiceUri?: string }>;
	repeat?: number;
	repeatDelayMs?: number;
	speech?: Partial<AnnounceSpeechSettings>;
}): Promise<void> {
	if (typeof window === 'undefined' || !window.speechSynthesis) return;
	await waitForSpeechVoices();
	window.speechSynthesis.cancel();
	await delay(CANCEL_TO_SPEAK_MS);
	const speech = normalizeSpeechSettings(opts.speech);
	const repeat = normalizeAnnounceRepeat(opts.repeat ?? 1);
	const repeatDelayMs = normalizeAnnounceRepeatDelayMs(opts.repeatDelayMs);
	const segments = opts.segments.filter((s) => s.text.trim());
	if (!segments.length) return;
	if (!speechUnlocked) {
		// shortcut: may be silent until display tap, unlockSpeechForUserGesture on first click
	}
	for (let r = 0; r < repeat; r++) {
		for (const segment of segments) {
			await speakOnce(segment.text, speechLangForLocale(segment.locale), {
				voiceUri: segment.voiceUri ?? speech.localeVoices[segment.locale],
				rate: speech.rate,
				pitch: speech.pitch,
				volume: speech.volume
			});
		}
		if (r < repeat - 1) await delay(repeatDelayMs);
	}
}
