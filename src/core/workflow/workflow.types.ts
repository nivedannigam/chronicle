/**
 * Chronicle Platform Workflow Engine
 *
 * Generic state machine for document/report lifecycles.
 * Health is the reference implementation; future modules reuse this core.
 */

export const WORKFLOW_STATES = [
	'DISCOVERED',
	'QUEUED',
	'PROCESSING',
	'OCR_COMPLETE',
	'PARSED',
	'PENDING_REVIEW',
	'APPROVED',
	'IMPORTING',
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
	| 'workflow.processing_started'
	| 'workflow.ocr_complete'
	| 'workflow.parsed'
	| 'workflow.ready'
	| 'workflow.failed'
	| 'workflow.retry'

export interface WorkflowTransitionContext {
	userId: string
	registryId?: string | null
	reportId?: string | null
	familyMemberId?: string | null
	externalFileId?: string | null
	fileName?: string | null
	discoveryCategory?: string | null
	failureReason?: string | null
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
	retryCount: number
	discoveryCategory: string | null
	approvalStatus: 'pending' | 'approved' | 'rejected'
	metadata: Record<string, unknown>
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
	APPROVED: ['QUEUED', 'IMPORTING', 'FAILED'],
	QUEUED: ['IMPORTING', 'PROCESSING', 'FAILED'],
	IMPORTING: ['PROCESSING', 'FAILED'],
	PROCESSING: ['OCR_COMPLETE', 'PARSED', 'FAILED'],
	OCR_COMPLETE: ['PARSED', 'PROCESSING', 'FAILED'],
	PARSED: ['READY', 'FAILED'],
	READY: [],
	FAILED: ['QUEUED', 'PROCESSING', 'APPROVED'],
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
			return 'PROCESSING'
		case 'parsed':
			return 'PARSED'
		case 'completed':
			return 'READY'
		case 'failed':
			return 'FAILED'
		default:
			return null
	}
}
