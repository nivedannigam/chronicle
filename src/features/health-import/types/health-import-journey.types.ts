export type ImportJourneyPhase =
	| 'assign'
	| 'scanning'
	| 'detection'
	| 'download'
	| 'ocr'
	| 'metrics'
	| 'summary'

export type ImportJourneyOutcome =
	'success' | 'partial_success' | 'failed' | 'no_reports' | 'candidates_found'

export interface ImportJourneyProgress {
	phase: ImportJourneyPhase
	detail: string | null
	phasesCompleted: ImportJourneyPhase[]
	phasesSucceeded: ImportJourneyPhase[]
}

export interface ImportJourneyResult {
	outcome: ImportJourneyOutcome
	filesFound: number
	documentsScanned: number
	importCandidates: number
	medicalReports: number
	needsReview: number
	skippedIgnored: number
	reportsImported: number
	importedThisRun: number
	failedThisRun: number
	skippedThisRun: number
	autoApprovedCount: number
	metricsExtracted: number
	failedCount: number
	errorMessage: string | null
	primaryError?: string | null
	errorSamples?: string[]
	phasesCompleted: ImportJourneyPhase[]
	phasesSucceeded: ImportJourneyPhase[]
}

export const IMPORT_JOURNEY_STEPS: {
	phase: ImportJourneyPhase
	label: string
}[] = [
	{ phase: 'assign', label: 'Assign Folder' },
	{ phase: 'scanning', label: 'Scanning Google Drive' },
	{ phase: 'detection', label: 'Medical Report Detection' },
	{ phase: 'download', label: 'Download' },
	{ phase: 'ocr', label: 'OCR' },
	{ phase: 'metrics', label: 'Metric Extraction' },
	{ phase: 'summary', label: 'Import Summary' },
]

export interface ImportQueueRunResult {
	importedThisRun: number
	failedThisRun: number
	skippedThisRun: number
}
