export { HealthKnowledgeDebugPage } from '@/features/health-knowledge/pages/HealthKnowledgeDebugPage'
export { HealthMetricTimelinePage } from '@/features/health-knowledge/pages/HealthMetricTimelinePage'
export { useHealthKnowledge } from '@/features/health-knowledge/hooks/useHealthKnowledge'
export { healthKnowledgeService } from '@/features/health-knowledge/services/health-knowledge.service'
export { invalidateHealthKnowledgeCache } from '@/features/health-knowledge/services/health-knowledge-cache'
export type {
	HealthKnowledgeGraph,
	HealthMetricHistory,
	HealthObservation,
	PersonHealthProfile,
} from '@/features/health-knowledge/types'
