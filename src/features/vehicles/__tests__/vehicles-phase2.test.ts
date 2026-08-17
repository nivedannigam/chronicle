import { describe, expect, it } from 'vitest'
import { extractVehicleDocument } from '@/features/vehicle-knowledge/extraction/vehicle-document-extraction.service'
import { buildVehicleAttention } from '@/features/vehicle-knowledge/engines/vehicle-attention.engine'
import { buildVehicleCompleteness } from '@/features/vehicle-knowledge/engines/vehicle-completeness.engine'
import { computeVehicleCurrentState } from '@/features/vehicle-knowledge/engines/vehicle-state.engine'
import { buildVehicleKnowledgeFromRawData } from '@/features/vehicle-knowledge/services/vehicle-knowledge-builder'
import {
	matchVehicleDocument,
	vehicleWouldDuplicateExisting,
} from '@/features/vehicle-knowledge/services/vehicle-matching.service'
import {
	formatRegistrationNumber,
	normalizeRegistrationNumber,
	parseFlexibleDate,
	registrationNumbersMatch,
} from '@/features/vehicle-knowledge/utils/vehicle-normalization.utils'
import { resolveVehicleEvidence } from '@/features/vehicles/evidence/vehicle-evidence.resolver'

const baseVehicleRecord = {
	id: 'vehicle-1',
	userId: 'user-1',
	familyMemberId: null,
	displayName: 'XEV 9e',
	slug: 'xev-9e',
	category: 'car' as const,
	make: 'MG',
	model: 'XEV 9e',
	variant: null,
	registrationNumber: 'MH 12 AB 1234',
	registrationDate: null,
	purchaseDate: null,
	fuelType: 'electric',
	vin: 'MA1XA2BC3D4567890',
	engineNumber: 'ENG123456',
	color: null,
	status: 'active' as const,
	source: 'folder_discovery',
	createdAt: '',
	updatedAt: '',
}

function makeDocument(
	overrides: Partial<{
		id: string
		documentType: string
		documentSubtype: string
		documentDate: string | null
		expiryDate: string | null
		fileName: string
	}> = {},
) {
	return {
		id: overrides.id ?? 'doc-1',
		userId: 'user-1',
		vehicleId: 'vehicle-1',
		familyMemberId: null,
		registryId: null,
		fileName: overrides.fileName ?? 'document.pdf',
		documentType: overrides.documentType ?? 'insurance',
		documentSubtype: overrides.documentSubtype ?? 'motor_policy',
		status: 'completed',
		documentDate: overrides.documentDate ?? null,
		expiryDate: overrides.expiryDate ?? null,
		uploadedAt: '2026-01-01T00:00:00.000Z',
		processedAt: '2026-01-01T00:00:00.000Z',
	}
}

describe('vehicle normalization', () => {
	it('normalizes registration numbers for comparison', () => {
		expect(normalizeRegistrationNumber('MH 12 AB 1234')).toBe('MH12AB1234')
		expect(registrationNumbersMatch('MH12AB1234', 'MH 12 AB 1234')).toBe(true)
	})

	it('formats registration numbers for display', () => {
		expect(formatRegistrationNumber('mh12ab1234')).toBe('MH 12 AB 1234')
	})

	it('parses flexible dates', () => {
		expect(parseFlexibleDate('15/08/2026')).toBe('2026-08-15')
		expect(parseFlexibleDate('2026-08-15')).toBe('2026-08-15')
	})
})

