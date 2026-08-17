import { supabase } from '@/lib/supabase'
import { documentProcessingConfig } from '@/config/document-processing'
import {
	createDocumentFromUpload,
	defaultOCRProvider,
	runDocumentIntelligencePipeline,
	runOcrWithRetry,
} from '@/features/document-intelligence'
import { createKnowledgeItemFromHealthReport } from '@/features/knowledge/services/knowledge-health.service'
import { invalidateHealthKnowledgeCache } from '@/features/health-knowledge/services/health-knowledge-cache'
import { persistHealthKnowledgeGraph } from '@/features/health-knowledge/services/health-knowledge-persist.service'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import { buildWorkflowErrorDetail } from '@/core/workflow/workflow-errors.types'
import { safeTransitionWorkflowItem } from '@/features/health/workflow/safe-workflow-transition'
import { resetWorkflowForReprocess } from '@/features/health/workflow/reset-workflow-for-reprocess'
import {
	completePipelineStage,
	failPipelineStage,
	startPipelineStage,
} from '@/features/health/pipeline/health-pipeline-logger'
import { serializeParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import { persistHealthMetrics } from '@/features/health/services/health-metrics-persist.service'
import {
	healthReportQualifiesForMetriclessCompletion,
	isReportDisplayReady,
	NO_LAB_METRICS_EXTRACTED_MESSAGE,
	reportHasExtractedText,
	reportNeedsReprocess,
	UNSUPPORTED_HEALTH_DOCUMENT_MESSAGE,
} from '@/features/health/services/report-readiness.service'
import {
	AI_REPROCESS_FAILED_USER_MESSAGE,
	buildHealthReportFromAiExtraction,
	buildHealthReportWithAiDefaultExtraction,
	buildHealthReportFromAiDirectExtraction,
	OCR_FAILED_USER_MESSAGE,
	reportEligibleForAiReprocess,
	toAiReprocessUserFacingError,
} from '@/features/health/services/health-ai-extraction.service'
import { shouldSkipAiMetricExtraction } from '@/features/health/services/health-partial-extraction.service'
import {
	getParsedHealthReport,
	getReportDisplayDate,
} from '@/features/health/services/health-parsed-report.service'
import {
	logHealthAiReprocessEvent,
	formatObservabilityError,
} from '@/features/health/services/health-ai-reprocess.observability'
import {
	withHealthReportProcessingLock,
	isHealthReportProcessingLocked,
	getInFlightHealthReportProcessing,
} from '@/features/health/services/health-report-processing-lock.service'
import { safeTransitionToParsing } from '@/features/health/services/health-workflow-progress.service'
import {
	clearRegistryErrorForReport,
	syncRegistryWithReportOutcome,
} from '@/features/health-import/services/registry-report-sync.service'
import type { HealthReport } from '@/features/document-intelligence/domain/health-report.domain'
import type {
	HealthReportStatus,
	UploadedHealthReport,
} from '@/features/health/types'

export type HealthExtractionMode = 'deterministic' | 'llm_text'

const PENDING_STATUSES: HealthReportStatus[] = [
	'uploaded',
	'queued',
	'processing',
	'parsed',
]

const REPROCESSABLE_STATUSES: HealthReportStatus[] = [
	'completed',
	'failed',
	'parsed',
]

type ReportUpdate = Partial<
	Pick<
		UploadedHealthReport,
		| 'status'
		| 'extracted_text'
		| 'processed_at'
		| 'processing_error'
		| 'parsed_data'
		| 'ocr_page_count'
		| 'ocr_confidence'
		| 'ocr_provider'
		| 'ocr_processing_time_ms'
		| 'ocr_metadata'
		| 'report_type'
		| 'report_date'
	>
>

async function updateReportStatus(reportId: string, updates: ReportUpdate) {
	const { error } = await supabase
		.from('health_reports')
		.update(updates)
		.eq('id', reportId)

	if (error) {
		throw new Error(error.message)
	}
}

async function updateQueueStatus(
	reportId: string,
	status: HealthReportStatus,
	extra: {
		started_at?: string
		completed_at?: string
		error_message?: string | null
	} = {},
) {
	const { error } = await supabase
		.from('health_report_processing_queue')
		.update({ status, ...extra })
		.eq('report_id', reportId)

	if (error) {
		throw new Error(error.message)
	}
}

export async function enqueueHealthReportProcessing(
	userId: string,
	reportId: string,
) {
	const { error } = await supabase
		.from('health_report_processing_queue')
		.upsert(
			{
				report_id: reportId,
				user_id: userId,
				status: 'queued',
				started_at: null,
				completed_at: null,
				error_message: null,
			},
			{ onConflict: 'report_id' },
		)

	if (error) {
		throw new Error(error.message)
	}

	await updateReportStatus(reportId, { status: 'queued' })
}

async function completeHealthReportAfterExtraction(input: {
	reportId: string
	typedReport: UploadedHealthReport
	finalHealthReport: HealthReport
	parsedReportUpdate: ReportUpdate
	outcome: {
		pageCount: number
		characters: number
		confidence: number | null
		processingTimeMs: number
	}
	useLayoutOnly?: boolean
	reportWithOcr?: UploadedHealthReport
}): Promise<UploadedHealthReport> {
	const processedAt =
		input.parsedReportUpdate.processed_at ?? new Date().toISOString()
	const reportWithOcr = input.reportWithOcr ?? {
		...input.typedReport,
		...input.parsedReportUpdate,
	}
	const finalParsedReportUpdate = {
		...input.parsedReportUpdate,
		parsed_data: serializeParsedHealthReport(input.finalHealthReport),
		report_type: input.finalHealthReport.metadata.reportType,
		report_date: input.finalHealthReport.metadata.reportDate,
	}

	await updateReportStatus(input.reportId, {
		status: 'parsed',
		...finalParsedReportUpdate,
	})

	let persistedMetricCount = 0

	try {
		const displayDate = getReportDisplayDate(
			reportWithOcr,
			input.finalHealthReport,
		)

		persistedMetricCount = await persistHealthMetrics({
			userId: input.typedReport.user_id,
			reportId: input.reportId,
			familyMemberId: input.typedReport.family_member_id ?? null,
			healthReport: input.finalHealthReport,
			reportDate: displayDate,
			observedAt: `${displayDate}T12:00:00.000Z`,
		})
	} catch (metricError) {
		const errorDetail = buildWorkflowErrorDetail({
			stage: 'PARSING',
			error: metricError,
		})

		await updateReportStatus(input.reportId, {
			status: 'failed',
			processing_error: errorDetail.userMessage,
		})
		await updateQueueStatus(input.reportId, 'failed', {
			completed_at: processedAt,
			error_message: errorDetail.userMessage,
		})

		await safeTransitionWorkflowItem({
			reportId: input.reportId,
			toState: 'FAILED',
			context: {
				userId: input.typedReport.user_id,
				reportId: input.reportId,
				failureReason: errorDetail.userMessage,
				failedStage: 'PARSING',
				errorDetail,
			},
		})

		throw metricError
	}

	const allowsMetriclessCompletion =
		persistedMetricCount === 0 &&
		healthReportQualifiesForMetriclessCompletion({
			metadata: input.finalHealthReport.metadata,
			fileName: input.typedReport.file_name,
		})

	if (persistedMetricCount === 0 && !allowsMetriclessCompletion) {
		failPipelineStage({
			reportId: input.reportId,
			stage: 'PARSING',
			error: NO_LAB_METRICS_EXTRACTED_MESSAGE,
			details: {
				pageCount: input.outcome.pageCount,
				characters: input.outcome.characters,
				confidence: input.outcome.confidence,
				metricCount: 0,
			},
		})

		await updateReportStatus(input.reportId, {
			...finalParsedReportUpdate,
			status: 'failed',
			processing_error: NO_LAB_METRICS_EXTRACTED_MESSAGE,
		})

		await updateQueueStatus(input.reportId, 'failed', {
			error_message: NO_LAB_METRICS_EXTRACTED_MESSAGE,
		})

		await safeTransitionWorkflowItem({
			reportId: input.reportId,
			toState: 'FAILED',
			context: {
				userId: input.typedReport.user_id,
				reportId: input.reportId,
				failureReason: NO_LAB_METRICS_EXTRACTED_MESSAGE,
				failedStage: 'PARSING',
			},
		})

		invalidateHealthKnowledgeCache(input.typedReport.user_id)
		invalidateAfterHealthImport(input.typedReport.user_id)

		await syncRegistryWithReportOutcome(input.reportId, {
			status: 'failed',
			errorMessage: NO_LAB_METRICS_EXTRACTED_MESSAGE,
		})

		return {
			...input.typedReport,
			...finalParsedReportUpdate,
			status: 'failed',
			processing_error: NO_LAB_METRICS_EXTRACTED_MESSAGE,
		}
	}

	completePipelineStage({
		reportId: input.reportId,
		stage: 'PARSING',
		nextStage: 'INDEXING',
		details: {
			pageCount: input.outcome.pageCount,
			characters: input.outcome.characters,
			confidence: input.outcome.confidence,
			processingTimeMs: input.outcome.processingTimeMs,
			metricCount: persistedMetricCount,
		},
	})

	startPipelineStage({
		reportId: input.reportId,
		stage: 'INDEXING',
		nextStage: 'READY',
	})

	await safeTransitionWorkflowItem({
		reportId: input.reportId,
		toState: 'INDEXING',
		context: {
			userId: input.typedReport.user_id,
			reportId: input.reportId,
			progress: { label: 'Generating metrics' },
		},
	})

	createKnowledgeItemFromHealthReport({
		...input.typedReport,
		status: 'parsed',
		...finalParsedReportUpdate,
	})

	try {
		await persistHealthKnowledgeGraph(
			input.typedReport.user_id,
			input.typedReport.family_member_id ?? null,
		)
	} catch (indexError) {
		const errorDetail = buildWorkflowErrorDetail({
			stage: 'INDEXING',
			error: indexError,
		})

		await updateReportStatus(input.reportId, {
			status: 'failed',
			processing_error: errorDetail.userMessage,
		})
		await updateQueueStatus(input.reportId, 'failed', {
			completed_at: processedAt,
			error_message: errorDetail.userMessage,
		})

		await safeTransitionWorkflowItem({
			reportId: input.reportId,
			toState: 'FAILED',
			context: {
				userId: input.typedReport.user_id,
				reportId: input.reportId,
				failureReason: errorDetail.userMessage,
				failedStage: 'INDEXING',
				errorDetail,
			},
		})

		throw indexError
	}

	completePipelineStage({
		reportId: input.reportId,
		stage: 'INDEXING',
		nextStage: 'READY',
	})

	startPipelineStage({
		reportId: input.reportId,
		stage: 'READY',
		details: { reportId: input.reportId },
	})

	completePipelineStage({
		reportId: input.reportId,
		stage: 'READY',
		details: { reportId: input.reportId },
	})

	await safeTransitionWorkflowItem({
		reportId: input.reportId,
		toState: 'READY',
		context: { userId: input.typedReport.user_id, reportId: input.reportId },
	})

	await updateReportStatus(input.reportId, {
		status: 'completed',
		...finalParsedReportUpdate,
	})

	await updateQueueStatus(input.reportId, 'completed', {
		completed_at: processedAt,
		error_message: null,
	})

	const completedReport: UploadedHealthReport = {
		...input.typedReport,
		status: 'completed',
		...finalParsedReportUpdate,
	}

	invalidateHealthKnowledgeCache(completedReport.user_id)
	invalidateAfterHealthImport(completedReport.user_id)

	await syncRegistryWithReportOutcome(input.reportId, { status: 'completed' })

	return completedReport
}

export async function processHealthReport(
	reportId: string,
	options: { force?: boolean; extractionMode?: HealthExtractionMode } = {},
): Promise<UploadedHealthReport> {
	if (options.extractionMode === 'llm_text') {
		return withHealthReportProcessingLock(
			reportId,
			() => processHealthReportWithAiText(reportId, options),
			options,
		)
	}

	return withHealthReportProcessingLock(
		reportId,
		() => executeProcessHealthReport(reportId, options),
		options,
	)
}

async function executeProcessHealthReport(
	reportId: string,
	options: { force?: boolean; extractionMode?: HealthExtractionMode } = {},
): Promise<UploadedHealthReport> {
	const { data: report, error: fetchError } = await supabase
		.from('health_reports')
		.select('*')
		.eq('id', reportId)
		.single()

	if (fetchError || !report) {
		throw new Error(fetchError?.message ?? 'Report not found.')
	}

	const typedReport = report as UploadedHealthReport

	if (typedReport.status === 'completed' && !options.force) {
		if (isReportDisplayReady(typedReport)) {
			createKnowledgeItemFromHealthReport(typedReport)
			return typedReport
		}
	} else if (!options.force && typedReport.status === 'processing') {
		return typedReport
	} else if (
		!options.force &&
		typedReport.status === 'failed' &&
		!reportNeedsReprocess(typedReport)
	) {
		return typedReport
	} else if (
		!options.force &&
		typedReport.status === 'parsed' &&
		!reportNeedsReprocess(typedReport)
	) {
		return typedReport
	}

	try {
		await updateReportStatus(reportId, {
			status: 'processing',
			processing_error: null,
		})
		await clearRegistryErrorForReport(reportId)
		await updateQueueStatus(reportId, 'processing', {
			started_at: new Date().toISOString(),
			error_message: null,
		})

		if (options.force) {
			await resetWorkflowForReprocess({
				reportId,
				userId: typedReport.user_id,
				targetState: 'OCR',
			})
		}

		startPipelineStage({
			reportId,
			stage: 'OCR',
			nextStage: 'PARSING',
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'OCR',
			context: {
				userId: typedReport.user_id,
				reportId,
				progress: { label: 'Reading your document…' },
				worker: documentProcessingConfig.ocrProvider,
			},
		})

		const aiDirectHealthReport = await buildHealthReportFromAiDirectExtraction({
			report: typedReport,
		})

		if (aiDirectHealthReport) {
			return await completeHealthReportAfterExtraction({
				reportId,
				typedReport,
				finalHealthReport: aiDirectHealthReport,
				parsedReportUpdate: {
					extracted_text: null,
					parsed_data: serializeParsedHealthReport(aiDirectHealthReport),
					ocr_page_count: 0,
					ocr_confidence: null,
					ocr_provider: null,
					ocr_processing_time_ms: null,
					ocr_metadata: {
						extractionMethod: 'ai_direct',
						extractionSuccess: true,
						attemptCount: 1,
					},
					report_type: aiDirectHealthReport.metadata.reportType,
					report_date: aiDirectHealthReport.metadata.reportDate,
					processed_at: new Date().toISOString(),
					processing_error: null,
				},
				outcome: {
					pageCount: 0,
					characters: 0,
					confidence: null,
					processingTimeMs: 0,
				},
			})
		}

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'OCR',
			context: {
				userId: typedReport.user_id,
				reportId,
				progress: { label: 'Running OCR' },
				worker: documentProcessingConfig.ocrProvider,
			},
		})

		const document = createDocumentFromUpload({
			id: typedReport.id,
			userId: typedReport.user_id,
			fileName: typedReport.file_name,
			storagePath: typedReport.storage_path,
			uploadedAt: typedReport.uploaded_at,
		})

		const outcome = await runDocumentIntelligencePipeline({
			document,
			onProgress: async (progress) => {
				if (progress.stage === 'ocr_complete') {
					completePipelineStage({
						reportId,
						stage: 'OCR',
						nextStage: 'PARSING',
					})

					startPipelineStage({
						reportId,
						stage: 'PARSING',
						nextStage: 'READY',
					})

					await safeTransitionToParsing({
						reportId,
						userId: typedReport.user_id,
						progress: {
							label: 'OCR complete',
							percent: 100,
						},
					})
				}

				if (progress.stage === 'parsed') {
					await updateReportStatus(reportId, { status: 'parsed' })
					await updateQueueStatus(reportId, 'parsed')

					await safeTransitionToParsing({
						reportId,
						userId: typedReport.user_id,
						progress: { label: 'Parsing' },
					})
				}
			},
		})

		if (outcome.stage === 'failed') {
			throw new Error(outcome.error)
		}

		const { healthReport } = outcome

		if (!healthReport) {
			throw new Error(UNSUPPORTED_HEALTH_DOCUMENT_MESSAGE)
		}

		const processedAt = new Date().toISOString()
		const layoutHealthReport = healthReport
		const parsedReportUpdate = {
			extracted_text: outcome.extractedText,
			parsed_data: serializeParsedHealthReport(layoutHealthReport),
			ocr_page_count: outcome.pageCount,
			ocr_confidence: outcome.confidence,
			ocr_provider: outcome.ocrProvider,
			ocr_processing_time_ms: outcome.processingTimeMs,
			ocr_metadata: outcome.ocrMetadata as Record<string, unknown>,
			report_type: layoutHealthReport.metadata.reportType,
			report_date: layoutHealthReport.metadata.reportDate,
			processed_at: processedAt,
			processing_error: null,
		}

		await updateReportStatus(reportId, {
			status: 'parsed',
			...parsedReportUpdate,
		})

		await updateQueueStatus(reportId, 'parsed', {
			error_message: null,
		})

		const reportWithOcr: UploadedHealthReport = {
			...typedReport,
			...parsedReportUpdate,
		}

		const useLayoutOnly =
			options.extractionMode === 'deterministic' ||
			shouldSkipAiMetricExtraction({
				fileName: typedReport.file_name,
				metadata: layoutHealthReport.metadata,
			})

		let finalHealthReport = layoutHealthReport

		if (!useLayoutOnly && outcome.extractedText.trim().length >= 200) {
			try {
				finalHealthReport = await buildHealthReportWithAiDefaultExtraction({
					report: reportWithOcr,
					layoutReport: layoutHealthReport,
				})
			} catch (aiError) {
				const userMessage = toAiReprocessUserFacingError(aiError)

				failPipelineStage({
					reportId,
					stage: 'PARSING',
					error: userMessage,
					details: {
						pageCount: outcome.pageCount,
						characters: outcome.extractedText.length,
						layoutMetricCount: layoutHealthReport.metrics.length,
						extractionMode: 'ai_default',
					},
				})

				await updateReportStatus(reportId, {
					...parsedReportUpdate,
					status: 'failed',
					processing_error: userMessage,
				})

				await updateQueueStatus(reportId, 'failed', {
					error_message: userMessage,
				})

				await safeTransitionWorkflowItem({
					reportId,
					toState: 'FAILED',
					context: {
						userId: typedReport.user_id,
						reportId,
						failureReason: userMessage,
						failedStage: 'PARSING',
					},
				})

				invalidateHealthKnowledgeCache(typedReport.user_id)
				invalidateAfterHealthImport(typedReport.user_id)

				await syncRegistryWithReportOutcome(reportId, {
					status: 'failed',
					errorMessage: userMessage,
				})

				throw new Error(userMessage)
			}
		}

		const serializedParsedData = serializeParsedHealthReport(finalHealthReport)
		const finalParsedReportUpdate = {
			...parsedReportUpdate,
			parsed_data: serializedParsedData,
			report_type: finalHealthReport.metadata.reportType,
			report_date: finalHealthReport.metadata.reportDate,
		}

		await updateReportStatus(reportId, {
			status: 'parsed',
			...finalParsedReportUpdate,
		})

		let persistedMetricCount = 0

		try {
			const displayDate = getReportDisplayDate(reportWithOcr, finalHealthReport)

			persistedMetricCount = await persistHealthMetrics({
				userId: typedReport.user_id,
				reportId,
				familyMemberId: typedReport.family_member_id ?? null,
				healthReport: finalHealthReport,
				reportDate: displayDate,
				observedAt: `${displayDate}T12:00:00.000Z`,
			})
		} catch (metricError) {
			const errorDetail = buildWorkflowErrorDetail({
				stage: 'PARSING',
				error: metricError,
			})

			await updateReportStatus(reportId, {
				status: 'failed',
				processing_error: errorDetail.userMessage,
			})
			await updateQueueStatus(reportId, 'failed', {
				completed_at: processedAt,
				error_message: errorDetail.userMessage,
			})

			await safeTransitionWorkflowItem({
				reportId,
				toState: 'FAILED',
				context: {
					userId: typedReport.user_id,
					reportId,
					failureReason: errorDetail.userMessage,
					failedStage: 'PARSING',
					errorDetail,
				},
			})

			throw metricError
		}

		const allowsMetriclessCompletion =
			persistedMetricCount === 0 &&
			healthReportQualifiesForMetriclessCompletion({
				metadata: finalHealthReport.metadata,
				fileName: typedReport.file_name,
			})

		if (persistedMetricCount === 0 && !allowsMetriclessCompletion) {
			if (
				useLayoutOnly &&
				outcome.extractedText.trim().length >= 200 &&
				reportEligibleForAiReprocess(reportWithOcr)
			) {
				try {
					return await reprocessHealthReportWithAi(reportId)
				} catch {
					// Fall through to failure messaging below.
				}
			}

			failPipelineStage({
				reportId,
				stage: 'PARSING',
				error: NO_LAB_METRICS_EXTRACTED_MESSAGE,
				details: {
					pageCount: outcome.pageCount,
					characters: outcome.extractedText.length,
					confidence: outcome.confidence,
					metricCount: 0,
				},
			})

			await updateReportStatus(reportId, {
				...finalParsedReportUpdate,
				status: 'failed',
				processing_error: NO_LAB_METRICS_EXTRACTED_MESSAGE,
			})

			await updateQueueStatus(reportId, 'failed', {
				error_message: NO_LAB_METRICS_EXTRACTED_MESSAGE,
			})

			await safeTransitionWorkflowItem({
				reportId,
				toState: 'FAILED',
				context: {
					userId: typedReport.user_id,
					reportId,
					failureReason: NO_LAB_METRICS_EXTRACTED_MESSAGE,
					failedStage: 'PARSING',
				},
			})

			invalidateHealthKnowledgeCache(typedReport.user_id)
			invalidateAfterHealthImport(typedReport.user_id)

			await syncRegistryWithReportOutcome(reportId, {
				status: 'failed',
				errorMessage: NO_LAB_METRICS_EXTRACTED_MESSAGE,
			})

			return {
				...typedReport,
				...finalParsedReportUpdate,
				status: 'failed',
				processing_error: NO_LAB_METRICS_EXTRACTED_MESSAGE,
			}
		}

		completePipelineStage({
			reportId,
			stage: 'PARSING',
			nextStage: 'INDEXING',
			details: {
				pageCount: outcome.pageCount,
				characters: outcome.extractedText.length,
				confidence: outcome.confidence,
				processingTimeMs: outcome.processingTimeMs,
				metricCount: persistedMetricCount,
			},
		})

		startPipelineStage({
			reportId,
			stage: 'INDEXING',
			nextStage: 'READY',
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'INDEXING',
			context: {
				userId: typedReport.user_id,
				reportId,
				progress: { label: 'Generating metrics' },
			},
		})

		createKnowledgeItemFromHealthReport({
			...typedReport,
			status: 'parsed',
			...finalParsedReportUpdate,
		})

		try {
			await persistHealthKnowledgeGraph(
				typedReport.user_id,
				typedReport.family_member_id ?? null,
			)
		} catch (indexError) {
			const errorDetail = buildWorkflowErrorDetail({
				stage: 'INDEXING',
				error: indexError,
			})

			await updateReportStatus(reportId, {
				status: 'failed',
				processing_error: errorDetail.userMessage,
			})
			await updateQueueStatus(reportId, 'failed', {
				completed_at: processedAt,
				error_message: errorDetail.userMessage,
			})

			await safeTransitionWorkflowItem({
				reportId,
				toState: 'FAILED',
				context: {
					userId: typedReport.user_id,
					reportId,
					failureReason: errorDetail.userMessage,
					failedStage: 'INDEXING',
					errorDetail,
				},
			})

			throw indexError
		}

		completePipelineStage({
			reportId,
			stage: 'INDEXING',
			nextStage: 'READY',
		})

		startPipelineStage({
			reportId,
			stage: 'READY',
			details: { reportId },
		})

		completePipelineStage({
			reportId,
			stage: 'READY',
			details: { reportId },
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'READY',
			context: { userId: typedReport.user_id, reportId },
		})

		await updateReportStatus(reportId, {
			status: 'completed',
			...finalParsedReportUpdate,
		})

		await updateQueueStatus(reportId, 'completed', {
			completed_at: processedAt,
			error_message: null,
		})

		const completedReport: UploadedHealthReport = {
			...typedReport,
			status: 'completed',
			...finalParsedReportUpdate,
		}

		invalidateHealthKnowledgeCache(completedReport.user_id)
		invalidateAfterHealthImport(completedReport.user_id)

		await syncRegistryWithReportOutcome(reportId, { status: 'completed' })

		return completedReport
	} catch (error) {
		const errorDetail = buildWorkflowErrorDetail({
			stage: 'OCR',
			error,
			edgeFunction:
				documentProcessingConfig.ocrProvider === 'google'
					? 'document-ocr'
					: undefined,
		})

		failPipelineStage({
			reportId,
			stage: 'OCR',
			error: errorDetail.message,
		})

		await updateReportStatus(reportId, {
			status: 'failed',
			processing_error: OCR_FAILED_USER_MESSAGE,
		})

		await updateQueueStatus(reportId, 'failed', {
			completed_at: new Date().toISOString(),
			error_message: OCR_FAILED_USER_MESSAGE,
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'FAILED',
			context: {
				userId: typedReport.user_id,
				reportId,
				failureReason: OCR_FAILED_USER_MESSAGE,
				failedStage: 'OCR',
				errorDetail,
			},
		})

		await syncRegistryWithReportOutcome(reportId, {
			status: 'failed',
			errorMessage: OCR_FAILED_USER_MESSAGE,
		})

		logHealthAiReprocessEvent({
			event: 'ocr_failed',
			reportId,
			correlationId: crypto.randomUUID(),
			error: errorDetail.message,
			details: {
				edgeFunction: errorDetail.edgeFunction ?? null,
				httpStatus: errorDetail.httpStatus ?? null,
			},
		})

		throw new Error(OCR_FAILED_USER_MESSAGE)
	}
}

