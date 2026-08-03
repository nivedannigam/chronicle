import type { ProductReportStatus } from '@/features/health/services/health-product.mapper'

export interface HealthVisitDocument {
	reportId: string
	title: string
	documentType: string
	status: ProductReportStatus
	statusLabel: string
}

export interface HealthVisit {
	id: string
	title: string
	date: string
	displayDate: string
	displayMonthYear: string
	hospital: string
	reportIds: string[]
	reportCount: number
	documents: HealthVisitDocument[]
	summaryLine: string
	summaryParagraph: string
	findingCount: number
	status: ProductReportStatus
	statusLabel: string
	isGrouped: boolean
}
