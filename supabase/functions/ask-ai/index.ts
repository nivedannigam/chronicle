import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

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

	try {
		const body = (await request.json()) as AskAiRequestBody
		const provider = body.provider ?? 'openai'
		const model = body.model ?? 'gpt-4o-mini'

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
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : 'Ask AI failed',
			}),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			},
		)
	}
})

function jsonResponse(payload: unknown) {
	return new Response(JSON.stringify(payload), {
		headers: {
			...corsHeaders,
			'Content-Type': 'application/json',
		},
	})
}
