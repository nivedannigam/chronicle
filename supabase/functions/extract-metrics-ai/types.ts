export interface ExtractMetricsAiRequestBody {
	extractedText: string
	fileName: string
	model?: string
}

export interface ExtractMetricsAiMetric {
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

export interface ExtractMetricsAiResponseBody {
	metrics: ExtractMetricsAiMetric[]
	metadata?: {
		laboratory?: string | null
		reportDate?: string | null
		patientName?: string | null
		reportType?: string | null
	}
	warnings?: string[]
	model?: string
	correlationId?: string
	usage?: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
	}
	error?: string
	message?: string
	status?: number
}
