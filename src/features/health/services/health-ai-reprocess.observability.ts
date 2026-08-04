export type HealthAiReprocessEvent =
	| 'ocr_failed'
	| 'ai_reprocess_requested'
	| 'ai_reprocess_completed'
	| 'ai_reprocess_failed'

export function logHealthAiReprocessEvent(input: {
	event: HealthAiReprocessEvent
	reportId: string
	correlationId: string
	durationMs?: number
	error?: string
	details?: Record<string, unknown>
}): void {
	console.info(
		JSON.stringify({
			service: 'health-ai-reprocess',
			event: input.event,
			reportId: input.reportId,
			correlationId: input.correlationId,
			durationMs: input.durationMs ?? null,
			error: input.error ?? null,
			...input.details,
		}),
	)
}
