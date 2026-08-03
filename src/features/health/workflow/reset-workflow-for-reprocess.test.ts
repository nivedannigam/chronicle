import { describe, expect, it } from 'vitest'
import { canTransition } from '@/core/workflow'
import { shouldUseReportReprocess } from '@/features/health/workflow/reset-workflow-for-reprocess'

describe('workflow reprocess transitions', () => {
	it('allows READY → FAILED for reprocess reset', () => {
		expect(canTransition('READY', 'FAILED')).toBe(true)
	})

	it('allows FAILED → OCR and FAILED → PARSING for retry', () => {
		expect(canTransition('FAILED', 'OCR')).toBe(true)
		expect(canTransition('FAILED', 'PARSING')).toBe(true)
	})
})

describe('shouldUseReportReprocess', () => {
	it('prefers report reprocess when workflow is in-flight', () => {
		expect(
			shouldUseReportReprocess({
				reportId: 'report-1',
				workflowState: 'OCR',
				importStatus: 'ocr',
			}),
		).toBe(true)
	})

	it('prefers report reprocess when registry is parsing', () => {
		expect(
			shouldUseReportReprocess({
				reportId: 'report-1',
				workflowState: null,
				importStatus: 'parsing',
			}),
		).toBe(true)
	})

	it('prefers report reprocess for completed imports with a report', () => {
		expect(
			shouldUseReportReprocess({
				reportId: 'report-1',
				workflowState: 'READY',
				importStatus: 'completed',
			}),
		).toBe(true)
	})

	it('re-imports when download failed and no post-import work exists', () => {
		expect(
			shouldUseReportReprocess({
				reportId: 'report-1',
				workflowState: 'FAILED',
				importStatus: 'failed',
				failedStage: 'DOWNLOADING',
			}),
		).toBe(false)
	})

	it('reprocesses when parsing failed after report creation', () => {
		expect(
			shouldUseReportReprocess({
				reportId: 'report-1',
				workflowState: 'FAILED',
				importStatus: 'failed',
				failedStage: 'PARSING',
			}),
		).toBe(true)
	})

	it('returns false without a report id', () => {
		expect(
			shouldUseReportReprocess({
				reportId: null,
				workflowState: 'OCR',
				importStatus: 'ocr',
			}),
		).toBe(false)
	})
})
