/** User-facing labels — never expose implementation terms in UI. */
export const USER_VOCAB = {
	reportStatus: {
		completed: 'Ready',
		processing: 'Still Organizing',
		failed: 'Needs Your Help',
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
		tryAgain: 'Try again',
		scanNow: 'Find reports',
		reviewReports: 'Review reports',
		setupHealth: 'Set up health records',
		advancedReading: 'Advanced reading',
		advancedReadingBusy: 'Reading again…',
		downloadOriginal: 'Download original',
		deleteReport: 'Delete',
		askAboutReport: 'Ask about this report',
	},
	productReportStatus: {
		ready: 'Ready',
		organizing: 'Still Organizing',
		needsHelp: 'Needs Your Help',
	},
	overallStatus: {
		excellent: 'Excellent',
		good: 'Good',
		monitor: 'Monitor',
		needsAttention: 'Needs Attention',
		stillLearning: 'Still Learning',
	},
	domainStatus: {
		excellent: 'Excellent',
		good: 'Good',
		monitor: 'Monitor',
		needsAttention: 'Needs Attention',
		noRecentData: 'No Recent Data',
	},
	sections: {
		extractedMetrics: 'Important findings',
		reportDetails: 'About this report',
		healthSetup: 'Connect health records',
		chronicleSummary: 'Chronicle summary',
		healthImpact: 'Health impact',
		relatedVisits: 'Related visits',
		advanced: 'Advanced',
		reportImports: 'Review documents',
		reviewDocuments: 'Review documents',
		needsAttention: 'Needs your attention',
		dataSource: 'Data source',
		importPreferences: 'Import preferences',
	},
	messages: {
		couldNotUnderstand: "Chronicle couldn't understand this report yet.",
		stillOrganizing: 'Chronicle is still organizing results from this report.',
		noFindingsYet: 'No findings available for this report yet.',
		advancedReadingConfirm:
			'Advanced reading uses an alternative method to read difficult documents. Please verify the results.\n\nContinue?',
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

/** Map internal failure messages to consumer-safe copy. */
export function toConsumerReportMessage(
	message: string | null | undefined,
): string {
	if (!message?.trim()) {
		return USER_VOCAB.messages.couldNotUnderstand
	}

	const normalized = message.toLowerCase()

	if (
		normalized.includes('ocr') ||
		normalized.includes('parser') ||
		normalized.includes('processing') ||
		normalized.includes('pipeline') ||
		normalized.includes('reprocess') ||
		normalized.includes('metric')
	) {
		return USER_VOCAB.messages.couldNotUnderstand
	}

	return message
}
