import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import { extractGluedHorizontalMetrics } from '@/features/health/extraction/layouts/glued-horizontal.layout'
import { extractSpacedHorizontalMetrics } from '@/features/health/extraction/layouts/spaced-horizontal.layout'
import { extractVerticalBlockMetrics } from '@/features/health/extraction/layouts/vertical-block.layout'
import { extractMetricsFromLayouts } from '@/features/health/extraction/layouts/layout-extractor.registry'
import { extractMetricsFromOcr } from '@/features/health/extraction/metric-extraction.engine'

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

const THYROCARE_URINE_SNIPPET = `
BILE SALT
ABSENT
Absent
-
Hays sulphur
BILE PIGMENT
ABSENT
Absent
-
Ehrlich reaction
BACTERIA
ABSENT
Absent
-
Microscopy
`

const THYROCARE_ELECTROLYTE_SNIPPET = `
143I.S.E
mmol/l
SODIUM
Adults: 136-145 mmol/l
Reference Range :
Method :
ION SELECTIVE ELECTRODE
4.6I.S.E
mmol/l
POTASSIUM
ADULTS: 3.5-5.1 MMOL/L
Reference Range :
Method :
ION SELECTIVE ELECTRODE
109I.S.E
mmol/l
CHLORIDE
ADULTS: 98-107 MMOL/L
`

const SVASTH_CEA_SNIPPET = `
TestResultUnitBiological Ref. Range
Carcino Embryonic Antigen:2.10ng/mL
Non-Smoking : <3
Smoking: <5
`

const QTEST_MULTI_LINE_SNIPPET = `
Test DescriptionValue(s)UnitsReference Range
BSF
Blood Glucose Fasting
Method : Enzymatic (Hexokinase)
89mg/dL70 - 110
`

const THYROCARE_URINE_METHOD_FIRST_SNIPPET = `
BACTERIA
Microscopy
ABSENT
-
BILE PIGMENT
Ehrlich reaction
ABSENT
-
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

	it('extracts Thyrocare I.S.E electrolyte panels from inverted vertical blocks', () => {
		const rows = extractVerticalBlockMetrics(THYROCARE_ELECTROLYTE_SNIPPET)
		const names = rows.map((row) => row.rawName.toUpperCase())

		expect(names).toContain('SODIUM')
		expect(names).toContain('POTASSIUM')
		expect(names).toContain('CHLORIDE')
		expect(rows.find((row) => row.rawName === 'SODIUM')?.value).toBe('143')
	})

	it('extracts Svasth CEA reports from glued name:value+unit lines', () => {
		const rows = extractGluedHorizontalMetrics(SVASTH_CEA_SNIPPET)
		const cea = rows.find((row) =>
			/carcino embryonic antigen/i.test(row.rawName),
		)

		expect(cea?.value).toBe('2.10')
		expect(cea?.unit).toMatch(/ng\/ml/i)
	})

	it('extracts Qtest multi-line panels when method lines sit between name and value', () => {
		const rows = extractGluedHorizontalMetrics(QTEST_MULTI_LINE_SNIPPET)
		const glucose = rows.find((row) =>
			/blood glucose fasting/i.test(row.rawName),
		)

		expect(glucose?.value).toBe('89')
		expect(glucose?.unit).toMatch(/mg\/dL/i)
	})

	it('parses Thyrocare urine qualitative rows as ABSENT values', () => {
		const rows = extractVerticalBlockMetrics(THYROCARE_URINE_SNIPPET)
		const bacteria = rows.find((row) => row.rawName === 'BACTERIA')
		const bilePigment = rows.find((row) => row.rawName === 'BILE PIGMENT')
		const bileSalt = rows.find((row) => row.rawName === 'BILE SALT')

		expect(bacteria?.value).toBe('ABSENT')
		expect(bilePigment?.value).toBe('ABSENT')
		expect(bileSalt?.value).toBe('ABSENT')
	})

	it('parses urine rows when OCR places method before qualitative result', () => {
		const rows = extractVerticalBlockMetrics(
			THYROCARE_URINE_METHOD_FIRST_SNIPPET,
		)
		const bacteria = rows.find((row) => row.rawName === 'BACTERIA')
		const bilePigment = rows.find((row) => row.rawName === 'BILE PIGMENT')

		expect(bacteria?.value).toBe('ABSENT')
		expect(bilePigment?.value).toBe('ABSENT')
	})

	it('marks qualitative ABSENT urine metrics as normal after extraction', () => {
		const extraction = extractMetricsFromOcr({
			rawText: THYROCARE_URINE_SNIPPET,
			pages: [],
			tables: [],
			confidence: 1,
			metadata: {
				provider: 'mock',
				mimeType: 'application/pdf',
				fileName: 'urine-panel.pdf',
				language: 'en',
				pageCount: 1,
				tableCount: 0,
			},
			processingTimeMs: 1,
		})
		const bacteria = extraction.metrics.find(
			(metric) => metric.rawName === 'BACTERIA',
		)

		expect(bacteria?.value).toBe('ABSENT')
		expect(bacteria?.status).toBe('normal')
	})

	it.skipIf(
		!existsSync(
			path.join(
				process.cwd(),
				'src/features/health/extraction/fixtures/thyrocare-combo-march-2026.ocr.txt',
			),
		),
	)(
		'extracts qualitative urine metrics from March 2026 Thyrocare fixture',
		() => {
			const fixturePath = path.join(
				process.cwd(),
				'src/features/health/extraction/fixtures/thyrocare-combo-march-2026.ocr.txt',
			)
			const rawText = readFileSync(fixturePath, 'utf8')
			const { rows } = extractMetricsFromLayouts({
				rawText,
				tables: [],
				fileName: 'March 2026 - Thyrocare Test 2.pdf',
			})
			const bacteria = rows.find((row) => row.rawName === 'BACTERIA')

			expect(rows.length).toBeGreaterThanOrEqual(75)
			expect(bacteria?.value).toBe('ABSENT')
		},
	)

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
