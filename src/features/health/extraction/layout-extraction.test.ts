import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import { extractGluedHorizontalMetrics } from '@/features/health/extraction/layouts/glued-horizontal.layout'
import { extractSpacedHorizontalMetrics } from '@/features/health/extraction/layouts/spaced-horizontal.layout'
import { extractMetricsFromLayouts } from '@/features/health/extraction/layouts/layout-extractor.registry'

const FIXTURE_DIR = path.resolve(process.cwd(), '_fixtures/lab-reports')

const IRON_TEST_SNIPPET = `
TestResultUnitBiological Ref. Range
IRON:102.74ug/dl33-193
UIBC:259.80ug/dl125-345
Total Iron Binding Capacity :363ug/dl255-450
Iron Saturation:28.30ug/dl12-50
Ferritin:95.05ng/mL30-240
`

const METROPOLIS_SNIPPET = `
BILIRUBIN TOTAL 1.40 # mg/dl [0.30-1.20]
SGOT 32 IU/L [15-41]
`

describe('layout extractors', () => {
	it('extracts Qtest iron panel from glued layout', () => {
		const rows = extractGluedHorizontalMetrics(IRON_TEST_SNIPPET)
		const names = rows.map((row) => row.rawName.toUpperCase())

		expect(names).toContain('IRON')
		expect(names).toContain('UIBC')
		expect(names).toContain('TOTAL IRON BINDING CAPACITY')
		expect(names).toContain('IRON SATURATION')
		expect(names).toContain('FERRITIN')
	})

	it('extracts Metropolis bracket layout via spaced-horizontal', () => {
		const rows = extractSpacedHorizontalMetrics(METROPOLIS_SNIPPET)
		const names = rows.map((row) => row.rawName.toUpperCase())

		expect(names).toContain('BILIRUBIN TOTAL')
		expect(names).toContain('SGOT')
	})

	it('merges all layout strategies without vendor gating', () => {
		const { rows, strategiesUsed } = extractMetricsFromLayouts({
			rawText: IRON_TEST_SNIPPET + METROPOLIS_SNIPPET,
			tables: [],
		})

		expect(strategiesUsed).toContain('glued-horizontal')
		expect(strategiesUsed).toContain('spaced-horizontal')
		expect(rows.length).toBeGreaterThanOrEqual(5)
	})

	it.skipIf(!existsSync(path.join(FIXTURE_DIR, 'Iron Test 2026.pdf')))(
		'extracts iron panel from real Iron Test PDF',
		async () => {
			const buffer = readFileSync(path.join(FIXTURE_DIR, 'Iron Test 2026.pdf'))
			const parsed = await pdfParse(buffer)
			const { rows } = extractMetricsFromLayouts({
				rawText: parsed.text ?? '',
				tables: [],
				fileName: 'Iron Test 2026.pdf',
			})
			const names = rows.map((row) => row.rawName.toUpperCase())

			expect(names).toContain('IRON')
			expect(names).toContain('UIBC')
			expect(names).toContain('FERRITIN')
			expect(rows.length).toBeGreaterThanOrEqual(5)
		},
	)
})
