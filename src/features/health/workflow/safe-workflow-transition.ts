import { transitionWorkflowItem } from '@/features/health/workflow/health-workflow.service'
import { updateRegistryRecord } from '@/features/connectors/services/connector-store.service'
import { supabase } from '@/lib/supabase'
import type { WorkflowState, WorkflowTransitionContext } from '@/core/workflow'

async function persistTransitionFailure(input: {
	registryId?: string
	reportId?: string
	userId: string
	message: string
}): Promise<void> {
	const tasks: Promise<unknown>[] = []

	if (input.registryId) {
		tasks.push(
			updateRegistryRecord(input.registryId, {
				importStatus: 'failed',
				registryStatus: 'failed',
				errorMessage: input.message.slice(0, 500),
			}),
		)
	}

	if (input.reportId) {
		tasks.push(
			Promise.resolve(
				supabase
					.from('health_reports')
					.update({
						status: 'failed',
						processing_error: input.message.slice(0, 500),
					})
					.eq('id', input.reportId)
					.eq('user_id', input.userId),
			).then(({ error }) => {
				if (error) {
					console.warn(
						JSON.stringify({
							service: 'health-workflow',
							event: 'workflow_failure_persist_report_failed',
							reportId: input.reportId,
							error: error.message,
						}),
					)
				}
			}),
		)
	}

	await Promise.allSettled(tasks)
}

export async function safeTransitionWorkflowItem(input: {
	registryId?: string
	reportId?: string
	toState: WorkflowState
	context?: Partial<WorkflowTransitionContext> & { userId: string }
	approvalStatus?: 'pending' | 'approved' | 'rejected'
	incrementRetry?: boolean
}): Promise<boolean> {
	try {
		await transitionWorkflowItem(input)
		return true
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Workflow transition failed'

		console.warn(
			JSON.stringify({
				service: 'health-workflow',
				event: 'workflow_transition_failed',
				targetState: input.toState,
				registryId: input.registryId ?? null,
				reportId: input.reportId ?? input.context?.reportId ?? null,
				error: message,
			}),
		)

		const failureMessage =
			input.context?.failureReason ??
			`Workflow transition to ${input.toState} failed: ${message}`

		if (input.context?.userId) {
			const reportId = input.reportId ?? input.context.reportId ?? undefined

			await persistTransitionFailure({
				registryId: input.registryId,
				reportId,
				userId: input.context.userId,
				message: failureMessage,
			})
		}

		return false
	}
}
