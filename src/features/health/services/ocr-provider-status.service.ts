import { documentProcessingConfig } from '@/config/document-processing'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { supabase } from '@/lib/supabase'
import {
	resolveOcrProviderStatus,
	type OcrProcessingEvent,
} from '@chronicle/core-ocr'

function isOcrRelatedFailure(message: string | null | undefined): boolean {
	if (!message) {
		return false
	}

	return /ocr|document ai|document-ocr|PAGE_LIMIT|extract text|read text/i.test(
		message,
	)
}

export async function fetchOcrProviderStatus(userId: string) {
	const [reportsResult, registryRecords, workflowResult] = await Promise.all([
		supabase
			.from('health_reports')
			.select(
				'status, processing_error, ocr_provider, processed_at, uploaded_at',
			)
			.eq('user_id', userId)
			.order('processed_at', { ascending: false, nullsFirst: false })
			.limit(25),
		listRegistryRecords(userId, 'google-drive'),
		supabase
			.from('health_workflow_items')
			.select('failure_reason, failed_stage, updated_at, current_state')
			.eq('user_id', userId)
			.eq('current_state', 'FAILED')
			.order('updated_at', { ascending: false })
			.limit(15),
	])

	if (reportsResult.error) {
		throw new Error(reportsResult.error.message)
	}

	if (workflowResult.error) {
		throw new Error(workflowResult.error.message)
	}

	const failures: OcrProcessingEvent[] = []
	const successes: OcrProcessingEvent[] = []

	for (const report of reportsResult.data ?? []) {
		const occurredAt =
			(report.processed_at as string | null) ??
			(report.uploaded_at as string | null) ??
			new Date().toISOString()

		if (report.status === 'completed' && report.ocr_provider) {
			successes.push({
				message: 'completed',
				occurredAt,
				source: 'report',
			})
		}

		if (
			report.status === 'failed' &&
			isOcrRelatedFailure(report.processing_error as string | null)
		) {
			failures.push({
				message: report.processing_error as string,
				occurredAt,
				source: 'report',
			})
		}
	}

	for (const record of registryRecords) {
		if (record.importStatus !== 'failed' || !record.errorMessage) {
			continue
		}

		if (!isOcrRelatedFailure(record.errorMessage)) {
			continue
		}

		failures.push({
			message: record.errorMessage,
			occurredAt: record.lastSyncAt ?? new Date().toISOString(),
			source: 'registry',
		})
	}

	for (const item of workflowResult.data ?? []) {
		const failureReason = item.failure_reason as string | null
		const failedStage = item.failed_stage as string | null

		if (
			!failureReason ||
			!isOcrRelatedFailure(`${failedStage ?? ''} ${failureReason}`)
		) {
			continue
		}

		failures.push({
			message: failureReason,
			occurredAt:
				(item.updated_at as string | null) ?? new Date().toISOString(),
			source: 'workflow',
		})
	}

	return resolveOcrProviderStatus({
		providerType: documentProcessingConfig.ocrProvider,
		failures,
		successes,
	})
}