describe('vehicle matching', () => {
	it('matches by normalized registration across folder names', () => {
		const match = matchVehicleDocument({
			vehicles: [baseVehicleRecord],
			identifiers: { registrationNumber: 'MH12AB1234' },
			folderVehicleName: 'Some Other Folder',
		})

		expect(match.vehicleId).toBe('vehicle-1')
		expect(match.matchType).toBe('registration')
	})

	it('matches by VIN', () => {
		const match = matchVehicleDocument({
			vehicles: [baseVehicleRecord],
			identifiers: { vin: 'MA1XA2BC3D4567890' },
			folderVehicleName: null,
		})

		expect(match.vehicleId).toBe('vehicle-1')
		expect(match.matchType).toBe('vin')
	})

	it('prevents duplicate vehicles for the same registration', () => {
		const duplicate = vehicleWouldDuplicateExisting({
			vehicles: [baseVehicleRecord],
			registrationNumber: 'MH 12 AB 1234',
		})

		expect(duplicate?.id).toBe('vehicle-1')
	})

	it('falls back to folder name when no strong identifiers match', () => {
		const match = matchVehicleDocument({
			vehicles: [baseVehicleRecord],
			identifiers: {},
			folderVehicleName: 'XEV 9e',
		})

		expect(match.vehicleId).toBe('vehicle-1')
		expect(match.matchType).toBe('folder')
	})

	it('creates a new vehicle from strong identifiers when none exists', () => {
		const match = matchVehicleDocument({
			vehicles: [],
			identifiers: { registrationNumber: 'MH12CD9999' },
			folderVehicleName: 'Random Folder',
		})

		expect(match.vehicleId).toBeNull()
		expect(match.shouldCreateVehicle).toBe(true)
	})
})

describe('vehicle document extraction', () => {
	it('classifies and extracts RC facts from searchable text', () => {
		const extraction = extractVehicleDocument({
			fileName: 'RC.pdf',
			folderPath: 'Vehicles/XEV 9e',
			text: `
				Registration No: MH 12 AB 1234
				VIN: MA1XA2BC3D4567890
				Engine No: ENG123456
				Make: MG
				Model: XEV 9e
				Fuel type: Electric
			`,
		})

		expect(extraction.documentType).toBe('registration')
		expect(extraction.identifiers.registrationNumber).toBe('MH 12 AB 1234')
		expect(extraction.identifiers.vin).toBe('MA1XA2BC3D4567890')
		expect(extraction.facts.some((fact) => fact.factKey === 'make')).toBe(true)
	})

	it('extracts insurance expiry and policy number', () => {
		const extraction = extractVehicleDocument({
			fileName: 'Insurance Policy 2026.pdf',
			folderPath: 'Vehicles/XEV 9e/Insurance',
			text: `
				Policy No: POL/123456
				Insurer: HDFC ERGO
				Policy expiry: 31/12/2026
				Premium: Rs. 12,500
			`,
		})

		expect(extraction.documentType).toBe('insurance')
		expect(
			extraction.facts.some((fact) => fact.factKey === 'policy_number'),
		).toBe(true)
		expect(
			extraction.facts.some((fact) => fact.factKey === 'policy_expiry'),
		).toBe(true)
	})

	it('extracts PUC expiry from filename and text', () => {
		const extraction = extractVehicleDocument({
			fileName: 'PUC Certificate 2026.pdf',
			folderPath: 'Vehicles/XEV 9e',
			text: 'PUC valid till 30/06/2026',
		})

		expect(extraction.documentSubtype).toBe('puc')
		expect(extraction.facts.some((fact) => fact.factKey === 'puc_expiry')).toBe(
			true,
		)
	})

	it('extracts service amount and odometer', () => {
		const extraction = extractVehicleDocument({
			fileName: 'Service Invoice July 2026.pdf',
			folderPath: 'Vehicles/XEV 9e/Service',
			text: `
				Service date: 15/07/2026
				Odometer: 12,450 km
				Total amount: Rs. 4,800
			`,
		})

		expect(extraction.documentType).toBe('service')
		expect(
			extraction.facts.some((fact) => fact.factKey === 'service_mileage'),
		).toBe(true)
		expect(
			extraction.facts.some((fact) => fact.factKey === 'service_amount'),
		).toBe(true)
	})
})

