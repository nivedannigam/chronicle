import type { WorkflowState } from '@/core/workflow'

export interface WorkflowTraceContext {
	workflowId: string
	reportId?: string | null
	fromState: WorkflowState
	toState: WorkflowState
	durationMs?: number
	error?: string | null
	retryCount?: number
	edgeFunction?: string | null
	correlationId?: string | null
	metadata?: Record<string, unknown>
}

export function logWorkflowTransition(context: WorkflowTraceContext): void {
	const payload = {
		service: 'health-workflow',
		event: 'workflow_transition',
		timestamp: new Date().toISOString(),
		workflowId: context.workflowId,
		reportId: context.reportId ?? null,
		fromState: context.fromState,
		toState: context.toState,
		durationMs: context.durationMs ?? null,
		error: context.error ?? null,
		retryCount: context.retryCount ?? 0,
		edgeFunction: context.edgeFunction ?? null,
		correlationId: context.correlationId ?? null,
		...(context.metadata ?? {}),
	}

	if (import.meta.env.DEV) {
		console.info('[workflow]', payload)
		return
	}

	console.info(JSON.stringify(payload))
}
