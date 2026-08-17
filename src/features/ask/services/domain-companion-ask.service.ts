import { resolveAnswerStrategy } from '@/features/ask/routing/answer-strategy.router'
import {
	buildNarrativeFailureTurn,
	companionResponseToAnswer,
	platformResponseToAskTurn,
} from '@/features/ask/services/platform-response.adapter'
import type { AskConversationTurn } from '@/features/ask/types'
import { toConfidenceLevel } from '@/features/intelligence/types/confidence.types'
import { planAndResolveInsuranceEvidence } from '@/shared/ai/evidence-planning/plan-insurance-evidence'
import { planAndResolveVehicleEvidence } from '@/shared/ai/evidence-planning/plan-vehicle-evidence'
import { isAIPlatformConfigured } from '@/shared/ai/config/ai-platform.config'
import { createChronicleCompanionAI } from '@/shared/ai/companion/chronicle-companion-ai'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceAskScope } from '@/features/insurance/types/insurance-ask.types'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'

export function useCompanionAskForDomain(
	domain: Extract<KnowledgeDomainId, 'insurance' | 'vehicles'>,
): boolean {
	void domain
	if (typeof import.meta === 'undefined' || !import.meta.env) {
		return isAIPlatformConfigured()
	}

	if (import.meta.env.VITE_USE_TEMPLATE_DOMAIN_ASK === 'true') {
		return false
	}

	return isAIPlatformConfigured()
}

function buildFactLookupFromEvidence(input: {
	question: string
	domain: AskConversationTurn['domains'][number]
	memberId: string | null
	memberName: string | null
	lines: string[]
	limitations: string[]
}): AskConversationTurn {
	const answer =
		input.lines.length > 0
			? input.lines.join('\n')
			: input.limitations.join('\n') ||
				'We have not found this information yet.'
	const dataAvailable = input.lines.length > 0
	const confidence = dataAvailable ? 0.82 : 0.35
	const timestamp = new Date().toISOString()

	return {
		id: crypto.randomUUID(),
		question: input.question,
		answer,
		cards: [],
		relatedReports: [],
		relatedMetrics: [],
		citations: [],
		evidence: input.lines,
		followUpQuestions: [],
		confidence,
		confidenceLevel: toConfidenceLevel(confidence),
		dataAvailable,
		memberId: input.memberId,
		memberName: input.memberName,
		displayTimestamp: 'Now',
		timestamp,
		domains: [input.domain],
	}
}

export async function buildDomainCompanionAskTurn(input: {
	domain: Extract<KnowledgeDomainId, 'insurance' | 'vehicles'>
	knowledge: InsuranceKnowledge | VehicleKnowledge
	question: string
	userId: string
	familyMemberId: string | null
	accountOwnerMemberId?: string | null
	memberName: string | null
	sessionKey: string
	scope?: InsuranceAskScope
	onStream?: (partial: string) => void
}): Promise<AskConversationTurn> {
	const strategy = resolveAnswerStrategy({
		question: input.question,
		legacyIntent: 'general_health',
	})

	const evidencePlan =
		input.domain === 'insurance'
			? planAndResolveInsuranceEvidence({
					question: input.question,
					knowledge: input.knowledge as InsuranceKnowledge,
					scope: input.scope,
				})
			: planAndResolveVehicleEvidence({
					question: input.question,
					knowledge: input.knowledge as VehicleKnowledge,
				})

	if (
		strategy.strategy === 'FACT_LOOKUP' ||
		evidencePlan.questionType === 'FACT_LOOKUP'
	) {
		return buildFactLookupFromEvidence({
			question: input.question,
			domain: input.domain,
			memberId: input.familyMemberId,
			memberName: input.memberName,
			lines: evidencePlan.evidenceBundle.summary.lines,
			limitations: evidencePlan.evidenceBundle.summary.limitations,
		})
	}

	if (!isAIPlatformConfigured()) {
		return buildNarrativeFailureTurn({
			question: input.question,
			member: {
				memberId: input.familyMemberId,
				memberName: input.memberName,
				familyMemberNames: [],
			},
			domains: [input.domain],
		})
	}

	const companion = createChronicleCompanionAI()
	const result = await companion.ask({
		userId: input.userId,
		question: input.question,
		domain: input.domain,
		familyMemberId: input.familyMemberId,
		accountOwnerMemberId: input.accountOwnerMemberId ?? null,
		memberName: input.memberName,
		insuranceScope: input.domain === 'insurance' ? input.scope : undefined,
	})

	if (input.onStream) {
		input.onStream(companionResponseToAnswer(result.response))
	}

	return platformResponseToAskTurn({
		response: result.response,
		member: {
			memberId: input.familyMemberId,
			memberName: input.memberName,
			familyMemberNames: [],
		},
		domains: [input.domain],
		dataAvailable: result.knowledge.dataAvailable,
		question: input.question,
	})
}
