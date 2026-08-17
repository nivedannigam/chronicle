import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()
const mockListModuleFolderAssignments = vi.fn()
const mockClearModuleFolderAssignments = vi.fn()

vi.mock('@/lib/supabase', () => ({
	supabase: {
		from: (...args: unknown[]) => mockFrom(...args),
	},
}))

vi.mock(
	'@/features/settings/services/module-folder-assignments.service',
	() => ({
		listModuleFolderAssignments: (...args: unknown[]) =>
			mockListModuleFolderAssignments(...args),
		clearModuleFolderAssignments: (...args: unknown[]) =>
			mockClearModuleFolderAssignments(...args),
	}),
)

function createQueryChain(result: { data: unknown; error: unknown }) {
	const chain = {
		select: vi.fn(() => chain),
		eq: vi.fn(() => chain),
		order: vi.fn(() => chain),
		upsert: vi.fn(() => chain),
		delete: vi.fn(() => chain),
		single: vi.fn(async () => result),
		then(
			onFulfilled: (value: typeof result) => unknown,
			onRejected?: (reason: unknown) => unknown,
		) {
			return Promise.resolve(result).then(onFulfilled, onRejected)
		},
	}

	return chain
}

describe('insurance-sources.service legacy migration', () => {
	beforeEach(async () => {
		mockFrom.mockReset()
		mockListModuleFolderAssignments.mockReset()
		mockClearModuleFolderAssignments.mockReset()

		const { resetInsuranceLegacyMigrationForTests } =
			await import('@/features/family/services/insurance-sources.service')
		resetInsuranceLegacyMigrationForTests()
	})

	it('migrates localStorage once without recursive assign/list loops', async () => {
		mockListModuleFolderAssignments.mockResolvedValue([
			{
				id: 'local-1',
				userId: 'user-1',
				moduleId: 'insurance',
				connectorId: 'google-drive',
				folderId: 'drive-folder-1',
				familyMemberId: 'member-1',
				familyMemberName: 'You',
				memberLabel: 'You',
				externalFolderId: 'drive-folder-1',
				folderName: 'Insurance',
				folderPath: 'Insurance',
				assignedAt: '2026-01-01T00:00:00.000Z',
				enabled: true,
			},
		])

		const folderUpsertChain = createQueryChain({
			data: { id: 'folder-row-1' },
			error: null,
		})
		const assignmentUpsertChain = createQueryChain({ data: null, error: null })
		const listChain = createQueryChain({ data: [], error: null })

		mockFrom.mockImplementation((table: string) => {
			if (table === 'connector_folders') {
				return folderUpsertChain
			}

			if (table === 'insurance_folder_assignments') {
				return {
					upsert: vi.fn(() => assignmentUpsertChain),
					select: vi.fn(() => listChain),
					delete: vi.fn(() => assignmentUpsertChain),
				}
			}

			return listChain
		})

		const { listInsuranceSourceAssignments } =
			await import('@/features/family/services/insurance-sources.service')

		await listInsuranceSourceAssignments('user-1')
		await listInsuranceSourceAssignments('user-1')

		expect(folderUpsertChain.upsert).toHaveBeenCalledTimes(1)
		expect(mockClearModuleFolderAssignments).toHaveBeenCalledWith(
			'user-1',
			'insurance',
		)
		expect(mockListModuleFolderAssignments).toHaveBeenCalledTimes(1)
	})
})
