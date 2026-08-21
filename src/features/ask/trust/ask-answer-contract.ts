import type { CrossModuleEvidenceBundle } from '@/shared/ai/evidence-planning/cross-module-evidence.types'
import type { AskAuthorizationStatus } from '@/core/platform/services/privacy-authorization.service'

export type AskAnswerStatus =
	'ANSWERABLE' | 'PARTIAL' | 'NOT_FOUND' | 'RESTRICTED'

export interface AskAnswerGateResult {
	status: AskAnswerStatus
	hasEvidence: boolean
	hasLimitations: boolean
}

export const ASK_NOT_FOUND_MESSAGE =
	"I couldn't find enough information in your records to answer that."

export const ASK_PARTIAL_PREFIX =
	'I found some information, but important details are still missing.'

export function evaluateAskEvidenceGate(input: {
	authorizationStatus: AskAuthorizationStatus
	bundle: CrossModuleEvidenceBundle
}): AskAnswerGateResult {
	if (input.authorizationStatus === 'RESTRICTED') {
		return {
			status: 'RESTRICTED',
			hasEvidence: false,
			hasLimitations: false,
		}
	}

	const evidenceLines = input.bundle.summaryLines.filter(Boolean)
	const evidenceItems = input.bundle.items.filter((item) => Boolean(item.value))
	const hasEvidence = evidenceLines.length > 0 || evidenceItems.length > 0
	const hasLimitations = input.bundle.limitations.some(Boolean)

	if (!hasEvidence) {
		return {
			status: 'NOT_FOUND',
			hasEvidence: false,
			hasLimitations,
		}
	}

	if (hasLimitations && evidenceLines.length <= 1) {
		return {
			status: 'PARTIAL',
			hasEvidence: true,
			hasLimitations: true,
		}
	}

	return {
		status: 'ANSWERABLE',
		hasEvidence: true,
		hasLimitations,
	}
}

export function shouldBlockNarrativeWithoutEvidence(
	gate: AskAnswerGateResult,
): boolean {
	return gate.status === 'NOT_FOUND' || gate.status === 'RESTRICTED'
}
