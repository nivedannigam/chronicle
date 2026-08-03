import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import { normalizeDocumentAiOcrText } from '@/features/health/extraction/layouts/document-ai-text-normalizer'
import { extractMetricsFromLayouts } from '@/features/health/extraction/layouts/layout-extractor.registry'

const FIXTURE_DIR = path.resolve(process.cwd(), '_fixtures/lab-reports')

function toVerticalBlocks(text: string): string {
	const lines = text.split('\n')
	const output: string[] = []

	for (const line of lines) {
		const glued = line.match(
			/^([A-Za-z0-9 ()/.%-]{2,}?)\s*:?\s*([\d.]+)\s*([A-Za-z%/μ^³.]+)\s*([\d.]+\s*-\s*[\d.]+|[<>]\s*[\d.]+)?$/,
		)

		if (
			glued &&
			/^(IRON|UIBC|Ferritin|Iron Saturation|Total Iron Binding Capacity|Carcino Embryonic Antigen)/i.test(
				glued[1],
			)
		) {
			output.push(glued[1].trim(), glued[2], glued[3])

			if (glued[4]) {
				output.push(glued[4].replace(/\s+/g, ''))
			}

			continue
		}

		const ceaGlued = line.match(
			/^(Carcino Embryonic Antigen)\s*:?\s*([\d.]+)\s*(ng\/mL|ng\/ml)$/i,
		)

		if (ceaGlued) {
			output.push(ceaGlued[1], ceaGlued[2], ceaGlued[3])
			continue
		}

		output.push(line)
	}

	return output.join('\n')
}

describe('normalizeDocumentAiOcrText', () => {
	it('joins vertical Qtest iron panel blocks', () => {
		const vertical = `
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
		const { rows } = extractMetricsFromLayouts({
			rawText: normalized,
			tables: [],
			fileName: 'Iron Test 2026.pdf',
		})

		expect(rows.length).toBeGreaterThanOrEqual(2)
		expect(rows.map((row) => row.rawName.toUpperCase())).toContain('IRON')
	})

	it('extracts iron and CEA from fixture PDFs after vertical OCR simulation', async () => {
		for (const fileName of ['Iron Test 2026.pdf', 'CEA Test Feb 2026.pdf']) {
			const filePath = path.join(FIXTURE_DIR, fileName)

			if (!existsSync(filePath)) {
				continue
			}

			const parsed = await pdfParse(readFileSync(filePath))
			const vertical = toVerticalBlocks(parsed.text ?? '')
			const { rows } = extractMetricsFromLayouts({
				rawText: normalizeDocumentAiOcrText(vertical),
				tables: [],
				fileName,
			})

			expect(rows.length, fileName).toBeGreaterThan(0)
		}
	})
})
