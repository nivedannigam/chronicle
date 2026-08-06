import { supabase } from '@/lib/supabase'
import {
	requireSupabaseSession,
	SupabaseAuthRequiredError,
} from '@/lib/supabase-session'
import { loadAIPlatformConfig } from '@/shared/ai/config/ai-platform.config'
import { GEMINI_MODEL } from '@/shared/ai/constants/gemini-model'
import {
	buildExtractMetricsPrompt,
	parseExtractMetricsModelJson,
} from '@/shared/ai/prompt/extract-metrics.prompt'
import { invokeAskAiEdgeFunction } from '@/shared/ai/transport/ask-ai-edge.client'
import type {
	ExtractMetricsAiEdgeMetric,
	ExtractMetricsAiEdgeResult,
} from '@/shared/ai/transport/extract-metrics.types'

export class ExtractMetricsAiInvokeError extends Error {
	readonly statusCode?: number
	readonly correlationId?: string
	readonly providerResponse?: string

	constructor(
		message: string,
		options?: {
			statusCode?: number
			correlationId?: string
			providerResponse?: string
		},
	) {
		super(message)
		this.name = 'ExtractMetricsAiInvokeError'
		this.statusCode = options?.statusCode
		this.correlationId = options?.correlationId
		this.providerResponse = options?.providerResponse
	}
}

export type {
	ExtractMetricsAiEdgeMetric,
	ExtractMetricsAiEdgeResult,
} from '@/shared/ai/transport/extract-metrics.types'

function isDedicatedExtractMetricsEdgeEnabled(): boolean {
	if (typeof import.meta === 'undefined' || !import.meta.env) {
		return false
	}

	return import.meta.env.VITE_EXTRACT_METRICS_USE_DEDICATED_EDGE === 'true'
}

function readErrorPayload(data: unknown): {
	message?: string
	error?: string
	status?: number
	correlationId?: string
	providerResponse?: string
} {
	if (!data || typeof data !== 'object') {
		return {}
	}

	const payload = data as Record<string, unknown>

	return {
		message: typeof payload.message === 'string' ? payload.message : undefined,
		error: typeof payload.error === 'string' ? payload.error : undefined,
		status: typeof payload.status === 'number' ? payload.status : undefined,
		correlationId:
			typeof payload.correlationId === 'string'
				? payload.correlationId
				: undefined,
		providerResponse:
			typeof payload.providerResponse === 'string'
				? payload.providerResponse
				: undefined,
	}
}

function toExtractMetricsResult(input: {
	parsed: ReturnType<typeof parseExtractMetricsModelJson>
	model: string
	correlationId?: string
	usage: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
	}
}): ExtractMetricsAiEdgeResult {
	return {
		metrics: input.parsed.metrics,
		metadata: input.parsed.metadata,
		warnings: input.parsed.warnings,
		model: input.model,
		correlationId: input.correlationId,
		usage: input.usage,
	}
}

async function invokeDedicatedExtractMetricsFunction(input: {
	extractedText: string
	fileName: string
	model: string
	accessToken: string
}): Promise<ExtractMetricsAiEdgeResult> {
	const { data, error } = await supabase.functions.invoke(
		'extract-metrics-ai',
		{
			body: {
				extractedText: input.extractedText,
				fileName: input.fileName,
				model: input.model,
			},
			headers: {
				Authorization: `Bearer ${input.accessToken}`,
			},
		},
	)

	const payload = readErrorPayload(data)

	if (error) {
		const message =
			payload.message ??
			payload.error ??
			(error.message.includes('401') || error.message.includes('Unauthorized')
				? 'AI extraction authentication failed. Sign in again and retry.'
				: error.message)

		throw new ExtractMetricsAiInvokeError(message, {
			statusCode:
				payload.status ?? (error.message.includes('401') ? 401 : undefined),
			correlationId: payload.correlationId,
			providerResponse: payload.providerResponse,
		})
	}

	if (payload.error) {
		throw new ExtractMetricsAiInvokeError(payload.error, {
			statusCode: payload.status,
			correlationId: payload.correlationId,
			providerResponse: payload.providerResponse,
		})
	}

	if (payload.status && payload.status >= 400) {
		throw new ExtractMetricsAiInvokeError(
			payload.message ?? 'AI metric extraction failed',
			{
				statusCode: payload.status,
				correlationId: payload.correlationId,
				providerResponse: payload.providerResponse,
			},
		)
	}

	const body = data as {
		metrics?: ExtractMetricsAiEdgeMetric[]
		metadata?: ExtractMetricsAiEdgeResult['metadata']
		warnings?: string[]
		model?: string
		correlationId?: string
		usage?: {
			promptTokens?: number
			completionTokens?: number
			totalTokens?: number
		}
	}

	const promptTokens = body.usage?.promptTokens ?? 0
	const completionTokens = body.usage?.completionTokens ?? 0

	return {
		metrics: body.metrics ?? [],
		metadata: body.metadata ?? {},
		warnings: body.warnings ?? [],
		model: body.model ?? input.model,
		correlationId: body.correlationId,
		usage: {
			promptTokens,
			completionTokens,
			totalTokens: body.usage?.totalTokens ?? promptTokens + completionTokens,
		},
	}
}

async function invokeExtractMetricsViaAskAi(input: {
	extractedText: string
	fileName: string
	model: string
}): Promise<ExtractMetricsAiEdgeResult> {
	const askResult = await invokeAskAiEdgeFunction({
		provider: 'gemini',
		model: input.model,
		messages: buildExtractMetricsPrompt({
			extractedText: input.extractedText,
			fileName: input.fileName,
		}),
		responseFormat: 'json',
		temperature: 0.1,
		maxTokens: 8192,
	})

	const parsed = parseExtractMetricsModelJson(askResult.content)

	if (parsed.metrics.length === 0) {
		throw new ExtractMetricsAiInvokeError(
			'AI extraction returned no usable laboratory metrics from the stored OCR text.',
			{
				correlationId: askResult.correlationId,
			},
		)
	}

	return toExtractMetricsResult({
		parsed,
		model: askResult.model,
		correlationId: askResult.correlationId,
		usage: askResult.usage,
	})
}

export async function invokeExtractMetricsAiEdgeFunction(input: {
	extractedText: string
	fileName: string
}): Promise<ExtractMetricsAiEdgeResult> {
	const config = loadAIPlatformConfig()
	const model = config.model || GEMINI_MODEL

	let session

	try {
		session = await requireSupabaseSession()
	} catch (error) {
		if (error instanceof SupabaseAuthRequiredError) {
			throw new ExtractMetricsAiInvokeError(error.message)
		}

		throw error
	}

	if (!isDedicatedExtractMetricsEdgeEnabled()) {
		return invokeExtractMetricsViaAskAi({
			extractedText: input.extractedText,
			fileName: input.fileName,
			model,
		})
	}

	try {
		return await invokeDedicatedExtractMetricsFunction({
			extractedText: input.extractedText,
			fileName: input.fileName,
			model,
			accessToken: session.access_token,
		})
	} catch (primaryError) {
		if (
			primaryError instanceof ExtractMetricsAiInvokeError &&
			primaryError.statusCode === 401
		) {
			throw primaryError
		}

		console.warn(
			JSON.stringify({
				service: 'health-ai-reprocess',
				event: 'extract_metrics_edge_fallback',
				message:
					primaryError instanceof Error
						? primaryError.message
						: 'extract-metrics-ai failed',
			}),
		)

		return invokeExtractMetricsViaAskAi({
			extractedText: input.extractedText,
			fileName: input.fileName,
			model,
		})
	}
}
