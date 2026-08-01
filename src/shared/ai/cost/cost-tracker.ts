import { estimateTokenCost } from '@/shared/ai/cost/cost-pricing'
import type { AIProviderId } from '@/shared/ai/types/ai-platform.types'

export interface CostRecord {
	id: string
	provider: AIProviderId
	model: string
	intent: string
	promptTokens: number
	completionTokens: number
	totalTokens: number
	estimatedCostUsd: number
	requestTime: string
	requestId: string
}

const costLog: CostRecord[] = []
const MAX_RECORDS = 500

export function recordAICost(input: {
	requestId: string
	provider: AIProviderId
	model: string
	intent: string
	promptTokens: number
	completionTokens: number
}): CostRecord {
	const estimatedCostUsd = estimateTokenCost({
		provider: input.provider,
		model: input.model,
		promptTokens: input.promptTokens,
		completionTokens: input.completionTokens,
	})

	const record: CostRecord = {
		id: crypto.randomUUID(),
		requestId: input.requestId,
		provider: input.provider,
		model: input.model,
		intent: input.intent,
		promptTokens: input.promptTokens,
		completionTokens: input.completionTokens,
		totalTokens: input.promptTokens + input.completionTokens,
		estimatedCostUsd,
		requestTime: new Date().toISOString(),
	}

	costLog.push(record)

	if (costLog.length > MAX_RECORDS) {
		costLog.splice(0, costLog.length - MAX_RECORDS)
	}

	return record
}

export function getAICostLog(): readonly CostRecord[] {
	return costLog
}

export function clearAICostLog(): void {
	costLog.length = 0
}

export function getTotalEstimatedCost(): number {
	return costLog.reduce((sum, record) => sum + record.estimatedCostUsd, 0)
}
