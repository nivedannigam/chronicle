import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	checkDiscoveryDuplicate,
	checkForDuplicate,
	checkForDuplicateManualUpload,
} from '@/features/health-import/services/duplicate-detection.service'
import type { ConnectorDocumentRecord } from '@/core/connectors'

const mockFindRegistry = vi.fn()
const mockSupabaseFrom = vi.fn()

vi.mock('@/features/connectors/services/connector-store.service', () => ({
	findRegistryByExternalFileId: (...args: unknown[]) =>
		mockFindRegistry(...args),
	updateRegistryRecord: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
	supabase: {
		from: (...args: unknown[]) => mockSupabaseFrom(...args),
	},
}))

function buildExisting(
	overrides: Partial<ConnectorDocumentRecord> = {},
): ConnectorDocumentRecord {
	return {
		id: 'registry-1',
		userId: 'user-1',
		connectorId: 'google-drive',
		externalFileId: 'file-1',
		fileName: 'lab.pdf',
		mimeType: 'application/pdf',
		checksum: 'checksum-1',
		fileSize: 1000,
		externalCreatedAt: '2022-01-01',
		externalModifiedAt: '2022-01-01T00:00:00.000Z',
		folderId: null,
		importedAt: null,
		lastSyncAt: null,
		registryStatus: 'discovered',
		importStatus: 'discovered',
		healthReportId: 'report-1',
		knowledgeGraphStatus: null,
		errorMessage: null,
		familyMemberId: null,
		folderPath: 'Health',
		discoveryCategory: 'likely_medical',
		discoveryConfidence: 72,
		discoveryReason: 'PDF document',
		sha256Checksum: null,
		approvalStatus: 'approved',
		detectedPatient: null,
		detectedReportDate: null,
		detectedReportType: null,
		...overrides,
	}
}

const discoveryItem = {
	externalFileId: 'file-1',
	fileName: 'lab.pdf',
	mimeType: 'application/pdf',
	fileSize: 1000,
	checksum: 'checksum-1',
	externalCreatedAt: '2022-01-01',
	externalModifiedAt: '2022-01-01T00:00:00.000Z',
	folderExternalId: 'folder-1',
}

function mockHealthReportQuery(report: Record<string, unknown> | null) {
	const chain = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		is: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockResolvedValue({ data: report, error: null }),
	}

	mockSupabaseFrom.mockReturnValue(chain)

	return chain
}

describe('checkForDuplicate', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockHealthReportQuery(null)
	})

	it('does not treat the same registry row as a duplicate of itself', async () => {
		mockFindRegistry.mockResolvedValue(buildExisting({ id: 'registry-1' }))

		const result = await checkForDuplicate({
			userId: 'user-1',
			item: discoveryItem,
			excludeRegistryId: 'registry-1',
		})

		expect(result.isDuplicate).toBe(false)
	})

	it('detects a completed import with the same checksum as duplicate', async () => {
		mockFindRegistry.mockResolvedValue(
			buildExisting({
				id: 'registry-other',
				importStatus: 'completed',
			}),
		)

		const result = await checkForDuplicate({
			userId: 'user-1',
			item: discoveryItem,
			excludeRegistryId: 'registry-1',
		})

		expect(result.isDuplicate).toBe(true)
		expect(result.reason).toBe('unchanged')
	})

	it('returns not duplicate when no registry row exists', async () => {
		mockFindRegistry.mockResolvedValue(null)

		const result = await checkForDuplicate({
			userId: 'user-1',
			item: discoveryItem,
		})

		expect(result.isDuplicate).toBe(false)
	})

	it('treats skipped unchanged registry rows as duplicates', async () => {
		mockFindRegistry.mockResolvedValue(
			buildExisting({
				id: 'registry-other',
				importStatus: 'skipped',
				errorMessage: 'Duplicate file',
			}),
		)

		const result = await checkForDuplicate({
			userId: 'user-1',
			item: discoveryItem,
			excludeRegistryId: 'registry-1',
		})

		expect(result.isDuplicate).toBe(true)
		expect(result.reason).toBe('unchanged')
	})

	it('does not treat discovered registry rows as duplicates', async () => {
		mockFindRegistry.mockResolvedValue(
			buildExisting({
				id: 'registry-other',
				importStatus: 'discovered',
			}),
		)

		const result = await checkForDuplicate({
			userId: 'user-1',
			item: discoveryItem,
		})

		expect(result.isDuplicate).toBe(false)
	})
})

describe('checkDiscoveryDuplicate', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('skips unchanged completed health reports during scan', async () => {
		mockFindRegistry.mockResolvedValue(
			buildExisting({
				importStatus: 'completed',
				healthReportId: 'report-1',
			}),
		)
		mockHealthReportQuery({
			id: 'report-1',
			status: 'completed',
			external_modified_at: '2022-01-01T00:00:00.000Z',
		})

		const result = await checkDiscoveryDuplicate({
			userId: 'user-1',
			item: discoveryItem,
		})

		expect(result.isDuplicate).toBe(true)
		expect(result.reason).toBe('unchanged')
		expect(result.existingReportId).toBe('report-1')
	})
})

describe('checkForDuplicateManualUpload', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('detects a completed manual upload with the same file hash', async () => {
		mockSupabaseFrom.mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			is: vi.fn().mockResolvedValue({
				data: [
					{
						id: 'report-1',
						status: 'completed',
						file_name: 'lab.pdf',
						uploaded_at: '2022-01-01T00:00:00.000Z',
					},
				],
				error: null,
			}),
		})

		const result = await checkForDuplicateManualUpload({
			userId: 'user-1',
			fileHash: 'abc123',
		})

		expect(result.isDuplicate).toBe(true)
		expect(result.existingReport?.id).toBe('report-1')
	})
})
