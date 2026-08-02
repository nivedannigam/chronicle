import { supabase } from '@/lib/supabase'
import {
	requireSupabaseSession,
	SupabaseAuthRequiredError,
} from '@/lib/supabase-session'
import { loadAIPlatformConfig } from '@/shared/ai/config/ai-platform.config'
import { GEMINI_MODEL } from '@/shared/ai/constants/gemini-model'

export class ExtractMetricsAiInvokeError extends Error {
	readonly statusCode?: number
	readonly correlationId?: string

	constructor(
		message: string,
		options?: { statusCode?: number; correlationId?: string },
	) {
		super(message)
		this.name = 'ExtractMetricsAiInvokeError'
		this.statusCode = options?.statusCode
		this.correlationId = options?.correlationId
	}
}

export interface ExtractMetricsAiEdgeMetric {
	rawName: string
	displayName: string
	value: string
	unit: string | null
	referenceRange: {
		rawText: string
		lowerLimit: number | null
		upperLimit: number | null
		unit: string | null
	}
	status: string
}

export interface ExtractMetricsAiEdgeResult {
	metrics: ExtractMetricsAiEdgeMetric[]
	metadata: {
		laboratory?: string | null
		reportDate?: string | null
		patientName?: string | null
		reportType?: string | null
	}
	warnings: string[]
	model: string
	correlationId?: string
	usage: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
	}
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

	const { data, error } = await supabase.functions.invoke(
		'extract-metrics-ai',
		{
			body: {
				extractedText: input.extractedText,
				fileName: input.fileName,
				model,
			},
			headers: {
				Authorization: `Bearer ${session.access_token}`,
			},
		},
	)

	if (error) {
		throw new ExtractMetricsAiInvokeError(
			error.message.includes('401') || error.message.includes('Unauthorized')
				? 'AI extraction authentication failed. Sign in again and retry.'
				: error.message,
			{
				statusCode: error.message.includes('401') ? 401 : undefined,
			},
		)
	}

	const payload = data as {
		metrics?: ExtractMetricsAiEdgeMetric[]
		metadata?: ExtractMetricsAiEdgeResult['metadata']
		warnings?: string[]
		model?: string
		correlationId?: string
		status?: number
		message?: string
		error?: string
		usage?: {
			promptTokens?: number
			completionTokens?: number
			totalTokens?: number
		}
	}

	if (!payload || payload.error) {
		throw new ExtractMetricsAiInvokeError(
			payload?.error ?? payload?.message ?? 'AI metric extraction failed',
		)
	}

	if (payload.status && payload.status >= 400) {
		throw new ExtractMetricsAiInvokeError(
			payload.message ?? 'AI metric extraction failed',
			{
				statusCode: payload.status,
				correlationId: payload.correlationId,
			},
		)
	}

	const promptTokens = payload.usage?.promptTokens ?? 0
	const completionTokens = payload.usage?.completionTokens ?? 0

	return {
		metrics: payload.metrics ?? [],
		metadata: payload.metadata ?? {},
		warnings: payload.warnings ?? [],
		model: payload.model ?? model,
		correlationId: payload.correlationId,
		usage: {
			promptTokens,
			completionTokens,
			totalTokens:
				payload.usage?.totalTokens ?? promptTokens + completionTokens,
		},
	}
}
