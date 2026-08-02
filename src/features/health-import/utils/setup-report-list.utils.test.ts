import { describe, expect, it } from 'vitest'
import type { ConnectorDocumentRecord } from '@/core/connectors'
import type { UploadedHealthReport } from '@/features/health/types'
import {
	applySetupListVisibility,
	buildSetupReportRows,
	buildSetupSummaryLine,
	compareSetupReportRows,
	deriveSetupReportStatus,
	filterSetupReportRows,
} from '@/features/health-import/utils/setup-report-list.utils'

function registry(
	overrides: Partial<ConnectorDocumentRecord> & { id?: string } = {},
): ConnectorDocumentRecord {
	return {
		id: 'reg-test',
		userId: 'user-1',
		connectorId: 'google-drive',
		externalFileId: 'ext-1',
		fileName: 'lab.pdf',
		mimeType: 'application/pdf',
		checksum: 'abc',
		fileSize: 1000,
		externalCreatedAt: null,
		externalModifiedAt: '2024-01-01T00:00:00.000Z',
		folderId: null,
		importedAt: '2024-01-02T00:00:00.000Z',
		lastSyncAt: null,
		registryStatus: 'imported',
		importStatus: 'completed',
		healthReportId: null,
		knowledgeGraphStatus: null,
		errorMessage: null,
		familyMemberId: 'member-1',
		folderPath: null,
		discoveryCategory: 'likely_medical',
		discoveryConfidence: 0.9,
		discoveryReason: null,
		sha256Checksum: null,
		approvalStatus: 'approved',
		detectedPatient: null,
		detectedReportDate: null,
		detectedReportType: null,
		...overrides,
	}
}

function report(
	overrides: Partial<UploadedHealthReport> & Pick<UploadedHealthReport, 'id'>,
): UploadedHealthReport {
	return {
		user_id: 'user-1',
		family_member_id: 'member-1',
		file_name: 'lab.pdf',
		storage_path: 'path/lab.pdf',
		report_date: '2024-01-01',
		report_type: 'lab',
		uploaded_at: '2024-01-02T00:00:00.000Z',
		created_at: '2024-01-02T00:00:00.000Z',
		status: 'completed',
		extracted_text: 'hemoglobin 12',
		parsed_data: {
			metrics: [
				{ name: 'Hemoglobin', value: 12, unit: 'g/dL', status: 'normal' },
			],
			metadata: { laboratory: 'Thyrocare', reportType: 'lab' },
		},
		ocr_page_count: 1,
		ocr_confidence: 0.9,
		ocr_provider: 'test',
		ocr_processing_time_ms: 100,
		ocr_metadata: null,
		processed_at: '2024-01-02T00:00:00.000Z',
		processing_error: null,
		...overrides,
	}
}

describe('deriveSetupReportStatus', () => {
	it('maps registry failure before report readiness', () => {
		expect(
			deriveSetupReportStatus({
				registry: registry({
					importStatus: 'failed',
					errorMessage: 'download',
				}),
				report: null,
			}),
		).toBe('failed')
	})

	it('maps completed report with metrics to ready', () => {
		const readyReport = report({ id: 'r1' })

		expect(
			deriveSetupReportStatus({
				registry: registry({
					id: 'reg-1',
					importStatus: 'completed',
					healthReportId: 'r1',
				}),
				report: readyReport,
			}),
		).toBe('ready')
	})

	it('maps completed report without metrics to needs_reprocess', () => {
		const incomplete = report({
			id: 'r2',
			parsed_data: { metrics: [], metadata: { reportType: 'lab' } },
		})

		expect(
			deriveSetupReportStatus({
				registry: registry({
					id: 'reg-2',
					importStatus: 'completed',
					healthReportId: 'r2',
				}),
				report: incomplete,
			}),
		).toBe('needs_reprocess')
	})

	it('maps active registry queue status to processing', () => {
		expect(
			deriveSetupReportStatus({
				registry: registry({ importStatus: 'ocr' }),
				report: report({ id: 'r3', status: 'processing' }),
			}),
		).toBe('processing')
	})

	it('prefers report failed over active registry ocr', () => {
		expect(
			deriveSetupReportStatus({
				registry: registry({ importStatus: 'ocr' }),
				report: report({
					id: 'r4',
					status: 'failed',
					processing_error: 'No parser registered for document: ecg.pdf',
				}),
			}),
		).toBe('failed')
	})

	it('prefers display-ready report over stale registry processing', () => {
		expect(
			deriveSetupReportStatus({
				registry: registry({ importStatus: 'ocr', healthReportId: 'r5' }),
				report: report({ id: 'r5' }),
			}),
		).toBe('ready')
	})
})

