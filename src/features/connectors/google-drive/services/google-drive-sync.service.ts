export {
	processImportQueueWithProgress,
	runHealthImportSync,
	retryFailedImports,
	resetGoogleDriveConnector,
	getImportDebugTimings,
} from '@/features/health-import/services/health-import-runner.service'

import type { ConnectorSyncMode } from '@/core/connectors'
import { processImportQueueWithProgress } from '@/features/health-import/services/health-import-runner.service'
import { runHealthImportSync } from '@/features/health-import/services/health-import-runner.service'
import { runInsuranceImportSync } from '@/features/insurance-import/services/insurance-import-runner.service'

export async function processImportQueue(
	userId: string,
	limit = 3,
): Promise<number> {
	const result = await processImportQueueWithProgress(userId, {
		limit,
		parallel: 2,
	})

	return result.importedThisRun
}

export async function runGoogleDriveSync(input: {
	userId: string
	mode: ConnectorSyncMode
}): Promise<void> {
	await runHealthImportSync(input).catch(() => {
		// Health folders may not be configured — insurance sync can still proceed.
	})

	try {
		await runInsuranceImportSync(input.userId)
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Insurance import failed'

		if (!message.includes('No insurance folders configured')) {
			throw error
		}
	}
}
