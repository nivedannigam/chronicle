import type { WorkflowState } from '@/core/workflow'
import { canTransition } from '@/core/workflow'
import { getWorkflowItemByReportId } from '@/features/health/workflow/health-workflow.service'
import { safeTransitionWorkflowItem } from '@/features/health/workflow/safe-workflow-transition'

const SKIP_PARSING_FROM = new Set<WorkflowState>([
	'PARSING',
	'INDEXING',
	'READY',
	'PARSED',
])

/** Avoid backward workflow transitions during overlapping OCR progress callbacks. */
export async function safeTransitionToParsing(input: {
	reportId: string
	userId: string
	progress?: { label: string; percent?: number }
}): Promise<void> {
	const item = await getWorkflowItemByReportId(input.reportId)

	if (!item) {
		return
	}

	const currentState = item.currentState

	if (SKIP_PARSING_FROM.has(currentState)) {
		return
	}

	if (!canTransition(currentState, 'PARSING')) {
		return
	}

	await safeTransitionWorkflowItem({
		reportId: input.reportId,
		toState: 'PARSING',
		context: {
			userId: input.userId,
			reportId: input.reportId,
			progress: input.progress ?? { label: 'Parsing' },
		},
	})
}
