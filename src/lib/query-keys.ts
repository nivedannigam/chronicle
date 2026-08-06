export const STALE_TIME = {
	familyMembers: 10 * 60 * 1000,
	healthDashboard: 2 * 60 * 1000,
	healthTimeline: 5 * 60 * 1000,
	reports: 2 * 60 * 1000,
	healthSources: 30 * 1000,
	discovery: 0,
	importStatus: 30 * 1000,
	importHistory: 60 * 1000,
	importReview: 30 * 1000,
	connectorConnection: 60 * 1000,
	connectorRegistry: 30 * 1000,
	driveBrowse: 30 * 1000,
	default: 60 * 1000,
	documents: 2 * 60 * 1000,
	timeline: 2 * 60 * 1000,
	insuranceKnowledge: 2 * 60 * 1000,
	insuranceSources: 30 * 1000,
} as const

export const queryKeys = {
	family: {
		members: (userId: string | undefined) =>
			['family-members', userId] as const,
		context: (userId: string | undefined) =>
			['family-context', userId] as const,
		roles: () => ['family-roles'] as const,
		invitations: (familyId: string | undefined) =>
			['family-invitations', familyId] as const,
	},
	health: {
		reports: (userId: string | undefined) =>
			['health-reports', userId] as const,
		reportDetail: (reportId: string | undefined) =>
			['health-report-detail', reportId] as const,
		dashboard: (userId: string | undefined) =>
			['health-dashboard-summary', userId] as const,
		timeline: (userId: string | undefined) =>
			['health-timeline', userId] as const,
		sources: (userId: string | undefined) =>
			['health-source-assignments', userId] as const,
		workflow: (userId: string | undefined) =>
			['health-workflow-projection', userId] as const,
		ocrStatus: (userId: string | undefined) =>
			['ocr-provider-status', userId] as const,
		metrics: (
			userId: string | undefined,
			memberId: string | null | undefined,
		) => ['health-metrics', userId, memberId ?? 'all'] as const,
	},
	discovery: {
		stats: (userId: string | undefined) => ['discovery-stats', userId] as const,
		latestRun: (userId: string | undefined) =>
			['discovery-latest-run', userId] as const,
		files: (userId: string | undefined, filter: string) =>
			['discovery-files', userId, filter] as const,
	},
	import: {
		status: (userId: string | undefined) =>
			['health-import-status', userId] as const,
		history: (userId: string | undefined) =>
			['health-import-history', userId] as const,
		review: (userId: string | undefined, scope: string) =>
			['import-review', userId, scope] as const,
	},
	connectors: {
		connection: (userId: string | undefined, connectorId: string) =>
			['connector-connection', userId, connectorId] as const,
		folders: (userId: string | undefined, connectorId: string) =>
			['connector-folders', userId, connectorId] as const,
		registry: (userId: string | undefined, connectorId: string) =>
			['connector-registry', userId, connectorId] as const,
		syncRun: (userId: string | undefined, connectorId: string) =>
			['connector-sync-run', userId, connectorId] as const,
		driveBrowse: (userId: string | undefined, folderId: string) =>
			['drive-browse', userId, folderId] as const,
	},
	ask: {
		sessions: (userId: string | undefined) => ['ask-sessions', userId] as const,
	},
	knowledge: {
		timeline: (userId: string | undefined) =>
			['knowledge-timeline', userId] as const,
	},
	documents: {
		list: (userId: string | undefined) => ['documents', userId] as const,
		detail: (documentId: string | undefined) =>
			['document-detail', documentId] as const,
	},
	timeline: {
		events: (userId: string | undefined, memberId: string | null | undefined) =>
			['timeline-events', userId, memberId] as const,
	},
	insurance: {
		knowledge: (
			userId: string | undefined,
			memberId: string | null | undefined,
		) => ['insurance-knowledge', userId, memberId ?? 'all'] as const,
		sources: (userId: string | undefined) =>
			['insurance-source-assignments', userId] as const,
		preferences: (userId: string | undefined) =>
			['insurance-preferences', userId] as const,
	},
} as const

/** @deprecated Use queryKeys.health.reports */
export function uploadedHealthReportsQueryKey(userId: string | undefined) {
	return queryKeys.health.reports(userId)
}

/** @deprecated Use queryKeys.import.status */
export function healthImportStatusQueryKey(userId: string | undefined) {
	return queryKeys.import.status(userId)
}

/** @deprecated Use queryKeys.health.dashboard */
export function healthDashboardSummaryQueryKey(userId: string | undefined) {
	return queryKeys.health.dashboard(userId)
}

/** @deprecated Use queryKeys.knowledge.timeline */
export function knowledgeTimelineQueryKey(userId: string | undefined) {
	return queryKeys.knowledge.timeline(userId)
}
