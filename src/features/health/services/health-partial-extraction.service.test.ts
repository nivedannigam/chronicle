import { describe, expect, it } from 'vitest'
import type { HealthMetric } from '@/features/health/domain/metric.types'
import {
	isSuspiciousPartialExtraction,
	reportNeedsAiExtractionBackfill,
	shouldSkipAiMetricExtraction,
} from '@/features/health/services/health-partial-extraction.service'
import type { UploadedHealthReport } from '@/features/health/types'

function metric(canonicalId: string, rawName = canonicalId): HealthMetric {
	return {
		id: canonicalId,
		canonicalId,
		displayName: rawName,
		rawName,
		value: '1',
		numericValue: 1,
		unit: null,
		referenceRange: {
			rawText: '',
			lowerLimit: null,
			upperLimit: null,
			unit: null,
		},
		status: 'normal',
		confidence: 0.9,
	}
}

describe('health-partial-extraction.service', () => {
	it('skips AI for TMT metricless reports', () => {
		expect(
			shouldSkipAiMetricExtraction({
				fileName: 'Feb 2026 - TMT.pdf',
				metadata: { reportType: 'general' },
			}),
		).toBe(true)
	})

	it('flags full-body reports with too few metrics', () => {
		const urineOnly = Array.from({ length: 10 }, (_, index) =>
			metric(`urine-${index}`, `Urine ${index}`),
		)

		expect(
			isSuspiciousPartialExtraction({
				fileName: 'Mar 2026 - Full Body Checkup.pdf',
				metrics: urineOnly,
			}),
		).toBe(true)
	})

	it('accepts full-body reports with enough core markers', () => {
		const panel = [
			metric('creatinine'),
			metric('tsh'),
			metric('ldl'),
			metric('alt'),
			metric('hba1c'),
			...Array.from({ length: 12 }, (_, index) =>
				metric(`other-${index}`, `Other ${index}`),
			),
		]

		expect(
			isSuspiciousPartialExtraction({
				fileName: 'Mar 2026 - Full Body Checkup.pdf',
				metrics: panel,
			}),
		).toBe(false)
	})

	it('queues backfill for completed full-body reports with low metric counts', () => {
		const report = {
			id: 'r1',
			status: 'completed',
			file_name: 'Feb 2026 - Fully Body Checkup.pdf',
			parsed_data: {
				metrics: Array.from({ length: 10 }, (_, index) => ({
					id: `m-${index}`,
					canonicalId: `urine-${index}`,
					displayName: `Urine ${index}`,
					rawName: `Urine ${index}`,
					value: '1',
					numericValue: 1,
					unit: null,
					referenceRange: {
						rawText: '',
						lowerLimit: null,
						upperLimit: null,
						unit: null,
					},
					status: 'normal',
					confidence: 0.5,
				})),
				metadata: { reportType: 'general' },
				debug: { extractionMethod: 'deterministic' },
			},
		} as unknown as UploadedHealthReport

		expect(reportNeedsAiExtractionBackfill(report)).toBe(true)
	})
})
