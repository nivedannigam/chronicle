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
