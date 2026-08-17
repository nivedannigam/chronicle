import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import {
	hasVerticalMetricStack,
	looksLikeLabReportOcr,
	normalizeDocumentAiOcrText,
} from '@/features/health/extraction/layouts/document-ai-text-normalizer'
import { extractMetricsFromLayouts } from '@/features/health/extraction/layouts/layout-extractor.registry'

const FIXTURE_DIR = path.resolve(process.cwd(), '_fixtures/lab-reports')
const shouldRunPdfCorpusTests =
	process.env.CHRONICLE_PDF_FIXTURES === 'true' && existsSync(FIXTURE_DIR)

function simulateDocumentAiSpacing(text: string): string {
	return text
		.replace(/([A-Za-z)]):([\d.])/g, '$1: $2')
		.replace(/([\d.]+)(ug\/dl|ng\/mL|mg\/dL|U\/L|mmol\/l)/gi, '$1 $2')
		.replace(/(ug\/dl|ng\/mL|mg\/dL|U\/L|mmol\/l)([\d.<>-]+)/gi, '$1 $2')
}

function toVerticalBlocks(text: string): string {
	const lines = text.split('\n')
	const output: string[] = []

	for (const line of lines) {
		const glued = line.match(
			/^([A-Za-z0-9 ()/.%-]{2,}?)\s*:?\s*([\d.]+)\s*([A-Za-z%/μ^³.]+)\s*([\d.]+\s*-\s*[\d.]+|[<>]\s*[\d.]+)?$/,
		)

		if (glued && /[\d.]/.test(glued[2])) {
			output.push(glued[1].trim(), glued[2], glued[3])

			if (glued[4]) {
				output.push(glued[4].replace(/\s+/g, ''))
			}

			continue
		}

		output.push(line)
	}

	return output.join('\n')
}

describe('looksLikeLabReportOcr', () => {
	it('detects generic lab table headers without vendor names', () => {
		expect(
			looksLikeLabReportOcr(
				'Test Name          Result    Reference Range    Unit\nHemoglobin         14.1      13-17              g/dL',
			),
		).toBe(true)
	})

	it('detects Thyrocare-style headers', () => {
		expect(
			looksLikeLabReportOcr(
				'TEST NAME VALUE TECHNOLOGY UNITS Bio. Ref. Interval.',
			),
		).toBe(true)
	})

	it('does not flag unrelated documents', () => {
		expect(
			looksLikeLabReportOcr(
				'Face Match Score Customer Name Photo Id Reference Photo',
			),
		).toBe(false)
	})
})

describe('normalizeDocumentAiOcrText', () => {
	it('preserves CEA single-line glued metrics after spacing normalization', () => {
		const raw =
			'TestResultUnitBiological Ref. Range\nCarcino Embryonic Antigen:2.10ng/mL\nNon-Smoking : <3'
		const normalized = normalizeDocumentAiOcrText(raw)
		expect(normalized).toMatch(/Carcino Embryonic Antigen:\s*2\.10\s*ng\/mL/i)

		const { rows } = extractMetricsFromLayouts({
			rawText: raw,
			tables: [],
			fileName: 'CEA Test Feb 2026.pdf',
		})

		expect(rows.length).toBeGreaterThan(0)
		expect(rows[0]?.rawName).toMatch(/Carcino Embryonic Antigen/i)
	})

	it('does not break glued Thyrocare-style metrics like FASTING77mg/dL70-110', () => {
		const glued = 'GLUCOSE, FASTING77mg/dL70-110\nHAEMOGLOBIN13.5g/dL13-17'
		const { rows } = extractMetricsFromLayouts({
			rawText: glued,
			tables: [],
		})

		expect(rows.length).toBeGreaterThanOrEqual(2)
	})

	it('joins vertical metric blocks for any lab with unit columns', () => {
		const vertical = `
Test Name
Result
Reference Range
Unit
Total Cholesterol
192
mg/dL
<200
`

		expect(hasVerticalMetricStack(vertical)).toBe(true)

		const { rows } = extractMetricsFromLayouts({
			rawText: vertical,
			tables: [],
		})

		expect(rows.length).toBeGreaterThanOrEqual(1)
		expect(rows.map((row) => row.rawName.toLowerCase())).toContain(
			'total cholesterol',
		)
	})

	it('joins vertical Qtest iron panel blocks', () => {
		const vertical = `
TestResultUnitBiological Ref. Range
IRON
102.74
ug/dl
33-193
UIBC
259.80
ug/dl
125-345
`

		const normalized = normalizeDocumentAiOcrText(vertical)
		expect(normalized).toMatch(/IRON:102\.74ug\/dl33-193/i)
		expect(normalized).toMatch(/UIBC:259\.80ug\/dl125-345/i)

		const { rows } = extractMetricsFromLayouts({
			rawText: vertical,
			tables: [],
			fileName: 'Iron Test 2026.pdf',
		})

		expect(rows.length).toBeGreaterThanOrEqual(2)
		expect(rows.map((row) => row.rawName.toUpperCase())).toContain('IRON')
	})

	it('extracts metrics from fixture PDFs after Document AI simulations', async () => {
		for (const fileName of ['Iron Test 2026.pdf', 'CEA Test Feb 2026.pdf']) {
			const filePath = path.join(FIXTURE_DIR, fileName)

			if (!existsSync(filePath)) {
				continue
			}

			const parsed = await pdfParse(readFileSync(filePath))

			for (const variant of ['spaced', 'vertical'] as const) {
				const rawText =
					variant === 'spaced'
						? simulateDocumentAiSpacing(parsed.text ?? '')
						: toVerticalBlocks(parsed.text ?? '')

				const { rows } = extractMetricsFromLayouts({
					rawText,
					tables: [],
					fileName,
				})

				expect(rows.length, `${fileName} ${variant}`).toBeGreaterThan(0)
			}
		}
	})

	it('does not reduce extraction counts on native PDF corpus text', async () => {
		if (!shouldRunPdfCorpusTests) {
			return
		}

		const pdfFiles = readdirSync(FIXTURE_DIR).filter((name) =>
			name.toLowerCase().endsWith('.pdf'),
		)

		for (const fileName of pdfFiles) {
			const parsed = await pdfParse(
				readFileSync(path.join(FIXTURE_DIR, fileName)),
			)
			const rawText = parsed.text ?? ''
			const baseline = extractMetricsFromLayouts({ rawText, tables: [] }).rows
				.length
			const normalized = extractMetricsFromLayouts({
				rawText: normalizeDocumentAiOcrText(rawText),
				tables: [],
				fileName,
			}).rows.length

			expect(normalized, `${fileName} native`).toBeGreaterThanOrEqual(baseline)
		}
	})

	it('preserves extraction across full PDF corpus with Document AI spacing', async () => {
		if (!shouldRunPdfCorpusTests) {
			return
		}

		const pdfFiles = readdirSync(FIXTURE_DIR).filter((name) =>
			name.toLowerCase().endsWith('.pdf'),
		)

		for (const fileName of pdfFiles) {
			const parsed = await pdfParse(
				readFileSync(path.join(FIXTURE_DIR, fileName)),
			)
			const rawText = parsed.text ?? ''
			const baseline = extractMetricsFromLayouts({ rawText, tables: [] }).rows
				.length
			const spaced = simulateDocumentAiSpacing(rawText)
			const normalizedCount = extractMetricsFromLayouts({
				rawText: spaced,
				tables: [],
				fileName,
			}).rows.length

			if (baseline > 0) {
				expect(normalizedCount, fileName).toBeGreaterThan(0)
			}
		}
	})
})
