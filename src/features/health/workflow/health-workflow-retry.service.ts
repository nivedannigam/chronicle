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
	resetWorkflowForReprocess,
	shouldUseReportReprocess,
} from '@/features/health/workflow/reset-workflow-for-reprocess'
import {
	enqueueHealthReportProcessing,
	processHealthReport,
	reprocessHealthReport,
} from '@/features/health/services/health-processing.service'
import type { WorkflowState } from '@/core/workflow'

export async function retryHealthDocument(
	userId: string,
	input: { registryId?: string | null; reportId?: string | null },
): Promise<{ targetState: WorkflowState; reportId?: string }> {
	if (input.registryId) {
		return retryFailedWorkflowItem(userId, input.registryId)
	}

	if (input.reportId) {
		await resetWorkflowForReprocess({
			reportId: input.reportId,
			userId,
			targetState: 'OCR',
		})
		await reprocessHealthReport(input.reportId)
		return { targetState: 'OCR', reportId: input.reportId }
	}

	throw new Error('No retryable document found')
}

export async function retryFailedWorkflowItem(
	userId: string,
	registryId: string,
): Promise<{ targetState: WorkflowState; reportId?: string }> {
	const item = await getWorkflowItemByRegistryId(registryId)

	const { data: registry, error } = await supabase
		.from('connector_document_registry')
		.select('import_status, health_report_id, approval_status')
		.eq('id', registryId)
		.single()

	if (error || !registry) {
		throw new Error(error?.message ?? 'Registry record not found')
	}

	const reportId =
		(registry.health_report_id as string | null) ?? item?.reportId ?? null

	if (
		shouldUseReportReprocess({
			reportId,
			workflowState: item?.currentState,
			importStatus: registry.import_status as string,
			failedStage: item?.failedStage,
		})
	) {
		await resetWorkflowForReprocess({
			reportId: reportId!,
			userId,
			targetState: 'OCR',
		})
		await reprocessHealthReport(reportId!)
		return { targetState: 'OCR', reportId: reportId! }
	}

	if (item?.currentState === 'FAILED') {
		return retryFailedWorkflowItemFromState(userId, registryId, item)
	}

	return retryRegistryImport(userId, registryId, reportId)
}

async function retryFailedWorkflowItemFromState(
	userId: string,
	registryId: string,
	item: NonNullable<Awaited<ReturnType<typeof getWorkflowItemByRegistryId>>>,
): Promise<{ targetState: WorkflowState; reportId?: string }> {
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

		await resetWorkflowForReprocess({
			reportId: item.reportId,
			userId,
			targetState:
				targetState === 'PARSING' || targetState === 'INDEXING'
					? 'PARSING'
					: 'OCR',
		})
		await reprocessHealthReport(item.reportId)
		return { targetState, reportId: item.reportId }
	}

	if (item.reportId) {
		await resetWorkflowForReprocess({
			reportId: item.reportId,
			userId,
			targetState: 'OCR',
		})
		await processHealthReport(item.reportId, { force: true })
		return { targetState, reportId: item.reportId }
	}

	const result = await importRegistryRecord(userId, registryId)
	return { targetState, reportId: result.reportId }
}

async function retryRegistryImport(
	userId: string,
	registryId: string,
	linkedReportId: string | null,
): Promise<{ targetState: WorkflowState; reportId?: string }> {
	const { data: registry, error } = await supabase
		.from('connector_document_registry')
		.select('import_status, health_report_id, approval_status')
		.eq('id', registryId)
		.single()

	if (error || !registry) {
		throw new Error(error?.message ?? 'Registry record not found')
	}

	const importStatus = registry.import_status as string
	const reportId =
		(registry.health_report_id as string | null) ?? linkedReportId

	if (importStatus === 'failed' || importStatus === 'discovered') {
		await updateRegistryRecord(registryId, {
			importStatus: 'queued',
			errorMessage: null,
		})

		const result = await importRegistryRecord(userId, registryId)
		return { targetState: 'IMPORTING', reportId: result.reportId }
	}

	if (reportId) {
		await resetWorkflowForReprocess({
			reportId,
			userId,
			targetState: 'OCR',
		})
		await reprocessHealthReport(reportId)
		return { targetState: 'OCR', reportId }
	}

	if (registry.approval_status === 'approved') {
		await updateRegistryRecord(registryId, {
			importStatus: 'queued',
			errorMessage: null,
		})
		await processImportQueueWithProgress(userId, {
			parallel: 1,
			limit: 1,
		})
		return { targetState: 'IMPORTING', reportId: reportId ?? undefined }
	}

	throw new Error('No retryable import state found for this document')
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
