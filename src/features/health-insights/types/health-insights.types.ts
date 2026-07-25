/** Proactive insight model — domain-agnostic; health is the first provider. */

export type InsightCategory =
	| 'positive_progress'
	| 'areas_to_watch'
	| 'recently_changed'
	| 'long_term_trends'
	| 'doctor_discussion'
	| 'upcoming_tests'
	| 'missing_information'

export type InsightConfidence = 'high' | 'medium' | 'low'
export type InsightSeverity = 'info' | 'attention' | 'positive'

export interface InsightEvidence {
	reportId: string
	reportTitle?: string
	metricName?: string
	date?: string
	snippet?: string
}

export interface ChronicleInsight {
	id: string
	domain: string
	category: InsightCategory
	title: string
	summary: string
	why: string
	evidence: InsightEvidence[]
	confidence: InsightConfidence
	severity: InsightSeverity
	timelineRefs: string[]
	metricId?: string
	categoryId?: string
	beganAt?: string | null
}

export interface ScorecardSection {
	id: string
	label: string
	summary: string
	status: 'available' | 'limited' | 'none'
	metricCount: number
	lastUpdated: string | null
	trend?: string
}

export interface HealthScorecard {
	generatedAt: string
	sections: ScorecardSection[]
	disclaimer: string
}

export interface DetectedChange {
	id: string
	kind:
		| 'improved'
		| 'worsening'
		| 'resolved'
		| 'persistent'
		| 'new_finding'
		| 'resolved_finding'
	metricId: string
	displayName: string
	description: string
	previousValue?: string
	currentValue?: string
	reportId: string
	previousReportId?: string
	observedAt: string
}

export const INSIGHT_SAFETY_DISCLAIMER =
	'This is informational and not medical advice. Consult a healthcare professional for medical decisions.'

export const MIN_EVIDENCE_FOR_INSIGHT = 1
