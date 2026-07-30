import type { AskIntent } from './ask-intent.types.ts'

export interface DetectedIntent {
	intent: AskIntent
	categoryId?: string
	metricName?: string
	timeRangeYears?: number
	confidence: number
}
