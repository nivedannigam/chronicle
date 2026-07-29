import {
	ACTIONABLE_REVIEW_STATES,
	isActionableForReview,
	isTerminalState,
	type WorkflowItem,
	type WorkflowState,
} from '@/core/workflow'
import { listWorkflowItemsForUser } from '@/features/health/workflow/health-workflow.service'

/** Single read model for all Health UI surfaces */
export interface HealthWorkflowProjection {
	items: WorkflowItem[]
	pendingReviewCount: number
	approvedPendingImportCount: number
	failedCount: number
	readyCount: number
	actionableReviewItems: WorkflowItem[]
	memberItems: (memberId: string | null) => WorkflowItem[]
}

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

	const failedCount = items.filter(
		(item) => item.currentState === 'FAILED',
	).length

	const readyCount = items.filter(
		(item) => item.currentState === 'READY',
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
		failedCount,
		readyCount,
		actionableReviewItems,
		memberItems,
	}
}

export function workflowStateLabel(state: WorkflowState): string {
	switch (state) {
		case 'DISCOVERED':
			return 'Discovered'
		case 'PENDING_REVIEW':
			return 'Waiting for review'
		case 'APPROVED':
			return 'Approved'
		case 'QUEUED':
			return 'Queued'
		case 'IMPORTING':
			return 'Importing'
		case 'PROCESSING':
			return 'Processing'
		case 'OCR_COMPLETE':
			return 'OCR complete'
		case 'PARSED':
			return 'Parsed'
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

export function isWorkflowProcessing(state: WorkflowState): boolean {
	return (
		state === 'QUEUED' ||
		state === 'IMPORTING' ||
		state === 'PROCESSING' ||
		state === 'OCR_COMPLETE' ||
		state === 'PARSED'
	)
}

export function isWorkflowReadyForDashboard(state: WorkflowState): boolean {
	return state === 'READY'
}

export { ACTIONABLE_REVIEW_STATES, isTerminalState, isActionableForReview }
