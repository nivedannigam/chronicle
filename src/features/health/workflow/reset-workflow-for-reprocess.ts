import {
	canTransition,
	normalizeLegacyWorkflowState,
	type WorkflowState,
} from '@/core/workflow'
import {
	getWorkflowItemByReportId,
	transitionWorkflowItem,
} from '@/features/health/workflow/health-workflow.service'

export type ReprocessWorkflowTarget = 'OCR' | 'PARSING'

/**
 * Moves a workflow item to a reprocess entry state, resetting through FAILED when
 * the current state cannot transition directly (e.g. READY → OCR).
 */
export async function resetWorkflowForReprocess(input: {
	reportId: string
	userId: string
	targetState: ReprocessWorkflowTarget
}): Promise<void> {
	const item = await getWorkflowItemByReportId(input.reportId)

	if (!item) {
		return
	}

	const target = normalizeLegacyWorkflowState(input.targetState)
	let current = normalizeLegacyWorkflowState(item.currentState)

	if (current === target) {
		return
	}

	if (canTransition(current, target)) {
		await transitionWorkflowItem({
			reportId: input.reportId,
			toState: target,
			incrementRetry: true,
			context: {
				userId: input.userId,
				reportId: input.reportId,
				progress: {
					label:
						target === 'PARSING'
							? 'Preparing AI reprocess'
							: 'Preparing reprocess',
				},
				metadata: { reprocessTarget: target },
			},
		})

		return
	}

	if (current !== 'FAILED' && canTransition(current, 'FAILED')) {
		await transitionWorkflowItem({
			reportId: input.reportId,
			toState: 'FAILED',
			context: {
				userId: input.userId,
				reportId: input.reportId,
				failureReason: 'Reset for reprocess',
				failedStage: current,
				metadata: { reprocessReset: true, reprocessTarget: target },
			},
		})

		current = 'FAILED'
	}

	if (current === 'FAILED' && canTransition(current, target)) {
		await transitionWorkflowItem({
			reportId: input.reportId,
			toState: target,
			incrementRetry: true,
			context: {
				userId: input.userId,
				reportId: input.reportId,
				progress: {
					label:
						target === 'PARSING'
							? 'Starting AI reprocess'
							: 'Starting reprocess',
				},
				metadata: { reprocessFromFailed: true, reprocessTarget: target },
			},
		})
	}
}

const REPORT_REPROCESS_WORKFLOW_STATES = new Set<WorkflowState>([
	'OCR',
	'PARSING',
	'INDEXING',
	'READY',
	'PROCESSING',
	'OCR_COMPLETE',
	'PARSED',
])

const REPORT_REPROCESS_IMPORT_STATUSES = new Set([
	'imported',
	'ocr',
	'parsing',
	'knowledge_graph',
	'completed',
])

/** Prefer report reprocess over re-download when a health report already exists. */
export function shouldUseReportReprocess(input: {
	reportId: string | null | undefined
	workflowState?: WorkflowState | null
	importStatus?: string | null
	failedStage?: WorkflowState | null
}): boolean {
	if (!input.reportId) {
		return false
	}

	const workflowState = input.workflowState
		? normalizeLegacyWorkflowState(input.workflowState)
		: null

	if (workflowState && REPORT_REPROCESS_WORKFLOW_STATES.has(workflowState)) {
		return true
	}

	const importStatus = input.importStatus ?? ''

	if (REPORT_REPROCESS_IMPORT_STATUSES.has(importStatus)) {
		return true
	}

	if (workflowState === 'FAILED') {
		const failedStage = normalizeLegacyWorkflowState(
			input.failedStage ?? 'FAILED',
		)

		if (failedStage === 'DOWNLOADING' || failedStage === 'IMPORTING') {
			return false
		}

		return true
	}

	if (importStatus === 'failed') {
		return true
	}

	return false
}
