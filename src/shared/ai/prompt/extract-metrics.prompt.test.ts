import { describe, expect, it } from 'vitest'
import {
	buildExtractMetricsPrompt,
	parseExtractMetricsModelJson,
} from '@/shared/ai/prompt/extract-metrics.prompt'

describe('extract-metrics.prompt', () => {
	it('builds system and user messages', () => {
		const messages = buildExtractMetricsPrompt({
			extractedText: 'HEMOGLOBIN 13.5 g/dL',
			fileName: 'Jun 2025 - Full Body Checkup.pdf',
		})

		expect(messages).toHaveLength(2)
		expect(messages[0]?.role).toBe('system')
		expect(messages[1]?.content).toContain('Jun 2025 - Full Body Checkup.pdf')
		expect(messages[1]?.content).toContain('HEMOGLOBIN 13.5 g/dL')
	})

	it('parses fenced JSON model output', () => {
		const parsed = parseExtractMetricsModelJson(`\`\`\`json
{
  "metrics": [
    {
      "name": "HEMOGLOBIN",
      "result": 13.5,
      "unit": "g/dL",
      "referenceRange": "12-16",
      "status": "normal"
    }
  ],
  "metadata": { "laboratory": "Thyrocare", "reportType": "general" },
  "warnings": []
}
\`\`\``)

		expect(parsed.metrics).toHaveLength(1)
		expect(parsed.metrics[0]?.value).toBe('13.5')
		expect(parsed.metadata.laboratory).toBe('Thyrocare')
	})

	it('returns empty metrics for empty model output', () => {
		const parsed = parseExtractMetricsModelJson('   ')

		expect(parsed.metrics).toEqual([])
		expect(parsed.warnings).toContain('empty_model_response')
	})

	it('throws for invalid JSON', () => {
		expect(() => parseExtractMetricsModelJson('not json')).toThrow(
			/invalid JSON/i,
		)
	})
})
