import { describe, expect, it } from 'vitest'
import { describeImportJourneyResult } from '@/features/health-import/services/import-journey-summary'
import type { ImportJourneyResult } from '@/features/health-import/types/health-import-journey.types'

function createResult(
	overrides: Partial<ImportJourneyResult>,
): ImportJourneyResult {
	return {
		outcome: 'success',
		filesFound: 0,
		documentsScanned: 0,
		importCandidates: 0,
		medicalReports: 0,
		needsReview: 0,
		skippedIgnored: 0,
		reportsImported: 0,
		importedThisRun: 0,
		failedThisRun: 0,
		skippedThisRun: 0,
		autoApprovedCount: 0,
		metricsExtracted: 0,
		failedCount: 0,
		errorMessage: null,
		phasesCompleted: [],
		phasesSucceeded: [],
		...overrides,
	}
}

describe('describeImportJourneyResult', () => {
	it('describes failed imports with the primary error', () => {
		const summary = describeImportJourneyResult(
			createResult({
				outcome: 'failed',
				failedThisRun: 1,
				primaryError: 'No laboratory metrics were extracted.',
			}),
		)

		expect(summary.tone).toBe('error')
		expect(summary.message).toContain('No laboratory metrics')
	})

	it('describes reprocessed success', () => {
		const summary = describeImportJourneyResult(
			createResult({
				outcome: 'success',
				importedThisRun: 1,
				metricsExtracted: 72,
			}),
		)

		expect(summary.tone).toBe('success')
		expect(summary.message).toContain('Imported 1 report')
	})
})
