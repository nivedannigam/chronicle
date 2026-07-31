import { supabase } from '@/lib/supabase'
import { enqueueHealthReportProcessing } from '@/features/health/services/health-processing.service'
import { buildHealthKnowledgeGraph } from '@/features/health-knowledge/services/health-knowledge-builder'
import { loadPersistedKnowledgeGraph } from '@/features/health-knowledge/services/health-knowledge-persist.service'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import { fetchUploadedHealthReports } from '@/features/health/services/health-upload.service'
import type {
	ExtractionQualityItem,
	HealthValidationReport,
	IntegrityCheck,
	ValidationStage,
	ValidationStageStatus,
} from '@/features/health-validation/types/health-validation.types'

function stageStatus(passed: boolean, partial = false): ValidationStageStatus {
	if (passed) {
		return 'success'
	}

	return partial ? 'warning' : 'failed'
}

function deriveOverallStatus(stages: ValidationStage[]): ValidationStageStatus {
	if (stages.some((stage) => stage.status === 'failed')) {
		return 'failed'
	}

	if (stages.some((stage) => stage.status === 'warning')) {
		return 'warning'
	}

	if (
		stages.every(
			(stage) => stage.status === 'success' || stage.status === 'skipped',
		)
	) {
		return 'success'
	}

	return 'pending'
}

export async function runHealthDataValidation(
	userId: string,
): Promise<HealthValidationReport> {
	const errors: string[] = []
	const warnings: string[] = []

	const [discoveryResult, registryResult, reports, graphPersisted] =
		await Promise.all([
			supabase
				.from('health_discovery_runs')
				.select('*')
				.eq('user_id', userId)
				.order('started_at', { ascending: false })
				.limit(1)
				.maybeSingle(),
			supabase
				.from('connector_document_registry')
				.select('*')
				.eq('user_id', userId)
				.eq('connector_id', 'google-drive'),
			fetchUploadedHealthReports(),
			loadPersistedKnowledgeGraph(userId, null),
		])

	if (discoveryResult.error) {
		errors.push(`Discovery query failed: ${discoveryResult.error.message}`)
	}

	if (registryResult.error) {
		errors.push(`Registry query failed: ${registryResult.error.message}`)
	}

	const registry = registryResult.data ?? []
	const latestDiscovery = discoveryResult.data
	const completedReports = reports.filter(
		(report) => report.status === 'completed',
	)

	let totalMetrics = 0
	const extractionQuality: ExtractionQualityItem[] = []

	for (const report of completedReports) {
		const parsed = getParsedHealthReport(report)

		if (!parsed) {
			extractionQuality.push({
				reportId: report.id,
				fileName: report.file_name,
				ocrConfidence: report.ocr_confidence,
				metricCount: 0,
				unknownMetrics: [],
				patientMatchConfidence: null,
				errors: ['Parsed data unavailable'],
			})
			continue
		}

		totalMetrics += parsed.metrics.length
		const unknownMetrics = parsed.metrics
			.filter((metric) => !metric.canonicalId)
			.map((metric) => metric.rawName)

		extractionQuality.push({
			reportId: report.id,
			fileName: report.file_name,
			ocrConfidence: report.ocr_confidence,
			metricCount: parsed.metrics.length,
			unknownMetrics,
			patientMatchConfidence: parsed.metadata.patientName ? 0.85 : null,
			errors: parsed.debug?.warnings ?? [],
		})
	}

	const graph = buildHealthKnowledgeGraph({
		personId: userId,
		uploadedReports: reports,
	})

	const timelineEntries = graph.profile.metricHistories.reduce(
		(sum, history) => sum + history.observations.length,
		0,
	)

	const googleFilesFound = registry.length
	const medicalReports = registry.filter(
		(row) =>
			row.discovery_category === 'likely_medical' ||
			row.discovery_category === 'needs_review',
	).length
	const imported = registry.filter(
		(row) =>
			row.import_status === 'completed' || row.registry_status === 'completed',
	).length
	const ocrCompleted = completedReports.length

	const stages: ValidationStage[] = [
		{
			id: 'discovery',
			label: 'Discovery',
			status: latestDiscovery
				? latestDiscovery.status === 'completed'
					? 'success'
					: latestDiscovery.status === 'failed'
						? 'failed'
						: 'pending'
				: registry.length > 0
					? 'success'
					: 'failed',
			message: latestDiscovery
				? `Last scan ${latestDiscovery.status} · ${latestDiscovery.files_scanned ?? 0} files`
				: registry.length > 0
					? `${registry.length} files in registry`
					: 'No discovery run recorded',
			count: googleFilesFound,
		},
		{
			id: 'import',
			label: 'Import',
			status: stageStatus(imported > 0, imported === 0 && medicalReports > 0),
			message:
				imported > 0
					? `${imported} documents imported`
					: medicalReports > 0
						? `${medicalReports} awaiting import`
						: 'No documents imported',
			count: imported,
		},
		{
			id: 'ocr',
			label: 'OCR',
			status: stageStatus(ocrCompleted > 0, ocrCompleted < imported),
			message:
				ocrCompleted > 0
					? `${ocrCompleted} reports OCR processed`
					: 'No OCR completed reports',
			count: ocrCompleted,
		},
		{
			id: 'metrics',
			label: 'Metric Extraction',
			status: stageStatus(
				totalMetrics > 0,
				totalMetrics === 0 && ocrCompleted > 0,
			),
			message:
				totalMetrics > 0
					? `${totalMetrics} metrics extracted`
					: ocrCompleted > 0
						? 'OCR complete but no metrics extracted'
						: 'No metrics extracted',
			count: totalMetrics,
		},
		{
			id: 'knowledge-graph',
			label: 'Knowledge Graph',
			status: graphPersisted
				? 'success'
				: graph.profile.metricHistories.length > 0
					? 'warning'
					: 'failed',
			message: graphPersisted
				? `Persisted at ${new Date(graphPersisted.builtAt).toLocaleString()}`
				: graph.profile.metricHistories.length > 0
					? 'Graph built in memory but not persisted'
					: 'Knowledge graph empty',
			count: graph.profile.metricHistories.length,
		},
		{
			id: 'dashboard',
			label: 'Dashboard',
			status: stageStatus(
				timelineEntries > 0,
				timelineEntries === 0 && totalMetrics > 0,
			),
			message:
				timelineEntries > 0
					? `${timelineEntries} timeline entries ready`
					: totalMetrics > 0
						? 'Metrics exist but timeline empty'
						: 'Dashboard has no data',
			count: timelineEntries,
		},
	]

	const integrityChecks = buildIntegrityChecks(
		registry,
		reports,
		graph.profile.reportIds,
	)

	for (const check of integrityChecks.filter((item) => !item.passed)) {
		warnings.push(`${check.label}: ${check.detail}`)
	}

	for (const item of extractionQuality.filter(
		(entry) => entry.errors.length > 0,
	)) {
		warnings.push(`${item.fileName}: ${item.errors.join(', ')}`)
	}

	return {
		generatedAt: new Date().toISOString(),
		overallStatus: deriveOverallStatus(stages),
		stages,
		stats: {
			googleFilesFound,
			medicalReports,
			imported,
			ocrCompleted,
			metricsExtracted: totalMetrics,
			timelineEntries,
			knowledgeGraphNodes: graph.profile.metricHistories.length,
		},
		errors,
		warnings,
		integrityChecks,
		extractionQuality,
	}
}

