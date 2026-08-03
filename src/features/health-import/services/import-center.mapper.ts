import type { HealthVisit } from '@/features/health/types/health-visit.types'
import type { SetupReportRowModel } from '@/features/health-import/types/setup-report-list.types'
import type { ReviewDocument } from '@/features/medical-discovery/types/medical-discovery.types'

export type ImportHelpKind =
	'choose_member' | 'not_medical' | 'unreadable_document'

export interface ImportRecentlyAddedItem {
	id: string
	title: string
	displayMonthYear: string
	reportCount: number
	summaryLine: string
	visitId: string
}

export interface ImportOrganizingItem {
	id: string
	title: string
	statusLine: string
}

export interface ImportHelpItem {
	id: string
	kind: ImportHelpKind
	title: string
	question: string
	subtitle?: string
	registryId: string | null
	reportId: string | null
	rowKey: string | null
	memberOptions?: Array<{ id: string; label: string }>
}

export interface ImportCenterViewModel {
	recentlyImported: ImportRecentlyAddedItem[]
	stillOrganizing: ImportOrganizingItem[]
	needsHelp: ImportHelpItem[]
	hasAnything: boolean
	needsAttentionCount: number
	organizingCount: number
}

export interface ImportAttentionSummary {
	message: string | null
	kind: 'new_visits' | 'needs_attention' | null
}

const RECENT_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function isRecentDate(date: string): boolean {
	const parsed = Date.parse(date)
	if (Number.isNaN(parsed)) {
		return false
	}

	return Date.now() - parsed <= RECENT_DAYS_MS
}

function cleanFileTitle(fileName: string): string {
	return fileName
		.replace(/\.pdf$/i, '')
		.replace(/[_-]+/g, ' ')
		.trim()
}

export function mapReviewDocumentToHelpItem(
	doc: ReviewDocument,
	memberOptions: Array<{ id: string; label: string }>,
): ImportHelpItem | null {
	if (doc.approvalStatus !== 'pending' && doc.importStatus !== 'failed') {
		return null
	}

	if (doc.importStatus === 'failed') {
		return {
			id: `review-failed-${doc.registryId}`,
			kind: 'unreadable_document',
			title: cleanFileTitle(doc.fileName),
			question: "We couldn't understand this document yet.",
			subtitle: doc.folderPath || undefined,
			registryId: doc.registryId,
			reportId: null,
			rowKey: null,
		}
	}

	if (!doc.familyMemberId) {
		const patient = doc.detectedPatient ?? doc.familyMemberName

		return {
			id: `review-member-${doc.registryId}`,
			kind: 'choose_member',
			title: cleanFileTitle(doc.fileName),
			question: patient
				? `Is this report for ${patient}?`
				: 'Who is this report for?',
			subtitle: doc.folderPath || undefined,
			registryId: doc.registryId,
			reportId: null,
			rowKey: null,
			memberOptions,
		}
	}

	if (doc.category === 'needs_review') {
		return {
			id: `review-medical-${doc.registryId}`,
			kind: 'not_medical',
			title: cleanFileTitle(doc.fileName),
			question: "This document doesn't appear to be medical.",
			subtitle: doc.folderPath || undefined,
			registryId: doc.registryId,
			reportId: null,
			rowKey: null,
		}
	}

	return null
}

export function mapSetupRowToOrganizingItem(
	row: SetupReportRowModel,
): ImportOrganizingItem {
	const lowerTitle = row.title.toLowerCase()

	const statusLine =
		lowerTitle.includes('ecg') || lowerTitle.includes('scan')
			? 'Still organizing…'
			: 'Analyzing…'

	return {
		id: row.key,
		title: row.title,
		statusLine,
	}
}

export function mapSetupRowToHelpItem(
	row: SetupReportRowModel,
): ImportHelpItem | null {
	if (row.status !== 'failed' && row.status !== 'needs_reprocess') {
		return null
	}

	return {
		id: `setup-help-${row.key}`,
		kind: 'unreadable_document',
		title: row.title,
		question: "We couldn't understand this document yet.",
		subtitle: row.subtitle || undefined,
		registryId: row.registryId,
		reportId: row.reportId,
		rowKey: row.key,
	}
}

export function buildImportCenterViewModel(input: {
	visits: HealthVisit[]
	setupRows: SetupReportRowModel[]
	reviewDocuments: ReviewDocument[]
	memberOptions: Array<{ id: string; label: string }>
}): ImportCenterViewModel {
	const recentlyImported = input.visits
		.filter((visit) => visit.status === 'ready' && isRecentDate(visit.date))
		.slice(0, 8)
		.map((visit) => ({
			id: visit.id,
			title: visit.title,
			displayMonthYear: visit.displayMonthYear,
			reportCount: visit.reportCount,
			summaryLine: 'Imported successfully',
			visitId: visit.id,
		}))

	const stillOrganizing = input.setupRows
		.filter((row) => row.status === 'processing')
		.map(mapSetupRowToOrganizingItem)

	const reviewHelp = input.reviewDocuments
		.map((doc) => mapReviewDocumentToHelpItem(doc, input.memberOptions))
		.filter((item): item is ImportHelpItem => item !== null)

	const setupHelp = input.setupRows
		.map(mapSetupRowToHelpItem)
		.filter((item): item is ImportHelpItem => item !== null)

	const needsHelp = [...reviewHelp, ...setupHelp]
	const needsAttentionCount = needsHelp.length
	const organizingCount = stillOrganizing.length

	return {
		recentlyImported,
		stillOrganizing,
		needsHelp,
		hasAnything:
			recentlyImported.length > 0 ||
			stillOrganizing.length > 0 ||
			needsHelp.length > 0,
		needsAttentionCount,
		organizingCount,
	}
}

export function buildImportAttentionSummary(input: {
	view: ImportCenterViewModel
}): ImportAttentionSummary {
	if (input.view.needsAttentionCount > 0) {
		const count = input.view.needsAttentionCount

		return {
			message: `${count} document${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} your attention.`,
			kind: 'needs_attention',
		}
	}

	const recentCount = input.view.recentlyImported.length

	if (recentCount > 0) {
		return {
			message: `${recentCount} new health visit${recentCount === 1 ? '' : 's'} added.`,
			kind: 'new_visits',
		}
	}

	return {
		message: null,
		kind: null,
	}
}
