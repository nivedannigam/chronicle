import { describe, expect, it } from 'vitest'
import {
	buildHealthCoverageSnapshot,
	deriveReportBadgeStatus,
	groupImportFailures,
} from '@/features/health/services/health-coverage.service'
import type { ConnectorDocumentRecord } from '@/core/connectors'
import type { UploadedHealthReport } from '@/features/health/types'

function report(
	overrides: Partial<UploadedHealthReport> = {},
): UploadedHealthReport {
	return {
		id: 'report-1',
		user_id: 'user-1',
		file_name: 'Thyrocare.pdf',
		storage_path: 'path',
		report_date: '2026-03-09',
		report_type: 'general',
		status: 'completed',
		uploaded_at: '2026-03-09T00:00:00.000Z',
		parsed_data: {
			metrics: [
				{
					displayName: 'LDL',
					rawName: 'LDL',
					value: '110',
					unit: 'mg/dL',
					status: 'normal',
				},
				{
					displayName: 'BACTERIA',
					rawName: 'BACTERIA',
					value: 'ABSENT',
					unit: null,
					status: 'unknown',
				},
			],
			metadata: {
				laboratory: 'Thyrocare',
				reportDate: '2026-03-09',
			},
		},
		...overrides,
	} as UploadedHealthReport
}

function registryRecord(
	overrides: Partial<ConnectorDocumentRecord> = {},
): ConnectorDocumentRecord {
	return {
		id: 'reg-1',
		userId: 'user-1',
		connectorId: 'google-drive',
		externalFileId: 'file-1',
		fileName: 'Thyrocare.pdf',
		importStatus: 'completed',
		registryStatus: 'completed',
		...overrides,
	} as ConnectorDocumentRecord
}

describe('health-coverage.service', () => {
	it('marks partial badge when unknown metrics remain', () => {
		expect(
			deriveReportBadgeStatus({
				classifiedCount: 1,
				unknownCount: 1,
				hasAbnormal: false,
				needsReprocess: false,
			}),
		).toBe('partial')
	})

	it('marks needs reprocess when no classified metrics', () => {
		expect(
			deriveReportBadgeStatus({
				classifiedCount: 0,
				unknownCount: 2,
				hasAbnormal: false,
				needsReprocess: false,
			}),
		).toBe('needs_reprocess')
	})

	it('builds partial corpus snapshot with failed imports', () => {
		const snapshot = buildHealthCoverageSnapshot({
			uploadedReports: [report()],
			importRegistry: [
				registryRecord(),
				registryRecord({
					id: 'reg-2',
					fileName: 'failed.pdf',
					importStatus: 'failed',
					errorMessage:
						'Google Drive download failed. Reconnect Drive and retry.',
				}),
				registryRecord({
					id: 'reg-3',
					fileName: 'queued.pdf',
					importStatus: 'discovered',
					registryStatus: 'discovered',
				}),
			],
		})

		expect(snapshot.displayReadyCount).toBe(1)
		expect(snapshot.failedCount).toBe(1)
		expect(snapshot.discoveredCount).toBe(3)
		expect(snapshot.corpusCompleteness).toBe('partial')
		expect(
			snapshot.limitations.some((line) => /need your help/i.test(line)),
		).toBe(true)
		expect(snapshot.summaryLine).toContain('1 failed')
	})

	it('groups import failures by error type', () => {
		const groups = groupImportFailures([
			registryRecord({
				importStatus: 'failed',
				errorMessage: 'Google Drive download failed',
			}),
			registryRecord({
				id: 'reg-2',
				importStatus: 'failed',
				fileName: 'photo.jpg',
				errorMessage: 'This file is a photo, not a laboratory report.',
			}),
			registryRecord({
				id: 'reg-3',
				importStatus: 'failed',
				errorMessage: 'OCR completed but no laboratory metrics were extracted',
			}),
		])

		expect(groups.download).toBe(1)
		expect(groups.nonLab).toBe(1)
		expect(groups.noMetrics).toBe(1)
	})
})
