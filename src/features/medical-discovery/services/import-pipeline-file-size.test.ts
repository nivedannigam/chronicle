import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HEALTH_REPORT_MAX_FILE_SIZE_BYTES } from '@/features/health-import/constants/import-limits'
import { queueApprovedImports } from '@/features/medical-discovery/services/import-pipeline.service'

const mockListApprovedForImport = vi.fn()
const mockCheckForDuplicate = vi.fn()
const mockUpdateRegistryRecord = vi.fn()

vi.mock('@/features/medical-discovery/services/import-review.service', () => ({
	listApprovedForImport: (...args: unknown[]) =>
		mockListApprovedForImport(...args),
}))

vi.mock(
	'@/features/health-import/services/duplicate-detection.service',
	() => ({
		checkForDuplicate: (...args: unknown[]) => mockCheckForDuplicate(...args),
	}),
)

vi.mock('@/features/connectors/services/connector-store.service', () => ({
	updateRegistryRecord: (...args: unknown[]) =>
		mockUpdateRegistryRecord(...args),
}))

describe('queueApprovedImports file size guard', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockCheckForDuplicate.mockResolvedValue({ isDuplicate: false })
		mockUpdateRegistryRecord.mockResolvedValue(undefined)
	})

	it('marks oversized registry rows failed before download', async () => {
		mockListApprovedForImport.mockResolvedValue([
			{
				id: 'registry-big',
				external_file_id: 'file-big',
				file_name: 'Large Lab Report.pdf',
				mime_type: 'application/pdf',
				file_size: HEALTH_REPORT_MAX_FILE_SIZE_BYTES + 1,
				checksum: 'abc',
				external_created_at: '2022-01-01',
				external_modified_at: '2022-01-01',
			},
		])

		const summary = await queueApprovedImports('user-1')

		expect(summary.errors).toBe(1)
		expect(mockUpdateRegistryRecord).toHaveBeenCalledWith(
			'registry-big',
			expect.objectContaining({
				importStatus: 'failed',
				errorMessage: expect.stringContaining('File exceeds size limit'),
			}),
		)
		expect(mockCheckForDuplicate).not.toHaveBeenCalled()
	})
})