export async function reprocessHealthReport(
	reportId: string,
): Promise<UploadedHealthReport> {
	return processHealthReport(reportId, { force: true })
}

export async function reprocessHealthReportWithAi(
	reportId: string,
): Promise<UploadedHealthReport> {
	return withHealthReportProcessingLock(
		reportId,
		() => executeReprocessHealthReportWithAi(reportId),
		{ force: true },
	)
}

async function executeReprocessHealthReportWithAi(
	reportId: string,
): Promise<UploadedHealthReport> {
	const correlationId = crypto.randomUUID()
	const startedAt = Date.now()

	logHealthAiReprocessEvent({
		event: 'ai_reprocess_requested',
		reportId,
		correlationId,
	})

	try {
		const { data: report, error: fetchError } = await supabase
			.from('health_reports')
			.select('*')
			.eq('id', reportId)
			.single()

		if (fetchError || !report) {
			throw new Error(fetchError?.message ?? 'Report not found.')
		}

		const typedReport = report as UploadedHealthReport

		if (!reportEligibleForAiReprocess(typedReport)) {
			throw new Error(AI_REPROCESS_FAILED_USER_MESSAGE)
		}

		await hydrateReportOcrTextForAiReprocess(typedReport, correlationId)

		const result = await processHealthReportWithAiText(reportId, {
			force: true,
		})

		logHealthAiReprocessEvent({
			event: 'ai_reprocess_completed',
			reportId,
			correlationId,
			durationMs: Date.now() - startedAt,
		})

		return result
	} catch (error) {
		const underlyingError =
			error instanceof Error ? error.message : String(error)

		logHealthAiReprocessEvent({
			event: 'ai_reprocess_failed',
			reportId,
			correlationId,
			durationMs: Date.now() - startedAt,
			error: underlyingError,
			details: {
				userMessage: toAiReprocessUserFacingError(error),
			},
		})

		throw new Error(toAiReprocessUserFacingError(error))
	}
}

