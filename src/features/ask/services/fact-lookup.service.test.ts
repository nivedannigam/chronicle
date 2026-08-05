import { describe, expect, it } from 'vitest'
import { buildFactLookupTurn } from '@/features/ask/services/fact-lookup.service'
import type { AskHealthContext } from '@/features/ask/context/ask-health-context.types'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'

const sampleMetric = {
	canonicalId: 'ldl',
	displayName: 'LDL',
	latestValue: '120',
	unit: 'mg/dL',
	status: 'high',
	reportId: 'r1',
	reportTitle: 'Lipid panel',
	observedAt: '2026-01-15',
	referenceRange: '< 100',
	trend: 'stable' as const,
	categoryId: 'heart' as const,
}

function buildKnowledge(
	metrics: RetrievedKnowledge['metrics'],
): RetrievedKnowledge {
	return {
		intent: 'metric_lookup',
		metrics,
		reports: [],
		trends: [],
		comparisons: [],
		alerts: [],
	} as unknown as RetrievedKnowledge
}

function buildContext(): AskHealthContext {
	return {
		healthSummary: {
			reportCount: 1,
			metricCount: 1,
			abnormalCount: 1,
			hasMultipleReports: false,
		},
		latestReport: null,
		reportHistory: [],
		importantMetrics: [],
		abnormalFindings: [],
		recentChanges: [],
		timeline: [],
		evidence: [],
		rankedImportant: [],
		internal: { dataAvailable: true },
		rawKnowledge: buildKnowledge([]),
	}
}

describe('fact-lookup.service', () => {
	it('returns null when the requested metric is not found', () => {
		const turn = buildFactLookupTurn({
			question: 'What is my HbA1c?',
			knowledge: buildKnowledge([sampleMetric]),
			context: buildContext(),
			domains: ['health'],
			metricName: 'HbA1c',
		})

		expect(turn).toBeNull()
	})

	it('answers when the metric exists', () => {
		const turn = buildFactLookupTurn({
			question: 'What is my LDL?',
			knowledge: buildKnowledge([sampleMetric]),
			context: buildContext(),
			domains: ['health'],
			metricName: 'LDL',
		})

		expect(turn?.answer).toContain('LDL')
		expect(turn?.answer).toContain('120')
	})
})
