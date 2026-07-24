import { supabase } from '@/lib/supabase'
import type {
	ApprovalStatus,
	DiscoveryCategory,
	ImportPipelineSummary,
	ReviewDocument,
	ReviewQueueFilter,
} from '@/features/medical-discovery/types/medical-discovery.types'

function mapReviewDocument(row: Record<string, unknown>): ReviewDocument {
	const member = row.family_members as { display_name?: string } | null

	return {
		registryId: row.id as string,
		fileId: row.external_file_id as string,
		fileName: row.file_name as string,
		mimeType: row.mime_type as string,
		modifiedTime: (row.external_modified_at as string) ?? '',
		folderPath: (row.folder_path as string) ?? '',
		confidence: Number(row.discovery_confidence ?? 0),
		reason: (row.discovery_reason as string) ?? '',
		category: (row.discovery_category as DiscoveryCategory) ?? 'needs_review',
		approvalStatus: (row.approval_status as ApprovalStatus) ?? 'pending',
		importStatus: (row.import_status as string) ?? 'discovered',
		errorMessage: (row.error_message as string | null) ?? null,
		familyMemberId: (row.family_member_id as string | null) ?? null,
		familyMemberName: member?.display_name ?? null,
		detectedPatient: (row.detected_patient as string | null) ?? null,
		detectedReportDate: (row.detected_report_date as string | null) ?? null,
		detectedReportType: (row.detected_report_type as string | null) ?? null,
	}
}

const COMPLETED_IMPORT_STATUSES = new Set(['completed', 'skipped'])

function isActionableReviewDocument(row: Record<string, unknown>): boolean {
	const approvalStatus = row.approval_status as ApprovalStatus
	const importStatus = row.import_status as string

	if (importStatus === 'failed') {
		return true
	}

	if (approvalStatus === 'pending') {
		return true
	}

	if (
		approvalStatus === 'approved' &&
		!COMPLETED_IMPORT_STATUSES.has(importStatus)
	) {
		return true
	}

	return false
}

export async function listReviewDocuments(
	userId: string,
	filter: ReviewQueueFilter = 'actionable',
): Promise<ReviewDocument[]> {
	let query = supabase
		.from('connector_document_registry')
		.select('*, family_members(display_name)')
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')
		.neq('discovery_category', 'ignored')
		.neq('approval_status', 'rejected')
		.order('discovery_confidence', { ascending: false })

	if (filter === 'pending') {
		query = query.eq('approval_status', 'pending')
	}

	const { data, error } = await query

	if (error) {
		throw new Error(error.message)
	}

	const rows = data ?? []

	const filtered =
		filter === 'actionable'
			? rows.filter((row) =>
					isActionableReviewDocument(row as Record<string, unknown>),
				)
			: rows

	return filtered.map((row) =>
		mapReviewDocument(row as Record<string, unknown>),
	)
}

export async function updateDocumentApproval(
	registryId: string,
	approvalStatus: ApprovalStatus,
	updates?: {
		familyMemberId?: string | null
		detectedPatient?: string | null
	},
) {
	const payload: Record<string, unknown> = {
		approval_status: approvalStatus,
		updated_at: new Date().toISOString(),
	}

	if (updates?.familyMemberId !== undefined) {
		payload.family_member_id = updates.familyMemberId
	}

	if (updates?.detectedPatient !== undefined) {
		payload.detected_patient = updates.detectedPatient
	}

	const { error } = await supabase
		.from('connector_document_registry')
		.update(payload)
		.eq('id', registryId)

	if (error) {
		throw new Error(error.message)
	}
}

export async function approveDocument(registryId: string) {
	await updateDocumentApproval(registryId, 'approved')
}

export async function rejectDocument(registryId: string) {
	await updateDocumentApproval(registryId, 'rejected')
}

export async function reassignDocument(
	registryId: string,
	familyMemberId: string,
) {
	await updateDocumentApproval(registryId, 'pending', { familyMemberId })
}

export async function approveAllLikelyMedical(userId: string): Promise<number> {
	const { data, error } = await supabase
		.from('connector_document_registry')
		.update({
			approval_status: 'approved',
			updated_at: new Date().toISOString(),
		})
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')
		.eq('discovery_category', 'likely_medical')
		.eq('approval_status', 'pending')
		.select('id')

	if (error) {
		throw new Error(error.message)
	}

	return data?.length ?? 0
}

export async function approveAllImportCandidates(
	userId: string,
): Promise<number> {
	const { data, error } = await supabase
		.from('connector_document_registry')
		.update({
			approval_status: 'approved',
			updated_at: new Date().toISOString(),
		})
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')
		.in('discovery_category', ['likely_medical', 'needs_review'])
		.eq('approval_status', 'pending')
		.select('id')

	if (error) {
		throw new Error(error.message)
	}

	return data?.length ?? 0
}

export async function getImportPipelineSummary(
	userId: string,
): Promise<ImportPipelineSummary> {
	const { data, error } = await supabase
		.from('connector_document_registry')
		.select('import_status, approval_status')
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')

	if (error) {
		throw new Error(error.message)
	}

	const rows = data ?? []

	const failedRows = rows.filter((r) => r.import_status === 'failed')

	return {
		imported: rows.filter((r) => r.import_status === 'completed').length,
		skipped: rows.filter((r) => r.import_status === 'skipped').length,
		duplicates: rows.filter((r) => r.import_status === 'skipped').length,
		errors: failedRows.length,
		lastError: null,
		errorSamples: [],
	}
}

export async function listApprovedForImport(userId: string) {
	const { data, error } = await supabase
		.from('connector_document_registry')
		.select('*')
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')
		.eq('approval_status', 'approved')
		.in('import_status', ['discovered', 'queued', 'retry', 'failed'])

	if (error) {
		throw new Error(error.message)
	}

	return data ?? []
}
