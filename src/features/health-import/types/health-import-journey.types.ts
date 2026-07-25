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
	{ phase: 'assign', label: 'Folder connected' },
	{ phase: 'scanning', label: 'Searching your Drive' },
	{ phase: 'detection', label: 'Finding health reports' },
	{ phase: 'download', label: 'Downloading reports' },
	{ phase: 'ocr', label: 'Reading reports' },
	{ phase: 'metrics', label: 'Organizing results' },
	{ phase: 'summary', label: 'Complete' },
]

export interface ImportQueueRunResult {
	importedThisRun: number
	failedThisRun: number
	skippedThisRun: number
}
