import { describe, expect, it } from 'vitest'
import {
	validateAiExtractedMetrics,
	reportEligibleForAiReprocess,
} from '@/features/health/services/health-ai-extraction.service'
import type { UploadedHealthReport } from '@/features/health/types'

describe('health-ai-extraction.service', () => {
	it('requires stored OCR text for AI reprocess eligibility', () => {
		const eligible = {
			extracted_text: 'HEMOGLOBIN 13.5 g/dL',
		} as UploadedHealthReport
		const ineligible = {
			extracted_text: null,
		} as UploadedHealthReport

		expect(reportEligibleForAiReprocess(eligible)).toBe(true)
		expect(reportEligibleForAiReprocess(ineligible)).toBe(false)
	})

	it('validates AI metrics with names and values', () => {
		const metrics = validateAiExtractedMetrics([
			{
				rawName: 'HEMOGLOBIN',
				displayName: 'Hemoglobin',
				value: '13.5',
				unit: 'g/dL',
				referenceRange: {
					rawText: '12-16',
					lowerLimit: 12,
					upperLimit: 16,
					unit: 'g/dL',
				},
				status: 'normal',
			},
		])

		expect(metrics).toHaveLength(1)
	})

	it('rejects empty AI metric payloads', () => {
		expect(() => validateAiExtractedMetrics([])).toThrow(
			/no usable laboratory metrics/i,
		)
	})
})
