import {
	canTransition,
	type WorkflowState,
	type WorkflowTransitionContext,
} from '@/core/workflow'
import {
	getWorkflowItemByRegistryId,
	transitionWorkflowItem,
} from '@/features/health/workflow/health-workflow.service'

const PATH_TO_DOWNLOADING: Partial<Record<WorkflowState, WorkflowState[]>> = {
	DISCOVERED: ['APPROVED', 'QUEUED', 'DOWNLOADING'],
	PENDING_REVIEW: ['APPROVED', 'QUEUED', 'DOWNLOADING'],
	APPROVED: ['QUEUED', 'DOWNLOADING'],
	QUEUED: ['DOWNLOADING'],
	FAILED: ['QUEUED', 'DOWNLOADING'],
}

async function transitionIfValid(input: {
	registryId: string
	toState: WorkflowState
	context: Partial<WorkflowTransitionContext> & { userId: string }
	approvalStatus?: 'pending' | 'approved' | 'rejected'
}): Promise<void> {
	const item = await getWorkflowItemByRegistryId(input.registryId)

	if (!item || item.currentState === input.toState) {
		return
	}

	if (!canTransition(item.currentState, input.toState)) {
		return
	}

	await transitionWorkflowItem({
		registryId: input.registryId,
		toState: input.toState,
		approvalStatus: input.approvalStatus,
		context: input.context,
	})
}

/**
 * Walks valid workflow transitions so import can reach DOWNLOADING from DISCOVERED/APPROVED/FAILED.
 */
export async function advanceImportWorkflowToDownload(input: {
	registryId: string
	userId: string
	familyMemberId?: string | null
	worker?: string
}): Promise<void> {
	const item = await getWorkflowItemByRegistryId(input.registryId)

	if (!item) {
		return
	}

	if (item.currentState === 'DOWNLOADING') {
		return
	}

	const path = PATH_TO_DOWNLOADING[item.currentState]

	if (!path) {
		if (canTransition(item.currentState, 'DOWNLOADING')) {
			await transitionWorkflowItem({
				registryId: input.registryId,
				toState: 'DOWNLOADING',
				context: {
					userId: input.userId,
					familyMemberId: input.familyMemberId ?? null,
					worker: input.worker ?? 'drive-connector',
					progress: { label: 'Downloading' },
				},
			})
		}

		return
	}

	for (const step of path) {
		await transitionIfValid({
			registryId: input.registryId,
			toState: step,
			approvalStatus: step === 'APPROVED' ? 'approved' : undefined,
			context: {
				userId: input.userId,
				familyMemberId: input.familyMemberId ?? null,
				worker: input.worker ?? 'drive-connector',
				progress:
					step === 'DOWNLOADING'
						? { label: 'Downloading' }
						: step === 'QUEUED'
							? { label: 'Queued' }
							: undefined,
			},
		})
	}
}

export async function advanceImportWorkflowToQueued(input: {
	registryId: string
	userId: string
}): Promise<void> {
	const item = await getWorkflowItemByRegistryId(input.registryId)

	if (!item) {
		return
	}

	if (item.currentState === 'QUEUED') {
		return
	}

	if (
		item.currentState === 'DISCOVERED' ||
		item.currentState === 'PENDING_REVIEW'
	) {
		await transitionIfValid({
			registryId: input.registryId,
			toState: 'APPROVED',
			approvalStatus: 'approved',
			context: { userId: input.userId },
		})
	}

	await transitionIfValid({
		registryId: input.registryId,
		toState: 'QUEUED',
		context: { userId: input.userId, progress: { label: 'Queued' } },
	})
}

export async function advanceImportWorkflowToApproved(input: {
	registryId: string
	userId: string
}): Promise<void> {
	const item = await getWorkflowItemByRegistryId(input.registryId)

	if (!item || item.currentState === 'APPROVED') {
		return
	}

	if (
		item.currentState === 'DISCOVERED' ||
		item.currentState === 'PENDING_REVIEW'
	) {
		await transitionIfValid({
			registryId: input.registryId,
			toState: 'APPROVED',
			approvalStatus: 'approved',
			context: { userId: input.userId },
		})
	}
}
