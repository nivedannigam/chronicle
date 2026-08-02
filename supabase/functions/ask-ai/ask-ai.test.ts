import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
	buildGeminiRequestUrl,
	buildSimplifiedGeminiBody,
	computeIncomingPromptSize,
} from './gemini.ts'
import { GEMINI_MODEL, SIMPLIFIED_PING_PROMPT } from './constants.ts'
import { maskApiKeyInUrl, truncateForLog } from './logging.ts'

Deno.test('maskApiKeyInUrl hides Gemini API key', () => {
	const masked = maskApiKeyInUrl(
		'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=secret-key',
	)

	assertEquals(
		masked,
		'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=***',
	)
})

Deno.test('truncateForLog truncates long Gemini bodies', () => {
	const truncated = truncateForLog('a'.repeat(2500), 2000)

	assertEquals(truncated.includes('[truncated 500 chars]'), true)
	assertEquals(truncated.length < 2500, true)
})

Deno.test('buildSimplifiedGeminiBody sends Hello Chronicle only', () => {
	const body = buildSimplifiedGeminiBody()

	assertEquals(body, {
		contents: [{ parts: [{ text: SIMPLIFIED_PING_PROMPT }] }],
	})
})

Deno.test('buildGeminiRequestUrl uses hardcoded model path', () => {
	const url = buildGeminiRequestUrl(GEMINI_MODEL, 'test-key')

	assertEquals(
		url,
		`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=test-key`,
	)
})

Deno.test('computeIncomingPromptSize sums message content lengths', () => {
	const size = computeIncomingPromptSize({
		messages: [
			{ role: 'system', content: 'abc' },
			{ role: 'user', content: 'hello' },
		],
	})

	assertEquals(size, 8)
})
