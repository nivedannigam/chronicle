import { buildFinanceKnowledge } from '@/features/finance-knowledge'
import {
	buildIdentityKnowledge,
	filterIdentityKnowledgeForMember,
} from '@/features/identity-knowledge'
import { insuranceKnowledgeProvider } from '@/features/insurance-knowledge'
import {
	buildPropertyKnowledge,
	filterPropertyKnowledgeForMember,
} from '@/features/property-knowledge'
import { vehicleKnowledgeProvider } from '@/features/vehicle-knowledge'
import type { AskScopeContext } from '@/features/ask/services/knowledge-query.interface'
import type { UniversalQueryClassification } from '@/features/ask/routing/universal-query-router'
import { healthKnowledgeProvider } from '@/features/health-knowledge/providers/health-knowledge.provider'
import { mergeCrossModuleEvidence } from '@/shared/ai/evidence-planning/cross-module-evidence.adapter'
import type { CrossModuleEvidenceBundle } from '@/shared/ai/evidence-planning/cross-module-evidence.types'
import { planAndResolveFinanceEvidence } from '@/shared/ai/evidence-planning/plan-finance-evidence'
import { planAndResolveHealthEvidence } from '@/shared/ai/evidence-planning/plan-health-evidence'
import { planAndResolveIdentityEvidence } from '@/shared/ai/evidence-planning/plan-identity-evidence'
import { planAndResolveInsuranceEvidence } from '@/shared/ai/evidence-planning/plan-insurance-evidence'
import { planAndResolvePropertyEvidence } from '@/shared/ai/evidence-planning/plan-property-evidence'
import { planAndResolveVehicleEvidence } from '@/shared/ai/evidence-planning/plan-vehicle-evidence'
import type { EvidenceBundle } from '@/shared/ai/evidence-planning/types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'

export interface UniversalEvidenceInput {
	question: string
	classification: UniversalQueryClassification
	userId: string
	familyMemberId: string | null
	accountOwnerMemberId: string | null
	memberName: string | null
	documents: ChronicleDocument[]
	familyMembers: FamilyMemberWithAliases[]
	scope?: AskScopeContext
	hasFinanceFolderAssigned?: boolean
	hasPropertyFolderAssigned?: boolean
}

export interface UniversalEvidenceResult {
	bundle: CrossModuleEvidenceBundle
	resolvedDomains: KnowledgeDomainId[]
	failedDomains: KnowledgeDomainId[]
	domainBundles: Array<{
		domain: KnowledgeDomainId
		bundle: EvidenceBundle
		entity: string | null
	}>
}

function providerFailureBundle(domain: KnowledgeDomainId): EvidenceBundle {
	const label =
		domain === 'health'
			? 'health records'
			: domain === 'insurance'
				? 'insurance records'
				: domain === 'vehicles'
					? 'vehicle records'
					: domain === 'identity'
						? 'identity records'
						: domain === 'finance'
							? 'financial records'
							: domain === 'property'
								? 'property records'
								: 'records'

	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: 'Unavailable',
			lines: [],
			healthScore: null,
			limitations: [`I couldn't retrieve your ${label} right now.`],
		},
		metadata: {
			questionType: 'STATUS_OVERVIEW',
			resolver: 'universal.evidence_orchestrator.v1',
			excluded: [],
		},
	}
}

