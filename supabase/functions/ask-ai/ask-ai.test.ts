import {
	assertEquals,
	assertThrows,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
	buildGeminiGenerateBody,
	buildGeminiRequestUrl,
	buildPingGeminiBody,
	computeIncomingPromptSize,
	mapMessagesToGeminiContents,
	resolveGeminiModel,
} from './gemini.ts'
import { GEMINI_MODEL, SIMPLIFIED_PING_PROMPT } from './constants.ts'
import { maskApiKeyInUrl, truncateForLog } from './logging.ts'

Deno.test('maskApiKeyInUrl hides Gemini API key', () => {
	const masked = maskApiKeyInUrl(
		`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=secret-key`,
	)

	assertEquals(
		masked,
		`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=***`,
	)
})

Deno.test('truncateForLog truncates long Gemini bodies', () => {
	const truncated = truncateForLog('a'.repeat(2500), 2000)

	assertEquals(truncated.includes('[truncated 500 chars]'), true)
	assertEquals(truncated.length < 2500, true)
})

Deno.test('buildPingGeminiBody sends Hello Chronicle only', () => {
	const body = buildPingGeminiBody()

	assertEquals(body, {
		contents: [{ parts: [{ text: SIMPLIFIED_PING_PROMPT }] }],
	})
})

Deno.test('resolveGeminiModel prefers request model', () => {
	assertEquals(
		resolveGeminiModel({ model: 'gemini-3.5-flash-lite' }),
		'gemini-3.5-flash-lite',
	)
	assertEquals(resolveGeminiModel({}), GEMINI_MODEL)
})

Deno.test(
	'mapMessagesToGeminiContents maps system and developer to systemInstruction',
	() => {
		const mapped = mapMessagesToGeminiContents([
			{ role: 'system', content: 'System rules' },
			{ role: 'developer', content: 'Developer rules' },
			{ role: 'user', content: 'Summarize my report' },
		])

		assertEquals(
			mapped.systemInstruction?.parts[0]?.text,
			'System rules\n\nDeveloper rules',
		)
		assertEquals(mapped.contents, [
			{ role: 'user', parts: [{ text: 'Summarize my report' }] },
		])
	},
)

Deno.test('buildGeminiGenerateBody includes json response config', () => {
	const body = buildGeminiGenerateBody({
		messages: [{ role: 'user', content: 'hello' }],
		responseFormat: 'json',
		temperature: 0.2,
		maxTokens: 1024,
	})

	assertEquals(body.generationConfig, {
		temperature: 0.2,
		maxOutputTokens: 1024,
		responseMimeType: 'application/json',
	})
})

Deno.test('buildGeminiGenerateBody rejects empty messages', () => {
	assertThrows(
		() => buildGeminiGenerateBody({ messages: [] }),
		Error,
		'missing messages',
	)
})

Deno.test('buildGeminiRequestUrl uses model path', () => {
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
