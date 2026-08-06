import { estimateEvidenceTokens } from '@/shared/ai/evidence/token-estimator'
import type {
	EvidenceItem,
	SelectedEvidence,
} from '@/shared/ai/evidence/evidence.types'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import type { EvidenceBundle } from '@/shared/ai/evidence-planning/types'

export function evidenceBundleToSelectedEvidence(input: {
	bundle: EvidenceBundle
	classifiedIntent: ClassifiedIntent
	question: string
	memberName?: string | null
}): SelectedEvidence {
	const items: EvidenceItem[] = []

	for (const report of input.bundle.reports) {
		items.push({
			id: `report-${report.id}`,
			type: 'health_report',
			label: report.title,
			data: { ...report },
		})
	}

	for (const metric of input.bundle.metrics) {
		items.push({
			id: `metric-${metric.id}`,
			type: 'health_metric',
			label: metric.displayName,
			data: { ...metric },
		})
	}

	for (const trend of input.bundle.trends) {
		items.push({
			id: `trend-${trend.metricId}`,
			type: 'health_trend',
			label: trend.displayName,
			data: { ...trend },
		})
	}

	for (const event of input.bundle.timeline) {
		items.push({
			id: `timeline-${event.id}`,
			type: 'health_timeline',
			label: event.title,
			data: { ...event },
		})
	}

	const payload = {
		questionType: input.bundle.metadata.questionType,
		resolver: input.bundle.metadata.resolver,
		bundle: input.bundle,
		groundedItems: items,
	}

	const contextSizeChars = JSON.stringify(payload).length

	return {
		domain: 'health',
		intent: input.classifiedIntent.intent,
		question: input.question,
		memberName: input.memberName,
		items,
		metadata: {
			evidenceCount: items.length,
			excludedItems: input.bundle.metadata.excluded,
			estimatedTokens: estimateEvidenceTokens({
				payload,
				question: input.question,
			}),
			contextSizeChars,
			selectedKeys: items.map((item) => item.id),
		},
	}
}