async function resolveDomainEvidence(
	domain: KnowledgeDomainId,
	input: UniversalEvidenceInput,
): Promise<{ bundle: EvidenceBundle; entity: string | null }> {
	const {
		question,
		userId,
		familyMemberId,
		accountOwnerMemberId,
		documents,
		familyMembers,
		scope,
	} = input

	switch (domain) {
		case 'health': {
			const knowledge = await healthKnowledgeProvider.getKnowledge({
				userId,
				familyMemberId,
				accountOwnerMemberId,
			})
			const resolved = planAndResolveHealthEvidence({
				question,
				knowledge,
				userId,
				familyMemberId,
				accountOwnerMemberId,
				memberName: input.memberName,
				categoryId: scope?.categoryId,
				reportId: scope?.reportId,
				reportIds: scope?.reportIds,
			})
			return {
				bundle: resolved.evidenceBundle,
				entity: knowledge.summary.headline || 'Health',
			}
		}
		case 'insurance': {
			const knowledge = await insuranceKnowledgeProvider.getKnowledge({
				userId,
				familyMemberId,
				accountOwnerMemberId,
			})
			const resolved = planAndResolveInsuranceEvidence({
				question,
				knowledge,
				scope: {
					policyId: scope?.policyId,
					claimId: scope?.claimId,
				},
			})
			return {
				bundle: resolved.evidenceBundle,
				entity: resolved.evidenceBundle.summary.headline,
			}
		}
		case 'vehicles': {
			const knowledge = await vehicleKnowledgeProvider.getKnowledge({
				userId,
				familyMemberId,
				accountOwnerMemberId,
			})
			const resolved = planAndResolveVehicleEvidence({
				question,
				knowledge,
			})
			return {
				bundle: resolved.evidenceBundle,
				entity: resolved.evidenceBundle.summary.headline,
			}
		}
		case 'identity': {
			const knowledge = filterIdentityKnowledgeForMember(
				buildIdentityKnowledge({
					userId,
					documents,
					members: familyMembers,
					accountOwnerMemberId,
				}),
				familyMemberId,
			)
			const resolved = planAndResolveIdentityEvidence({
				question,
				knowledge,
				scope: {
					documentId: scope?.documentId,
					memberId: familyMemberId,
				},
			})
			return {
				bundle: resolved.evidenceBundle,
				entity: resolved.evidenceBundle.summary.headline,
			}
		}
		case 'finance': {
			const financeDocuments = documents.filter(
				(document) => document.category_id === 'financial',
			)
			const knowledge = buildFinanceKnowledge({
				userId,
				documents: financeDocuments,
				members: familyMembers,
				hasFolderAssigned: input.hasFinanceFolderAssigned ?? false,
				selectedMemberId: familyMemberId,
			})
			const resolved = planAndResolveFinanceEvidence({
				question,
				knowledge,
				scope: {
					entityId: scope?.entityId,
					documentId: scope?.documentId,
				},
			})
			return {
				bundle: resolved.evidenceBundle,
				entity: resolved.evidenceBundle.summary.headline,
			}
		}
		case 'property': {
			const knowledge = filterPropertyKnowledgeForMember(
				buildPropertyKnowledge({
					userId,
					documents,
					members: familyMembers,
					hasFolderAssigned: input.hasPropertyFolderAssigned ?? false,
					selectedMemberId: familyMemberId,
				}),
				familyMemberId,
			)
			const resolved = planAndResolvePropertyEvidence({
				question,
				knowledge,
				scope: {
					propertyId: scope?.entityId,
					documentId: scope?.documentId,
					memberId: familyMemberId,
				},
			})
			return {
				bundle: resolved.evidenceBundle,
				entity: resolved.evidenceBundle.summary.headline,
			}
		}
		default:
			return {
				bundle: providerFailureBundle(domain),
				entity: null,
			}
	}
}

export async function gatherUniversalEvidence(
	input: UniversalEvidenceInput,
): Promise<UniversalEvidenceResult> {
	const domains = input.classification.domains
	const domainBundles: UniversalEvidenceResult['domainBundles'] = []
	const resolvedDomains: KnowledgeDomainId[] = []
	const failedDomains: KnowledgeDomainId[] = []

	for (const domain of domains) {
		try {
			const resolved = await resolveDomainEvidence(domain, input)
			domainBundles.push({
				domain,
				bundle: resolved.bundle,
				entity: resolved.entity,
			})
			resolvedDomains.push(domain)

			if (
				resolved.bundle.summary.limitations.some((line) =>
					line.includes("couldn't retrieve"),
				)
			) {
				failedDomains.push(domain)
			}
		} catch {
			domainBundles.push({
				domain,
				bundle: providerFailureBundle(domain),
				entity: null,
			})
			failedDomains.push(domain)
		}
	}

	const bundle = mergeCrossModuleEvidence({
		domainBundles: domainBundles.map((entry) => ({
			domain: entry.domain,
			bundle: entry.bundle,
			entity: entry.entity,
		})),
	})

	return {
		bundle,
		resolvedDomains,
		failedDomains,
		domainBundles,
	}
}
