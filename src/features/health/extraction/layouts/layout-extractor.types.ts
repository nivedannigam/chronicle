import type { OcrTable } from '@/features/document-intelligence/ocr'

export type LabLayoutId =
	| 'ocr-table'
	| 'vertical-block'
	| 'spaced-horizontal'
	| 'glued-horizontal'
	| 'loose-text'

export type RawMetricRow = {
	rawName: string
	value: string
	referenceRange: string
	unit: string | null
	confidence: number
	source: 'table' | 'text'
	layoutId?: LabLayoutId
}

export interface LayoutExtractorInput {
	rawText: string
	tables: OcrTable[]
	fileName?: string
}

export interface LabLayoutExtractor {
	id: LabLayoutId
	/** Higher priority wins dedupe conflicts. */
	priority: number
	extract(input: LayoutExtractorInput): RawMetricRow[]
}

export interface LayoutExtractionResult {
	rows: RawMetricRow[]
	strategiesUsed: LabLayoutId[]
}
