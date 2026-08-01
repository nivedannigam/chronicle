import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import { extractMetricsFromLayouts } from '@/features/health/extraction/layouts/layout-extractor.registry'
import type { RawMetricRow } from '@/features/health/extraction/layouts/layout-extractor.types'

const FIXTURE_DIR = path.resolve(process.cwd(), '_fixtures/lab-reports')

const MINIMUM_PDFS = [
	'March 2026 - Thyrocare Test 2.pdf',
	'2023 Feb - Complete Blood Test.pdf',
	'2023 Feb - Serum Electrolytes.pdf',
	'2024 Mar - Full Body Checkup.pdf',
	'2025 Jun - Full Body Checkup.pdf',
	'Iron Test 2026.pdf',
	'Jan 2026.pdf',
	'2022 Jan - Complete Blood Test.pdf',
]

type CorpusRow = {
	filename: string
	pages: number
	metricCount: number
	strategies: string
	sampleMetrics: string
	layoutHint: string
}

async function extractPdfText(
	filePath: string,
): Promise<{ text: string; pages: number }> {
	const buffer = readFileSync(filePath)
	const parsed = await pdfParse(buffer)
	return { text: parsed.text ?? '', pages: parsed.numpages ?? 0 }
}

function sampleMetricNames(rows: RawMetricRow[]): string {
	return rows
		.slice(0, 5)
		.map((row) => row.rawName)
		.join('; ')
}

const fixturesPresent = existsSync(FIXTURE_DIR)

describe.skipIf(!fixturesPresent)('corpus-extraction integration', () => {
	it('runs layout extractors across lab-report PDF corpus', async () => {
		const pdfFiles = readdirSync(FIXTURE_DIR)
			.filter((name) => name.toLowerCase().endsWith('.pdf'))
			.sort()

		expect(pdfFiles.length).toBeGreaterThan(0)

		for (const name of MINIMUM_PDFS) {
			expect(pdfFiles, `missing minimum corpus PDF: ${name}`).toContain(name)
		}

		const table: CorpusRow[] = []

		for (const filename of pdfFiles) {
			const filePath = path.join(FIXTURE_DIR, filename)
			const { text, pages } = await extractPdfText(filePath)
			const { rows, strategiesUsed } = extractMetricsFromLayouts({
				rawText: text,
				tables: [],
				fileName: filename,
			})
			const layoutHint =
				rows.length === 0 ? text.replace(/\s+/g, ' ').trim().slice(0, 500) : ''

			table.push({
				filename,
				pages,
				metricCount: rows.length,
				strategies: strategiesUsed.join(', ') || '(none)',
				sampleMetrics: sampleMetricNames(rows),
				layoutHint,
			})
		}

		const header = [
			'filename',
			'pages',
			'strategies',
			'metric count',
			'sample metrics',
		]
		const colWidths = [
			Math.max(header[0].length, ...table.map((r) => r.filename.length)),
			5,
			24,
			12,
			40,
		]

		const formatRow = (cols: string[]) =>
			cols.map((col, i) => col.padEnd(colWidths[i] ?? 20)).join(' | ')

		console.log('\n=== Lab PDF corpus extraction ===\n')
		console.log(formatRow(header))
		console.log(colWidths.map((w) => '-'.repeat(w)).join('-+-'))

		for (const row of table) {
			console.log(
				formatRow([
					row.filename,
					String(row.pages),
					row.strategies,
					String(row.metricCount),
					row.sampleMetrics || '(none)',
				]),
			)
			if (row.layoutHint) {
				console.log(`  layout hint (${row.filename}): ${row.layoutHint}`)
			}
		}

		console.log('\n=== End corpus table ===\n')

		const march2026 = table.find(
			(r) => r.filename === 'March 2026 - Thyrocare Test 2.pdf',
		)
		if (march2026) {
			expect(march2026.metricCount).toBeGreaterThan(15)
		}

		const ironTest = table.find((r) => r.filename === 'Iron Test 2026.pdf')
		if (ironTest) {
			expect(ironTest.metricCount).toBeGreaterThan(0)
		}

		const feb2023 = table.find(
			(r) => r.filename === '2023 Feb - Complete Blood Test.pdf',
		)
		if (feb2023) {
			expect(feb2023.metricCount).toBeGreaterThan(10)
		}
	}, 120_000)
})
