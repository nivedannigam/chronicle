import { describe, expect, it } from 'vitest'
import {
	isInferredInternalPolicyNumber,
	resolveConsumerPolicyNumber,
} from '@/features/insurance-knowledge/utils/policy-number-provenance'

describe('policy-number-provenance', () => {
	it('detects internal fallback policy numbers', () => {
		expect(
			isInferredInternalPolicyNumber('icici-lombard:motor:health-shield'),
		).toBe(true)
		expect(isInferredInternalPolicyNumber('POL-123456')).toBe(false)
	})

	it('hides inferred internal policy numbers from consumer display', () => {
		expect(
			resolveConsumerPolicyNumber({
				policyNumber: 'hdfc-ergo:health:term-life',
				extractionMethod: 'deterministic',
				confidence: 0.35,
			}),
		).toBeNull()
	})

	it('keeps AI extracted policy numbers visible', () => {
		expect(
			resolveConsumerPolicyNumber({
				policyNumber: '1234567890123',
				extractionMethod: 'llm',
				confidence: 0.9,
			}),
		).toBe('1234567890123')
	})
})
