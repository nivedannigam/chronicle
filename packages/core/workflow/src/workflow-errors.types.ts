import type { WorkflowState } from './workflow.types'

const HEALTH_REPORT_SUPPORTED_FORMATS_LABEL = 'PDF, JPG, PNG, HEIC, TIFF'

function formatStorageMimeRejectionError(storageMessage: string): string {
	const lower = storageMessage.toLowerCase()

	if (
		lower.includes('mime type') &&
		(lower.includes('not supported') || lower.includes('invalid'))
	) {
		return `Unsupported file type. Supported: ${HEALTH_REPORT_SUPPORTED_FORMATS_LABEL}.`
	}

	return storageMessage
}

export type WorkflowErrorType =
	| 'edge_function'
	| 'ocr_failure'
	| 'parse_failure'
	| 'index_failure'
	| 'download_failure'
	| 'storage_failure'
	| 'database_failure'
	| 'validation'
	| 'unknown'

export interface WorkflowErrorDetail {
	stage: WorkflowState
	errorType: WorkflowErrorType
	message: string
	userMessage: string
	httpStatus?: number
	edgeFunction?: string
	stack?: string
	recoveryRecommendation: string
	requestPayload?: Record<string, unknown>
	responsePayload?: unknown
	recordedAt: string
}

export function buildWorkflowErrorDetail(input: {
	stage: WorkflowState
	error: unknown
	edgeFunction?: string
	httpStatus?: number
	requestPayload?: Record<string, unknown>
	responsePayload?: unknown
}): WorkflowErrorDetail {
	const message =
		input.error instanceof Error ? input.error.message : String(input.error)
	const stack = input.error instanceof Error ? input.error.stack : undefined

	const errorType = resolveErrorType(input.stage, message, input.edgeFunction)
	const userMessage = friendlyMessage(errorType, message)
	const recoveryRecommendation = recoveryHint(errorType, input.stage)

	return {
		stage: input.stage,
		errorType,
		message,
		userMessage,
		httpStatus: input.httpStatus,
		edgeFunction: input.edgeFunction,
		stack,
		recoveryRecommendation,
		requestPayload: input.requestPayload,
		responsePayload: input.responsePayload,
		recordedAt: new Date().toISOString(),
	}
}

function resolveErrorType(
	stage: WorkflowState,
	message: string,
	edgeFunction?: string,
): WorkflowErrorType {
	const lower = message.toLowerCase()

	if (
		stage === 'OCR' ||
		stage === 'PROCESSING' ||
		lower.includes('ocr') ||
		lower.includes('document ai') ||
		lower.includes('page_limit_exceeded')
	) {
		return 'ocr_failure'
	}

	if (
		stage === 'DOWNLOADING' ||
		lower.includes('google drive download') ||
		lower.includes('could not download') ||
		lower.includes('drive download failed')
	) {
		return 'download_failure'
	}

	if (
		lower.includes('storage upload') ||
		lower.includes('health-reports') ||
		lower.includes('storage upload failed')
	) {
		return 'storage_failure'
	}

	if (
		lower.includes('could not create health report') ||
		lower.includes('database schema') ||
		lower.includes('health_reports') ||
		lower.includes('insert failed') ||
		lower.includes('violates')
	) {
		return 'database_failure'
	}

	if (stage === 'PARSING' || lower.includes('pars')) {
		return 'parse_failure'
	}

	if (stage === 'INDEXING' || lower.includes('index')) {
		return 'index_failure'
	}

	if (edgeFunction && lower.includes('temporarily unavailable')) {
		return 'edge_function'
	}

	if (
		edgeFunction &&
		(lower.includes('network') ||
			lower.includes('fetch failed') ||
			lower.includes('functions/v1'))
	) {
		return 'edge_function'
	}

	return 'unknown'
}

function friendlyMessage(errorType: WorkflowErrorType, detail: string): string {
	switch (errorType) {
		case 'edge_function':
			return detail.length > 0 &&
				!detail.includes('Import service temporarily unavailable')
				? detail.length > 160
					? `${detail.slice(0, 157)}…`
					: detail
				: 'Import service temporarily unavailable. Retry shortly.'
		case 'download_failure':
			return detail.startsWith('Google Drive download failed')
				? detail
				: 'Google Drive download failed. Reconnect Drive and retry.'
		case 'storage_failure':
			if (
				detail.toLowerCase().includes('mime type') &&
				detail.toLowerCase().includes('not supported')
			) {
				return formatStorageMimeRejectionError(detail)
			}

			return detail.startsWith('Storage upload') ||
				detail.startsWith('Unsupported file type')
				? detail
				: 'Storage upload failed. Verify Supabase storage bucket health-reports.'
		case 'database_failure':
			return detail.startsWith('Could not create health report') ||
				detail.includes('health_reports')
				? detail
				: 'Database insert failed while creating the health report.'
		case 'ocr_failure':
			if (
				detail.includes('PAGE_LIMIT_EXCEEDED') ||
				detail.includes('pages exceed the limit') ||
				detail.includes('multiple OCR batches')
			) {
				return detail.length > 120 ? `${detail.slice(0, 117)}…` : detail
			}

			return detail.length > 0 &&
				!detail.startsWith('Could not read text from this report')
				? detail.length > 160
					? `${detail.slice(0, 157)}…`
					: detail
				: 'OCR failed. Could not read text from this report.'
		case 'parse_failure':
			return 'Parser failed. Could not extract health data from this report.'
		case 'index_failure':
			return 'Metrics generation failed. Report processed but dashboard update failed.'
		default:
			return detail.length > 120 ? `${detail.slice(0, 117)}…` : detail
	}
}

function recoveryHint(
	errorType: WorkflowErrorType,
	stage: WorkflowState,
): string {
	switch (errorType) {
		case 'edge_function':
			return 'Check Supabase edge function logs and redeploy if secrets changed.'
		case 'download_failure':
			return 'Verify Google Drive connection and file permissions, then retry download.'
		case 'storage_failure':
			return 'Verify health-reports bucket exists and drive-connector has service-role access.'
		case 'database_failure':
			return 'Apply pending Supabase migrations for health_reports and retry.'
		case 'ocr_failure':
			return 'Retry OCR; verify document-ocr secrets or use chunked OCR for large PDFs.'
		case 'parse_failure':
			return 'Retry parsing; inspect OCR output quality in Import Debug.'
		case 'index_failure':
			return 'Retry indexing; verify health_knowledge_graphs table and RLS policies.'
		default:
			return `Retry from stage ${stage}.`
	}
}