describe('vehicle current state', () => {
	it('uses the latest insurance policy for current insurance state', () => {
		const state = computeVehicleCurrentState({
			vehicleId: 'vehicle-1',
			registrationNumber: 'MH 12 AB 1234',
			documents: [
				makeDocument({
					id: 'old-policy',
					documentType: 'insurance',
					documentDate: '2025-01-01',
					expiryDate: '2025-12-31',
					fileName: 'Insurance 2025.pdf',
				}),
				makeDocument({
					id: 'new-policy',
					documentType: 'insurance',
					documentDate: '2026-01-01',
					expiryDate: '2026-12-31',
					fileName: 'Insurance 2026.pdf',
				}),
			],
			facts: [
				{
					id: 'fact-old',
					userId: 'user-1',
					vehicleId: 'vehicle-1',
					documentId: 'old-policy',
					factKey: 'policy_expiry',
					factValue: '2025-12-31',
					valueDate: '2025-12-31',
					valueNumber: null,
					confidence: 0.8,
					source: 'deterministic',
				},
				{
					id: 'fact-new',
					userId: 'user-1',
					vehicleId: 'vehicle-1',
					documentId: 'new-policy',
					factKey: 'policy_expiry',
					factValue: '2026-12-31',
					valueDate: '2026-12-31',
					valueNumber: null,
					confidence: 0.8,
					source: 'deterministic',
				},
			],
		})

		expect(state.insurance.status).not.toBe('expired')
		expect(state.insurance.effectiveDate).toBe('2026-12-31')
		expect(state.insurance.sourceDocumentName).toBe('Insurance 2026.pdf')
	})

	it('marks expired PUC from latest certificate', () => {
		const state = computeVehicleCurrentState({
			vehicleId: 'vehicle-1',
			registrationNumber: 'MH 12 AB 1234',
			documents: [
				makeDocument({
					id: 'puc-doc',
					documentType: 'compliance',
					documentSubtype: 'puc',
					expiryDate: '2020-01-01',
					fileName: 'PUC 2020.pdf',
				}),
			],
			facts: [
				{
					id: 'puc-fact',
					userId: 'user-1',
					vehicleId: 'vehicle-1',
					documentId: 'puc-doc',
					factKey: 'puc_expiry',
					factValue: '2020-01-01',
					valueDate: '2020-01-01',
					valueNumber: null,
					confidence: 0.8,
					source: 'deterministic',
				},
			],
		})

		expect(state.puc.status).toBe('expired')
	})
})

