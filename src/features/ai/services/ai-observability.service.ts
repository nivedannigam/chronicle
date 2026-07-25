import type { AiObservabilityLog } from '@/features/ai/types'

const logs: AiObservabilityLog[] = []
const MAX_LOGS = 50

export function logAiRequest(entry: AiObservabilityLog): void {
	if (!import.meta.env.DEV) {
		return
	}

	logs.unshift(entry)

	if (logs.length > MAX_LOGS) {
		logs.length = MAX_LOGS
	}
}

export function getAiObservabilityLogs(): AiObservabilityLog[] {
	return [...logs]
}

export function getLatestAiObservabilityLog(): AiObservabilityLog | null {
	return logs[0] ?? null
}

export function clearAiObservabilityLogs(): void {
	logs.length = 0
}
