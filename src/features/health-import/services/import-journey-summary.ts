import type { ImportJourneyResult } from '@/features/health-import/types/health-import-journey.types'

export function describeImportJourneyResult(result: ImportJourneyResult): {
	tone: 'success' | 'warning' | 'error' | 'info'
	title: string
	message: string
} {
	switch (result.outcome) {
		case 'success':
			return {
				tone: 'success',
				title: 'Import complete',
				message:
					result.importedThisRun > 0
						? `Imported ${result.importedThisRun} report${result.importedThisRun === 1 ? '' : 's'} with ${result.metricsExtracted} organized metric${result.metricsExtracted === 1 ? '' : 's'}.`
						: 'Your health reports are ready on the dashboard.',
			}
		case 'partial_success':
			return {
				tone: 'warning',
				title: 'Import partially complete',
				message:
					result.primaryError ??
					`Imported ${result.importedThisRun}, but ${result.failedThisRun} report${result.failedThisRun === 1 ? '' : 's'} failed.`,
			}
		case 'failed':
			return {
				tone: 'error',
				title: 'Import failed',
				message:
					result.primaryError ??
					result.errorMessage ??
					'Could not extract metrics from your reports. Try reprocessing from Setup.',
			}
		case 'no_reports':
			return {
				tone: 'info',
				title: 'Nothing new to import',
				message:
					result.skippedThisRun > 0
						? `${result.skippedThisRun} duplicate file${result.skippedThisRun === 1 ? '' : 's'} skipped — all assigned reports are already in Chronicle.`
						: 'No new medical PDFs were found in your assigned folder.',
			}
		case 'candidates_found':
			return {
				tone: 'info',
				title: 'Reports need review',
				message: `${result.needsReview} report${result.needsReview === 1 ? '' : 's'} waiting for approval before import.`,
			}
		default:
			return {
				tone: 'info',
				title: 'Scan finished',
				message: 'Check import status below.',
			}
	}
}