async function hydrateReportOcrTextForAiReprocess(
	report: UploadedHealthReport,
	correlationId: string,
): Promise<void> {
	if (reportHasExtractedText(report)) {
		return
	}

	const ocrStartedAt = Date.now()
	const document = createDocumentFromUpload({
		id: report.id,
		userId: report.user_id,
		fileName: report.file_name,
		storagePath: report.storage_path,
		uploadedAt: report.uploaded_at,
	})

	try {
		const { result: ocrDocument } = await runOcrWithRetry(
			defaultOCRProvider,
			document,
		)

		await updateReportStatus(report.id, {
			extracted_text: ocrDocument.rawText,
			ocr_page_count: ocrDocument.pages.length,
			ocr_confidence: ocrDocument.confidence,
			ocr_provider: ocrDocument.metadata.provider,
			ocr_processing_time_ms: ocrDocument.processingTimeMs,
			ocr_metadata: ocrDocument.metadata as Record<string, unknown>,
			processing_error: null,
		})

		logHealthAiReprocessEvent({
			event: 'ai_reprocess_requested',
			reportId: report.id,
			correlationId,
			durationMs: Date.now() - ocrStartedAt,
			details: {
				ocrHydrationCompleted: true,
				characters: ocrDocument.rawText.length,
			},
		})
	} catch (error) {
		const message = formatObservabilityError(error)

		logHealthAiReprocessEvent({
			event: 'ocr_failed',
			reportId: report.id,
			correlationId,
			durationMs: Date.now() - ocrStartedAt,
			error: message,
			details: { duringAiReprocess: true },
		})

		throw new Error(OCR_FAILED_USER_MESSAGE)
	}
}

