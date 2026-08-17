import { describe, expect, it } from 'vitest'
import { resolveModuleFolderAssignmentForFile } from '@/features/connectors/services/module-folder-assignment-resolver'

describe('module-folder-assignment-resolver', () => {
	const insuranceAssignment = {
		id: 'insurance-1',
		externalFolderId: 'drive-insurance-root',
		folderName: 'Insurance',
		folderPath: 'Insurance',
	}

	const vehicleAssignment = {
		id: 'vehicle-1',
		externalFolderId: 'drive-vehicle-root',
		folderName: 'Vehicles',
		folderPath: 'Vehicles',
	}

	it('matches insurance PDFs in nested subfolders', () => {
		const resolved = resolveModuleFolderAssignmentForFile(
			{
				folderExternalId: 'nested-health-folder',
				folderPath: 'Insurance/Health',
			},
			[insuranceAssignment],
		)

		expect(resolved?.id).toBe('insurance-1')
	})

	it('matches vehicle PDFs in nested subfolders', () => {
		const resolved = resolveModuleFolderAssignmentForFile(
			{
				folderExternalId: 'nested-car-folder',
				folderPath: 'Vehicles/XEV 9e/Insurance',
			},
			[vehicleAssignment],
		)

		expect(resolved?.id).toBe('vehicle-1')
	})

	it('prefers direct folder id match when available', () => {
		const resolved = resolveModuleFolderAssignmentForFile(
			{
				folderExternalId: 'drive-insurance-root',
				folderPath: 'Insurance',
			},
			[insuranceAssignment],
		)

		expect(resolved?.id).toBe('insurance-1')
	})
})