describe('vehicle knowledge builder phase 2', () => {
	it('builds timeline from document dates only and sorts chronologically', () => {
		const knowledge = buildVehicleKnowledgeFromRawData(
			{
				vehicles: [baseVehicleRecord],
				documents: [
					makeDocument({
						id: 'rc',
						documentType: 'registration',
						documentSubtype: 'rc',
						fileName: 'RC.pdf',
					}),
					makeDocument({
						id: 'service',
						documentType: 'service',
						documentSubtype: 'service_invoice',
						fileName: 'Service July 2026.pdf',
					}),
				],
				facts: [],
				timeline: [
					{
						id: 'event-1',
						userId: 'user-1',
						vehicleId: 'vehicle-1',
						documentId: 'service',
						eventType: 'service_completed',
						title: 'Vehicle serviced',
						description: null,
						eventDate: '2026-07-15',
						evidenceIds: ['document-service'],
					},
					{
						id: 'event-2',
						userId: 'user-1',
						vehicleId: 'vehicle-1',
						documentId: 'rc',
						eventType: 'registration_issued',
						title: 'Registration recorded',
						description: null,
						eventDate: '2025-05-10',
						evidenceIds: ['document-rc'],
					},
				],
				familyMembers: [],
				importRegistry: [],
			},
			{ userId: 'user-1', familyMemberId: null, accountOwnerMemberId: null },
		)

		expect(knowledge.timeline[0]?.eventDate).toBe('2026-07-15')
		expect(
			knowledge.timeline.every((event) => event.eventType !== 'document_added'),
		).toBe(true)
	})

	it('exposes completeness limitations without technical errors', () => {
		const knowledge = buildVehicleKnowledgeFromRawData(
			{
				vehicles: [baseVehicleRecord],
				documents: [
					makeDocument({
						id: 'rc',
						documentType: 'registration',
						documentSubtype: 'rc',
						fileName: 'RC.pdf',
					}),
				],
				facts: [],
				timeline: [],
				familyMembers: [],
				importRegistry: [],
			},
			{ userId: 'user-1', familyMemberId: null, accountOwnerMemberId: null },
		)

		expect(
			knowledge.vehicles[0]?.completeness.items.find(
				(item) => item.label === 'RC',
			)?.available,
		).toBe(true)
		expect(knowledge.limitations).toContain('Insurance information not found')
	})

	it('deduplicates attention for expired insurance', () => {
		const knowledge = buildVehicleKnowledgeFromRawData(
			{
				vehicles: [baseVehicleRecord],
				documents: [
					makeDocument({
						id: 'insurance',
						documentType: 'insurance',
						expiryDate: '2020-01-01',
						fileName: 'Insurance expired.pdf',
					}),
					makeDocument({
						id: 'rc',
						documentType: 'registration',
						documentSubtype: 'rc',
						fileName: 'RC.pdf',
					}),
				],
				facts: [
					{
						id: 'fact-insurance',
						userId: 'user-1',
						vehicleId: 'vehicle-1',
						documentId: 'insurance',
						factKey: 'policy_expiry',
						factValue: '2020-01-01',
						valueDate: '2020-01-01',
						valueNumber: null,
						confidence: 0.8,
						source: 'deterministic',
					},
				],
				timeline: [],
				familyMembers: [],
				importRegistry: [],
			},
			{ userId: 'user-1', familyMemberId: null, accountOwnerMemberId: null },
		)

		const insuranceAttention = knowledge.attention.filter((item) =>
			item.title.toLowerCase().includes('insurance'),
		)

		expect(insuranceAttention).toHaveLength(1)
		expect(insuranceAttention[0]?.severity).toBe('high')
	})
})