export async function listReportsEligibleForAiReprocess(
	userId: string,
): Promise<UploadedHealthReport[]> {
	const { data, error } = await supabase
		.from('health_reports')
		.select('*')
		.eq('user_id', userId)
		.in('status', REPROCESSABLE_STATUSES)

	if (error) {
		throw new Error(error.message)
	}

	return (data ?? [])
		.map((row) => row as UploadedHealthReport)
		.filter(
			(report) =>
				reportNeedsReprocess(report) && reportEligibleForAiReprocess(report),
		)
}

export async function reprocessFailedReportsWithAi(userId: string): Promise<{
	processed: number
	failed: number
	skipped: number
}> {
	const eligible = await listReportsEligibleForAiReprocess(userId)
	let processed = 0
	let failed = 0

	for (const report of eligible) {
		try {
			const result = await reprocessHealthReportWithAi(report.id)

			if (isReportDisplayReady(result)) {
				processed += 1
			} else {
				failed += 1
			}
		} catch {
			failed += 1
		}
	}

	if (processed > 0) {
		invalidateHealthKnowledgeCache(userId)
		await persistHealthKnowledgeGraph(userId, null)
		invalidateAfterHealthImport(userId)
	}

	return {
		processed,
		failed,
		skipped: 0,
	}
}

