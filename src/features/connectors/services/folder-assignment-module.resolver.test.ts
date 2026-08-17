import { describe, expect, it } from 'vitest'
import { resolveFolderAssignmentModule } from '@/features/connectors/services/folder-assignment-module.resolver'

describe('folder-assignment-module.resolver', () => {
	it('detects insurance folders by name', () => {
		expect(resolveFolderAssignmentModule('Insurance')).toBe('insurance')
		expect(resolveFolderAssignmentModule('My Insurance Policies')).toBe(
			'insurance',
		)
	})

	it('detects vehicle folders by name', () => {
		expect(resolveFolderAssignmentModule('Vehicles')).toBe('vehicles')
		expect(resolveFolderAssignmentModule('Car Documents')).toBe('vehicles')
	})

	it('defaults to health for medical folders', () => {
		expect(resolveFolderAssignmentModule('Health Reports')).toBe('health')
		expect(resolveFolderAssignmentModule('Lab Results')).toBe('health')
	})

	it('prefers existing insurance assignment hints over folder name', () => {
		expect(
			resolveFolderAssignmentModule('Lab Results', {
				externalFolderId: 'folder-1',
				insuranceFolderIds: new Set(['folder-1']),
			}),
		).toBe('insurance')
	})
})
