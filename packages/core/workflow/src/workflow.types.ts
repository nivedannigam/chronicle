/**
 * Chronicle Platform Workflow Engine
 *
 * Generic state machine for document/report lifecycles.
 * Health is the reference implementation; future modules reuse this core.
 */

export const WORKFLOW_STATES = [
	'DISCOVERED',
	'QUEUED',
	'DOWNLOADING',
	'IMPORTING',
	'OCR',
	'PARSING',
	'INDEXING',
	'PROCESSING',
	'OCR_COMPLETE',
	'PARSED',
	'PENDING_REVIEW',
	'APPROVED',
	'READY',
	'FAILED',
	'SKIPPED',
	'REJECTED',
] as const

export type WorkflowState = (typeof WORKFLOW_STATES)[number]

export const TERMINAL_WORKFLOW_STATES: ReadonlySet<WorkflowState> = new Set([
	'READY',
	'SKIPPED',
	'REJECTED',
])

export const REVIEW_WORKFLOW_STATES: ReadonlySet<WorkflowState> = new Set([
	'DISCOVERED',
	'PENDING_REVIEW',
	'APPROVED',
	'FAILED',
])

export const ACTIONABLE_REVIEW_STATES: ReadonlySet<WorkflowState> = new Set([
	'PENDING_REVIEW',
	'APPROVED',
	'FAILED',
])

export type WorkflowEventType =
	| 'workflow.created'
	| 'workflow.transitioned'
	| 'workflow.approved'
	| 'workflow.rejected'
	| 'workflow.import_started'
	| 'workflow.download_started'
	| 'workflow.processing_started'
	| 'workflow.ocr_complete'
	| 'workflow.parsed'
	| 'workflow.indexing'
	| 'workflow.ready'
	| 'workflow.failed'
	| 'workflow.retry'

export interface WorkflowProgress {
	label: string
	current?: number
	total?: number
	percent?: number
}

export interface WorkflowTransitionContext {
	userId: string
	registryId?: string | null
	reportId?: string | null
	familyMemberId?: string | null
	externalFileId?: string | null
	fileName?: string | null
	discoveryCategory?: string | null
	failureReason?: string | null
	failedStage?: WorkflowState | null
	errorDetail?: unknown
	progress?: WorkflowProgress | null
	worker?: string | null
	metadata?: Record<string, unknown>
}

export interface WorkflowItem {
	id: string
	userId: string
	registryId: string | null
	reportId: string | null
	familyMemberId: string | null
	externalFileId: string | null
	fileName: string | null
	currentState: WorkflowState
	previousState: WorkflowState | null
	failureReason: string | null
	failedStage: WorkflowState | null
	retryCount: number
	discoveryCategory: string | null
	approvalStatus: 'pending' | 'approved' | 'rejected'
	metadata: Record<string, unknown>
	progress: WorkflowProgress | null
	lastErrorDetail: Record<string, unknown> | null
	worker: string | null
	stageStartedAt: string | null
	stageFinishedAt: string | null
	createdAt: string
	updatedAt: string
	completedAt: string | null
}

export interface WorkflowEvent {
	id: string
	workflowItemId: string
	userId: string
	fromState: WorkflowState | null
	toState: WorkflowState
	eventType: WorkflowEventType
	payload: Record<string, unknown>
	createdAt: string
}

export type WorkflowEventHandler = (
	event: WorkflowEvent,
) => void | Promise<void>

/** Valid transitions — enforced by the engine */
export const WORKFLOW_TRANSITIONS: Record<
	WorkflowState,
	readonly WorkflowState[]
> = {
	DISCOVERED: ['PENDING_REVIEW', 'QUEUED', 'APPROVED', 'REJECTED', 'SKIPPED'],
	PENDING_REVIEW: ['APPROVED', 'REJECTED', 'FAILED'],
	APPROVED: ['QUEUED', 'DOWNLOADING', 'IMPORTING', 'FAILED'],
	QUEUED: ['DOWNLOADING', 'IMPORTING', 'OCR', 'FAILED'],
	DOWNLOADING: ['IMPORTING', 'FAILED'],
	IMPORTING: ['OCR', 'PROCESSING', 'FAILED'],
	OCR: ['PARSING', 'FAILED'],
	PARSING: ['INDEXING', 'READY', 'FAILED'],
	INDEXING: ['READY', 'FAILED'],
	PROCESSING: ['OCR', 'OCR_COMPLETE', 'PARSING', 'FAILED'],
	OCR_COMPLETE: ['PARSING', 'PARSED', 'FAILED'],
	PARSED: ['INDEXING', 'READY', 'FAILED'],
	READY: ['FAILED'],
	FAILED: [
		'QUEUED',
		'DOWNLOADING',
		'IMPORTING',
		'OCR',
		'PROCESSING',
		'PARSING',
		'INDEXING',
		'APPROVED',
	],
	SKIPPED: [],
	REJECTED: [],
}

export function canTransition(from: WorkflowState, to: WorkflowState): boolean {
	if (from === to) {
		return true
	}

	return WORKFLOW_TRANSITIONS[from]?.includes(to) ?? false
}

export function isTerminalState(state: WorkflowState): boolean {
	return TERMINAL_WORKFLOW_STATES.has(state)
}

export function isActionableForReview(state: WorkflowState): boolean {
	return ACTIONABLE_REVIEW_STATES.has(state)
}

export function mapDiscoveryCategoryToInitialState(
	category: string | null | undefined,
): WorkflowState {
	if (category === 'needs_review') {
		return 'PENDING_REVIEW'
	}

	if (category === 'likely_medical') {
		return 'DISCOVERED'
	}

	return 'DISCOVERED'
}

export function mapReportStatusToWorkflowState(
	status: string | null | undefined,
): WorkflowState | null {
	switch (status) {
		case 'uploaded':
		case 'queued':
			return 'QUEUED'
		case 'processing':
			return 'OCR'
		case 'parsed':
			return 'PARSING'
		case 'completed':
			return 'READY'
		case 'failed':
			return 'FAILED'
		default:
			return null
	}
}

export function normalizeLegacyWorkflowState(
	state: WorkflowState,
): WorkflowState {
	switch (state) {
		case 'PROCESSING':
		case 'OCR_COMPLETE':
			return 'OCR'
		case 'PARSED':
			return 'PARSING'
		default:
			return state
	}
}

export const IN_FLIGHT_WORKFLOW_STATES: ReadonlySet<WorkflowState> = new Set([
	'QUEUED',
	'DOWNLOADING',
	'IMPORTING',
	'OCR',
	'PARSING',
	'INDEXING',
	'PROCESSING',
	'OCR_COMPLETE',
	'PARSED',
])
