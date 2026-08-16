import { describe, expect, it } from 'vitest'
import { classifyVehicleDocument } from '@/features/vehicle-knowledge/utils/vehicle-document-classifier'
import {
	resolveVehicleNameFromPath,
	slugifyVehicleName,
} from '@/features/vehicle-knowledge/utils/vehicle-folder-resolver'
import { buildVehicleKnowledgeFromRawData } from '@/features/vehicle-knowledge/services/vehicle-knowledge-builder'
import { resolveVehicleEvidence } from '@/features/vehicles/evidence/vehicle-evidence.resolver'

describe('vehicle document classifier', () => {
	it('classifies insurance documents from folder context', () => {
		const result = classifyVehicleDocument({
			fileName: 'policy.pdf',
			folderPath: 'Vehicles/XEV 9e/Insurance',
		})

		expect(result.documentType).toBe('insurance')
	})

	it('classifies PUC documents from filename', () => {
		const result = classifyVehicleDocument({
			fileName: 'PUC Certificate 2026.pdf',
			folderPath: 'Vehicles/XEV 9e',
		})

		expect(result.documentType).toBe('compliance')
		expect(result.documentSubtype).toBe('puc')
	})
})

describe('vehicle folder resolver', () => {
	it('extracts vehicle name from nested folder path', () => {
		expect(
			resolveVehicleNameFromPath({
				folderPath: 'Vehicles/XEV 9e/Insurance',
				rootFolderPath: 'Vehicles',
			}),
		).toBe('XEV 9e')
	})

	it('slugifies vehicle names', () => {
		expect(slugifyVehicleName('XEV 9e')).toBe('xev-9e')
	})
})

describe('vehicle knowledge builder', () => {
	it('builds attention for expiring insurance', () => {
		const soon = new Date()
		soon.setDate(soon.getDate() + 10)

		const knowledge = buildVehicleKnowledgeFromRawData(
			{
				vehicles: [
					{
						id: 'vehicle-1',
						userId: 'user-1',
						familyMemberId: null,
						displayName: 'XEV 9e',
						slug: 'xev-9e',
						category: 'car',
						make: null,
						model: null,
						variant: null,
						registrationNumber: 'MH12AB1234',
						registrationDate: null,
						purchaseDate: null,
						fuelType: null,
						vin: null,
						engineNumber: null,
						color: null,
						status: 'active',
						source: 'folder_discovery',
						createdAt: '',
						updatedAt: '',
					},
				],
				documents: [
					{
						id: 'doc-1',
						userId: 'user-1',
						vehicleId: 'vehicle-1',
						familyMemberId: null,
						registryId: null,
						fileName: 'insurance.pdf',
						documentType: 'insurance',
						documentSubtype: 'motor_policy',
						status: 'completed',
						documentDate: null,
						expiryDate: soon.toISOString().slice(0, 10),
						uploadedAt: new Date().toISOString(),
						processedAt: new Date().toISOString(),
					},
					{
						id: 'doc-2',
						userId: 'user-1',
						vehicleId: 'vehicle-1',
						familyMemberId: null,
						registryId: null,
						fileName: 'rc.pdf',
						documentType: 'registration',
						documentSubtype: 'rc',
						status: 'completed',
						documentDate: null,
						expiryDate: null,
						uploadedAt: new Date().toISOString(),
						processedAt: new Date().toISOString(),
					},
				],
				facts: [],
				timeline: [],
				familyMembers: [],
				importRegistry: [],
			},
			{ userId: 'user-1', familyMemberId: null, accountOwnerMemberId: null },
		)

		expect(knowledge.hasVehicles).toBe(true)
		expect(knowledge.documentCount).toBe(2)
		expect(knowledge.attention.some((item) => item.severity === 'medium')).toBe(
			true,
		)
	})
})

describe('vehicle evidence resolver', () => {
	it('returns status overview evidence', () => {
		const bundle = resolveVehicleEvidence({
			knowledge: {
				userId: 'user-1',
				familyMember: {
					id: null,
					displayName: 'You',
					relationship: 'self',
					isAccountOwner: true,
				},
				vehicles: [
					{
						id: 'vehicle-1',
						displayName: 'XEV 9e',
						slug: 'xev-9e',
						category: 'car',
						categoryLabel: 'Car',
						status: 'active',
						statusLabel: 'Active',
						registrationNumber: 'MH12AB1234',
						registrationDate: null,
						purchaseDate: null,
						fuelType: null,
						vin: null,
						engineNumber: null,
						color: null,
						make: null,
						model: null,
						variant: null,
						documentCount: 2,
						insuranceExpiry: '2026-12-31',
						pucExpiry: null,
						warrantyExpiry: null,
						lastServiceDate: null,
						nextServiceLabel: null,
						isDisplayReady: true,
					},
				],
				documents: [],
				facts: [],
				timeline: [],
				attention: [],
				summary: { headline: 'XEV 9e', lines: [] },
				hasVehicles: true,
				documentCount: 2,
			},
			request: {
				questionType: 'STATUS_OVERVIEW',
				domain: 'vehicles',
				subject: {},
				question: 'What is the status of my XEV 9e?',
			},
		})

		expect(bundle.metadata.resolver).toBe('vehicles.evidence_resolver.v1')
		expect(
			bundle.summary.lines.some((line) => line.includes('Registration')),
		).toBe(true)
	})
})
