import type { EvidenceSelectionMetadata } from '@/shared/ai/evidence/evidence.types'
import type { ChronicleIntent } from '@/shared/ai/intent/intent.types'

export interface EvidenceSelectionObservability {
	intent: ChronicleIntent
	selectedEvidence: string[]
	excludedEvidence: string[]
	estimatedTokens: number
	evidenceCount: number
	contextSizeChars: number
}

const evidenceLog: EvidenceSelectionObservability[] = []

export function recordEvidenceSelection(input: {
	intent: ChronicleIntent
	metadata: EvidenceSelectionMetadata
}): EvidenceSelectionObservability {
	const record: EvidenceSelectionObservability = {
		intent: input.intent,
		selectedEvidence: input.metadata.selectedKeys,
		excludedEvidence: input.metadata.excludedItems,
		estimatedTokens: input.metadata.estimatedTokens,
		evidenceCount: input.metadata.evidenceCount,
		contextSizeChars: input.metadata.contextSizeChars,
	}

	evidenceLog.push(record)

	if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
		console.debug('[chronicle-ai-evidence]', record)
	}

	return record
}

export function getEvidenceSelectionLog(): readonly EvidenceSelectionObservability[] {
	return evidenceLog
}

export function clearEvidenceSelectionLog(): void {
	evidenceLog.length = 0
}
