import {
	detectMissingPanels,
	extractReportConfidences,
} from '@/features/health-knowledge/engines/confidence.model'
import type {
	HealthKnowledgeLimitation,
	HealthKnowledgeReportRef,
	KnowledgeLimitationCode,
} from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { HealthCoverageSnapshot } from '@/features/health/types/health-coverage.types'
import type { HealthKnowledgeMetric } from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { UploadedHealthReport } from '@/features/health/types'

function limitation(
	code: KnowledgeLimitationCode,
	message: string,
	severity: HealthKnowledgeLimitation['severity'] = 'info',
): HealthKnowledgeLimitation {
	return { code, message, severity }
}

export function buildKnowledgeLimitations(input: {
	reports: HealthKnowledgeReportRef[]
	metrics: HealthKnowledgeMetric[]
	coverage: HealthCoverageSnapshot
	uploadedReports: UploadedHealthReport[]
	processingCount: number
}): HealthKnowledgeLimitation[] {
	const limitations: HealthKnowledgeLimitation[] = []
	const displayReadyReports = input.reports.filter(
		(report) => report.isDisplayReady,
	)

	if (displayReadyReports.length === 0) {
		limitations.push(
			limitation(
				'no_reports',
				'No display-ready health reports available.',
				input.reports.length > 0 ? 'warning' : 'info',
			),
		)
	}

	if (displayReadyReports.length === 1) {
		limitations.push(
			limitation(
				'single_report',
				'Only one report available — trend and comparison analysis is limited.',
			),
		)
	}

	if (displayReadyReports.length >= 2) {
		const hasHistoricalComparison = input.metrics.some((metric) => {
			const sameCanonical = input.metrics.filter(
				(item) => item.canonicalId === metric.canonicalId,
			)
			const reportIds = new Set(sameCanonical.map((item) => item.reportId))
			return reportIds.size >= 2
		})

		if (!hasHistoricalComparison) {
			limitations.push(
				limitation(
					'no_previous_comparison',
					'No overlapping metrics across reports for longitudinal comparison.',
				),
			)
		}
	}

	const panels = detectMissingPanels(input.metrics)

	if (panels.missingLipid && displayReadyReports.length > 0) {
		limitations.push(
			limitation(
				'missing_lipid_profile',
				'Lipid profile not found in available reports.',
			),
		)
	}

	if (panels.missingDiabetes && displayReadyReports.length > 0) {
		limitations.push(
			limitation(
				'missing_diabetes_panel',
				'Diabetes markers (HbA1c / glucose) not found in available reports.',
			),
		)
	}

	if (panels.missingThyroid && displayReadyReports.length > 0) {
		limitations.push(
			limitation(
				'missing_thyroid_panel',
				'Thyroid panel not found in available reports.',
			),
		)
	}

	for (const report of input.reports) {
		const uploaded = input.uploadedReports.find((item) => item.id === report.id)
		const confidences = uploaded ? extractReportConfidences(uploaded) : null

		if (confidences?.ocrConfidence != null && confidences.ocrConfidence < 0.5) {
			limitations.push(
				limitation(
					'low_ocr_confidence',
					'OCR confidence is low for one or more reports.',
					'warning',
				),
			)
			break
		}

		if (
			confidences?.parserConfidence != null &&
			confidences.parserConfidence >= 0.4 &&
			confidences.parserConfidence < 0.7
		) {
			limitations.push(
				limitation(
					'medium_parser_confidence',
					'Parser confidence is medium for one or more reports.',
				),
			)
			break
		}
	}

	if (input.coverage.failedCount > 0) {
		limitations.push(
			limitation(
				'import_failures',
				`${input.coverage.failedCount} import failure${input.coverage.failedCount === 1 ? '' : 's'} — corpus is incomplete.`,
				'warning',
			),
		)
	}

	const partialReports = input.reports.filter(
		(report) => report.badgeStatus === 'partial',
	)

	if (partialReports.length > 0) {
		limitations.push(
			limitation(
				'partial_report',
				`${partialReports.length} report${partialReports.length === 1 ? '' : 's'} have partially classified metrics.`,
				'warning',
			),
		)
	}

	if (input.coverage.reportsNeedingReprocess.length > 0) {
		limitations.push(
			limitation(
				'reprocess_needed',
				`${input.coverage.reportsNeedingReprocess.length} report${input.coverage.reportsNeedingReprocess.length === 1 ? '' : 's'} need reprocessing.`,
				'warning',
			),
		)
	}

	if (input.processingCount > 0) {
		limitations.push(
			limitation(
				'processing_in_progress',
				`${input.processingCount} report${input.processingCount === 1 ? '' : 's'} still processing.`,
			),
		)
	}

	if (
		input.coverage.corpusCompleteness === 'partial' &&
		input.coverage.discoveredCount > input.coverage.displayReadyCount
	) {
		limitations.push(
			limitation(
				'incomplete_corpus',
				`Only ${input.coverage.displayReadyCount} of ${input.coverage.discoveredCount} discovered files are fully usable.`,
				'warning',
			),
		)
	}

	return dedupeLimitations(limitations)
}

function dedupeLimitations(
	limitations: HealthKnowledgeLimitation[],
): HealthKnowledgeLimitation[] {
	const seen = new Set<KnowledgeLimitationCode>()
	const result: HealthKnowledgeLimitation[] = []

	for (const item of limitations) {
		if (seen.has(item.code)) {
			continue
		}

		seen.add(item.code)
		result.push(item)
	}

	return result
}
