import { describe, expect, it } from 'vitest'
import {
	discoverModuleFoldersFromRoot,
	formatDiscoveredModuleLabel,
} from '@/features/setup/services/chronicle-root-discovery.service'

describe('discoverModuleFoldersFromRoot', () => {
	it('recognizes active module folders under a Chronicle root', () => {
		const result = discoverModuleFoldersFromRoot({
			rootFolderId: 'root-1',
			rootFolderName: 'Chronicle',
			rootFolderPath: 'Chronicle',
			childFolders: [
				{ id: 'health-1', name: 'Health' },
				{ id: 'insurance-1', name: 'Insurance' },
				{ id: 'vehicles-1', name: 'Vehicles' },
				{ id: 'misc-1', name: 'Misc' },
			],
		})

		expect(result.recognized.map((entry) => entry.moduleId)).toEqual([
			'health',
			'insurance',
			'vehicles',
		])
		expect(result.recognized.every((entry) => entry.active)).toBe(true)
		expect(result.unrecognized.map((entry) => entry.name)).toEqual(['Misc'])
	})

	it('labels coming-soon modules without marking them active', () => {
		const result = discoverModuleFoldersFromRoot({
			rootFolderId: 'root-1',
			rootFolderName: 'Chronicle',
			childFolders: [{ id: 'identity-1', name: 'Identity' }],
		})

		expect(result.recognized[0]).toMatchObject({
			moduleId: 'identity',
			active: false,
		})
	})

	it('formats module labels for display', () => {
		expect(formatDiscoveredModuleLabel('vehicles')).toBe('Vehicles')
	})
})
