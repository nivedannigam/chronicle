export {
	processImportQueueWithProgress,
	runHealthImportSync,
	runGoogleDriveSync,
	retryFailedImports,
	resetGoogleDriveConnector,
	getImportDebugTimings,
} from '@/features/health-import/services/health-import-runner.service'

import { processImportQueueWithProgress } from '@/features/health-import/services/health-import-runner.service'

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
