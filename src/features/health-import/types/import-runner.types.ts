import {
	formatFileTooLargeError,
	HEALTH_REPORT_MAX_FILE_SIZE_BYTES,
	isFileTooLargeError,
} from '@/features/health-import/constants/import-limits'

export {
	formatFileTooLargeError,
	HEALTH_REPORT_MAX_FILE_SIZE_BYTES,
	isFileTooLargeError,
}

export type ImportRegistryOutcome = 'imported' | 'skipped_existing' | 'failed'

export type ImportPhase = 'download' | 'ocr' | 'metrics'
