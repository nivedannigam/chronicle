export type TimelineModule =
	| 'health'
	| 'insurance'
	| 'documents'
	| 'finance'
	| 'travel'
	| 'family'
	| 'system'

export type TimelineEventType =
	| 'report_imported'
	| 'lab_result'
	| 'diagnosis'
	| 'improvement'
	| 'finding'
	| 'vaccination'
	| 'medication'
	| 'procedure'
	| 'document_uploaded'
	| 'document_issued'
	| 'document_renewed'
	| 'document_expiry'
	| 'insurance_purchased'
	| 'property_registered'
	| 'connection'
	| 'custom'

export type TimelineImportance = 'low' | 'medium' | 'high'

export type TimelineEventCategory = 'life' | 'import' | 'operational'

export interface TimelineEventReference {
	type: string
	id: string
	label: string
}

export interface TimelineRelatedAsset {
	type: 'report' | 'document' | 'metric' | 'member'
	id: string
	label: string
}

/** Universal platform timeline event — all domains map into this model. */
export interface ChronicleTimelineEvent {
	id: string
	timestamp: string
	eventType: TimelineEventType
	/** Life events appear in Life Timeline; import/operational events are hidden by default. */
	category: TimelineEventCategory
	title: string
	summary: string
	familyMemberId: string | null
	familyMemberName?: string | null
	sourceModule: TimelineModule
	relatedAssets: TimelineRelatedAsset[]
	tags: string[]
	importance: TimelineImportance
	confidence?: number | null
	references: TimelineEventReference[]
	metadata: Record<string, string>
}

export interface TimelineFilters {
	searchQuery?: string
	memberId?: string | null
	modules?: TimelineModule[]
	importance?: TimelineImportance[]
	fromDate?: string
	toDate?: string
	/** When true (default), hides import and operational events. */
	lifeEventsOnly?: boolean
}

export interface TimelineMonthGroup {
	key: string
	label: string
	year: number
	month: number
	events: ChronicleTimelineEvent[]
}

export interface TimelineBuildResult {
	events: ChronicleTimelineEvent[]
	totalCount: number
	groups: TimelineMonthGroup[]
}

export interface TimelineSources {
	health?: {
		uploadedReports?: import('@/features/health/types').UploadedHealthReport[]
		metricHistories?: import('@/features/health-knowledge/types').HealthMetricHistory[]
	}
	documents?: {
		uploadedDocuments?: import('@/features/documents/types/document.types').ChronicleDocument[]
	}
	insurance?: {
		knowledge?: import('@/features/insurance-knowledge/types/insurance-knowledge-object.types').InsuranceKnowledge
		rawData?: import('@/features/insurance-knowledge/providers/insurance-knowledge-data-source').InsuranceKnowledgeRawData
		userId?: string
		familyMemberId?: string | null
		accountOwnerMemberId?: string | null
	}
	system?: {
		lastDriveScanAt?: string | null
		medicalReportsCount?: number
	}
}
