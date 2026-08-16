import { describe, expect, it, vi } from 'vitest'
import {
	isInsuranceRegistryRow,
	resolveHealthDiscoveryFolderIds,
} from '@/features/connectors/services/registry-module-routing.service'

vi.mock('@/features/family/services/health-sources.service', () => ({
	listHealthSourceAssignments: vi.fn(async () => [
		{ externalFolderId: 'health-folder-1' },
		{ externalFolderId: 'shared-folder' },
	]),
}))

vi.mock('@/features/family/services/insurance-sources.service', () => ({
	listInsuranceSourceAssignments: vi.fn(async () => [
		{
			externalFolderId: 'insurance-folder-1',
			enabled: true,
		},
		{
			externalFolderId: 'shared-folder',
			enabled: true,
		},
	]),
}))

describe('registry-module-routing.service', () => {
	it('detects insurance registry rows', () => {
		expect(
			isInsuranceRegistryRow({
				targetModule: 'insurance',
				discoveryCategory: 'likely_medical',
			}),
		).toBe(true)

		expect(
			isInsuranceRegistryRow({
				targetModule: null,
				discoveryCategory: 'insurance_policy',
			}),
		).toBe(true)

		expect(
			isInsuranceRegistryRow({
				targetModule: null,
				discoveryCategory: 'likely_medical',
			}),
		).toBe(false)
	})

	it('excludes insurance-assigned folders from health discovery', async () => {
		const folderIds = await resolveHealthDiscoveryFolderIds('user-1')

		expect(folderIds).toEqual(['health-folder-1'])
	})

	it('filters requested folder ids against insurance assignments', async () => {
		const folderIds = await resolveHealthDiscoveryFolderIds('user-1', [
			'health-folder-1',
			'insurance-folder-1',
			'shared-folder',
		])

		expect(folderIds).toEqual(['health-folder-1'])
	})
})
