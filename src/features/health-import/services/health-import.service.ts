import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import { invalidateHealthKnowledgeCache } from '@/features/health-knowledge/services/health-knowledge-cache'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { runMedicalDiscovery } from '@/features/medical-discovery/services/medical-discovery-engine.service'
import { approveAllImportCandidates } from '@/features/medical-discovery/services/import-review.service'
import { processApprovedImports } from '@/features/medical-discovery/services/import-pipeline.service'
import { processImportQueueWithProgress } from '@/features/health-import/services/health-import-runner.service'
import { buildImportSummary } from '@/features/health-import/services/import-summary.service'
import { pushImportNotification } from '@/features/health-import/services/import-notifications.service'
import type {
	HealthImportDiscoveryPreview,
	HealthImportDocumentProgress,
	HealthImportJob,
	HealthImportSummary,
} from '@/features/health-import/types/health-import.types'
import { stageLabelForStatus } from '@/features/health-import/types/health-import.types'

let activeJob: HealthImportJob | null = null
let cancelled = false
const progressListeners = new Set<(job: HealthImportJob) => void>()

function emit(job: HealthImportJob) {
	activeJob = job

	for (const listener of progressListeners) {
		listener(job)
	}
}

export function subscribeHealthImportProgress(
	listener: (job: HealthImportJob) => void,
): () => void {
	progressListeners.add(listener)

	if (activeJob) {
		listener(activeJob)
	}

	return () => progressListeners.delete(listener)
}

export function getActiveHealthImportJob(): HealthImportJob | null {
	return activeJob
}

export function cancelHealthImport(): void {
	cancelled = true

	if (activeJob) {
		emit({ ...activeJob, status: 'cancelled' })
		pushImportNotification('failed', 'Import cancelled')
	}
}

function mapDocuments(
	records: Awaited<ReturnType<typeof listRegistryRecords>>,
): HealthImportDocumentProgress[] {
	const now = Date.now()

	return records.slice(0, 50).map((record) => ({
		registryId: record.id,
		fileName: record.fileName,
		status: record.importStatus,
		stageLabel: stageLabelForStatus(record.importStatus),
		startedAt:
			record.lastSyncAt ?? record.importedAt ?? new Date().toISOString(),
		elapsedMs: record.lastSyncAt
			? now - new Date(record.lastSyncAt).getTime()
			: 0,
		errorMessage: record.errorMessage,
	}))
}

export async function previewHealthImportDiscovery(
	userId: string,
): Promise<HealthImportDiscoveryPreview> {
	const { run, files } = await runMedicalDiscovery({ userId, mode: 'manual' })
	const importCandidates = files.filter(
		(file) => file.category !== 'ignored',
	).length

	return {
		folderCount: run.foldersScanned,
		pdfCount: importCandidates,
		skippedCount: run.ignoredCount,
		estimatedMinutes: Math.max(1, Math.ceil(importCandidates * 0.5)),
		medicalCount: run.medicalCount,
		reviewCount: run.reviewCount,
		ignoredCount: run.ignoredCount,
	}
}

export async function runHealthImport(
	userId: string,
): Promise<HealthImportSummary> {
	cancelled = false
	const startedAt = Date.now()

	const job: HealthImportJob = {
		id: crypto.randomUUID(),
		userId,
		status: 'discovering',
		startedAt: new Date().toISOString(),
		completedAt: null,
		discovery: null,
		summary: null,
		documents: [],
		errorMessage: null,
	}

	emit(job)
	pushImportNotification('started', 'Health import started')

	try {
		const discovery = await previewHealthImportDiscovery(userId)

		emit({
			...job,
			status: 'importing',
			discovery,
		})

		await approveAllImportCandidates(userId)

		const pipelineSummary = await processApprovedImports(userId, {
			parallel: 2,
			onDocumentProgress: async () => {
				if (cancelled) {
					return
				}

				const registry = await listRegistryRecords(userId, 'google-drive')

				emit({
					...job,
					status: 'processing',
					discovery,
					documents: mapDocuments(registry),
				})

				invalidateHealthKnowledgeCache(userId)
				invalidateAfterHealthImport(userId)
			},
		})

		if (cancelled) {
			throw new Error('Import cancelled')
		}

		const registry = await listRegistryRecords(userId, 'google-drive')
		const summary = buildImportSummary({
			userId,
			registry,
			syncRun: null,
			durationMs: Date.now() - startedAt,
		})

		summary.reportsImported = pipelineSummary.imported
		summary.skippedCount = pipelineSummary.duplicates + pipelineSummary.skipped
		summary.failedCount = pipelineSummary.errors

		const completedJob: HealthImportJob = {
			...job,
			status: summary.failedCount > 0 ? 'failed' : 'completed',
			completedAt: new Date().toISOString(),
			discovery,
			summary,
			documents: mapDocuments(registry),
		}

		emit(completedJob)

		if (summary.failedCount > 0) {
			pushImportNotification(
				'failed',
				`Import finished with ${summary.failedCount} failed report(s)`,
			)
		} else if (pipelineSummary.imported === 0) {
			pushImportNotification(
				'complete',
				'No approved reports to import. Review discoveries first.',
			)
		} else {
			pushImportNotification(
				'complete',
				`${pipelineSummary.imported} health reports imported successfully`,
			)
		}

		invalidateHealthKnowledgeCache(userId)
		invalidateAfterHealthImport(userId)

		return summary
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Import failed'

		emit({
			...job,
			status: cancelled ? 'cancelled' : 'failed',
			completedAt: new Date().toISOString(),
			errorMessage: message,
		})

		pushImportNotification('failed', message)
		throw error
	}
}

export async function retryHealthImport(userId: string): Promise<number> {
	pushImportNotification('started', 'Retrying failed imports')

	const count = (
		await processImportQueueWithProgress(userId, {
			parallel: 2,
			retryFailedOnly: true,
			onDocumentProgress: async () => {
				invalidateAfterHealthImport(userId)
			},
		})
	).importedThisRun

	pushImportNotification('retry_complete', `Retried ${count} failed import(s)`)
	invalidateHealthKnowledgeCache(userId)
	invalidateAfterHealthImport(userId)

	return count
}
