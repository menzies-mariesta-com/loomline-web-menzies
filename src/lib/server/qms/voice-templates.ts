export {
	renderVoiceTemplate,
	DEFAULT_VOICE_TEMPLATE,
	DEFAULT_TEMPLATE_BY_LOCALE,
	speakAnnouncement,
	unlockSpeechForUserGesture,
	normalizeAnnounceLocales,
	normalizeAnnounceRepeat,
	normalizeAnnounceRepeatDelayMs,
	normalizeSpeechSettings,
	normalizeLocaleTemplates,
	buildAnnounceVoiceConfig,
	buildAnnounceSegments,
	speechLangForLocale,
	ticketCallAnnounceKey,
	defaultAnnounceTemplateForLocale,
	listBrowserVoicesForLocale
} from '#lib/util/voice';