describe('vehicle evidence resolver phase 2', () => {
	const knowledge = buildVehicleKnowledgeFromRawData(
		{
			vehicles: [baseVehicleRecord],
			documents: [
				makeDocument({
					id: 'insurance-2026',
					documentType: 'insurance',
					documentDate: '2026-01-01',
					expiryDate: '2026-12-31',
					fileName: 'Insurance Policy 2026.pdf',
				}),
				makeDocument({
					id: 'rc',
					documentType: 'registration',
					documentSubtype: 'rc',
					fileName: 'RC.pdf',
				}),
			],
			facts: [
				{
					id: 'reg-fact',
					userId: 'user-1',
					vehicleId: 'vehicle-1',
					documentId: 'rc',
					factKey: 'registration_number',
					factValue: 'MH 12 AB 1234',
					valueDate: null,
					valueNumber: null,
					confidence: 0.9,
					source: 'deterministic',
				},
				{
					id: 'policy-expiry',
					userId: 'user-1',
					vehicleId: 'vehicle-1',
					documentId: 'insurance-2026',
					factKey: 'policy_expiry',
					factValue: '2026-12-31',
					valueDate: '2026-12-31',
					valueNumber: null,
					confidence: 0.9,
					source: 'deterministic',
				},
			],
			timeline: [
				{
					id: 'service-event',
					userId: 'user-1',
					vehicleId: 'vehicle-1',
					documentId: 'service-doc',
					eventType: 'service_completed',
					title: 'Vehicle serviced',
					description: null,
					eventDate: '2026-07-15',
					evidenceIds: [],
				},
			],
			familyMembers: [],
			importRegistry: [],
		},
		{ userId: 'user-1', familyMemberId: null, accountOwnerMemberId: null },
	)

	it('supports FACT_LOOKUP with source traceability', () => {
		const bundle = resolveVehicleEvidence({
			knowledge,
			request: {
				questionType: 'FACT_LOOKUP',
				domain: 'vehicles',
				subject: {},
				question: 'What is my registration number?',
			},
		})

		expect(
			bundle.summary.lines.some((line) => line.includes('MH 12 AB 1234')),
		).toBe(true)
		expect(bundle.summary.lines.some((line) => line.includes('RC.pdf'))).toBe(
			true,
		)
	})

	it('supports LATEST_REPORT for insurance artifact', () => {
		const bundle = resolveVehicleEvidence({
			knowledge,
			request: {
				questionType: 'LATEST_REPORT',
				domain: 'vehicles',
				subject: {},
				question: 'What is my latest insurance policy?',
			},
		})

		expect(bundle.reports[0]?.title).toBe('Insurance Policy 2026.pdf')
	})

	it('supports STATUS_OVERVIEW with current state labels', () => {
		const bundle = resolveVehicleEvidence({
			knowledge,
			request: {
				questionType: 'STATUS_OVERVIEW',
				domain: 'vehicles',
				subject: {},
				question: 'What is the status of my XEV 9e?',
			},
		})

		expect(
			bundle.summary.lines.some((line) =>
				line.includes('Insurance valid until'),
			),
		).toBe(true)
	})

	it('supports INVENTORY phrasing', () => {
		const bundle = resolveVehicleEvidence({
			knowledge,
			request: {
				questionType: 'STATUS_OVERVIEW',
				domain: 'vehicles',
				subject: {},
				question: 'What vehicle documents do I have?',
			},
		})

		expect(bundle.summary.lines.some((line) => line.includes('✓ RC'))).toBe(
			true,
		)
	})

	it('supports TREND for service history', () => {
		const bundle = resolveVehicleEvidence({
			knowledge,
			request: {
				questionType: 'TREND',
				domain: 'vehicles',
				subject: {},
				question: 'What has my servicing been like?',
			},
		})

		expect(bundle.timeline.length).toBeGreaterThan(0)
	})
})

describe('vehicle completeness engine', () => {
	it('counts canonical document availability per vehicle', () => {
		const completeness = buildVehicleCompleteness({
			vehicleId: 'vehicle-1',
			documents: [
				makeDocument({
					id: 'rc',
					documentType: 'registration',
					documentSubtype: 'rc',
				}),
				makeDocument({ id: 'insurance', documentType: 'insurance' }),
			],
		})

		expect(completeness.items.filter((item) => item.available)).toHaveLength(2)
	})
})

describe('vehicle attention engine', () => {
	it('does not emit duplicate insurance attention items', () => {
		const attention = buildVehicleAttention({
			vehicles: [
				{
					id: 'vehicle-1',
					displayName: 'XEV 9e',
					currentState: computeVehicleCurrentState({
						vehicleId: 'vehicle-1',
						registrationNumber: 'MH 12 AB 1234',
						documents: [
							makeDocument({
								id: 'insurance',
								documentType: 'insurance',
								expiryDate: '2020-01-01',
							}),
							makeDocument({
								id: 'rc',
								documentType: 'registration',
								documentSubtype: 'rc',
							}),
						],
						facts: [
							{
								id: 'fact',
								userId: 'user-1',
								vehicleId: 'vehicle-1',
								documentId: 'insurance',
								factKey: 'policy_expiry',
								factValue: '2020-01-01',
								valueDate: '2020-01-01',
								valueNumber: null,
								confidence: 0.8,
								source: 'deterministic',
							},
						],
					}),
				},
			],
			documents: [
				makeDocument({
					id: 'insurance',
					documentType: 'insurance',
					expiryDate: '2020-01-01',
				}),
				makeDocument({
					id: 'rc',
					documentType: 'registration',
					documentSubtype: 'rc',
				}),
			],
			timeline: [],
		})

		const insuranceItems = attention.filter((item) =>
			item.title.toLowerCase().includes('insurance'),
		)

		expect(insuranceItems).toHaveLength(1)
	})
})
