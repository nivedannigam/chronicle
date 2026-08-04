import { describe, expect, it } from 'vitest'
import {
	AI_REPROCESS_FAILED_USER_MESSAGE,
	getHealthReportFailureMessage,
	OCR_FAILED_USER_MESSAGE,
	PARSING_FAILED_USER_MESSAGE,
	reportEligibleForAiReprocess,
	reportFailedAtOcrStage,
	toAiReprocessUserFacingError,
	resolveAiExtractedMetrics,
	validateAiExtractedMetrics,
} from '@/features/health/services/health-ai-extraction.service'
import type { UploadedHealthReport } from '@/features/health/types'

describe('health-ai-extraction.service', () => {
	it('allows AI reprocess when stored OCR text exists', () => {
		const eligible = {
			extracted_text: 'HEMOGLOBIN 13.5 g/dL',
			storage_path: 'user/report.pdf',
			status: 'failed',
		} as UploadedHealthReport

		expect(reportEligibleForAiReprocess(eligible)).toBe(true)
	})

	it('allows AI reprocess for OCR-failed reports with a stored file', () => {
		const ocrFailed = {
			extracted_text: null,
			storage_path: 'user/report.pdf',
			status: 'failed',
		} as UploadedHealthReport

		expect(reportEligibleForAiReprocess(ocrFailed)).toBe(true)
		expect(reportFailedAtOcrStage(ocrFailed)).toBe(true)
	})

	it('rejects AI reprocess without a stored file', () => {
		const ineligible = {
			extracted_text: null,
			storage_path: '',
			status: 'failed',
		} as UploadedHealthReport

		expect(reportEligibleForAiReprocess(ineligible)).toBe(false)
	})

	it('maps OCR and parsing failures to friendly messages', () => {
		expect(
			getHealthReportFailureMessage({
				status: 'failed',
				extracted_text: null,
			} as UploadedHealthReport),
		).toBe(OCR_FAILED_USER_MESSAGE)

		expect(
			getHealthReportFailureMessage({
				status: 'failed',
				extracted_text: 'HEMOGLOBIN 13.5',
			} as UploadedHealthReport),
		).toBe(PARSING_FAILED_USER_MESSAGE)
	})

	it('maps unknown AI errors to a friendly message', () => {
		expect(toAiReprocessUserFacingError(new Error('Gemini 500'))).toBe(
			AI_REPROCESS_FAILED_USER_MESSAGE,
		)
		expect(
			toAiReprocessUserFacingError(new Error(OCR_FAILED_USER_MESSAGE)),
		).toBe(OCR_FAILED_USER_MESSAGE)
	})

	it('validates AI metrics with names and values', () => {
		const metrics = validateAiExtractedMetrics([
			{
				rawName: 'HEMOGLOBIN',
				displayName: 'Hemoglobin',
				value: '13.5',
				unit: 'g/dL',
				referenceRange: {
					rawText: '12-16',
					lowerLimit: 12,
					upperLimit: 16,
					unit: 'g/dL',
				},
				status: 'normal',
			},
		])

		expect(metrics).toHaveLength(1)
	})

	it('rejects empty AI metric payloads', () => {
		expect(() => validateAiExtractedMetrics([])).toThrow(
			/no usable laboratory metrics/i,
		)
	})

	it('allows empty AI metrics for metricless report types', () => {
		const metrics = resolveAiExtractedMetrics({
			metrics: [],
			report: {
				file_name: '2023 - 2026 Health Summary.pdf',
				parsed_data: {
					metrics: [],
					metadata: { reportType: 'health-summary' },
				},
			} as unknown as UploadedHealthReport,
		})

		expect(metrics).toEqual([])
	})
})
