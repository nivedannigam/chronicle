import type { WorkflowState } from './workflow.types'

export type WorkflowErrorType =
	| 'edge_function'
	| 'ocr_failure'
	| 'parse_failure'
	| 'index_failure'
	| 'download_failure'
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
	if (edgeFunction) {
		return 'edge_function'
	}

	if (stage === 'DOWNLOADING' || message.toLowerCase().includes('download')) {
		return 'download_failure'
	}

	if (
		stage === 'OCR' ||
		stage === 'PROCESSING' ||
		message.toLowerCase().includes('ocr')
	) {
		return 'ocr_failure'
	}

	if (stage === 'PARSING' || message.toLowerCase().includes('pars')) {
		return 'parse_failure'
	}

	if (stage === 'INDEXING' || message.toLowerCase().includes('index')) {
		return 'index_failure'
	}

	return 'unknown'
}

function friendlyMessage(errorType: WorkflowErrorType, detail: string): string {
	switch (errorType) {
		case 'edge_function':
			return 'Import service temporarily unavailable. Retry shortly.'
		case 'download_failure':
			return 'Could not download this file from Google Drive. Reconnect Drive and retry.'
		case 'ocr_failure':
			return 'Could not read text from this report. Retry or upload manually.'
		case 'parse_failure':
			return 'Could not extract health data from this report.'
		case 'index_failure':
			return 'Report processed but dashboard update failed. Retry indexing.'
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
		case 'ocr_failure':
			return 'Retry OCR only; verify document-ocr secrets or use mock OCR in dev.'
		case 'parse_failure':
			return 'Retry parsing; inspect OCR output quality in Import Debug.'
		case 'index_failure':
			return 'Retry indexing; verify health_knowledge_graphs table and RLS policies.'
		default:
			return `Retry from stage ${stage}.`
	}
}
