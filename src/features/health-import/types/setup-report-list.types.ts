import type { ConnectorDocumentRecord } from '@/core/connectors'
import type { UploadedHealthReport } from '@/features/health/types'

/** User-facing setup row status — one badge per imported file/report. */
export type SetupReportRowStatus =
	'ready' | 'processing' | 'failed' | 'needs_reprocess' | 'skipped'

export type SetupReportListFilter =
	'all' | 'needs_attention' | 'ready' | 'skipped'

export interface SetupReportRowModel {
	/** Stable key for React lists — registry id, report id, or synthetic. */
	key: string
	registryId: string | null
	reportId: string | null
	title: string
	subtitle: string
	status: SetupReportRowStatus
	reason: string | null
	stageLabel: string | null
	failedStage: string | null
	errorLog: string | null
	sortDate: string
	canReimport: boolean
	canReprocess: boolean
	canReprocessWithAi: boolean
	canViewReport: boolean
}

export interface BuildSetupReportRowsInput {
	registry: ConnectorDocumentRecord[]
	reports: UploadedHealthReport[]
	memberId: string | null | undefined
	accountOwnerMemberId: string | null
}
