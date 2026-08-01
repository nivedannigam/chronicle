import { supabase } from '@/lib/supabase'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { invalidateHealthKnowledgeCache } from '@/features/health-knowledge/services/health-knowledge-cache'
import { healthKnowledgeService } from '@/features/health-knowledge/services/health-knowledge.service'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import type { UploadedHealthReport } from '@/features/health/types'
import { processImportQueueWithProgress } from '@/features/health-import/services/health-import-runner.service'
import type {
	ImportJourneyPhase,
	ImportJourneyProgress,
	ImportJourneyResult,
} from '@/features/health-import/types/health-import-journey.types'
import type { ImportPhase } from '@/features/health-import/types/import-runner.types'
import { approveAllLikelyMedical } from '@/features/medical-discovery/services/import-review.service'
import {
	queueApprovedImports,
	prepareImportCandidatesForQueue,
} from '@/features/medical-discovery/services/import-pipeline.service'
import { runMedicalDiscovery } from '@/features/medical-discovery/services/medical-discovery-engine.service'

function invalidateImportCaches(userId: string) {
	invalidateHealthKnowledgeCache(userId)
	invalidateAfterHealthImport(userId)
}

function emitProgress(
	onProgress: (progress: ImportJourneyProgress) => void,
	phase: ImportJourneyPhase,
	phasesCompleted: ImportJourneyPhase[],
	phasesSucceeded: ImportJourneyPhase[],
	detail: string | null = null,
) {
	onProgress({
		phase,
		detail,
		phasesCompleted: [...phasesCompleted],
		phasesSucceeded: [...phasesSucceeded],
	})
}

const PIPELINE_PHASES: ImportJourneyPhase[] = ['download', 'ocr', 'metrics']

function isJourneyTerminalSuccess(
	outcome: ImportJourneyResult['outcome'],
): boolean {
	return (
		outcome === 'success' ||
		outcome === 'partial_success' ||
		outcome === 'no_reports'
	)
}

function pipelinePhasesSucceeded(
	phasesCompleted: ImportJourneyPhase[],
	phasesSucceeded: ImportJourneyPhase[],
): boolean {
	return PIPELINE_PHASES.every(
		(phase) =>
			!phasesCompleted.includes(phase) || phasesSucceeded.includes(phase),
	)
}

function markPipelinePhaseCompleted(
	phasesCompleted: ImportJourneyPhase[],
	phase: ImportJourneyPhase,
): void {
	if (!phasesCompleted.includes(phase)) {
		phasesCompleted.push(phase)
	}
}

function buildResult(
	partial: Omit<ImportJourneyResult, 'phasesCompleted' | 'phasesSucceeded'> & {
		phasesCompleted: ImportJourneyPhase[]
		phasesSucceeded: ImportJourneyPhase[]
	},
): ImportJourneyResult {
	return partial
}

function finalizeJourneySummary(
	phasesCompleted: ImportJourneyPhase[],
	phasesSucceeded: ImportJourneyPhase[],
	outcome: ImportJourneyResult['outcome'],
): void {
	phasesCompleted.push('summary')

	if (outcome === 'candidates_found') {
		phasesSucceeded.push('summary')
		return
	}

	if (
		isJourneyTerminalSuccess(outcome) &&
		pipelinePhasesSucceeded(phasesCompleted, phasesSucceeded)
	) {
		phasesSucceeded.push('summary')
	}
}

async function fetchCompletedReports(
	userId: string,
): Promise<UploadedHealthReport[]> {
	const { data, error } = await supabase
		.from('health_reports')
		.select('*')
		.eq('user_id', userId)
		.eq('status', 'completed')

	if (error) {
		throw new Error(error.message)
	}

	return (data ?? []) as UploadedHealthReport[]
}

function countExtractedMetrics(
	userId: string,
	uploadedReports: UploadedHealthReport[],
): number {
	const graph = healthKnowledgeService.getGraphForUser(userId, uploadedReports)

	return graph.profile.metricHistories.length
}