describe('buildSetupReportRows', () => {
	it('merges registry and orphan reports without duplicating linked rows', () => {
		const rows = buildSetupReportRows({
			registry: [
				registry({
					id: 'reg-linked',
					healthReportId: 'r-linked',
					importStatus: 'completed',
				}),
			],
			reports: [
				report({ id: 'r-linked' }),
				report({ id: 'r-manual', file_name: 'manual.pdf' }),
			],
			memberId: 'member-1',
			accountOwnerMemberId: 'member-1',
		})

		expect(rows).toHaveLength(2)
		expect(rows.map((row) => row.reportId).sort()).toEqual([
			'r-linked',
			'r-manual',
		])
	})

	it('sorts failed before ready rows', () => {
		const rows = buildSetupReportRows({
			registry: [
				registry({
					id: 'reg-failed',
					importStatus: 'failed',
					fileName: 'failed.pdf',
				}),
				registry({
					id: 'reg-ready',
					importStatus: 'completed',
					healthReportId: 'r-ready',
				}),
			],
			reports: [report({ id: 'r-ready', report_date: '2024-06-01' })],
			memberId: 'member-1',
			accountOwnerMemberId: 'member-1',
		})

		expect(rows[0]?.status).toBe('failed')
		expect(rows[1]?.status).toBe('ready')
		expect(compareSetupReportRows(rows[0]!, rows[1]!)).toBeLessThan(0)
	})
})

describe('filterSetupReportRows', () => {
	it('filters needs_attention to failed and needs_reprocess only', () => {
		const rows = buildSetupReportRows({
			registry: [
				registry({ id: 'a', importStatus: 'failed' }),
				registry({
					id: 'dup',
					importStatus: 'skipped',
					errorMessage: 'Duplicate file — already imported',
				}),
				registry({
					id: 'b',
					importStatus: 'completed',
					healthReportId: 'r1',
				}),
			],
			reports: [
				report({
					id: 'r1',
					parsed_data: { metrics: [], metadata: { reportType: 'lab' } },
				}),
			],
			memberId: 'member-1',
			accountOwnerMemberId: 'member-1',
		})

		const filtered = filterSetupReportRows(rows, 'needs_attention')
		expect(filtered.every((row) => row.status !== 'ready')).toBe(true)
		expect(filtered.every((row) => row.status !== 'skipped')).toBe(true)
		expect(filtered.length).toBe(2)
	})
})

describe('buildSetupReportRows error display', () => {
	it('uses report processing_error and ignores stale registry error in log', () => {
		const rows = buildSetupReportRows({
			registry: [
				registry({
					id: 'reg-stale',
					importStatus: 'failed',
					healthReportId: 'r-stale',
					errorMessage:
						'Google Drive download failed. Reconnect Drive and retry.',
				}),
			],
			reports: [
				report({
					id: 'r-stale',
					status: 'failed',
					processing_error: 'No parser registered for document: ecg.pdf',
				}),
			],
			memberId: 'member-1',
			accountOwnerMemberId: 'member-1',
		})

		const row = rows[0]
		expect(row?.reason).toBe('No parser registered for document: ecg.pdf')
		expect(row?.errorLog).toContain('No parser registered')
		expect(row?.errorLog).not.toContain('Google Drive download failed')
		expect(row?.errorLog).toContain('Stage: Parsing')
	})

	it('disables AI reprocess on ready reports', () => {
		const rows = buildSetupReportRows({
			registry: [
				registry({
					id: 'reg-ready',
					importStatus: 'completed',
					healthReportId: 'r-ready',
				}),
			],
			reports: [report({ id: 'r-ready', extracted_text: 'hemoglobin 12' })],
			memberId: 'member-1',
			accountOwnerMemberId: 'member-1',
		})

		expect(rows[0]?.status).toBe('ready')
		expect(rows[0]?.canReprocessWithAi).toBe(false)
		expect(rows[0]?.canViewReport).toBe(true)
	})
})

describe('applySetupListVisibility', () => {
	it('hides skipped rows from all until showDuplicates is enabled', () => {
		const rows = buildSetupReportRows({
			registry: [
				registry({
					id: 'skip',
					importStatus: 'skipped',
					errorMessage: 'Duplicate file — already imported',
				}),
				registry({ id: 'fail', importStatus: 'failed' }),
			],
			reports: [],
			memberId: 'member-1',
			accountOwnerMemberId: 'member-1',
		})

		expect(applySetupListVisibility(rows, 'all', false)).toHaveLength(1)
		expect(applySetupListVisibility(rows, 'all', true)).toHaveLength(2)
	})

	it('maps legacy photo failure registry rows to skipped', () => {
		expect(
			deriveSetupReportStatus({
				registry: registry({
					importStatus: 'failed',
					errorMessage:
						'This file is a photo, not a laboratory report. Upload a PDF lab report instead.',
				}),
				report: null,
			}),
		).toBe('skipped')
	})
})

describe('buildSetupSummaryLine', () => {
	it('includes skipped and need reprocess counts', () => {
		const rows = buildSetupReportRows({
			registry: [
				registry({
					id: 'skip',
					importStatus: 'skipped',
					errorMessage: 'Duplicate file — already imported',
				}),
				registry({ id: 'fail', importStatus: 'failed' }),
			],
			reports: [],
			memberId: 'member-1',
			accountOwnerMemberId: 'member-1',
		})

		expect(buildSetupSummaryLine(rows)).toBe('0 ready · 1 failed · 1 skipped')
	})
})
