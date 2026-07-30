import { beforeEach, describe, expect, it, vi } from 'vitest'
import { processApprovedImports } from '@/features/medical-discovery/services/import-pipeline.service'

const mockListApprovedForImport = vi.fn()
const mockCheckForDuplicate = vi.fn()
const mockUpdateRegistryRecord = vi.fn()
const mockListRegistryRecords = vi.fn()
const mockProcessImportQueueWithProgress = vi.fn()

vi.mock('@/lib/supabase', () => {
	const chain: Record<string, unknown> = {
		eq: vi.fn(() => chain),
		in: vi.fn(() => chain),
		select: vi.fn(() => chain),
		update: vi.fn(() => chain),
	}

	chain.then = (resolve: (value: unknown) => void) =>
		Promise.resolve({ data: [], error: null }).then(resolve)

	return {
		supabase: {
			from: vi.fn(() => chain),
		},
	}
})

vi.mock('@/features/medical-discovery/services/import-review.service', () => ({
	listApprovedForImport: (...args: unknown[]) =>
		mockListApprovedForImport(...args),
}))

vi.mock(
	'@/features/health-import/services/duplicate-detection.service',
	() => ({
		checkForDuplicate: (...args: unknown[]) => mockCheckForDuplicate(...args),
		markRegistrySkipped: vi.fn(),
	}),
)

vi.mock('@/features/connectors/services/connector-store.service', () => ({
	updateRegistryRecord: (...args: unknown[]) =>
		mockUpdateRegistryRecord(...args),
	listRegistryRecords: (...args: unknown[]) => mockListRegistryRecords(...args),
	findRegistryByExternalFileId: vi.fn(),
}))

vi.mock(
	'@/features/health-import/services/health-import-runner.service',
	() => ({
		processImportQueueWithProgress: (...args: unknown[]) =>
			mockProcessImportQueueWithProgress(...args),
		importRegistryRecord: vi.fn(),
	}),
)

vi.mock('@/features/health/workflow/advance-import-workflow', () => ({
	advanceImportWorkflowToQueued: vi.fn().mockResolvedValue(undefined),
}))

describe('processApprovedImports', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		mockListApprovedForImport.mockResolvedValue([
			{
				id: 'registry-1',
				external_file_id: 'file-1',
				file_name: '2022 Jan - Complete Blood Test.pdf',
				mime_type: 'application/pdf',
				file_size: 1000,
				checksum: 'abc',
				external_created_at: '2022-01-01',
				external_modified_at: '2022-01-01',
			},
		])
		mockCheckForDuplicate.mockResolvedValue({ isDuplicate: false })
		mockUpdateRegistryRecord.mockResolvedValue(undefined)
		mockProcessImportQueueWithProgress.mockResolvedValue({
			importedThisRun: 0,
			failedThisRun: 0,
			skippedThisRun: 0,
		})
		mockListRegistryRecords.mockResolvedValue([
			{
				id: 'registry-1',
				importStatus: 'failed',
				errorMessage: 'Google Drive download failed (401): UNAUTHENTICATED',
			},
		])
	})

	it('surfaces real import errors in summary instead of generic Import failed', async () => {
		const summary = await processApprovedImports('user-1')

		expect(summary.imported).toBe(0)
		expect(summary.errors).toBeGreaterThan(0)
		expect(summary.lastError).toBe(
			'Google Drive download failed (401): UNAUTHENTICATED',
		)
		expect(summary.errorSamples).toContain(
			'Google Drive download failed (401): UNAUTHENTICATED',
		)
		expect(summary.errorSamples).not.toContain('Import failed')
	})
})
