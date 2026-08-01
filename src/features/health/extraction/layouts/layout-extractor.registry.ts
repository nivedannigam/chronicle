import type {
	LayoutExtractionResult,
	LayoutExtractorInput,
	LabLayoutId,
	RawMetricRow,
} from '@/features/health/extraction/layouts/layout-extractor.types'
import { dedupeMetricRows } from '@/features/health/extraction/layouts/layout-extractor.utils'
import { gluedHorizontalLayoutExtractor } from '@/features/health/extraction/layouts/glued-horizontal.layout'
import { looseTextLayoutExtractor } from '@/features/health/extraction/layouts/loose-text.layout'
import { ocrTableLayoutExtractor } from '@/features/health/extraction/layouts/ocr-table.layout'
import { spacedHorizontalLayoutExtractor } from '@/features/health/extraction/layouts/spaced-horizontal.layout'
import { verticalBlockLayoutExtractor } from '@/features/health/extraction/layouts/vertical-block.layout'

const LAYOUT_EXTRACTORS = [
	ocrTableLayoutExtractor,
	verticalBlockLayoutExtractor,
	spacedHorizontalLayoutExtractor,
	gluedHorizontalLayoutExtractor,
	looseTextLayoutExtractor,
].sort((a, b) => b.priority - a.priority)

function countByLayout(
	rows: RawMetricRow[],
): Partial<Record<LabLayoutId, number>> {
	const counts: Partial<Record<LabLayoutId, number>> = {}

	for (const row of rows) {
		const id = row.layoutId ?? 'loose-text'

		counts[id] = (counts[id] ?? 0) + 1
	}

	return counts
}

export function extractMetricsFromLayouts(
	input: LayoutExtractorInput,
): LayoutExtractionResult {
	const allRows: RawMetricRow[] = []
	const strategiesUsed = new Set<LabLayoutId>()

	for (const extractor of LAYOUT_EXTRACTORS) {
		const rows = extractor.extract(input)

		if (rows.length > 0) {
			strategiesUsed.add(extractor.id)
			allRows.push(...rows)
		}
	}

	const deduped = dedupeMetricRows(allRows)

	return {
		rows: deduped,
		strategiesUsed: [...strategiesUsed],
	}
}

export function formatLayoutExtractionSummary(
	rows: RawMetricRow[],
	strategiesUsed: LabLayoutId[],
): string {
	if (rows.length === 0) {
		return 'No metric rows identified in OCR output.'
	}

	const counts = countByLayout(rows)
	const parts = strategiesUsed.map((id) => `${id} (${counts[id] ?? 0})`)

	return `Extracted ${rows.length} metric row(s) via layout extractors: ${parts.join(', ')}.`
}
