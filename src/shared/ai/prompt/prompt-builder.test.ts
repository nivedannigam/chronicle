import { describe, expect, it } from 'vitest'
import { buildPlatformPrompt } from '@/shared/ai/prompt/prompt-builder'
import type { PromptContext } from '@/shared/ai/types/prompt.types'

const sampleContext: PromptContext = {
	intent: 'summarize_report',
	question: 'Summarize my latest health report',
	memberName: 'Nivedan',
	knowledge: {
		domain: 'health',
		intent: 'summarize_report',
		question: 'Summarize my latest health report',
		reports: [
			{
				id: 'report-1',
				title: 'Thyrocare Checkup',
				date: '2026-03-09',
				lab: 'Thyrocare',
			},
		],
		metrics: [
			{
				id: 'hba1c',
				displayName: 'HbA1c',
				value: '5.8',
				unit: '%',
				status: 'borderline',
				reportId: 'report-1',
			},
		],
		insights: [],
		alerts: [],
		evidence: [
			{
				id: 'metric-hba1c',
				sourceType: 'health_metric',
				label: 'HbA1c',
				metricName: 'HbA1c',
				metricValue: '5.8 %',
			},
		],
		summaryLines: [],
		coverageNotes: ['Partial corpus'],
		dataAvailable: true,
	},
}

describe('prompt-builder', () => {
	it('builds system, developer, user, evidence, and schema sections', () => {
		const prompt = buildPlatformPrompt(sampleContext)

		expect(prompt.system).toContain('Chronicle')
		expect(prompt.developer).toContain('HealthKnowledge')
		expect(prompt.user).toContain('Summarize my latest health report')
		expect(prompt.evidence).toContain('HbA1c')
		expect(prompt.context).toContain('health')
		expect(prompt.outputSchema).toContain('keyFindings')
		expect(prompt.messages).toHaveLength(3)
	})
})