async function processHealthReportWithAiText(
	reportId: string,
	options: { force?: boolean } = {},
): Promise<UploadedHealthReport> {
	const { data: report, error: fetchError } = await supabase
		.from('health_reports')
		.select('*')
		.eq('id', reportId)
		.single()

	if (fetchError || !report) {
		throw new Error(fetchError?.message ?? 'Report not found.')
	}

	const typedReport = report as UploadedHealthReport

	if (!reportHasExtractedText(typedReport)) {
		throw new Error(OCR_FAILED_USER_MESSAGE)
	}

	if (
		!options.force &&
		typedReport.status === 'completed' &&
		isReportDisplayReady(typedReport)
	) {
		return typedReport
	}

	if (!options.force && typedReport.status === 'processing') {
		return typedReport
	}

	const processedAt = new Date().toISOString()

	try {
		await updateReportStatus(reportId, {
			status: 'processing',
			processing_error: null,
		})
		await updateQueueStatus(reportId, 'processing', {
			started_at: processedAt,
			error_message: null,
		})

		if (options.force) {
			await resetWorkflowForReprocess({
				reportId,
				userId: typedReport.user_id,
				targetState: 'PARSING',
			})
		}

		startPipelineStage({
			reportId,
			stage: 'PARSING',
			nextStage: 'INDEXING',
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'PARSING',
			context: {
				userId: typedReport.user_id,
				reportId,
				progress: { label: 'AI metric extraction' },
			},
		})

		const parsedLayout = getParsedHealthReport(typedReport)
		const healthReport = await buildHealthReportFromAiExtraction({
			report: typedReport,
			layoutReport: parsedLayout ?? undefined,
		})
		const serializedParsedData = serializeParsedHealthReport(healthReport)
		const parsedReportUpdate = {
			extracted_text: typedReport.extracted_text,
			parsed_data: serializedParsedData,
			ocr_page_count: typedReport.ocr_page_count,
			ocr_confidence: typedReport.ocr_confidence,
			ocr_provider: typedReport.ocr_provider,
			ocr_processing_time_ms: typedReport.ocr_processing_time_ms,
			ocr_metadata: typedReport.ocr_metadata,
			report_type: healthReport.metadata.reportType,
			report_date: healthReport.metadata.reportDate ?? typedReport.report_date,
			processed_at: processedAt,
			processing_error: null,
		}

		await updateReportStatus(reportId, {
			status: 'parsed',
			...parsedReportUpdate,
		})
		await updateQueueStatus(reportId, 'parsed', { error_message: null })

		const displayDate = getReportDisplayDate(
			{ ...typedReport, ...parsedReportUpdate },
			healthReport,
		)

		const persistedMetricCount = await persistHealthMetrics({
			userId: typedReport.user_id,
			reportId,
			familyMemberId: typedReport.family_member_id ?? null,
			healthReport,
			reportDate: displayDate,
			observedAt: `${displayDate}T12:00:00.000Z`,
		})

		if (persistedMetricCount === 0) {
			const allowsMetriclessCompletion =
				healthReportQualifiesForMetriclessCompletion({
					metadata: healthReport.metadata,
					fileName: typedReport.file_name,
				})

			if (!allowsMetriclessCompletion) {
				throw new Error(NO_LAB_METRICS_EXTRACTED_MESSAGE)
			}
		}

		completePipelineStage({
			reportId,
			stage: 'PARSING',
			nextStage: 'INDEXING',
			details: {
				metricCount: persistedMetricCount,
				extractionMode: 'llm_text',
				metricless: persistedMetricCount === 0,
			},
		})

		startPipelineStage({
			reportId,
			stage: 'INDEXING',
			nextStage: 'READY',
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'INDEXING',
			context: {
				userId: typedReport.user_id,
				reportId,
				progress: { label: 'Saving AI metrics' },
			},
		})

		createKnowledgeItemFromHealthReport({
			...typedReport,
			status: 'parsed',
			...parsedReportUpdate,
		})

		await persistHealthKnowledgeGraph(
			typedReport.user_id,
			typedReport.family_member_id ?? null,
		)

		completePipelineStage({
			reportId,
			stage: 'INDEXING',
			nextStage: 'READY',
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'READY',
			context: { userId: typedReport.user_id, reportId },
		})

		await updateReportStatus(reportId, {
			status: 'completed',
			...parsedReportUpdate,
		})
		await updateQueueStatus(reportId, 'completed', {
			completed_at: processedAt,
			error_message: null,
		})

		await syncRegistryWithReportOutcome(reportId, {
			status: 'completed',
		})

		const completedReport: UploadedHealthReport = {
			...typedReport,
			status: 'completed',
			...parsedReportUpdate,
		}

		invalidateHealthKnowledgeCache(completedReport.user_id)
		invalidateAfterHealthImport(completedReport.user_id)

		return completedReport
	} catch (error) {
		const errorDetail = buildWorkflowErrorDetail({
			stage: 'PARSING',
			error,
		})

		await updateReportStatus(reportId, {
			status: 'failed',
			processing_error: AI_REPROCESS_FAILED_USER_MESSAGE,
		})
		await updateQueueStatus(reportId, 'failed', {
			completed_at: processedAt,
			error_message: AI_REPROCESS_FAILED_USER_MESSAGE,
		})

		await safeTransitionWorkflowItem({
			reportId,
			toState: 'FAILED',
			context: {
				userId: typedReport.user_id,
				reportId,
				failureReason: AI_REPROCESS_FAILED_USER_MESSAGE,
				failedStage: 'PARSING',
				errorDetail,
			},
		})

		await syncRegistryWithReportOutcome(reportId, {
			status: 'failed',
			errorMessage: AI_REPROCESS_FAILED_USER_MESSAGE,
		})

		throw new Error(AI_REPROCESS_FAILED_USER_MESSAGE)
	}
}

