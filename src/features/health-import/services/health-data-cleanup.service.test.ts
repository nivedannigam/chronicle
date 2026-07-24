import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()
const mockStorageRemove = vi.fn()
const mockListAssignments = vi.fn()
const mockInvalidateCache = vi.fn()

vi.mock('@/lib/supabase', () => ({
	supabase: {
		from: (...args: unknown[]) => mockFrom(...args),
		storage: {
			from: vi.fn(() => ({
				remove: (...removeArgs: unknown[]) => mockStorageRemove(...removeArgs),
			})),
		},
	},
}))

vi.mock('@/features/family/services/health-sources.service', () => ({
	listHealthSourceAssignments: (...args: unknown[]) =>
		mockListAssignments(...args),
}))

vi.mock('@/features/health-knowledge/services/health-knowledge-cache', () => ({
	invalidateHealthKnowledgeCache: (...args: unknown[]) =>
		mockInvalidateCache(...args),
}))

function createChain(result: { data?: unknown; error?: unknown }) {
	const chain: Record<string, unknown> = {}

	chain.select = vi.fn(() => chain)
	chain.eq = vi.fn(() => chain)
	chain.in = vi.fn(() => chain)
	chain.delete = vi.fn(() => chain)
	chain.ilike = vi.fn(() => chain)
	chain.or = vi.fn(() => chain)
	chain.maybeSingle = vi.fn(async () => result)
	chain.single = vi.fn(async () => result)
	chain.then = (resolve: (value: unknown) => void) =>
		Promise.resolve(result).then(resolve)

	return chain
}

describe('removeHealthSourceAndData', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockStorageRemove.mockResolvedValue({ error: null })
		mockListAssignments.mockResolvedValue([
			{
				id: 'assignment-1',
				folderId: 'folder-db-1',
				externalFolderId: 'drive-folder-1',
			},
		])
	})

	it('deletes registry rows, health reports, and assignment', async () => {
		mockFrom.mockImplementation((table: string) => {
			if (table === 'connector_document_registry') {
				return createChain({
					data: [
						{
							id: 'registry-1',
							health_report_id: 'report-1',
							external_file_id: 'file-1',
						},
					],
					error: null,
				})
			}

			if (table === 'health_reports') {
				return createChain({
					data: [{ id: 'report-1', storage_path: 'user/report-1.pdf' }],
					error: null,
				})
			}

			if (table === 'health_folder_assignments') {
				return createChain({ data: null, error: null })
			}

			if (table === 'health_knowledge_graphs') {
				return createChain({ data: null, error: null })
			}

			if (table === 'connector_folders') {
				return createChain({ data: null, error: null })
			}

			return createChain({ data: null, error: null })
		})

		const { removeHealthSourceAndData } =
			await import('@/features/health-import/services/health-data-cleanup.service')

		const result = await removeHealthSourceAndData('user-1', 'assignment-1')

		expect(result.registryDeleted).toBe(1)
		expect(mockStorageRemove).toHaveBeenCalled()
		expect(mockInvalidateCache).toHaveBeenCalledWith('user-1')
	})
})
