import type {
	LabLayoutExtractor,
	RawMetricRow,
} from '@/features/health/extraction/layouts/layout-extractor.types'

const LAYOUT_ID = 'loose-text' as const

/** Fallback for reports with wide whitespace-separated columns. */
const METRIC_ROW_PATTERN =
	/^([A-Za-z0-9 ()/.%-]+?)\s{2,}(\S+)\s{2,}([\d.<>-]+(?:\s*-\s*[\d.]+)?)\s{2,}(.+)$/gm

export function extractLooseTextMetrics(text: string): RawMetricRow[] {
	const rows: RawMetricRow[] = []

	for (const match of text.matchAll(METRIC_ROW_PATTERN)) {
		const [, rawName, value, referenceRange, unit] = match

		rows.push({
			rawName: rawName.trim(),
			value: value.trim(),
			referenceRange: referenceRange.trim(),
			unit: unit.trim(),
			confidence: 0.88,
			source: 'text',
			layoutId: LAYOUT_ID,
		})
	}

	return rows
}

export const looseTextLayoutExtractor: LabLayoutExtractor = {
	id: LAYOUT_ID,
	priority: 70,
	extract({ rawText }) {
		return extractLooseTextMetrics(rawText)
	},
}