export async function reprocessAllHealthReports(userId: string): Promise<{
	processed: number
	failed: number
}> {
	const { data, error } = await supabase
		.from('health_reports')
		.select('*')
		.eq('user_id', userId)
		.in('status', REPROCESSABLE_STATUSES)

	if (error) {
		throw new Error(error.message)
	}

	let processed = 0
	let failed = 0

	for (const row of data ?? []) {
		const report = row as UploadedHealthReport

		if (!reportNeedsReprocess(report)) {
			continue
		}

		try {
			await processHealthReport(report.id, { force: true })
			processed += 1
		} catch {
			failed += 1
		}
	}

	invalidateHealthKnowledgeCache(userId)
	await persistHealthKnowledgeGraph(userId, null)
	invalidateAfterHealthImport(userId)

	return { processed, failed }
}

export async function reprocessStuckHealthReports(
	userId: string,
	options: { familyMemberId?: string | null } = {},
): Promise<{ processed: number; failed: number; succeeded: number }> {
	const { data, error } = await supabase
		.from('health_reports')
		.select('*')
		.eq('user_id', userId)
		.in('status', REPROCESSABLE_STATUSES)

	if (error) {
		throw new Error(error.message)
	}

	let processed = 0
	let failed = 0
	let succeeded = 0

	for (const row of data ?? []) {
		const report = row as UploadedHealthReport

		if (options.familyMemberId) {
			const reportMemberId = report.family_member_id ?? null

			if (reportMemberId !== options.familyMemberId) {
				continue
			}
		}

		if (!reportNeedsReprocess(report)) {
			continue
		}

		processed += 1

		try {
			const result = await processHealthReport(report.id, { force: true })

			if (isReportDisplayReady(result)) {
				succeeded += 1
			} else if (result.status === 'failed') {
				failed += 1
			}
		} catch {
			failed += 1
		}
	}

	if (processed > 0) {
		invalidateHealthKnowledgeCache(userId)
		await persistHealthKnowledgeGraph(userId, options.familyMemberId ?? null)
		invalidateAfterHealthImport(userId)
	}

	return { processed, failed, succeeded }
}

