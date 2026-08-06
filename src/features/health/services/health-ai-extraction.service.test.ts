import { describe, expect, it, vi } from 'vitest'
import {
	AI_REPROCESS_FAILED_USER_MESSAGE,
	buildHealthReportWithAiDefaultExtraction,
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
import type { HealthReport } from '@/features/document-intelligence/domain/health-report.domain'

vi.mock('@/shared/ai/transport/extract-metrics-ai-edge.client', () => ({
	invokeExtractMetricsAiEdgeFunction: vi.fn(),
	ExtractMetricsAiInvokeError: class ExtractMetricsAiInvokeError extends Error {},
}))

import { invokeExtractMetricsAiEdgeFunction } from '@/shared/ai/transport/extract-metrics-ai-edge.client'

const mockedInvoke = vi.mocked(invokeExtractMetricsAiEdgeFunction)

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

	it('skips AI extraction for TMT reports', async () => {
		const layoutReport = {
			id: 'r1',
			documentId: 'r1',
			metadata: {
				reportType: 'general',
				laboratory: '',
				reportDate: '2026-02-01',
				collectionDate: null,
				referenceNumber: null,
				patientName: null,
				doctorName: null,
				testNames: [],
				sourceDocumentId: 'r1',
				parserVersion: 'test',
				ocrConfidence: 0,
				pageCount: 1,
				ocrProvider: 'google',
				ocrProcessingTimeMs: 0,
			},
			metrics: [],
			metricResults: [],
			extractedText: 'TMT negative for ischemia',
			createdAt: '2026-02-01T00:00:00.000Z',
		} as HealthReport

		const result = await buildHealthReportWithAiDefaultExtraction({
			report: {
				id: 'r1',
				file_name: 'Feb 2026 - TMT.pdf',
				extracted_text: 'TMT negative for ischemia',
			} as UploadedHealthReport,
			layoutReport,
		})

		expect(mockedInvoke).not.toHaveBeenCalled()
		expect(result.debug?.extractionMethod).toBe('deterministic')
	})

	it('invokes AI for full-body lab reports', async () => {
		const aiMetrics = [
			'CREATININE',
			'TSH',
			'LDL',
			'ALT',
			'HBA1C',
			...Array.from({ length: 12 }, (_, index) => `METRIC_${index}`),
		].map((name) => ({
			rawName: name,
			displayName: name,
			value: '1',
			unit: '',
			referenceRange: {
				rawText: '',
				lowerLimit: null,
				upperLimit: null,
				unit: null,
			},
			status: 'normal' as const,
		}))

		mockedInvoke.mockResolvedValueOnce({
			metrics: aiMetrics,
			metadata: { reportType: 'general', laboratory: 'Thyrocare' },
			warnings: [],
			model: 'gemini',
			usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
		})

		const layoutReport = {
			id: 'r2',
			documentId: 'r2',
			metadata: {
				reportType: 'general',
				laboratory: 'Thyrocare',
				reportDate: '2026-03-01',
				collectionDate: null,
				referenceNumber: null,
				patientName: null,
				doctorName: null,
				testNames: [],
				sourceDocumentId: 'r2',
				parserVersion: 'test',
				ocrConfidence: 0,
				pageCount: 1,
				ocrProvider: 'google',
				ocrProcessingTimeMs: 0,
			},
			metrics: [],
			metricResults: [],
			extractedText: 'CREATININE 0.9',
			createdAt: '2026-03-01T00:00:00.000Z',
		} as HealthReport

		const result = await buildHealthReportWithAiDefaultExtraction({
			report: {
				id: 'r2',
				file_name: 'Mar 2026 - Full Body Checkup.pdf',
				extracted_text: 'CREATININE 0.9 mg/dL',
			} as UploadedHealthReport,
			layoutReport,
		})

		expect(mockedInvoke).toHaveBeenCalledOnce()
		expect(result.debug?.extractionMethod).toBe('llm')
	})
})
