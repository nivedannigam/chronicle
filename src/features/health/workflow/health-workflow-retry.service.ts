import { supabase } from '@/lib/supabase'
import { updateRegistryRecord } from '@/features/connectors/services/connector-store.service'
import {
	importRegistryRecord,
	processImportQueueWithProgress,
} from '@/features/health-import/services/health-import-runner.service'
import {
	getRetryTargetState,
	retryRegistryImportStatus,
	shouldRedownload,
	shouldReprocessReport,
} from '@chronicle/core-jobs'
import {
	getWorkflowItemByRegistryId,
	transitionWorkflowItem,
} from '@/features/health/workflow/health-workflow.service'
import {
	enqueueHealthReportProcessing,
	processHealthReport,
	reprocessHealthReport,
} from '@/features/health/services/health-processing.service'
import type { WorkflowState } from '@/core/workflow'

export async function retryFailedWorkflowItem(
	userId: string,
	registryId: string,
): Promise<{ targetState: WorkflowState; reportId?: string }> {
	const item = await getWorkflowItemByRegistryId(registryId)

	if (!item || item.currentState !== 'FAILED') {
		throw new Error('No failed workflow item found for retry')
	}

	const targetState = getRetryTargetState(
		item.failedStage ?? item.previousState,
	)
	const importStatus = retryRegistryImportStatus(targetState)

	await updateRegistryRecord(registryId, {
		importStatus,
		errorMessage: null,
	})

	await transitionWorkflowItem({
		registryId,
		toState: targetState,
		incrementRetry: true,
		context: {
			userId,
			reportId: item.reportId ?? undefined,
			failureReason: null,
			metadata: { retryFrom: item.failedStage, retryTarget: targetState },
		},
	})

	if (shouldRedownload(targetState)) {
		const result = await importRegistryRecord(userId, registryId)
		return { targetState, reportId: result.reportId }
	}

	if (shouldReprocessReport(targetState) && item.reportId) {
		if (targetState === 'OCR' || targetState === 'PROCESSING') {
			await enqueueHealthReportProcessing(userId, item.reportId)
		}

		await reprocessHealthReport(item.reportId)
		return { targetState, reportId: item.reportId }
	}

	if (item.reportId) {
		await processHealthReport(item.reportId, { force: true })
		return { targetState, reportId: item.reportId }
	}

	const result = await importRegistryRecord(userId, registryId)
	return { targetState, reportId: result.reportId }
}

export async function retryAllFailedWorkflowItems(
	userId: string,
): Promise<{ retried: number; failed: number }> {
	const { data, error } = await supabase
		.from('health_workflow_items')
		.select('registry_id')
		.eq('user_id', userId)
		.eq('current_state', 'FAILED')
		.not('registry_id', 'is', null)

	if (error) {
		throw new Error(error.message)
	}

	let retried = 0
	let failed = 0

	for (const row of data ?? []) {
		const registryId = row.registry_id as string

		try {
			await retryFailedWorkflowItem(userId, registryId)
			retried += 1
		} catch {
			failed += 1
		}
	}

	return { retried, failed }
}

export async function processApprovedBatch(
	userId: string,
	options: { parallel?: number; limit?: number } = {},
) {
	return processImportQueueWithProgress(userId, {
		parallel: options.parallel ?? 3,
		limit: options.limit,
	})
}
