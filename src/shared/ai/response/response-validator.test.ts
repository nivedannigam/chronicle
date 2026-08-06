import { describe, expect, it } from 'vitest'
import {
	assertStructuredResponse,
	buildGroundedValidationContext,
	buildGroundedValidationContextFromEvidenceItems,
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

	it('accepts Gemini companion payloads with missing optional fields', () => {
		const geminiPayload = {
			overallStatus: 'completed',
			directAnswer:
				'Your most recent report shows several values within normal range.',
			evidenceFromReports: ['Red Blood Cells: normal status'],
			whatChanged: ['Chloride was noted as currently high.'],
			doctorDiscussion: ['Discuss your chloride level with your doctor.'],
			sourceReports: [
				{
					id: 'report-4f322d5f-401a-4f68-a08f-59bd2e1c80a0',
					label: 'Feb 2026',
					date: '2026-08-03',
					lab: 'Svasth Healthi',
				},
			],
			limitations: ['Some results may be incomplete.'],
		}

		const result = validateStructuredResponseContent(
			JSON.stringify(geminiPayload),
		)

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.directAnswer).toContain('most recent report')
			expect(result.value.overallStatus).toBe('stable')
			expect(result.value.sourceReports?.[0]?.sourceType).toBe('health_report')
			expect(result.value.evidenceReferences).toHaveLength(1)
		}
	})

	it('accepts report ids in grounded validation', () => {
		const context = buildGroundedValidationContext({
			metricNames: ['Red Blood Cells'],
			reportIds: ['report-4f322d5f-401a-4f68-a08f-59bd2e1c80a0'],
			evidenceIds: ['metric-1'],
		})

		const grounded = validateGroundedResponse(
			{
				...validPayload,
				keyFindings: ['Report reviewed successfully'],
				evidenceReferences: [
					{
						id: 'report-4f322d5f-401a-4f68-a08f-59bd2e1c80a0',
						label: 'Feb 2026',
						sourceType: 'health_report',
					},
				],
			},
			context,
		)

		expect(grounded.errors).toEqual([])
		expect(grounded.ok).toBe(true)
	})

	it('accepts heart-status Gemini payload with graph report ids and narrative findings', () => {
		const geminiPayload = {
			overallStatus: 'good',
			directAnswer:
				'Nivedan, looking at your heart-related tests, your cholesterol levels from October 2024 were within the normal range.',
			evidenceFromReports: [
				'Total Cholesterol was recorded at 167 mg/dl (normal range 0-200) in October 2024.',
				'Non-HDL Cholesterol was recorded at 116 mg/dl (normal range 0-130) in October 2024.',
				'An ECG Report was completed on March 1, 2026.',
				'A TMT (Treadmill Test) Report was completed on February 25, 2026.',
			],
			whatChanged: [],
			doctorDiscussion: [
				'Discuss the results of your recent TMT and ECG with your physician.',
			],
			sourceReports: [
				{
					id: 'graph-health-report:fd83c5c9-6fc3-4485-9891-ef456a93f2b1',
					title: 'ECG Report',
					date: '2026-03-01',
				},
				{
					id: 'graph-health-report:35e27e1a-118e-45af-b146-7a4defff030b',
					title: 'TMT (Treadmill Test) Report',
					date: '2026-02-25',
				},
				{
					id: 'graph-health-report:260fe224-6b45-4d12-8bb6-ccfb4acc7cda',
					title: 'Oct 2024 Partial Checkup',
					date: '2024-10-22',
				},
			],
			limitations: [
				'Some heart-related test reports do not include detailed numerical metrics in the current records.',
			],
		}

		const structured = validateStructuredResponseContent(
			JSON.stringify(geminiPayload),
		)
		expect(structured.ok).toBe(true)
		if (!structured.ok) {
			return
		}

		const context = buildGroundedValidationContextFromEvidenceItems([
			{
				id: 'graph-health-report:fd83c5c9-6fc3-4485-9891-ef456a93f2b1',
				type: 'health_report',
				data: {
					graphEntityId: 'health-report:fd83c5c9-6fc3-4485-9891-ef456a93f2b1',
					reportId: 'fd83c5c9-6fc3-4485-9891-ef456a93f2b1',
				},
			},
			{
				id: 'graph-health-report:35e27e1a-118e-45af-b146-7a4defff030b',
				type: 'health_report',
				data: {
					graphEntityId: 'health-report:35e27e1a-118e-45af-b146-7a4defff030b',
					reportId: '35e27e1a-118e-45af-b146-7a4defff030b',
				},
			},
			{
				id: 'graph-health-report:260fe224-6b45-4d12-8bb6-ccfb4acc7cda',
				type: 'health_report',
				data: {
					graphEntityId: 'health-report:260fe224-6b45-4d12-8bb6-ccfb4acc7cda',
					reportId: '260fe224-6b45-4d12-8bb6-ccfb4acc7cda',
				},
			},
			{
				id: 'metric-cholesterol-1',
				type: 'health_metric',
				data: { displayName: 'Total Cholesterol' },
			},
			{
				id: 'metric-cholesterol-2',
				type: 'health_metric',
				data: { displayName: 'Non-HDL Cholesterol' },
			},
		])

		const grounded = validateGroundedResponse(structured.value, context)
		expect(grounded.ok).toBe(true)

		const asserted = assertStructuredResponse(
			JSON.stringify(geminiPayload),
			context,
		)
		expect(asserted.directAnswer).toContain('cholesterol')
	})
})
