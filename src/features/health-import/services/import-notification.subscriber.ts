import type { ImportEvent } from '@chronicle/core-events'
import type { WorkflowEvent } from '@/core/workflow'
import {
	bridgeEventBusToNotifications,
	registerEventNotificationMapper,
} from '@chronicle/core-notifications'
import { workflowEventBus } from '@chronicle/core-workflow'
import { importEventBus } from '@/features/health-import/services/import-event-bus'

export const HEALTH_IMPORT_NOTIFICATION_CHANNEL = 'health-import'

function importTypeToNotificationType(
	type: ImportEvent['type'],
): 'started' | 'complete' | 'failed' | 'retry_complete' {
	switch (type) {
		case 'import.started':
		case 'import.retry_started':
			return 'started'
		case 'import.completed':
			return 'complete'
		case 'import.retry_completed':
			return 'retry_complete'
		case 'import.failed':
		case 'import.cancelled':
			return 'failed'
	}
}

function severityForImportType(
	type: ImportEvent['type'],
): 'info' | 'success' | 'warning' | 'error' {
	switch (type) {
		case 'import.completed':
		case 'import.retry_completed':
			return 'success'
		case 'import.failed':
		case 'import.cancelled':
			return 'error'
		default:
			return 'info'
	}
}

let bootstrapped = false

export function bootstrapHealthImportNotifications(): void {
	if (bootstrapped) {
		return
	}

	registerEventNotificationMapper<ImportEvent>('*', (event) => ({
		channel: HEALTH_IMPORT_NOTIFICATION_CHANNEL,
		severity: severityForImportType(event.type),
		message: event.message,
		metadata: {
			type: importTypeToNotificationType(event.type),
			userId: event.userId,
			...event.payload,
		},
	}))

	bridgeEventBusToNotifications(importEventBus, (event) => event.type)

	registerEventNotificationMapper<WorkflowEvent>('workflow.failed', (event) => {
		const fileName =
			typeof event.payload.fileName === 'string' ? event.payload.fileName : null

		if (!fileName) {
			return null
		}

		return {
			channel: HEALTH_IMPORT_NOTIFICATION_CHANNEL,
			severity: 'error',
			message: `Processing failed for ${fileName}`,
			metadata: {
				type: 'failed',
				workflowItemId: event.workflowItemId,
				userId: event.userId,
			},
		}
	})

	bridgeEventBusToNotifications(workflowEventBus, (event) => event.eventType)

	bootstrapped = true
}
