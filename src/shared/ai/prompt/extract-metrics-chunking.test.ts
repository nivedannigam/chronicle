import { describe, expect, it } from 'vitest'
import {
	mergeAiExtractedMetrics,
	splitOcrTextForExtraction,
	EXTRACT_METRICS_CHUNK_SIZE,
} from '@/shared/ai/prompt/extract-metrics-chunking'

describe('extract-metrics-chunking', () => {
	const emptyRange = {
		rawText: '',
		lowerLimit: null,
		upperLimit: null,
		unit: null,
	}

	it('returns a single chunk for short OCR text', () => {
		const text = 'HEMOGLOBIN 13.5 g/dL'
		expect(splitOcrTextForExtraction(text)).toEqual([text])
	})

	it('splits long OCR text into overlapping chunks', () => {
		const text = 'A'.repeat(EXTRACT_METRICS_CHUNK_SIZE + 500)
		const chunks = splitOcrTextForExtraction(text)

		expect(chunks.length).toBeGreaterThan(1)
		expect(chunks[0]?.length).toBe(EXTRACT_METRICS_CHUNK_SIZE)
	})

	it('merges metrics from two chunks without duplicates', () => {
		const merged = mergeAiExtractedMetrics([
			[
				{
					rawName: 'HEMOGLOBIN',
					displayName: 'Hemoglobin',
					value: '13.5',
					unit: 'g/dL',
					referenceRange: emptyRange,
					status: 'normal',
				},
				{
					rawName: 'CREATININE',
					displayName: 'Creatinine',
					value: '0.9',
					unit: 'mg/dL',
					referenceRange: emptyRange,
					status: 'normal',
				},
			],
			[
				{
					rawName: 'hemoglobin',
					displayName: 'Hemoglobin',
					value: '13.6',
					unit: 'g/dL',
					referenceRange: emptyRange,
					status: 'normal',
				},
				{
					rawName: 'TSH',
					displayName: 'TSH',
					value: '2.1',
					unit: 'mIU/L',
					referenceRange: emptyRange,
					status: 'normal',
				},
			],
		])

		expect(merged).toHaveLength(3)
		expect(
			merged.find((metric) => metric.rawName === 'hemoglobin')?.value,
		).toBe('13.6')
	})
})
