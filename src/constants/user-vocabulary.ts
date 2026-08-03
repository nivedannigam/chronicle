/** User-facing labels — never expose implementation terms in UI. */
export const USER_VOCAB = {
	reportStatus: {
		completed: 'Ready',
		processing: 'Importing…',
		failed: 'Import failed',
		queued: 'Waiting',
		pending: 'Waiting',
	},
	importPhase: {
		assign: 'Folder connected',
		scanning: 'Searching your Drive',
		detection: 'Finding health reports',
		download: 'Downloading reports',
		ocr: 'Reading reports',
		metrics: 'Organizing results',
		summary: 'Complete',
	},
	actions: {
		reprocess: 'Refresh report',
		reprocessing: 'Refreshing…',
		retryImport: 'Try again',
		scanNow: 'Find reports',
		reviewReports: 'Review reports',
		setupHealth: 'Set up health records',
	},
	productReportStatus: {
		ready: 'Ready',
		organizing: 'Still Organizing',
		needsHelp: 'Needs Your Help',
	},
	sections: {
		extractedMetrics: 'Results from this visit',
		reportDetails: 'Visit details',
		healthSetup: 'Connect health records',
	},
} as const

export function formatReportStatus(status: string | null | undefined): string {
	if (!status) {
		return 'Unknown'
	}

	return (
		USER_VOCAB.reportStatus[status as keyof typeof USER_VOCAB.reportStatus] ??
		status.replace(/_/g, ' ')
	)
}

export function formatImportPhaseLabel(phase: string): string {
	return (
		USER_VOCAB.importPhase[phase as keyof typeof USER_VOCAB.importPhase] ??
		phase
	)
}
