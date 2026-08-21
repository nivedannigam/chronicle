export const ASK_EMPTY_SUGGESTIONS = [
	'How am I doing?',
	'Explain my latest report.',
	'What changed?',
	'Should I be worried about anything?',
	'Prepare me for my next doctor visit.',
] as const

/** Starter prompts for universal /ask — cross-module, not health-only. */
export const UNIVERSAL_ASK_EMPTY_SUGGESTIONS = [
	'What should I know about my health?',
	'What insurance do I have?',
	'When does my passport expire?',
	'What changed recently?',
	'Do you have all my important documents?',
] as const
