import type { HealthReport } from '@/features/document-intelligence/domain'
import type { OcrDocumentResult } from '@/features/document-intelligence/ocr'

export interface HealthReportParserInput {
	documentId: string
	fileName: string
	ocrDocument: OcrDocumentResult
}

export interface HealthReportParser {
	parse(input: HealthReportParserInput): Promise<HealthReport>
}
