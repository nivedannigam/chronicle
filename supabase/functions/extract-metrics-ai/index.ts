import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GeminiRequestError } from '../ask-ai/gemini.ts'
import { callExtractMetricsGemini } from './gemini.ts'
import type {
	ExtractMetricsAiRequestBody,
	ExtractMetricsAiResponseBody,
} from './types.ts'

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type',
}

serve(async (request) => {
	if (request.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders })
	}

	const correlationId = crypto.randomUUID()

	try {
		const authHeader = request.headers.get('Authorization')

		if (!authHeader) {
			return jsonResponse({ error: 'Unauthorized', correlationId }, 401)
		}

		const supabaseUrl = Deno.env.get('SUPABASE_URL')!
		const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
		const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
		const userClient = createClient(supabaseUrl, anonKey, {
			global: { headers: { Authorization: authHeader } },
		})

		const {
			data: { user },
			error: authError,
		} = await userClient.auth.getUser(jwt)

		if (authError || !user) {
			return jsonResponse(
				{
					error: 'Unauthorized',
					message: authError?.message ?? 'Invalid or expired session',
					correlationId,
				},
				401,
			)
		}

		const body = (await request.json()) as ExtractMetricsAiRequestBody
		const extractedText = body.extractedText?.trim() ?? ''

		if (!extractedText) {
			return jsonResponse(
				{
					error: 'Missing extractedText',
					message: 'OCR text is required for AI metric extraction.',
					correlationId,
				},
				400,
			)
		}

		const geminiResult = await callExtractMetricsGemini({
			correlationId,
			body,
		})

		const parsed = parseModelJson(geminiResult.reply)

		const response: ExtractMetricsAiResponseBody = {
			metrics: parsed.metrics,
			metadata: parsed.metadata,
			warnings: parsed.warnings,
			model: geminiResult.model,
			correlationId,
			usage: geminiResult.usage,
		}

		return jsonResponse(response)
	} catch (error) {
		if (error instanceof GeminiRequestError) {
			return jsonResponse(
				{
					status: error.status,
					message: error.message,
					correlationId,
					providerResponse: error.providerResponse,
				},
				error.status >= 400 && error.status < 600 ? error.status : 502,
			)
		}

		const message =
			error instanceof Error ? error.message : 'AI metric extraction failed'

		return jsonResponse(
			{
				status: 500,
				message,
				correlationId,
			},
			500,
		)
	}
})

function parseModelJson(raw: string): {
	metrics: ExtractMetricsAiResponseBody['metrics']
	metadata: ExtractMetricsAiResponseBody['metadata']
	warnings: string[]
} {
	const cleaned = raw
		.trim()
		.replace(/^```json\s*/i, '')
		.replace(/^```\s*/i, '')
		.replace(/\s*```$/i, '')

	const parsed = JSON.parse(cleaned) as ExtractMetricsAiResponseBody

	return {
		metrics: Array.isArray(parsed.metrics) ? parsed.metrics : [],
		metadata: parsed.metadata ?? {},
		warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
	}
}

function jsonResponse(payload: unknown, status = 200) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			...corsHeaders,
			'Content-Type': 'application/json',
		},
	})
}
