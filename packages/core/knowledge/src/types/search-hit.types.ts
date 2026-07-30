import type { KnowledgeDomain } from './knowledge-domain.types.ts'

export interface SemanticSearchHit {
	id: string
	domain: KnowledgeDomain
	kind: 'report' | 'metric' | 'timeline' | 'entity'
	title: string
	snippet: string
	score: number
	reportId?: string
	metricName?: string
	date?: string
	reportType?: string
	memberId?: string | null
}
