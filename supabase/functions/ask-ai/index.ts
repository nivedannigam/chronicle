import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type',
}

interface AskAiRequestBody {
	provider: 'openai' | 'azure-openai' | 'gemini' | 'claude'
	model: string
	messages: Array<{ role: string; content: string }>
	responseFormat?: 'text' | 'json'
}

serve(async (request) => {
	if (request.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders })
	}

	const startedAt = performance.now()
	const correlationId = crypto.randomUUID()

	try {
		const authHeader = request.headers.get('Authorization')

		if (!authHeader) {
			return jsonResponse({ error: 'Unauthorized' }, 401)
		}

		const supabaseUrl = Deno.env.get('SUPABASE_URL')!
		const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
		const userClient = createClient(supabaseUrl, anonKey, {
			global: { headers: { Authorization: authHeader } },
		})

		const {
			data: { user },
			error: authError,
		} = await userClient.auth.getUser()

		if (authError || !user) {
			return jsonResponse({ error: 'Unauthorized' }, 401)
		}

		const body = (await request.json()) as AskAiRequestBody
		const provider = body.provider ?? 'openai'
		const model = body.model ?? 'gpt-4o-mini'

		console.log(
			JSON.stringify({
				service: 'ask-ai',
				event: 'request_started',
				correlationId,
				userId: user.id,
				provider,
				model,
			}),
		)

		if (provider === 'openai') {
			const apiKey = Deno.env.get('OPENAI_API_KEY')

			if (!apiKey) {
				throw new Error('OPENAI_API_KEY is not configured')
			}

			const response = await fetch(
				'https://api.openai.com/v1/chat/completions',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						model,
						messages: body.messages,
						temperature: 0.2,
						response_format:
							body.responseFormat === 'json'
								? { type: 'json_object' }
								: undefined,
					}),
				},
			)

			if (!response.ok) {
				throw new Error(`OpenAI failed (${response.status})`)
			}

			const payload = await response.json()

			return jsonResponse({
				content: payload.choices?.[0]?.message?.content ?? '',
				provider,
				model,
				correlationId,
				usage: {
					promptTokens: payload.usage?.prompt_tokens ?? 0,
					completionTokens: payload.usage?.completion_tokens ?? 0,
					totalTokens: payload.usage?.total_tokens ?? 0,
				},
				latencyMs: Math.round(performance.now() - startedAt),
			})
		}

		if (provider === 'claude') {
			const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

			if (!apiKey) {
				throw new Error('ANTHROPIC_API_KEY is not configured')
			}

			const system =
				body.messages.find((message) => message.role === 'system')?.content ??
				''
			const messages = body.messages.filter(
				(message) => message.role !== 'system',
			)

			const response = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
					'anthropic-version': '2023-06-01',
				},
				body: JSON.stringify({
					model,
					max_tokens: 1200,
					system,
					messages: messages.map((message) => ({
						role: message.role === 'assistant' ? 'assistant' : 'user',
						content: message.content,
					})),
				}),
			})

			if (!response.ok) {
				throw new Error(`Claude failed (${response.status})`)
			}

			const payload = await response.json()
			const promptTokens = payload.usage?.input_tokens ?? 0
			const completionTokens = payload.usage?.output_tokens ?? 0

			return jsonResponse({
				content: (payload.content ?? [])
					.map((part: { text: string }) => part.text)
					.join('\n'),
				provider,
				model,
				correlationId,
				usage: {
					promptTokens,
					completionTokens,
					totalTokens: promptTokens + completionTokens,
				},
				latencyMs: Math.round(performance.now() - startedAt),
			})
		}

		if (provider === 'gemini') {
			const apiKey =
				Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('GOOGLE_AI_API_KEY')

			if (!apiKey) {
				throw new Error('GEMINI_API_KEY is not configured')
			}

			const system =
				body.messages.find((message) => message.role === 'system')?.content ??
				''
			const developer =
				body.messages.find((message) => message.role === 'developer')
					?.content ?? ''
			const userMessages = body.messages.filter(
				(message) => message.role === 'user' || message.role === 'assistant',
			)
			const userContent = userMessages
				.map((message) => message.content)
				.join('\n\n')

			const geminiModel = model.startsWith('gemini')
				? model
				: `gemini-2.0-flash`
			const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`

			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					systemInstruction: {
						parts: [{ text: [system, developer].filter(Boolean).join('\n\n') }],
					},
					contents: [
						{
							role: 'user',
							parts: [{ text: userContent }],
						},
					],
					generationConfig: {
						temperature: 0.2,
						maxOutputTokens: 2048,
						responseMimeType:
							body.responseFormat === 'json'
								? 'application/json'
								: 'text/plain',
					},
				}),
			})

			if (!response.ok) {
				const errorBody = await response.text()
				throw new Error(
					`Gemini failed (${response.status}): ${errorBody.slice(0, 200)}`,
				)
			}

			const payload = await response.json()
			const content =
				payload.candidates?.[0]?.content?.parts
					?.map((part: { text?: string }) => part.text ?? '')
					.join('') ?? ''

			const promptTokens = payload.usageMetadata?.promptTokenCount ?? 0
			const completionTokens = payload.usageMetadata?.candidatesTokenCount ?? 0

			return jsonResponse({
				content,
				provider,
				model: geminiModel,
				correlationId,
				usage: {
					promptTokens,
					completionTokens,
					totalTokens: promptTokens + completionTokens,
				},
				latencyMs: Math.round(performance.now() - startedAt),
			})
		}

		throw new Error(`Unsupported provider: ${provider}`)
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Ask AI failed'

		console.error(
			JSON.stringify({
				service: 'ask-ai',
				event: 'request_failed',
				correlationId,
				error: message,
			}),
		)

		return jsonResponse({ error: message, correlationId }, 500)
	}
})

function jsonResponse(payload: unknown, status = 200) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			...corsHeaders,
			'Content-Type': 'application/json',
		},
	})
}