export function processPendingHealthReports(
	reports: UploadedHealthReport[],
): Promise<void> {
	const pending = reports.filter((report) =>
		PENDING_STATUSES.includes(report.status),
	)

	return pending.reduce(async (chain, report) => {
		await chain

		try {
			if (isHealthReportProcessingLocked(report.id)) {
				const inFlight = getInFlightHealthReportProcessing(report.id)

				if (inFlight) {
					await inFlight.catch(() => {
						// Wait for the active import run to settle.
					})
				}

				return
			}

			if (report.status === 'processing') {
				return
			}

			const needsForce = reportNeedsReprocess(report)

			if (report.status === 'uploaded') {
				await enqueueHealthReportProcessing(report.user_id, report.id)
			}

			await processHealthReport(report.id, { force: needsForce })
		} catch {
			// Individual failures are persisted on the report row
		}
	}, Promise.resolve())
}

export function getHealthReportStatusLabel(status: HealthReportStatus): string {
	switch (status) {
		case 'uploaded':
		case 'queued':
		case 'processing':
		case 'parsed':
			return 'Importing…'
		case 'completed':
			return 'Ready'
		case 'failed':
			return 'Import failed'
	}
}

export function hasPendingProcessing(reports: UploadedHealthReport[]): boolean {
	return reports.some((report) => PENDING_STATUSES.includes(report.status))
}

export function isProcessingStatus(status: HealthReportStatus): boolean {
	return status === 'processing' || status === 'parsed'
}
