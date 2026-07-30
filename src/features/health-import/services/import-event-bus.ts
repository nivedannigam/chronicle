import { createEventBus } from '@chronicle/core-events'
import type { ImportEvent, ImportEventType } from '@chronicle/core-events'

export const importEventBus = createEventBus<ImportEventType, ImportEvent>(
	(event) => event.type,
)

export async function emitImportEvent(
	input: Omit<ImportEvent, 'id' | 'timestamp'> & { id?: string },
): Promise<void> {
	await importEventBus.publish({
		id: input.id ?? crypto.randomUUID(),
		type: input.type,
		userId: input.userId,
		message: input.message,
		payload: input.payload,
		timestamp: new Date().toISOString(),
	})
}
