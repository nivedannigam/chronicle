import { gatherUniversalEvidence } from '@/features/ask/evidence/universal-evidence.orchestrator'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'
import { setLastAskDebugInfo } from '@/features/ask/services/ai-ask-reasoning.engine'
import {
	buildNarrativeFailureTurn,
	companionResponseToAnswer,
	platformResponseToAskTurn,
} from '@/features/ask/services/platform-response.adapter'
import {
	buildNarrativeUniversalTurn,
	buildStructuredUniversalTurn,
	shouldUseStructuredUniversalTurn,
} from '@/features/ask/services/universal-ask-turn.builder'
import type { AskScopeContext } from '@/features/ask/services/knowledge-query.interface'
import {
	classifyUniversalQuery,
	isHealthOnlyQuestion,
} from '@/features/ask/routing/universal-query-router'
import type {
	AskConversationTurn,
	AskQuestionResult,
} from '@/features/ask/types'
import { createChronicleCompanionAI } from '@/shared/ai/companion/chronicle-companion-ai'
import { isAIPlatformConfigured } from '@/shared/ai/config/ai-platform.config'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'
import { toAskKnowledgeDomains } from '@/features/ask/utils/ask-domain.mapper'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { FinanceKnowledge } from '@/features/finance-knowledge/types/finance-knowledge.types'
import { buildFinanceKnowledge } from '@/features/finance-knowledge'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import { insuranceKnowledgeProvider } from '@/features/insurance-knowledge'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import { vehicleKnowledgeProvider } from '@/features/vehicle-knowledge'
import {
	evaluateAskEvidenceGate,
	shouldBlockNarrativeWithoutEvidence,
} from '@/features/ask/trust/ask-answer-contract'
import { buildGatedAskTurn } from '@/features/ask/trust/ask-gated-turn.builder'
import {
	resolveAskAuthorization,
	type AskAuthorizationResult,
} from '@/core/platform/services/privacy-authorization.service'
import { getAccountOwnerMemberId } from '@/features/family/utils/member-display'

export interface ResolveUniversalAskInput {
	userId: string
	question: string
	memberId: string | null
	memberName: string | null
	familyMembers: FamilyMemberWithAliases[]
	sessionKey: string
	documents: ChronicleDocument[]
	scope?: AskScopeContext
	hasFinanceFolderAssigned?: boolean
	hasPropertyFolderAssigned?: boolean
	onStream?: (partial: string) => void
}

async function maybeResolveSingleDomainNarrative(input: {
	resolveInput: ResolveUniversalAskInput
	domains: KnowledgeDomainId[]
	authorization: AskAuthorizationResult
	evidenceGate: ReturnType<typeof evaluateAskEvidenceGate>
}): Promise<AskConversationTurn | null> {
	const domain = input.domains[0]

	if (!domain || input.domains.length !== 1) {
		return null
	}

	if (input.authorization.status === 'RESTRICTED') {
		return null
	}

	if (shouldBlockNarrativeWithoutEvidence(input.evidenceGate)) {
		return null
	}

	if (!isAIPlatformConfigured()) {
		return null
	}

	if (domain !== 'insurance' && domain !== 'vehicles' && domain !== 'finance') {
		return null
	}

	const companion = createChronicleCompanionAI()
	let financeKnowledge: FinanceKnowledge | undefined
	let insuranceKnowledge: InsuranceKnowledge | undefined
	let vehicleKnowledge: VehicleKnowledge | undefined

	if (domain === 'finance') {
		financeKnowledge = buildFinanceKnowledge({
			userId: input.resolveInput.userId,
			documents: input.resolveInput.documents.filter(
				(document) => document.category_id === 'financial',
			),
			members: input.resolveInput.familyMembers,
			hasFolderAssigned: input.resolveInput.hasFinanceFolderAssigned ?? false,
			selectedMemberId: input.resolveInput.memberId,
		})
	} else if (domain === 'insurance') {
		insuranceKnowledge = await insuranceKnowledgeProvider.getKnowledge({
			userId: input.resolveInput.userId,
			familyMemberId: input.resolveInput.memberId,
			accountOwnerMemberId:
				input.resolveInput.familyMembers.find((entry) => entry.isAccountOwner)
					?.id ?? null,
		})
	} else {
		vehicleKnowledge = await vehicleKnowledgeProvider.getKnowledge({
			userId: input.resolveInput.userId,
			familyMemberId: input.resolveInput.memberId,
			accountOwnerMemberId:
				input.resolveInput.familyMembers.find((entry) => entry.isAccountOwner)
					?.id ?? null,
		})
	}

	void insuranceKnowledge
	void vehicleKnowledge

	const result = await companion.ask({
		userId: input.resolveInput.userId,
		question: input.resolveInput.question,
		domain,
		familyMemberId: input.resolveInput.memberId,
		accountOwnerMemberId:
			input.resolveInput.familyMembers.find((entry) => entry.isAccountOwner)
				?.id ?? null,
		memberName: input.resolveInput.memberName,
		financeKnowledge,
		financeScope:
			domain === 'finance'
				? {
						entityId: input.resolveInput.scope?.entityId,
						documentId: input.resolveInput.scope?.documentId,
					}
				: undefined,
		insuranceScope:
			domain === 'insurance'
				? {
						policyId: input.resolveInput.scope?.policyId,
						claimId: input.resolveInput.scope?.claimId,
					}
				: undefined,
		conversationTurns: conversationMemory.getTurns(
			input.resolveInput.sessionKey,
		),
	})

	if (input.resolveInput.onStream) {
		input.resolveInput.onStream(companionResponseToAnswer(result.response))
	}

	return platformResponseToAskTurn({
		response: result.response,
		member: {
			memberId: input.resolveInput.memberId,
			memberName: input.resolveInput.memberName,
			familyMemberNames: [],
		},
		domains: toAskKnowledgeDomains([domain]),
		dataAvailable: result.knowledge.dataAvailable,
		question: input.resolveInput.question,
	})
}

