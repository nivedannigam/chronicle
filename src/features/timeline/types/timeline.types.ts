export type TimelineModule =
	| 'health'
	| 'insurance'
	| 'vehicles'
	| 'identity'
	| 'documents'
	| 'finance'
	| 'property'
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
	accountOwnerMemberId?: string | null
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
	finance?: {
		knowledge?: import('@/features/finance-knowledge/types/finance-knowledge.types').FinanceKnowledge
		documents?: import('@/features/documents/types/document.types').ChronicleDocument[]
		userId?: string
		hasFolderAssigned?: boolean
		familyMemberId?: string | null
	}
	vehicles?: {
		knowledge?: import('@/features/vehicle-knowledge/types/vehicle-knowledge-object.types').VehicleKnowledge
		userId?: string
		familyMemberId?: string | null
		accountOwnerMemberId?: string | null
	}
	identity?: {
		knowledge?: import('@/features/identity-knowledge/types/identity-knowledge.types').IdentityKnowledge
		documents?: import('@/features/documents/types/document.types').ChronicleDocument[]
		userId?: string
		accountOwnerMemberId?: string | null
		familyMemberId?: string | null
	}
	property?: {
		knowledge?: import('@/features/property-knowledge/types/property-knowledge.types').PropertyKnowledge
		documents?: import('@/features/documents/types/document.types').ChronicleDocument[]
		userId?: string
		hasFolderAssigned?: boolean
		rootFolderPath?: string | null
		familyMemberId?: string | null
	}
	system?: {
		lastDriveScanAt?: string | null
		medicalReportsCount?: number
	}
}
