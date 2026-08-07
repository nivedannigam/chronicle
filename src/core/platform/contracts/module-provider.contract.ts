import type { PlatformModuleId } from '@/core/platform/contracts/platform-module.contract'
import type { ChronicleDocumentSummary } from '@/features/documents/types/document-intelligence.types'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { ChronicleTimelineEvent } from '@/features/timeline/types/timeline.types'
import type { PlatformNotification } from '@/core/platform/contracts/notification-platform.contract'

export interface ModuleProviderSources {
	health?: {
		uploadedReports?: UploadedHealthReport[]
	}
	documents?: {
		uploadedDocuments?: ChronicleDocument[]
	}
	insurance?: {
		knowledge?: InsuranceKnowledge | null
	}
}

export interface ModuleProviderQuery {
	userId: string
	memberId?: string | null
	memberName?: string | null
	memberNames?: Record<string, string>
	sources: ModuleProviderSources
}

export interface ModuleDocumentCategory {
	id: string
	label: string
	count: number
}

export interface ModuleDocumentSection {
	moduleId: PlatformModuleId | 'documents'
	label: string
	emoji: string
	totalCount: number
	categories: ModuleDocumentCategory[]
	documents: ChronicleDocumentSummary[]
}

export interface ModuleSummary {
	moduleId: PlatformModuleId | 'documents'
	label: string
	emoji: string
	documentCount: number
	headline: string | null
}

/**
 * Unified module provider — domains expose documents, timeline, notifications,
 * and summary without consumers reading module databases directly.
 */
export interface ChronicleModuleProvider {
	readonly moduleId: PlatformModuleId | 'documents'
	readonly label: string
	readonly emoji: string
	readonly priority: number

	getDocumentSection(query: ModuleProviderQuery): ModuleDocumentSection | null
	getSummary?(query: ModuleProviderQuery): ModuleSummary | null
	getTimelineEvents?(query: ModuleProviderQuery): ChronicleTimelineEvent[]
	getNotifications?(query: ModuleProviderQuery): PlatformNotification[]
}

export interface FederatedLibraryView {
	sections: ModuleDocumentSection[]
	allDocuments: ChronicleDocumentSummary[]
	totalCount: number
	moduleSummaries: ModuleSummary[]
}
