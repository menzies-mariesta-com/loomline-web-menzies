import { describe, expect, it } from 'vitest';
import {
	buildAnnounceSegments,
	normalizeAnnounceLocales,
	normalizeLocaleTemplates,
	resolveLocaleTemplate,
	speechLangForLocale,
	ticketCallAnnounceKey
} from '#lib/util/voice';

describe('voice', () => {
	it('preserves announce locale order from config', () => {
		expect(normalizeAnnounceLocales('my,en,ja')).toEqual(['my', 'en', 'ja']);
	});

	it('maps app locale codes to BCP-47 for speech', () => {
		expect(speechLangForLocale('my')).toBe('my-MM');
		expect(speechLangForLocale('en')).toBe('en-US');
		expect(speechLangForLocale('ja')).toBe('ja-JP');
		expect(speechLangForLocale('zh')).toBe('zh-CN');
		expect(speechLangForLocale('th')).toBe('th-TH');
		expect(speechLangForLocale('hi')).toBe('hi-IN');
	});

	it('uses per-locale templates and migrates legacy now_serving', () => {
		const merged = normalizeLocaleTemplates({ now_serving: 'Ticket {number} at {counter}' });
		expect(resolveLocaleTemplate(merged, 'en')).toContain('{number}');
		expect(resolveLocaleTemplate(merged, 'my')).toContain('{number}');
	});

	it('builds ordered segments with localized text', () => {
		const segments = buildAnnounceSegments({
			locales: ['my', 'en'],
			templates: normalizeLocaleTemplates({}),
			vars: { number: 'A1', counter: 'Desk 2' },
			localeVoices: {}
		});
		expect(segments).toHaveLength(2);
		expect(segments[0]!.locale).toBe('my');
		expect(segments[0]!.text).toContain('A1');
		expect(segments[1]!.locale).toBe('en');
	});

	it('changes announce key when calledAt changes (recall / re-call)', () => {
		const id = 't1';
		expect(ticketCallAnnounceKey({ id, calledAt: '2026-01-01T00:00:00.000Z' })).not.toBe(
			ticketCallAnnounceKey({ id, calledAt: '2026-01-01T00:00:01.000Z' })
		);
	});
});