export async function runHealthImportJourney(
	userId: string,
	folderIds: string[],
	onProgress: (progress: ImportJourneyProgress) => void,
): Promise<ImportJourneyResult> {
	const phasesCompleted: ImportJourneyPhase[] = ['assign']
	const phasesSucceeded: ImportJourneyPhase[] = ['assign']

	emitProgress(
		onProgress,
		'scanning',
		phasesCompleted,
		phasesSucceeded,
		'Scanning assigned folder…',
	)

	try {
		const { run } = await runMedicalDiscovery({
			userId,
			mode: 'manual',
			folderIds,
		})

		phasesCompleted.push('scanning')
		phasesSucceeded.push('scanning')

		const filesFound = run.filesScanned
		const medicalReports = run.medicalCount
		const needsReview = run.reviewCount
		const skippedIgnored = run.ignoredCount
		const duplicatesSkipped = run.duplicateCount
		const importCandidates = medicalReports + needsReview
		const documentsScanned = importCandidates

		phasesCompleted.push('detection')
		if (importCandidates > 0) {
			phasesSucceeded.push('detection')
		}

		emitProgress(
			onProgress,
			'detection',
			phasesCompleted,
			phasesSucceeded,
			importCandidates > 0
				? `Found ${importCandidates} import candidate${importCandidates === 1 ? '' : 's'}${duplicatesSkipped > 0 ? ` · ${duplicatesSkipped} duplicate${duplicatesSkipped === 1 ? '' : 's'} skipped` : ''}`
				: duplicatesSkipped > 0
					? `${duplicatesSkipped} duplicate file${duplicatesSkipped === 1 ? '' : 's'} skipped — nothing new to import`
					: 'No import candidates detected',
		)

		if (importCandidates === 0) {
			invalidateImportCaches(userId)
			finalizeJourneySummary(phasesCompleted, phasesSucceeded, 'no_reports')
			emitProgress(onProgress, 'summary', phasesCompleted, phasesSucceeded)

			return buildResult({
				outcome: 'no_reports',
				filesFound,
				documentsScanned,
				importCandidates,
				medicalReports,
				needsReview,
				skippedIgnored,
				reportsImported: 0,
				importedThisRun: 0,
				failedThisRun: 0,
				skippedThisRun: 0,
				autoApprovedCount: 0,
				metricsExtracted: 0,
				failedCount: 0,
				errorMessage: null,
				primaryError: null,
				errorSamples: [],
				phasesCompleted,
				phasesSucceeded,
			})
		}

		const autoApprovedCount = await approveAllLikelyMedical(userId)

		emitProgress(
			onProgress,
			'download',
			phasesCompleted,
			phasesSucceeded,
			autoApprovedCount > 0
				? `Auto-approved ${autoApprovedCount} likely medical report${autoApprovedCount === 1 ? '' : 's'} for import`
				: 'Downloading approved reports…',
		)

		await prepareImportCandidatesForQueue(userId)
		await queueApprovedImports(userId)

		let ocrPhaseReached = false
		let metricsPhaseStarted = false

		const runStats = await processImportQueueWithProgress(userId, {
			parallel: 2,
			onImportPhase: (phase: ImportPhase) => {
				if (phase === 'download') {
					markPipelinePhaseCompleted(phasesCompleted, 'download')
					emitProgress(
						onProgress,
						'download',
						phasesCompleted,
						phasesSucceeded,
						'Downloading reports from Google Drive…',
					)
				}

				if (phase === 'ocr') {
					ocrPhaseReached = true
					markPipelinePhaseCompleted(phasesCompleted, 'ocr')

					if (!phasesSucceeded.includes('download')) {
						phasesSucceeded.push('download')
					}

					emitProgress(
						onProgress,
						'ocr',
						phasesCompleted,
						phasesSucceeded,
						'Extracting text from reports…',
					)
				}

				if (phase === 'metrics') {
					metricsPhaseStarted = true
					markPipelinePhaseCompleted(phasesCompleted, 'metrics')

					if (!phasesSucceeded.includes('ocr')) {
						phasesSucceeded.push('ocr')
					}

					emitProgress(
						onProgress,
						'metrics',
						phasesCompleted,
						phasesSucceeded,
						'Extracting health metrics…',
					)
				}
			},
			onDocumentProgress: async () => {
				invalidateImportCaches(userId)
			},
		})

		const importedThisRun = runStats.importedThisRun
		const failedThisRun = runStats.failedThisRun
		const skippedThisRun = runStats.skippedThisRun

		if (importedThisRun > 0 || skippedThisRun > 0) {
			markPipelinePhaseCompleted(phasesCompleted, 'metrics')

			if (!phasesSucceeded.includes('download')) {
				phasesSucceeded.push('download')
			}

			if (!phasesSucceeded.includes('ocr')) {
				phasesSucceeded.push('ocr')
			}

			if (!phasesSucceeded.includes('metrics')) {
				phasesSucceeded.push('metrics')
			}
		} else if (metricsPhaseStarted && !phasesSucceeded.includes('metrics')) {
			markPipelinePhaseCompleted(phasesCompleted, 'metrics')
		} else if (ocrPhaseReached && !phasesCompleted.includes('ocr')) {
			markPipelinePhaseCompleted(phasesCompleted, 'ocr')
		}

		const pipelineFailed = PIPELINE_PHASES.some(
			(phase) =>
				phasesCompleted.includes(phase) && !phasesSucceeded.includes(phase),
		)

		invalidateImportCaches(userId)

		const registry = await listRegistryRecords(userId, 'google-drive')
		const completedReports = await fetchCompletedReports(userId)
		const reportsImported = registry.filter(
			(record) => record.importStatus === 'completed',
		).length
		const metricsExtracted = countExtractedMetrics(userId, completedReports)
		const failedRecords = registry.filter(
			(record) => record.importStatus === 'failed',
		)
		const failedCount = failedRecords.length

		const errorSamples = [
			...new Set(
				failedRecords
					.map((record) => record.errorMessage)
					.filter((message): message is string => Boolean(message)),
			),
		].slice(0, 3)

		const primaryError =
			failedRecords.find((record) => record.errorMessage)?.errorMessage ??
			(failedThisRun > 0
				? `${failedThisRun} report${failedThisRun === 1 ? '' : 's'} failed this run`
				: null)

		let outcome: ImportJourneyResult['outcome'] = 'candidates_found'

		if (importedThisRun > 0 && failedThisRun === 0) {
			outcome = 'success'
		} else if (importedThisRun > 0 && failedThisRun > 0) {
			outcome = 'partial_success'
		} else if (importedThisRun === 0 && failedThisRun > 0) {
			outcome = 'failed'
		} else if (needsReview > 0 && importedThisRun === 0 && !pipelineFailed) {
			outcome = 'candidates_found'
		} else if (importCandidates === 0) {
			outcome = 'no_reports'
		} else if (pipelineFailed && importedThisRun === 0) {
			outcome = 'failed'
		}

		finalizeJourneySummary(phasesCompleted, phasesSucceeded, outcome)
		emitProgress(onProgress, 'summary', phasesCompleted, phasesSucceeded)

		return buildResult({
			outcome,
			filesFound,
			documentsScanned,
			importCandidates,
			medicalReports,
			needsReview,
			skippedIgnored,
			reportsImported,
			importedThisRun,
			failedThisRun,
			skippedThisRun,
			autoApprovedCount,
			metricsExtracted,
			failedCount,
			errorMessage: primaryError,
			primaryError,
			errorSamples,
			phasesCompleted,
			phasesSucceeded,
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Import failed'

		phasesCompleted.push('summary')
		emitProgress(
			onProgress,
			'summary',
			phasesCompleted,
			phasesSucceeded,
			message,
		)

		return buildResult({
			outcome: 'failed',
			filesFound: 0,
			documentsScanned: 0,
			importCandidates: 0,
			medicalReports: 0,
			needsReview: 0,
			skippedIgnored: 0,
			reportsImported: 0,
			importedThisRun: 0,
			failedThisRun: 1,
			skippedThisRun: 0,
			autoApprovedCount: 0,
			metricsExtracted: 0,
			failedCount: 1,
			errorMessage: message,
			primaryError: message,
			errorSamples: [message],
			phasesCompleted,
			phasesSucceeded,
		})
	}
}
