import { createEventBus } from './event-bus.ts'
import type { ImportEvent, ImportEventType } from './platform-event.types.ts'

const importEventBus = createEventBus<ImportEventType, ImportEvent>(
	(event) => event.type,
)

export const subscribeImportEvent = importEventBus.subscribe
export const publishImportEvent = importEventBus.publish
export const clearImportEventHandlers = importEventBus.clear
