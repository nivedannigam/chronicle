import { QA_MEMBER_IDS, QA_USER_ID } from '@/qa/qa-constants'
import type { VehicleKnowledgeRawData } from '@/features/vehicle-knowledge/providers/vehicle-knowledge-data-source'

const NOW = '2026-08-01T10:00:00.000Z'

const QA_VEHICLE_XEV_ID = 'qa-vehicle-xev-9e'
const QA_VEHICLE_COMPACT_ID = 'qa-vehicle-city-compact'

export function buildEmptyQaVehicleKnowledgeRawData(
	familyMembers: VehicleKnowledgeRawData['familyMembers'],
): VehicleKnowledgeRawData {
	return {
		vehicles: [],
		documents: [],
		facts: [],
		timeline: [],
		linkedMotorPolicies: [],
		familyMembers,
		importRegistry: [],
	}
}

export function buildFullQaVehicleKnowledgeRawData(
	familyMembers: VehicleKnowledgeRawData['familyMembers'],
): VehicleKnowledgeRawData {
	const xevRcDocId = 'qa-vehicle-doc-xev-rc'
	const xevInsuranceDocId = 'qa-vehicle-doc-xev-insurance'
	const xevPucDocId = 'qa-vehicle-doc-xev-puc'
	const compactRcDocId = 'qa-vehicle-doc-compact-rc'

	return {
		vehicles: [
			{
				id: QA_VEHICLE_XEV_ID,
				userId: QA_USER_ID,
				familyMemberId: QA_MEMBER_IDS.nivedan,
				displayName: 'XEV 9e',
				slug: 'xev-9e',
				category: 'car',
				make: 'MG',
				model: 'XEV 9e',
				variant: null,
				registrationNumber: 'QA01AB1234',
				registrationDate: '2024-03-15',
				purchaseDate: '2024-03-01',
				fuelType: 'Electric',
				vin: null,
				engineNumber: null,
				color: null,
				status: 'active',
				source: 'qa_seed',
				createdAt: NOW,
				updatedAt: NOW,
			},
			{
				id: QA_VEHICLE_COMPACT_ID,
				userId: QA_USER_ID,
				familyMemberId: QA_MEMBER_IDS.nivedan,
				displayName: 'City Compact',
				slug: 'city-compact',
				category: 'car',
				make: 'QA',
				model: 'City Compact',
				variant: null,
				registrationNumber: 'QA02CD5678',
				registrationDate: '2022-06-10',
				purchaseDate: null,
				fuelType: 'Petrol',
				vin: null,
				engineNumber: null,
				color: null,
				status: 'active',
				source: 'qa_seed',
				createdAt: NOW,
				updatedAt: NOW,
			},
		],
		documents: [
			{
				id: xevRcDocId,
				userId: QA_USER_ID,
				vehicleId: QA_VEHICLE_XEV_ID,
				familyMemberId: QA_MEMBER_IDS.nivedan,
				registryId: null,
				fileName: 'xev9e-rc.pdf',
				documentType: 'registration',
				documentSubtype: 'rc',
				status: 'completed',
				documentDate: '2024-03-15',
				expiryDate: null,
				storagePath: 'qa/vehicles/xev9e-rc.pdf',
				uploadedAt: NOW,
				processedAt: NOW,
			},
			{
				id: xevInsuranceDocId,
				userId: QA_USER_ID,
				vehicleId: QA_VEHICLE_XEV_ID,
				familyMemberId: QA_MEMBER_IDS.nivedan,
				registryId: null,
				fileName: 'xev9e-insurance.pdf',
				documentType: 'insurance',
				documentSubtype: 'motor_policy',
				status: 'completed',
				documentDate: '2025-10-01',
				expiryDate: '2026-09-30',
				storagePath: 'qa/vehicles/xev9e-insurance.pdf',
				uploadedAt: NOW,
				processedAt: NOW,
			},
			{
				id: xevPucDocId,
				userId: QA_USER_ID,
				vehicleId: QA_VEHICLE_XEV_ID,
				familyMemberId: QA_MEMBER_IDS.nivedan,
				registryId: null,
				fileName: 'xev9e-puc.pdf',
				documentType: 'compliance',
				documentSubtype: 'puc',
				status: 'completed',
				documentDate: '2025-12-01',
				expiryDate: '2026-06-01',
				storagePath: 'qa/vehicles/xev9e-puc.pdf',
				uploadedAt: NOW,
				processedAt: NOW,
			},
			{
				id: compactRcDocId,
				userId: QA_USER_ID,
				vehicleId: QA_VEHICLE_COMPACT_ID,
				familyMemberId: QA_MEMBER_IDS.nivedan,
				registryId: null,
				fileName: 'city-compact-rc.pdf',
				documentType: 'registration',
				documentSubtype: 'rc',
				status: 'completed',
				documentDate: '2022-06-10',
				expiryDate: null,
				storagePath: 'qa/vehicles/city-compact-rc.pdf',
				uploadedAt: NOW,
				processedAt: NOW,
			},
		],
		facts: [
			{
				id: 'qa-vehicle-fact-xev-policy-expiry',
				userId: QA_USER_ID,
				vehicleId: QA_VEHICLE_XEV_ID,
				documentId: xevInsuranceDocId,
				factKey: 'policy_expiry',
				factValue: '2026-09-30',
				valueDate: '2026-09-30',
				valueNumber: null,
				confidence: 0.9,
				source: 'qa_seed',
			},
			{
				id: 'qa-vehicle-fact-xev-puc-expiry',
				userId: QA_USER_ID,
				vehicleId: QA_VEHICLE_XEV_ID,
				documentId: xevPucDocId,
				factKey: 'puc_expiry',
				factValue: '2026-06-01',
				valueDate: '2026-06-01',
				valueNumber: null,
				confidence: 0.9,
				source: 'qa_seed',
			},
		],
		timeline: [
			{
				id: 'qa-vehicle-timeline-xev-registration',
				userId: QA_USER_ID,
				vehicleId: QA_VEHICLE_XEV_ID,
				documentId: xevRcDocId,
				eventType: 'registered',
				title: 'Vehicle registered',
				description: 'Registration certificate recorded',
				eventDate: '2024-03-15',
				evidenceIds: [`document-${xevRcDocId}`],
			},
		],
		linkedMotorPolicies: [
			{
				policyId: 'qa-motor-policy-primary',
				productName: 'QA Motor Policy',
				expiryDate: '2026-09-30',
				insurerId: 'qa-insurer',
				sourceLabels: ['XEV 9e Insurance.pdf'],
			},
			{
				policyId: 'qa-motor-policy-secondary',
				productName: 'QA Motor Renewal',
				expiryDate: '2027-09-30',
				insurerId: 'qa-insurer-alt',
				sourceLabels: ['XEV 9e Renewal.pdf'],
			},
		],
		familyMembers,
		importRegistry: [],
	}
}
