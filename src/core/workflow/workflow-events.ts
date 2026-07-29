import type {
	WorkflowEvent,
	WorkflowEventHandler,
	WorkflowEventType,
} from '@/core/workflow/workflow.types'

const handlers = new Map<WorkflowEventType | '*', Set<WorkflowEventHandler>>()

export function subscribeWorkflowEvent(
	eventType: WorkflowEventType | '*',
	handler: WorkflowEventHandler,
): () => void {
	const key = eventType
	if (!handlers.has(key)) {
		handlers.set(key, new Set())
	}

	handlers.get(key)!.add(handler)

	return () => {
		handlers.get(key)?.delete(handler)
	}
}

export async function publishWorkflowEvent(
	event: WorkflowEvent,
): Promise<void> {
	const specific = handlers.get(event.eventType) ?? new Set()
	const global = handlers.get('*') ?? new Set()

	await Promise.allSettled(
		[...specific, ...global].map((handler) => handler(event)),
	)
}

export function clearWorkflowEventHandlers(): void {
	handlers.clear()
}
