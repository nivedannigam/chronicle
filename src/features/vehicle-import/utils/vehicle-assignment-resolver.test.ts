import { describe, expect, it } from 'vitest'
import { resolveVehicleAssignmentForFile } from '@/features/vehicle-import/utils/vehicle-assignment-resolver'

describe('vehicle assignment resolver', () => {
	it('matches nested files under assigned root folder path', () => {
		const assignment = {
			id: 'a-1',
			userId: 'user-1',
			connectorId: 'google-drive',
			folderId: 'folder-db-1',
			familyMemberId: 'member-1',
			familyMemberName: 'Me',
			memberLabel: 'Me',
			externalFolderId: 'drive-root',
			folderName: 'Vehicles',
			folderPath: 'Vehicles',
			discoveredVehicleNames: [],
			assignedAt: '',
			enabled: true,
		}

		const resolved = resolveVehicleAssignmentForFile(
			{
				folderExternalId: 'nested-folder',
				folderPath: 'Vehicles/XEV 9e/Insurance',
			},
			[assignment],
		)

		expect(resolved?.id).toBe('a-1')
	})
})