export async function resolveUniversalAskTurn(
	input: ResolveUniversalAskInput,
): Promise<AskQuestionResult> {
	const startedAt = performance.now()
	const classification = classifyUniversalQuery({
		question: input.question,
		contextModule: input.scope?.contextModule,
	})

	const accountOwnerMemberId = getAccountOwnerMemberId(input.familyMembers)
	const authorization = resolveAskAuthorization({
		question: input.question,
		viewerMemberId: input.memberId,
		viewerMemberName: input.memberName,
		members: input.familyMembers,
		accountOwnerMemberId,
	})

	if (authorization.status === 'RESTRICTED') {
		const turn = buildGatedAskTurn({
			question: input.question,
			status: 'RESTRICTED',
			memberId: input.memberId,
			memberName: input.memberName,
			domains: classification.domains,
			restrictedMemberName: input.memberName,
		})

		conversationMemory.addTurn(input.sessionKey, turn, {
			intent: classification.domains[0] ?? 'general',
		})

		return {
			turn,
			intent: classification.domains[0] ?? 'health',
			implementation: 'grounded-only',
			routing: 'grounded',
		}
	}

	const evidence = await gatherUniversalEvidence({
		question: input.question,
		classification,
		userId: input.userId,
		familyMemberId: authorization.retrievalMemberId,
		accountOwnerMemberId,
		memberName: input.memberName,
		documents: input.documents,
		familyMembers: input.familyMembers,
		scope: input.scope,
		hasFinanceFolderAssigned: input.hasFinanceFolderAssigned,
		hasPropertyFolderAssigned: input.hasPropertyFolderAssigned,
	})

	const evidenceGate = evaluateAskEvidenceGate({
		authorizationStatus: authorization.status,
		bundle: evidence.bundle,
	})

	const domains =
		evidence.resolvedDomains.length > 0
			? evidence.resolvedDomains
			: classification.domains

	let turn: AskConversationTurn

	if (evidenceGate.status === 'NOT_FOUND') {
		turn = buildGatedAskTurn({
			question: input.question,
			status: 'NOT_FOUND',
			memberId: input.memberId,
			memberName: input.memberName,
			domains,
		})
	} else if (shouldUseStructuredUniversalTurn(classification)) {
		turn = buildStructuredUniversalTurn({
			question: input.question,
			classification,
			bundle: evidence.bundle,
			memberId: input.memberId,
			memberName: input.memberName,
			domains,
		})
	} else if (shouldBlockNarrativeWithoutEvidence(evidenceGate)) {
		turn = buildGatedAskTurn({
			question: input.question,
			status: evidenceGate.status,
			memberId: input.memberId,
			memberName: input.memberName,
			domains,
		})
	} else {
		const narrativeTurn = await maybeResolveSingleDomainNarrative({
			resolveInput: {
				...input,
				memberId: authorization.retrievalMemberId,
			},
			domains,
			authorization,
			evidenceGate,
		})

		turn =
			narrativeTurn ??
			buildNarrativeUniversalTurn({
				question: input.question,
				classification,
				bundle: evidence.bundle,
				memberId: input.memberId,
				memberName: input.memberName,
				domains,
			})
	}

	if (!turn.answer && !isAIPlatformConfigured()) {
		turn = buildNarrativeFailureTurn({
			question: input.question,
			member: {
				memberId: input.memberId,
				memberName: input.memberName,
				familyMemberNames: [],
			},
			domains: toAskKnowledgeDomains(domains),
		})
	}

	if (input.onStream && turn.answer) {
		input.onStream(turn.answer)
	}

	conversationMemory.addTurn(input.sessionKey, turn, {
		intent: domains[0] ?? 'general',
	})

	const primaryDomain = domains[0] ?? 'health'
	const routing: AskQuestionResult['routing'] =
		evidenceGate.status === 'ANSWERABLE' && turn.evidence.length > 0
			? 'grounded'
			: 'grounded'

	if (import.meta.env.DEV) {
		setLastAskDebugInfo({
			intent: primaryDomain,
			resolvedQuestion: input.question,
			provider:
				turn.confidence >= 0.8 && !narrativeUsed(classification, turn)
					? 'structured-universal'
					: 'companion-ai',
			providerResponse: turn.answer,
			turn,
			timingMs: performance.now() - startedAt,
			routing,
		})
	}

	return {
		turn,
		intent: primaryDomain,
		implementation:
			turn.confidence >= 0.8 && !narrativeUsed(classification, turn)
				? 'grounded-only'
				: 'ai-provider',
		routing,
	}
}

function narrativeUsed(
	classification: ReturnType<typeof classifyUniversalQuery>,
	turn: AskConversationTurn,
): boolean {
	return (
		!shouldUseStructuredUniversalTurn(classification) &&
		turn.evidence.length === 0 &&
		turn.answer.length > 120
	)
}

export { classifyUniversalQuery, isHealthOnlyQuestion }
