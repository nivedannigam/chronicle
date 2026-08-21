import { describe, expect, it } from 'vitest'
import {
	evaluateAskEvidenceGate,
	shouldBlockNarrativeWithoutEvidence,
} from '@/features/ask/trust/ask-answer-contract'
import type { CrossModuleEvidenceBundle } from '@/shared/ai/evidence-planning/cross-module-evidence.types'

function emptyBundle(): CrossModuleEvidenceBundle {
	return {
		summaryLines: [],
		items: [],
		limitations: [],
		conflicts: [],
	}
}

describe('ask-answer-contract', () => {
	it('returns RESTRICTED when authorization is restricted', () => {
		const gate = evaluateAskEvidenceGate({
			authorizationStatus: 'RESTRICTED',
			bundle: emptyBundle(),
		})

		expect(gate.status).toBe('RESTRICTED')
		expect(shouldBlockNarrativeWithoutEvidence(gate)).toBe(true)
	})

	it('returns NOT_FOUND without evidence', () => {
		const gate = evaluateAskEvidenceGate({
			authorizationStatus: 'ALLOWED',
			bundle: emptyBundle(),
		})

		expect(gate.status).toBe('NOT_FOUND')
		expect(shouldBlockNarrativeWithoutEvidence(gate)).toBe(true)
	})

	it('returns ANSWERABLE with summary lines', () => {
		const gate = evaluateAskEvidenceGate({
			authorizationStatus: 'ALLOWED',
			bundle: {
				...emptyBundle(),
				summaryLines: ['Motor insurance expires 2026-09-30'],
			},
		})

		expect(gate.status).toBe('ANSWERABLE')
		expect(shouldBlockNarrativeWithoutEvidence(gate)).toBe(false)
	})
})
