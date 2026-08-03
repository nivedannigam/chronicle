import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import { extractMetricsFromLayouts } from '@/features/health/extraction/layouts/layout-extractor.registry'

const DOWNLOAD_DIR =
	'c:/Users/nived/Downloads/drive-download-20260801T110514Z-1-001'

function simulateDocumentAiSpacing(text: string): string {
	return text
		.replace(/([A-Za-z)]):([\d.])/g, '$1: $2')
		.replace(/([\d.])(ug\/dl|ng\/mL|mg\/dL)/gi, '$1 $2')
		.replace(/(ug\/dl|ng\/mL|mg\/dL)([\d.<>])/gi, '$1 $2')
}

describe('user Qtest/Svasth PDF extraction', () => {
	it('extracts iron and CEA from downloaded PDFs', async () => {
		const ironPath = `${DOWNLOAD_DIR}/Iron Test 2026.pdf`
		const ceaPath = `${DOWNLOAD_DIR}/CEA Test Feb 2026.pdf`

		if (!existsSync(ironPath) || !existsSync(ceaPath)) {
			return
		}

		for (const [fileName, filePath] of [
			['Iron Test 2026.pdf', ironPath],
			['CEA Test Feb 2026.pdf', ceaPath],
		] as const) {
			const parsed = await pdfParse(readFileSync(filePath))

			for (const variant of ['native', 'spaced'] as const) {
				const rawText =
					variant === 'native'
						? (parsed.text ?? '')
						: simulateDocumentAiSpacing(parsed.text ?? '')
				const { rows } = extractMetricsFromLayouts({
					rawText,
					tables: [],
					fileName,
				})

				expect(rows.length, `${fileName} ${variant}`).toBeGreaterThan(0)
			}
		}
	})
})
