import type { HealthCompanionView } from '@/features/health/types/health-companion.types'
import type { HealthVisit } from '@/features/health/types/health-visit.types'
import type { HealthCoverageSnapshot } from '@/features/health/types/health-coverage.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import type { ProductReportCard } from '@/features/health/services/health-product.mapper'
import type { HealthStoryViewModel } from '@/features/health/services/health-story.mapper'
import type { ProgressViewModel } from '@/features/progress/types/progress.types'
import type { HealthVisitSnapshot } from '@/features/health-knowledge/services/health-snapshot.service'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { VisitChangeItem } from '@/features/health/services/health-visit-changes.service'
import type {
	ConsumerOverallStatus,
	ConsumerTrendLabel,
} from '@/features/health/services/health-consumer-status.service'

/** Canonical health snapshot — single source of truth for all Health screens. */
export interface HealthCanonicalSnapshot {
	score: number | null
	overallStatus: ConsumerOverallStatus
	overallSummary: string
	trendLabel: ConsumerTrendLabel
	latestReportTitle: string | null
	latestReportDate: string | null
	latestVisitTitle: string | null
	latestVisitDate: string | null
	topRecommendationTitle: string | null
	topRecommendationPath: string | null
}

export interface HealthContextValue {
	reports: UploadedHealthReport[]
	visits: HealthVisit[]
	reportCards: ProductReportCard[]
	companion: HealthCompanionView
	graph: HealthKnowledgeGraph
	coverage: HealthCoverageSnapshot
	snapshot: HealthCanonicalSnapshot
	story: HealthStoryViewModel
	progress: ProgressViewModel
	visitSnapshots: HealthVisitSnapshot[]
	visitChanges: Record<string, VisitChangeItem[]>
	storedMetrics: StoredHealthMetric[]
	hasImportedReports: boolean
	isLoading: boolean
	isError: boolean
	refetch: () => void
}