function buildIntegrityChecks(
	registry: Array<Record<string, unknown>>,
	reports: Awaited<ReturnType<typeof fetchUploadedHealthReports>>,
	linkedReportIds: string[],
): IntegrityCheck[] {
	const checks: IntegrityCheck[] = []

	const duplicateFileIds = findDuplicates(
		registry.map((row) => row.external_file_id as string),
	)
	checks.push({
		id: 'no-duplicate-reports',
		label: 'No duplicate reports',
		passed: duplicateFileIds.length === 0,
		detail:
			duplicateFileIds.length === 0
				? 'All Google file IDs are unique'
				: `${duplicateFileIds.length} duplicate file IDs found`,
	})

	const checksumDupes = findDuplicates(
		registry
			.filter((row) => row.sha256_checksum)
			.map((row) => row.sha256_checksum as string),
	)
	checks.push({
		id: 'no-duplicate-checksums',
		label: 'No duplicate checksums',
		passed: checksumDupes.length === 0,
		detail:
			checksumDupes.length === 0
				? 'SHA256 checksums are unique'
				: `${checksumDupes.length} duplicate checksums`,
	})

	const orphanRegistry = registry.filter(
		(row) =>
			(row.import_status === 'completed' ||
				row.registry_status === 'completed') &&
			row.health_report_id &&
			!reports.some((report) => report.id === row.health_report_id),
	)
	checks.push({
		id: 'documents-linked',
		label: 'Documents linked to reports',
		passed: orphanRegistry.length === 0,
		detail:
			orphanRegistry.length === 0
				? 'All imported registry rows link to health reports'
				: `${orphanRegistry.length} orphan registry entries`,
	})

	const unlinkedReports = reports.filter(
		(report) =>
			report.status === 'completed' && !linkedReportIds.includes(report.id),
	)
	checks.push({
		id: 'reports-in-graph',
		label: 'Reports in knowledge graph',
		passed: unlinkedReports.length === 0 || linkedReportIds.length === 0,
		detail:
			unlinkedReports.length === 0
				? 'All completed reports linked in graph'
				: `${unlinkedReports.length} completed reports not in graph`,
	})

	const outOfOrder = findOutOfOrderTimelines(reports)
	checks.push({
		id: 'timeline-ordered',
		label: 'Timeline chronologically ordered',
		passed: outOfOrder.length === 0,
		detail:
			outOfOrder.length === 0
				? 'Report dates are ordered'
				: `${outOfOrder.length} reports out of chronological order`,
	})

	return checks
}

function findDuplicates(values: string[]): string[] {
	const seen = new Map<string, number>()

	for (const value of values) {
		seen.set(value, (seen.get(value) ?? 0) + 1)
	}

	return [...seen.entries()]
		.filter(([, count]) => count > 1)
		.map(([value]) => value)
}

function findOutOfOrderTimelines(
	reports: Awaited<ReturnType<typeof fetchUploadedHealthReports>>,
): string[] {
	const dated = reports
		.filter((report) => report.report_date || report.uploaded_at)
		.map((report) => ({
			id: report.id,
			date: Date.parse(report.report_date ?? report.uploaded_at),
		}))
		.sort((a, b) => a.date - b.date)

	const outOfOrder: string[] = []

	for (let index = 1; index < dated.length; index += 1) {
		if (dated[index]!.date < dated[index - 1]!.date) {
			outOfOrder.push(dated[index]!.id)
		}
	}

	return outOfOrder
}

export async function rerunReportOcr(
	userId: string,
	reportId: string,
): Promise<void> {
	await supabase
		.from('health_reports')
		.update({ status: 'queued', processing_error: null })
		.eq('id', reportId)
		.eq('user_id', userId)

	await enqueueHealthReportProcessing(userId, reportId)
}
