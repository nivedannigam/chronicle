import type {
	AIObservabilityRecord,
	AIObservabilitySink,
} from '@/shared/ai/observability/ai-observability.types'

const sinks: AIObservabilitySink[] = []
const inMemoryLog: AIObservabilityRecord[] = []

export function registerAIObservabilitySink(sink: AIObservabilitySink): void {
	sinks.push(sink)
}

export function recordAIObservability(record: AIObservabilityRecord): void {
	inMemoryLog.push(record)

	for (const sink of sinks) {
		sink(record)
	}

	if (typeof import.meta !== 'undefined') {
		const env = (import.meta as { env?: { DEV?: boolean } }).env
		if (env?.DEV) {
			const { error, ...safeRecord } = record
			void error
			console.debug('[chronicle-ai]', safeRecord)
		}
	}
}

export function getAIObservabilityLog(): readonly AIObservabilityRecord[] {
	return inMemoryLog
}

export function clearAIObservabilityLog(): void {
	inMemoryLog.length = 0
}
