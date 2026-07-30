import type {
	DocumentParser,
	DocumentTypeId,
	ParsedDocument,
	ParserInput,
} from '@chronicle/core-parser'
import { detectDocumentType } from '@chronicle/core-parser'
import type {
	HealthReport,
	ProcessingDebugInfo,
} from '@/features/health/domain/health-report.domain'
import {
	extractMetricsFromOcr,
	parseReportMetadata,
} from '@/features/health/extraction'

const PARSER_ID = 'health-report'
const PARSER_VERSION = '2.0.0-metric-extraction'

export class HealthReportParser implements DocumentParser<HealthReport> {
	readonly id = PARSER_ID
	readonly documentType: DocumentTypeId = 'health_report'
	readonly version = PARSER_VERSION

	canParse(input: ParserInput): boolean {
		return detectDocumentType(input) === 'health_report'
	}

	async parse(input: ParserInput): Promise<ParsedDocument<HealthReport>> {
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

		const healthReport: HealthReport = {
			id: crypto.randomUUID(),
			documentId: input.documentId,
			metadata,
			metrics: extraction.metrics,
			metricResults: extraction.metricResults,
			extractedText: input.ocrDocument.rawText,
			createdAt: new Date().toISOString(),
			debug,
		}

		return {
			documentType: 'health_report',
			documentId: input.documentId,
			parserId: this.id,
			parserVersion: this.version,
			extractedText: input.ocrDocument.rawText,
			payload: healthReport,
			metadata: {
				reportType: metadata.reportType,
				laboratory: metadata.laboratory,
				metricCount: extraction.metrics.length,
			},
		}
	}

	/** Legacy adapter for callers expecting HealthReport directly. */
	async parseLegacy(input: {
		documentId: string
		fileName: string
		ocrDocument: ParserInput['ocrDocument']
	}): Promise<HealthReport> {
		const parsed = await this.parse({
			documentId: input.documentId,
			fileName: input.fileName,
			mimeType: 'application/pdf',
			ocrDocument: input.ocrDocument,
		})

		return parsed.payload
	}
}

export const healthReportParser = new HealthReportParser()

/** @deprecated Use HealthReportParser */
export const HealthReportParserImpl = HealthReportParser
/** @deprecated Use healthReportParser */
export const mockHealthReportParser = healthReportParser
/** @deprecated Use HealthReportParser */
export const MockHealthReportParser = HealthReportParser

export type HealthReportParserInput = {
	documentId: string
	fileName: string
	ocrDocument: ParserInput['ocrDocument']
}
