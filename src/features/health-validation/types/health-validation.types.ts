export type ValidationStageStatus =
	'success' | 'warning' | 'failed' | 'pending' | 'skipped'

export interface ValidationStage {
	id: string
	label: string
	status: ValidationStageStatus
	message: string
	count?: number
}

export interface IntegrityCheck {
	id: string
	label: string
	passed: boolean
	detail: string
}

export interface ExtractionQualityItem {
	reportId: string
	fileName: string
	ocrConfidence: number | null
	metricCount: number
	unknownMetrics: string[]
	patientMatchConfidence: number | null
	errors: string[]
}

export interface HealthValidationReport {
	generatedAt: string
	overallStatus: ValidationStageStatus
	stages: ValidationStage[]
	stats: {
		googleFilesFound: number
		medicalReports: number
		imported: number
		ocrCompleted: number
		metricsExtracted: number
		timelineEntries: number
		knowledgeGraphNodes: number
	}
	errors: string[]
	warnings: string[]
	integrityChecks: IntegrityCheck[]
	extractionQuality: ExtractionQualityItem[]
}
