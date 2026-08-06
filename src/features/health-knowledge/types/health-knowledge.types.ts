export type HealthTrendDirection =
	'improving' | 'stable' | 'declining' | 'rapid_change' | 'unknown'

export type HealthAlertSeverity = 'info' | 'attention' | 'critical'

export interface HealthMetricDefinition {
	canonicalId: string
	displayName: string
	categoryId: MetricCategoryId
	aliases: string[]
	defaultUnit?: string
}

export type MetricCategoryId =
	| 'heart'
	| 'liver'
	| 'kidney'
	| 'diabetes'
	| 'thyroid'
	| 'vitamin'
	| 'blood'
	| 'urine'

export interface MetricCategory {
	id: MetricCategoryId
	name: string
	emoji: string
	color: string
	metricIds: string[]
}

export interface HealthObservation {
	id: string
	canonicalMetricId: string
	displayName: string
	rawName: string
	value: string
	numericValue: number | null
	unit: string | null
	status: string
	confidence: number
	observedAt: string
	reportId: string
	reportTitle: string
	laboratory: string
	referenceRange: string
	/** Provenance for merge — stored DB row vs parsed report JSON. */
	source?: 'stored' | 'parsed'
}

export interface MetricBaseline {
	latest: number | null
	best: number | null
	worst: number | null
	average: number | null
	highest: number | null
	lowest: number | null
	firstRecorded: number | null
	lastRecorded: number | null
	latestValueLabel: string
	firstObservedAt: string | null
	lastObservedAt: string | null
}

export interface HealthTrend {
	direction: HealthTrendDirection
	changePercent: number | null
	dataPointCount: number
	description: string
}

export interface HealthMetricHistory {
	canonicalMetricId: string
	displayName: string
	categoryId: MetricCategoryId
	unit: string | null
	observations: HealthObservation[]
	trend: HealthTrend
	baseline: MetricBaseline
	linkedReportIds: string[]
}

export interface MetricRelationship {
	id: string
	fromMetricId: string
	toMetricId: string
	relationshipType: 'influences' | 'indicates' | 'correlates'
	label: string
}

export interface HealthAlert {
	id: string
	metricId: string
	severity: HealthAlertSeverity
	message: string
	observedAt: string
	reportId: string
}

export interface DerivedHealthInsight {
	id: string
	text: string
	tone: 'positive' | 'warning' | 'neutral'
	metricId?: string
}

export interface CategorySnapshot {
	categoryId: MetricCategoryId
	name: string
	emoji: string
	color: string
	latestValue: string
	trend: HealthTrendDirection
	historyCount: number
	lastUpdated: string
	statusLabel: string
	metricCount: number
}

export interface PersonHealthProfile {
	personId: string
	metricHistories: HealthMetricHistory[]
	categories: CategorySnapshot[]
	insights: DerivedHealthInsight[]
	alerts: HealthAlert[]
	relationships: MetricRelationship[]
	reportIds: string[]
	generatedAt: string
	cacheVersion: string
}

export interface HealthKnowledgeGraph {
	profile: PersonHealthProfile
	metricDefinitions: HealthMetricDefinition[]
	metricCategories: MetricCategory[]
}

export interface BuildHealthKnowledgeInput {
	personId: string
	uploadedReports: import('@/features/health/types').UploadedHealthReport[]
	storedMetrics?: import('@/features/health/types/health-metric-record.types').StoredHealthMetric[]
}
