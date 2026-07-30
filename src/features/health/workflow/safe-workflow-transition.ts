import { transitionWorkflowItem } from '@/features/health/workflow/health-workflow.service'
import type { WorkflowState, WorkflowTransitionContext } from '@/core/workflow'

export async function safeTransitionWorkflowItem(input: {
	registryId?: string
	reportId?: string
	toState: WorkflowState
	context?: Partial<WorkflowTransitionContext> & { userId: string }
	approvalStatus?: 'pending' | 'approved' | 'rejected'
	incrementRetry?: boolean
}): Promise<void> {
	try {
		await transitionWorkflowItem(input)
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Workflow transition failed'

		console.warn(
			JSON.stringify({
				service: 'health-workflow',
				event: 'workflow_transition_failed',
				targetState: input.toState,
				registryId: input.registryId ?? null,
				reportId: input.reportId ?? null,
				error: message,
			}),
		)
	}
}
