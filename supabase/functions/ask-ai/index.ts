import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GEMINI_MODEL } from './constants.ts'
import { callGemini, GeminiRequestError, resolveGeminiModel } from './gemini.ts'
import { logRequestFailed, logSelectedProvider } from './logging.ts'
import type {
	AskAiRequestBody,
	ProviderErrorPayload,
	RequestTimings,
} from './types.ts'

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type',
}

const DEBUG_ASK_AI = Deno.env.get('DEBUG_ASK_AI') === 'true'

function debugLog(...args: unknown[]) {
	if (DEBUG_ASK_AI) {
		console.log(...args)
	}
}

serve(async (request) => {
	if (request.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders })
	}

	const startedAt = performance.now()
	const correlationId = crypto.randomUUID()
	const timings: RequestTimings = {
		authMs: 0,
		promptMs: 0,
		geminiMs: 0,
		parseMs: 0,
		totalMs: 0,
	}

	try {
		const authStarted = performance.now()
		const authHeader = request.headers.get('Authorization')

		debugLog('Authorization header exists:', Boolean(authHeader))
		debugLog(
			'Authorization header uses Bearer scheme:',
			authHeader?.startsWith('Bearer ') ?? false,
		)

		if (!authHeader) {
			debugLog('auth.getUser error:', 'Missing Authorization header')
			debugLog('user id:', null)

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

		debugLog('auth.getUser error:', authError?.message ?? null)
		debugLog('user id:', user?.id ?? null)

		timings.authMs = Math.round(performance.now() - authStarted)

		if (authError || !user) {
			logRequestFailed({
				correlationId,
				message: authError?.message ?? 'Unauthorized',
				status: 401,
			})

			return jsonResponse(
				{
					error: 'Unauthorized',
					message: authError?.message ?? 'Invalid or expired session',
					correlationId,
					timings,
				},
				401,
			)
		}

		const promptStarted = performance.now()
		const body = (await request.json()) as AskAiRequestBody
		timings.promptMs = Math.round(performance.now() - promptStarted)
		const chosenModel = resolveGeminiModel(body)

		console.log('Request received')
		console.log('Provider', body.provider ?? 'unspecified')
		console.log('Model', body.model ?? GEMINI_MODEL)
		console.log(
			JSON.stringify({
				service: 'ask-ai',
				event: 'request_started',
				correlationId,
				userId: user.id,
				action: body.action ?? 'complete',
				provider: body.provider ?? 'unspecified',
				requestedModel: body.model ?? null,
				chosenModel,
				messageCount: body.messages?.length ?? 0,
			}),
		)

		if (body.action === 'ping') {
			return await handlePing({
				body,
				correlationId,
				timings,
				startedAt,
			})
		}

		const provider = body.provider ?? 'openai'
		logSelectedProvider(provider)

		if (provider !== 'gemini') {
			const message = 'Unsupported provider requested.'
			logRequestFailed({
				correlationId,
				provider,
				message,
				status: 400,
			})

			return jsonResponse(
				{
					error: message,
					provider,
					model: body.model ?? null,
					correlationId,
					timings: finalizeTimings(timings, startedAt),
				},
				400,
			)
		}

		return await handleGeminiComplete({
			body,
			correlationId,
			timings,
			startedAt,
		})
	} catch (error) {
		return handleFailure({
			error,
			correlationId,
			timings,
			startedAt,
		})
	}
})

async function handlePing(input: {
	body: AskAiRequestBody
	correlationId: string
	timings: RequestTimings
	startedAt: number
}): Promise<Response> {
	logSelectedProvider('gemini')

	try {
		const geminiResult = await callGemini({
			correlationId: input.correlationId,
			body: input.body,
			mode: 'ping',
		})

		input.timings.geminiMs = Math.round(geminiResult.geminiMs)
		input.timings.parseMs = Math.round(geminiResult.parseMs)

		return jsonResponse({
			success: true,
			provider: 'gemini',
			model: geminiResult.model,
			reply: geminiResult.reply,
			latencyMs: Math.round(performance.now() - input.startedAt),
			correlationId: input.correlationId,
			usage: geminiResult.usage,
			timings: finalizeTimings(input.timings, input.startedAt),
		})
	} catch (error) {
		return handleFailure({
			error,
			correlationId: input.correlationId,
			timings: input.timings,
			startedAt: input.startedAt,
		})
	}
}

async function handleGeminiComplete(input: {
	body: AskAiRequestBody
	correlationId: string
	timings: RequestTimings
	startedAt: number
}): Promise<Response> {
	try {
		const geminiResult = await callGemini({
			correlationId: input.correlationId,
			body: input.body,
			mode: 'complete',
		})

		input.timings.geminiMs = Math.round(geminiResult.geminiMs)
		input.timings.parseMs = Math.round(geminiResult.parseMs)

		return jsonResponse({
			content: geminiResult.reply,
			provider: 'gemini',
			model: geminiResult.model,
			correlationId: input.correlationId,
			usage: geminiResult.usage,
			latencyMs: Math.round(performance.now() - input.startedAt),
			timings: finalizeTimings(input.timings, input.startedAt),
		})
	} catch (error) {
		return handleFailure({
			error,
			correlationId: input.correlationId,
			timings: input.timings,
			startedAt: input.startedAt,
		})
	}
}

function handleFailure(input: {
	error: unknown
	correlationId: string
	timings: RequestTimings
	startedAt: number
}): Response {
	const finalizedTimings = finalizeTimings(input.timings, input.startedAt)

	if (input.error instanceof GeminiRequestError) {
		const model = resolveGeminiModel({})
		const payload: ProviderErrorPayload = {
			provider: 'gemini',
			model,
			status: input.error.status,
			message: input.error.message,
			correlationId: input.correlationId,
			providerResponse: input.error.providerResponse,
			timings: finalizedTimings,
		}

		logRequestFailed({
			correlationId: input.correlationId,
			provider: 'gemini',
			model: GEMINI_MODEL,
			status: input.error.status,
			message: input.error.message,
		})

		const httpStatus =
			input.error.status >= 400 && input.error.status < 600
				? input.error.status
				: 502

		return jsonResponse(payload, httpStatus)
	}

	const message =
		input.error instanceof Error ? input.error.message : 'Ask AI failed'

	logRequestFailed({
		correlationId: input.correlationId,
		provider: 'gemini',
		model: GEMINI_MODEL,
		message,
		status: 500,
	})

	return jsonResponse(
		{
			provider: 'gemini',
			model: GEMINI_MODEL,
			status: 500,
			message,
			correlationId: input.correlationId,
			providerResponse: message,
			timings: finalizedTimings,
		},
		500,
	)
}

function finalizeTimings(
	timings: RequestTimings,
	startedAt: number,
): RequestTimings {
	return {
		...timings,
		totalMs: Math.round(performance.now() - startedAt),
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
