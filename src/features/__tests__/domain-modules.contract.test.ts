/**
 * Cross-module contract tests for Health, Insurance, and Vehicles.
 *
 * Run with: pnpm test:modules
 *
 * These tests verify the shared architecture contracts (import → knowledge → evidence → ask)
 * using fixtures and mocks. They do not hit Google Drive, Supabase, OCR, or live LLM APIs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildDomainCompanionAskTurn } from '@/features/ask/services/domain-companion-ask.service'
import { extractRegistryDocumentForDomain } from '@/features/document-import/services/domain-document-extraction.service'
import {
	downloadRegistryDocumentToStorage,
	extractTextFromStoredPdf,
} from '@/features/document-import/services/domain-document-text.service'
import { resolveHealthEvidence } from '@/features/health/evidence/health-evidence.resolver'
import { InsuranceKnowledgeProvider } from '@/features/insurance-knowledge/providers/insurance-knowledge.provider'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import { isPolicyDisplayReady } from '@/features/insurance-knowledge/services/insurance-knowledge-builder'
import { policyDedupeKey } from '@/features/insurance-knowledge/utils/policy-category-resolver'
import { resolveInsuranceEvidence } from '@/features/insurance/evidence/insurance-evidence.resolver'
import { buildVehicleKnowledgeFromRawData } from '@/features/vehicle-knowledge/services/vehicle-knowledge-builder'
import {
	registrationNumbersMatch,
	normalizeRegistrationNumber,
} from '@/features/vehicle-knowledge/utils/vehicle-normalization.utils'
import { resolveVehicleEvidence } from '@/features/vehicles/evidence/vehicle-evidence.resolver'
import { planAndResolveInsuranceEvidence } from '@/shared/ai/evidence-planning/plan-insurance-evidence'
import { planAndResolveVehicleEvidence } from '@/shared/ai/evidence-planning/plan-vehicle-evidence'
import {
	parseInsuranceExtractionJson,
	parseVehicleExtractionJson,
} from '@/shared/ai/prompt/extract-domain-document.parser'
import {
	extractDomainDocumentWithAi,
	extractDomainDocumentWithAiDirect,
} from '@/shared/ai/transport/extract-domain-document.client'
import {
	getRegisteredPlatformModuleIds,
	clearPlatformModules,
} from '@/core/platform/registries/module-registry'
import { registerPlatformModules } from '@/core/platform/bootstrap/register-modules'
import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { EvidenceRequest } from '@/shared/ai/evidence-planning/types'

vi.mock('@/shared/ai/config/ai-platform.config', async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import('@/shared/ai/config/ai-platform.config')
		>()
	return {
		...actual,
		isAIPlatformConfigured: () => false,
	}
})

vi.mock(
	'@/features/document-import/services/domain-document-text.service',
	() => ({
		downloadRegistryDocumentToStorage: vi.fn(async () => {
			throw new Error('network unavailable in contract test')
		}),
		extractTextFromStoredPdf: vi.fn(async () => ({ text: '' })),
	}),
)

vi.mock('@/shared/ai/transport/ask-ai-edge.client', () => ({
	isAskAiEdgeConfigured: vi.fn(() => true),
	assertAskAiEdgeConfigured: vi.fn(),
	invokeAskAiEdgeFunction: vi.fn(),
	AskAiEdgeInvokeError: class AskAiEdgeInvokeError extends Error {},
}))

vi.mock('@/shared/ai/transport/extract-domain-document.client', () => ({
	extractDomainDocumentWithAi: vi.fn(),
	extractDomainDocumentWithAiDirect: vi.fn(),
}))

const insuranceProvider = new InsuranceKnowledgeProvider({
	fetchRawData: async () => ({}) as InsuranceKnowledgeRawData,
})

function buildInsuranceKnowledge() {
	return insuranceProvider.buildFromRawData(
		{
			policies: [
				{
					id: 'policy-health',
					userId: 'user-1',
					familyMemberId: null,
					policyNumber: 'POL-H-001',
					policyType: 'health',
					productName: 'ICICI Health Shield',
					insurerId: 'icici-lombard',
					status: 'active',
					inceptionDate: '2024-01-01',
					expiryDate: '2027-01-01',
					renewalDate: null,
					sumInsured: 2500000,
					currency: 'INR',
					sourceDocumentIds: ['doc-1'],
					extractionMethod: 'llm',
					confidence: 0.9,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z',
				},
			],
			coverages: [],
			members: [],
			nominees: [],
			premiums: [],
			renewals: [],
			claims: [],
			benefits: [],
			exclusions: [],
			documents: [],
			insurers: [
				{
					id: 'icici-lombard',
					canonicalName: 'ICICI Lombard',
					displayName: 'ICICI Lombard',
					country: 'IN',
				},
			],
			familyMembers: [],
			importRegistry: [],
		},
		{
			userId: 'user-1',
			familyMemberId: null,
			accountOwnerMemberId: null,
		},
	)
}

function buildVehicleKnowledge() {
	return buildVehicleKnowledgeFromRawData(
		{
			vehicles: [
				{
					id: 'vehicle-1',
					userId: 'user-1',
					familyMemberId: null,
					displayName: 'XEV 9e',
					slug: 'xev-9e',
					category: 'car',
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
					status: 'active',
					source: 'folder_discovery',
					createdAt: '',
					updatedAt: '',
				},
			],
			documents: [
				{
					id: 'doc-insurance',
					userId: 'user-1',
					vehicleId: 'vehicle-1',
					familyMemberId: null,
					registryId: null,
					fileName: 'motor-policy.pdf',
					documentType: 'insurance',
					documentSubtype: 'motor_policy',
					status: 'completed',
					documentDate: '2025-07-01',
					expiryDate: '2027-07-01',
					uploadedAt: '2026-01-01T00:00:00.000Z',
					processedAt: '2026-01-01T00:00:00.000Z',
				},
			],
			facts: [
				{
					id: 'fact-1',
					userId: 'user-1',
					vehicleId: 'vehicle-1',
					documentId: 'doc-insurance',
					factKey: 'insurance_provider',
					factValue: 'Tata AIG',
					valueDate: '2025-07-01',
					valueNumber: null,
					unit: null,
					confidence: 0.9,
					source: 'content',
					createdAt: '',
					updatedAt: '',
				},
			],
			timeline: [],
			familyMembers: [],
		},
		{
			userId: 'user-1',
			familyMemberId: null,
			accountOwnerMemberId: null,
		},
	)
}

function healthFactLookupRequest(question: string): EvidenceRequest {
	return {
		question,
		questionType: 'FACT_LOOKUP',
		domain: 'health',
		subject: { metricIds: ['ldl'], metricNames: ['LDL'] },
	}
}

function minimalHealthKnowledge(): HealthKnowledge {
	return {
		patient: { userId: 'user-1' },
		familyMember: {
			id: null,
			displayName: 'You',
			relationship: 'self',
			isAccountOwner: true,
			dateOfBirth: null,
			gender: null,
		},
		latestReport: null,
		previousReports: [],
		metrics: [
			{
				id: 'metric-ldl',
				canonicalId: 'ldl',
				displayName: 'LDL',
				latestValue: '110',
				unit: 'mg/dL',
				status: 'normal',
				reportId: 'report-1',
				reportTitle: 'Lipid Profile',
				observedAt: '2026-01-01',
				categoryId: 'lipids',
				trendDirection: 'stable',
				previousValue: null,
				changePercent: null,
			},
		],
		categories: [],
		insights: [],
		limitations: [],
		abnormalMetrics: [],
		normalMetrics: [],
		criticalMetrics: [],
		borderlineMetrics: [],
		trendAnalysis: [],
		timeline: [],
		healthScore: null,
		summary: {
			headline: 'Latest health summary',
			lines: [],
		},
		hasReports: true,
		reportCount: 1,
	}
}

describe('domain modules contract', () => {
	beforeEach(() => {
		clearPlatformModules()
		registerPlatformModules()
	})

	describe('platform wiring', () => {
		it('registers health, insurance, and vehicles modules', () => {
			expect(getRegisteredPlatformModuleIds()).toEqual(
				expect.arrayContaining(['health', 'insurance', 'vehicles']),
			)
		})
	})

	describe('shared import contracts', () => {
		it('parses insurance and vehicle AI extraction JSON', () => {
			const insurance = parseInsuranceExtractionJson(
				JSON.stringify({
					insurer: 'ICICI Lombard',
					policyNumber: 'POL 123456',
					policyType: 'health',
					sumInsured: 2500000,
				}),
			)
			const vehicle = parseVehicleExtractionJson(
				JSON.stringify({
					documentType: 'insurance',
					registrationNumber: 'MH 12 AB 1234',
					vin: 'MA1XA2BC3D4567890',
				}),
			)

			expect(insurance.policyNumber).toBe('POL 123456')
			expect(vehicle.registrationNumber).toBe('MH 12 AB 1234')
		})

		it('falls back to metadata extraction when download fails', async () => {
			const result = await extractRegistryDocumentForDomain({
				target: 'insurance',
				userId: 'user-1',
				registryId: 'registry-1',
				externalFileId: 'file-1',
				fileName: 'health-policy.pdf',
				documentId: 'doc-1',
				categoryHint: 'health',
			})

			expect(result.download).toBeNull()
			expect(result.extraction.method).toBe('deterministic_fallback')
			expect(result.extraction.insurance?.productName).toBe('health-policy')
		})

		it('uses OCR fallback extraction when AI direct fails but OCR text succeeds', async () => {
			vi.mocked(downloadRegistryDocumentToStorage).mockResolvedValueOnce({
				storagePath: 'users/user-1/docs/doc-1.pdf',
				fileSize: 1000,
			})
			vi.mocked(extractDomainDocumentWithAiDirect).mockRejectedValueOnce(
				new Error('AI direct failed'),
			)
			vi.mocked(extractTextFromStoredPdf).mockResolvedValueOnce({
				text: `${'Policy Schedule\nInsurer: ICICI Lombard\nPolicy Number: POL 123456\n'.repeat(8)}`,
				confidence: 0.9,
			})
			vi.mocked(extractDomainDocumentWithAi).mockResolvedValueOnce({
				target: 'insurance',
				method: 'ocr_fallback',
				extractedText: 'Policy Number POL 123456',
				insurance: {
					insurer: 'ICICI Lombard',
					policyNumber: 'POL 123456',
					policyType: 'health',
					productName: 'Health Shield',
					inceptionDate: '2024-01-01',
					expiryDate: '2027-01-01',
					renewalDate: null,
					sumInsured: 2500000,
					premium: null,
					currency: 'INR',
					insuredMembers: [],
					documentKind: null,
					confidence: 0.92,
					rawFields: {},
				},
			})

			const result = await extractRegistryDocumentForDomain({
				target: 'insurance',
				userId: 'user-1',
				registryId: 'registry-1',
				externalFileId: 'file-1',
				fileName: 'health-policy.pdf',
				documentId: 'doc-1',
				categoryHint: 'health',
			})

			expect(result.download?.storagePath).toBe('users/user-1/docs/doc-1.pdf')
			expect(result.extraction.method).toBe('ocr_fallback')
			expect(result.extraction.insurance?.policyNumber).toBe('POL 123456')
		})

		it('dedupes insurance policies by normalized insurer + policy number', () => {
			const keyA = policyDedupeKey({
				insurerId: 'icici-lombard',
				policyNumber: 'pol 123',
			})
			const keyB = policyDedupeKey({
				insurerId: 'icici-lombard',
				policyNumber: 'POL 123',
			})

			expect(keyA).toBe(keyB)
		})

		it('rejects placeholder insurance policies from display-ready state', () => {
			expect(
				isPolicyDisplayReady({
					id: 'policy-1',
					userId: 'user-1',
					familyMemberId: null,
					policyNumber: 'from-filename',
					policyType: 'health',
					productName: 'Unknown',
					insurerId: 'unknown-insurer',
					status: 'unknown',
					inceptionDate: null,
					expiryDate: null,
					renewalDate: null,
					sumInsured: 0,
					currency: 'INR',
					sourceDocumentIds: [],
					extractionMethod: 'metadata',
					confidence: 0.2,
					createdAt: '',
					updatedAt: '',
				}),
			).toBe(false)
		})

		it('matches vehicle identity from AI-normalized registration numbers', () => {
			expect(
				registrationNumbersMatch(
					'MH12AB1234',
					normalizeRegistrationNumber('MH 12 AB 1234'),
				),
			).toBe(true)
		})
	})

	describe('health module contract', () => {
		it('resolves FACT_LOOKUP evidence without LLM', () => {
			const bundle = resolveHealthEvidence(
				minimalHealthKnowledge(),
				healthFactLookupRequest('What is my LDL?'),
			)

			expect(bundle.metrics).toHaveLength(1)
			expect(bundle.metrics[0]?.displayName).toMatch(/LDL/i)
		})
	})

	describe('insurance module contract', () => {
		it('plans and resolves insurance evidence', () => {
			const knowledge = buildInsuranceKnowledge()
			const prepared = planAndResolveInsuranceEvidence({
				question: 'What is my policy number?',
				knowledge,
			})

			expect(prepared.questionType).toBe('FACT_LOOKUP')
			expect(prepared.evidenceBundle.summary.lines.join('\n')).toContain(
				'Policy number: POL-H-001',
			)
		})

		it('builds deterministic insurance FACT_LOOKUP ask turns', async () => {
			const turn = await buildDomainCompanionAskTurn({
				domain: 'insurance',
				knowledge: buildInsuranceKnowledge(),
				question: 'What is my policy number?',
				userId: 'user-1',
				familyMemberId: null,
				memberName: 'You',
				sessionKey: 'insurance:contract',
			})

			expect(turn.domains).toEqual(['insurance'])
			expect(turn.answer).toContain('Policy number: POL-H-001')
		})

		it('supports insurance status overview evidence', () => {
			const bundle = resolveInsuranceEvidence({
				knowledge: buildInsuranceKnowledge(),
				request: {
					question: 'Summarize my insurance',
					questionType: 'STATUS_OVERVIEW',
					domain: 'insurance',
					subject: {},
				},
			})

			expect(bundle.summary.lines.length).toBeGreaterThan(0)
			expect(bundle.metadata.resolver).toBe('insurance.evidence_resolver.v1')
		})
	})

	describe('vehicles module contract', () => {
		it('plans and resolves vehicle evidence', () => {
			const knowledge = buildVehicleKnowledge()
			const prepared = planAndResolveVehicleEvidence({
				question: 'How is my XEV 9e doing?',
				knowledge,
			})

			expect(prepared.evidenceBundle.summary.lines.length).toBeGreaterThan(0)
		})

		it('builds deterministic vehicle FACT_LOOKUP ask turns', async () => {
			const turn = await buildDomainCompanionAskTurn({
				domain: 'vehicles',
				knowledge: buildVehicleKnowledge(),
				question: 'What is my registration number?',
				userId: 'user-1',
				familyMemberId: null,
				memberName: 'You',
				sessionKey: 'vehicles:contract',
			})

			expect(turn.domains).toEqual(['vehicles'])
			expect(turn.answer.length).toBeGreaterThan(0)
		})

		it('supports vehicle status overview evidence', () => {
			const knowledge = buildVehicleKnowledge()
			const bundle = resolveVehicleEvidence({
				knowledge,
				request: {
					question: 'How is my XEV 9e doing?',
					questionType: 'STATUS_OVERVIEW',
					domain: 'vehicles',
					subject: {},
				},
			})

			expect(bundle.summary.lines.join('\n')).toMatch(
				/Registration|insurance|PUC/i,
			)
			expect(bundle.metadata.resolver).toBe('vehicles.evidence_resolver.v1')
		})
	})
})
