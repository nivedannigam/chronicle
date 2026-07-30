import type { JobType } from '@chronicle/core-jobs'

/** Health pipeline job stages mapped to platform job types. */
export const HEALTH_JOB_TYPES = {
	download: 'download',
	ocr: 'ocr',
	parser: 'parser',
	metricExtraction: 'metric_extraction',
	searchIndex: 'search_index',
} as const satisfies Record<string, JobType>

export type HealthJobType =
	(typeof HEALTH_JOB_TYPES)[keyof typeof HEALTH_JOB_TYPES]

/** Default worker ids for health pipeline stages. */
export const HEALTH_JOB_WORKERS = {
	download: 'drive-connector',
	ocr: 'ocr-provider',
	parser: 'health-report-parser',
	searchIndex: 'health-knowledge-index',
} as const
