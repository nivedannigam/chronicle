import {
	ACTIONABLE_REVIEW_STATES,
	IN_FLIGHT_WORKFLOW_STATES,
	isActionableForReview,
	isTerminalState,
	normalizeLegacyWorkflowState,
	type WorkflowItem,
	type WorkflowState,
} from '@/core/workflow'
import { listWorkflowItemsForUser } from '@/features/health/workflow/health-workflow.service'

/** Single read model for all Health UI surfaces */
export interface HealthWorkflowProjection {
	items: WorkflowItem[]
	pendingReviewCount: number
	approvedPendingImportCount: number
	importingCount: number
	processingCount: number
	failedCount: number
	rejectedCount: number
	readyCount: number
	inFlightCount: number
	actionableReviewItems: WorkflowItem[]
	memberItems: (memberId: string | null) => WorkflowItem[]
}

const IMPORTING_STATES: ReadonlySet<WorkflowState> = new Set([
	'QUEUED',
	'DOWNLOADING',
	'IMPORTING',
])

const PROCESSING_STATES: ReadonlySet<WorkflowState> = new Set([
	'OCR',
	'PARSING',
	'INDEXING',
	'PROCESSING',
	'OCR_COMPLETE',
	'PARSED',
])

export async function getHealthWorkflowProjection(
	userId: string,
): Promise<HealthWorkflowProjection> {
	const items = await listWorkflowItemsForUser(userId)

	const pendingReviewCount = items.filter(
		(item) => item.currentState === 'PENDING_REVIEW',
	).length

	const approvedPendingImportCount = items.filter(
		(item) => item.currentState === 'APPROVED',
	).length

	const importingCount = items.filter((item) =>
		IMPORTING_STATES.has(item.currentState),
	).length

	const processingCount = items.filter((item) =>
		PROCESSING_STATES.has(item.currentState),
	).length

	const failedCount = items.filter(
		(item) => item.currentState === 'FAILED',
	).length

	const rejectedCount = items.filter(
		(item) => item.currentState === 'REJECTED',
	).length

	const readyCount = items.filter(
		(item) => item.currentState === 'READY',
	).length

	const inFlightCount = items.filter((item) =>
		IN_FLIGHT_WORKFLOW_STATES.has(item.currentState),
	).length

	const actionableReviewItems = items.filter((item) =>
		isActionableForReview(item.currentState),
	)

	const memberItems = (memberId: string | null) =>
		items.filter((item) => (memberId ? item.familyMemberId === memberId : true))

	return {
		items,
		pendingReviewCount,
		approvedPendingImportCount,
		importingCount,
		processingCount,
		failedCount,
		rejectedCount,
		readyCount,
		inFlightCount,
		actionableReviewItems,
		memberItems,
	}
}

export function workflowStateLabel(state: WorkflowState): string {
	const normalized = normalizeLegacyWorkflowState(state)

	switch (normalized) {
		case 'DISCOVERED':
			return 'Discovered'
		case 'PENDING_REVIEW':
			return 'Waiting for approval'
		case 'APPROVED':
			return 'Approved'
		case 'QUEUED':
			return 'Queued'
		case 'DOWNLOADING':
			return 'Downloading'
		case 'IMPORTING':
			return 'Importing'
		case 'OCR':
			return 'Running OCR'
		case 'PARSING':
			return 'Parsing'
		case 'INDEXING':
			return 'Generating metrics'
		case 'READY':
			return 'Ready'
		case 'FAILED':
			return 'Failed'
		case 'SKIPPED':
			return 'Skipped'
		case 'REJECTED':
			return 'Rejected'
		default:
			return state
	}
}

export function workflowProgressLabel(item: WorkflowItem): string {
	if (item.progress?.label) {
		const { current, total } = item.progress

		if (current != null && total != null && total > 0) {
			return `${item.progress.label} (${current}/${total})`
		}

		return item.progress.label
	}

	return workflowStateLabel(item.currentState)
}

export function isWorkflowProcessing(state: WorkflowState): boolean {
	return IN_FLIGHT_WORKFLOW_STATES.has(normalizeLegacyWorkflowState(state))
}

export function isWorkflowReadyForDashboard(state: WorkflowState): boolean {
	return normalizeLegacyWorkflowState(state) === 'READY'
}

export { ACTIONABLE_REVIEW_STATES, isTerminalState, isActionableForReview }
