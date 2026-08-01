export type AskMetricStatus =
	'normal' | 'low' | 'high' | 'critical' | 'borderline' | 'unknown'

export type AnswerCardType =
	| 'summary'
	| 'metric'
	| 'trend'
	| 'timeline'
	| 'report'
	| 'action'
	| 'comparison'
	| 'alert'

export interface SummaryCardData {
	type: 'summary'
	id: string
	text: string
}

export interface MetricCardData {
	type: 'metric'
	id: string
	name: string
	value: string
	reference: string
	status: AskMetricStatus
	reportTitle?: string
	reportDate?: string
}

export interface TrendCardData {
	type: 'trend'
	id: string
	name: string
	unit: string
	color: string
	values: Array<{ date: string; label: string; value: number }>
	latestValue: string
}

export interface TimelineCardData {
	type: 'timeline'
	id: string
	items: Array<{
		title: string
		date: string
		status?: string
		reportId?: string
	}>
}

export interface ComparisonCardData {
	type: 'comparison'
	id: string
	label: string
	olderLabel: string
	newerLabel: string
	metrics: Array<{
		metric: string
		oldValue: string
		newValue: string
		difference: string
		status: AskMetricStatus
	}>
}

export interface AlertCardData {
	type: 'alert'
	id: string
	message: string
	severity: 'info' | 'attention' | 'critical'
}

export interface ReportCardData {
	type: 'report'
	id: string
	reportId: string
	title: string
	date: string
	lab: string
	category: string
	summary: string
}

export interface ActionCardData {
	type: 'action'
	id: string
	title: string
	dueLabel: string
}

export type AnswerCardData =
	| SummaryCardData
	| MetricCardData
	| TrendCardData
	| TimelineCardData
	| ReportCardData
	| ActionCardData
	| ComparisonCardData
	| AlertCardData

export interface RelatedReportRef {
	id: string
	title: string
	date: string
}

export interface RelatedMetricRef {
	name: string
	value: string
	status: string
}

export interface EvidenceCitation {
	reportId: string
	reportTitle: string
	hospital: string
	date: string
	metricName?: string
	metricId?: string
	timelineRef?: string
	ocrExcerpt?: string
	claimKind?: import('@/features/ask/trust/trust.types').ClaimKind
	source: import('@/features/knowledge/retrieval/knowledge-retriever.types').KnowledgeDomain
}

export interface AskConversationTurn {
	id: string
	question: string
	answer: string
	clinicalAnswer?: import('@/features/ask/clinical/clinical-response.types').ClinicalAnswer
	cards: AnswerCardData[]
	relatedReports: RelatedReportRef[]
	relatedMetrics: RelatedMetricRef[]
	citations: EvidenceCitation[]
	evidence: string[]
	followUpQuestions: string[]
	memberId: string | null
	memberName: string | null
	domains: import('@/features/knowledge/retrieval/knowledge-retriever.types').KnowledgeDomain[]
	dataAvailable: boolean
	confidence: number
	confidenceLevel: import('@/features/intelligence/types/confidence.types').ConfidenceLevel
	trust?: import('@/features/ask/trust/trust.types').TrustResponse
	timestamp: string
	displayTimestamp: string
}

export interface AskRecentQuestion {
	id: string
	question: string
	displayTimestamp: string
	turn?: AskConversationTurn
}

export interface AskQuestionInput {
	userId: string
	question: string
}

export interface AskQuestionResult {
	turn: AskConversationTurn
	intent: string
	implementation: 'mock-reasoning' | 'grounded-only' | 'ai-provider'
	debug?: AskDebugInfo
}

export interface AskDebugInfo {
	intent: string
	resolvedQuestion: string
	retrievedKnowledge: import('@/features/knowledge/retrieval/knowledge-retriever.types').RetrievedKnowledge
	prompt: import('@/features/ask/prompt/prompt-builder').BuiltPrompt
	provider: string
	providerResponse: string
	turn: AskConversationTurn
}

export interface ReportSearchCriteria {
	category?: string
	metricName?: string
	abnormalOnly?: boolean
	limit?: number
}

export interface MetricSearchResult {
	metricName: string
	value: string
	reference: string
	status: AskMetricStatus
	reportId: string
	reportTitle: string
	reportDate: string
}

export interface ReportComparisonResult {
	label: string
	olderLabel: string
	newerLabel: string
	metrics: Array<{
		metric: string
		oldValue: string
		newValue: string
		difference: string
		status: AskMetricStatus
	}>
}

export interface ReportSummaryResult {
	reportId: string
	title: string
	date: string
	lab: string
	summary: string
	metrics: Array<{
		name: string
		value: string
		status: AskMetricStatus
	}>
}
