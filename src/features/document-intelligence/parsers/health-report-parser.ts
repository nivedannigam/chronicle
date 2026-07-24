import type {
	HealthReport,
	ProcessingDebugInfo,
} from '@/features/document-intelligence/domain/health-report.domain'
import {
	extractMetricsFromOcr,
	parseReportMetadata,
} from '@/features/document-intelligence/extraction'
import type {
	HealthReportParser,
	HealthReportParserInput,
} from '@/features/document-intelligence/parsers/health-report-parser.interface'

const PARSER_VERSION = '2.0.0-metric-extraction'

export class HealthReportParserImpl implements HealthReportParser {
	async parse(input: HealthReportParserInput): Promise<HealthReport> {
		const metadataFields = parseReportMetadata(
			input.ocrDocument,
			input.fileName,
		)
		const extraction = extractMetricsFromOcr(input.ocrDocument)

		const metadata = {
			...metadataFields,
			testNames: extraction.metrics.map((metric) => metric.displayName),
			sourceDocumentId: input.documentId,
			parserVersion: PARSER_VERSION,
			ocrConfidence: input.ocrDocument.confidence,
			pageCount: input.ocrDocument.pages.length,
			ocrProvider: input.ocrDocument.metadata.provider,
			ocrProcessingTimeMs: input.ocrDocument.processingTimeMs,
		}

		const debug: ProcessingDebugInfo | undefined = import.meta.env.DEV
			? {
					ocrProvider: input.ocrDocument.metadata.provider,
					ocrProcessingTimeMs: input.ocrDocument.processingTimeMs,
					ocrConfidence: input.ocrDocument.confidence,
					pageCount: input.ocrDocument.pages.length,
					tableCount: input.ocrDocument.tables.length,
					parsedFields: {
						reportType: metadata.reportType,
						laboratory: metadata.laboratory,
						reportDate: metadata.reportDate,
						collectionDate: metadata.collectionDate,
						referenceNumber: metadata.referenceNumber,
						patientName: metadata.patientName,
						doctorName: metadata.doctorName,
					},
					normalizationMap: extraction.normalizationMap,
					extractedMetricCount: extraction.metrics.length,
					warnings: extraction.warnings,
				}
			: undefined

		return {
			id: crypto.randomUUID(),
			documentId: input.documentId,
			metadata,
			metrics: extraction.metrics,
			metricResults: extraction.metricResults,
			extractedText: input.ocrDocument.rawText,
			createdAt: new Date().toISOString(),
			debug,
		}
	}
}

export const healthReportParser = new HealthReportParserImpl()

/** @deprecated */
export const MockHealthReportParser = HealthReportParserImpl
/** @deprecated */
export const mockHealthReportParser = healthReportParser
