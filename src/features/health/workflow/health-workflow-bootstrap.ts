import { subscribeWorkflowEvent, type WorkflowEvent } from '@/core/workflow'
import { handleHealthWorkflowSideEffects } from '@/features/health/workflow/health-workflow.service'

let bootstrapped = false

export function bootstrapHealthWorkflowEngine(): void {
	if (bootstrapped) {
		return
	}

	subscribeWorkflowEvent('*', async (event: WorkflowEvent) => {
		await handleHealthWorkflowSideEffects(event)
	})

	bootstrapped = true
}
