import { describe, expect, it } from 'vitest'
import {
	assertStructuredResponse,
	buildGroundedValidationContext,
	validateGroundedResponse,
	validateStructuredResponse,
	validateStructuredResponseContent,
} from '@/shared/ai/response/response-validator'

const validPayload = {
	summary: 'Your latest report looks stable.',
	overallStatus: 'stable' as const,
	keyFindings: ['HbA1c is borderline'],
	recommendations: ['Discuss with your clinician'],
	followUpQuestions: ['How did LDL change?'],
	confidence: 0.8,
	limitations: ['Single report only'],
	evidenceReferences: [
		{
			id: 'metric-1',
			label: 'HbA1c',
			sourceType: 'health_metric',
		},
	],
}

describe('response-validator', () => {
	it('accepts valid structured responses', () => {
		const result = validateStructuredResponse(validPayload)

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.summary).toContain('stable')
		}
	})

	it('rejects invalid confidence and missing summary', () => {
		const result = validateStructuredResponse({
			summary: '',
			overallStatus: 'stable',
			keyFindings: [],
			recommendations: [],
			followUpQuestions: [],
			confidence: 1.5,
			limitations: [],
			evidenceReferences: [],
		})

		expect(result.ok).toBe(false)
	})

	it('parses JSON content and asserts', () => {
		const json = JSON.stringify(validPayload)
		const validated = assertStructuredResponse(json)
		expect(validated.summary).toBe(validPayload.summary)
	})

	it('rejects non-json content', () => {
		const result = validateStructuredResponseContent('not json')
		expect(result.ok).toBe(false)
	})

	it('rejects unknown evidence references', () => {
		const context = buildGroundedValidationContext({
			metricNames: ['HbA1c'],
			reportIds: ['report-1'],
			evidenceIds: ['metric-1'],
		})

		const grounded = validateGroundedResponse(
			{
				...validPayload,
				evidenceReferences: [
					{ id: 'unknown-id', label: 'Fake', sourceType: 'health_metric' },
				],
			},
			context,
		)

		expect(grounded.ok).toBe(false)
	})

	it('rejects likely hallucinated numeric findings', () => {
		const context = buildGroundedValidationContext({
			metricNames: ['HbA1c'],
			reportIds: ['report-1'],
			evidenceIds: ['metric-1'],
		})

		const grounded = validateGroundedResponse(
			{
				...validPayload,
				keyFindings: ['Vitamin X level is 999 mg/dL'],
			},
			context,
		)

		expect(grounded.ok).toBe(false)
	})
})
