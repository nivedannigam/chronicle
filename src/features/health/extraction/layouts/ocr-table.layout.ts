import type { OcrTable } from '@/features/document-intelligence/ocr'
import type {
	LabLayoutExtractor,
	RawMetricRow,
} from '@/features/health/extraction/layouts/layout-extractor.types'

const LAYOUT_ID = 'ocr-table' as const

function getTableCell(
	table: OcrTable,
	row: number,
	column: number,
): string | null {
	const cell = table.cells.find(
		(item) => item.row === row && item.column === column,
	)

	return cell?.text?.trim() ?? null
}

export function extractOcrTableMetrics(tables: OcrTable[]): RawMetricRow[] {
	const rows: RawMetricRow[] = []

	for (const table of tables) {
		for (let row = 1; row < table.rows; row += 1) {
			const rawName = getTableCell(table, row, 0)
			const value = getTableCell(table, row, 1)
			const referenceRange = getTableCell(table, row, 2) ?? ''
			const unit = getTableCell(table, row, 3)

			if (!rawName || !value) {
				continue
			}

			const cellConfidence = table.cells
				.filter((cell) => cell.row === row)
				.map((cell) => cell.confidence ?? 0.95)
			const confidence =
				cellConfidence.length > 0
					? cellConfidence.reduce((sum, item) => sum + item, 0) /
						cellConfidence.length
					: 0.95

			rows.push({
				rawName,
				value,
				referenceRange,
				unit,
				confidence,
				source: 'table',
				layoutId: LAYOUT_ID,
			})
		}
	}

	return rows
}

export const ocrTableLayoutExtractor: LabLayoutExtractor = {
	id: LAYOUT_ID,
	priority: 95,
	extract({ tables }) {
		return extractOcrTableMetrics(tables)
	},
}
