import { createEventBus } from '@chronicle/core-events'
import type {
	WorkflowEvent,
	WorkflowEventHandler,
	WorkflowEventType,
} from './workflow.types.ts'

const workflowEventBus = createEventBus<WorkflowEventType, WorkflowEvent>(
	(event) => event.eventType,
)

export function subscribeWorkflowEvent(
	eventType: WorkflowEventType | '*',
	handler: WorkflowEventHandler,
): () => void {
	return workflowEventBus.subscribe(eventType, handler)
}

export async function publishWorkflowEvent(
	event: WorkflowEvent,
): Promise<void> {
	return workflowEventBus.publish(event)
}

export function clearWorkflowEventHandlers(): void {
	workflowEventBus.clear()
}

export { workflowEventBus }
