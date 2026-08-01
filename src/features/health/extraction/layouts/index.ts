export type {
	LabLayoutId,
	LabLayoutExtractor,
	LayoutExtractionResult,
	LayoutExtractorInput,
	RawMetricRow,
} from '@/features/health/extraction/layouts/layout-extractor.types'
export {
	extractMetricsFromLayouts,
	formatLayoutExtractionSummary,
} from '@/features/health/extraction/layouts/layout-extractor.registry'
export { extractVerticalBlockMetrics } from '@/features/health/extraction/layouts/vertical-block.layout'
export { extractSpacedHorizontalMetrics } from '@/features/health/extraction/layouts/spaced-horizontal.layout'
export { extractGluedHorizontalMetrics } from '@/features/health/extraction/layouts/glued-horizontal.layout'
export { extractOcrTableMetrics } from '@/features/health/extraction/layouts/ocr-table.layout'
export { extractLooseTextMetrics } from '@/features/health/extraction/layouts/loose-text.layout'
