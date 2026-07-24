import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkForDuplicate } from '@/features/health-import/services/duplicate-detection.service'
import type { ConnectorDocumentRecord } from '@/core/connectors'

const mockFindRegistry = vi.fn()

vi.mock('@/features/connectors/services/connector-store.service', () => ({
	findRegistryByExternalFileId: (...args: unknown[]) =>
		mockFindRegistry(...args),
	updateRegistryRecord: vi.fn(),
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
		externalModifiedAt: '2022-01-01',
		folderId: null,
		importedAt: null,
		lastSyncAt: null,
		registryStatus: 'discovered',
		importStatus: 'discovered',
		healthReportId: null,
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
	externalModifiedAt: '2022-01-01',
	folderExternalId: 'folder-1',
}

describe('checkForDuplicate', () => {
	beforeEach(() => {
		vi.clearAllMocks()
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
		expect(result.reason).toBe('same_checksum')
	})

	it('returns not duplicate when no registry row exists', async () => {
		mockFindRegistry.mockResolvedValue(null)

		const result = await checkForDuplicate({
			userId: 'user-1',
			item: discoveryItem,
		})

		expect(result.isDuplicate).toBe(false)
	})

	it('does not treat skipped registry rows as duplicates', async () => {
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

		expect(result.isDuplicate).toBe(false)
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
