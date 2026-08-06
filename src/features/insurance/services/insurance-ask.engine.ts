import type {
	AskConversationTurn,
	EvidenceCitation,
} from '@/features/ask/types'
import type { TrustResponse } from '@/features/ask/trust/trust.types'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import {
	consumerProtectionSummary,
	deriveConsumerProtectionStatus,
	formatCoverageAmount,
} from '@/features/insurance/services/insurance-consumer-status.service'
import { buildClaimCards } from '@/features/insurance/services/insurance-claims.mapper'
import {
	buildPolicyCardViewModel,
	buildPolicyCards,
} from '@/features/insurance/services/insurance-policies.mapper'
import { buildProtectionOverviewViewModel } from '@/features/insurance/services/insurance-protection.mapper'
import type {
	InsuranceAskIntent,
	InsuranceAskMemoryContext,
	InsuranceAskScope,
} from '@/features/insurance/types/insurance-ask.types'

const GENERIC_PREFIX =
	'Generally speaking — and not based on your personal policies — '

function normalizeQuestion(question: string): string {
	return question.trim().toLowerCase()
}

export function classifyInsuranceAskIntent(
	question: string,
	memory?: InsuranceAskMemoryContext,
): InsuranceAskIntent {
	const q = normalizeQuestion(question)

	if (
		memory?.lastIntent === 'recommendation' ||
		memory?.lastIntent === 'coverage_lookup'
	) {
		if (
			/what would that cost|how much would|cost to increase|premium/i.test(q)
		) {
			return 'follow_up'
		}
	}

	if (
		/am i adequately insured|summarize my protection|protection overview|how protected|overall protection/i.test(
			q,
		)
	) {
		return 'protection_overview'
	}

	if (
		/enough health|adequate health|sufficient health|do i have enough health/i.test(
			q,
		)
	) {
		return 'coverage_lookup'
	}

	if (
		/total life|life insurance|how much life|life cover|term insurance/i.test(q)
	) {
		return 'coverage_lookup'
	}

	if (/duplicate|compare.*health|compare.*polic|overlap/i.test(q)) {
		return 'comparison'
	}

	if (
		/which policy covers|policy covers|covers my|insurance for my|xev|vehicle/i.test(
			q,
		)
	) {
		return 'policy_lookup'
	}

	if (/polic(y|ies) covering|covering advika|covering .+/i.test(q)) {
		return 'member_coverage'
	}

	if (/claim|hospitalization|settled|filed a claim/i.test(q)) {
		return 'claim_lookup'
	}

	if (/expir|renew|next policy|when does.*renew|due next/i.test(q)) {
		return 'renewal'
	}

	if (/premium|pay every year|annual cost|how much do i pay/i.test(q)) {
		return 'financial_summary'
	}

	if (/missing|gap|should i have|do i need|important insurance/i.test(q)) {
		return 'recommendation'
	}

	if (
		/explain this policy|explain my|what does this policy|what does my/i.test(q)
	) {
		return 'policy_explanation'
	}

	if (/hospitalized|accident|what happens if|scenario|risk/i.test(q)) {
		return 'risk_scenario'
	}

	if (/what changed|since last year|compared to last year/i.test(q)) {
		return 'comparison'
	}

	if (
		/home insurance|travel insurance|vehicle insurance|health insurance/i.test(
			q,
		)
	) {
		return 'policy_lookup'
	}

	return memory?.lastIntent ?? 'general'
}

function resolvePolicyCards(knowledge: InsuranceKnowledge) {
	return buildPolicyCards(knowledge)
}

function buildEvidenceCitations(
	knowledge: InsuranceKnowledge,
	policyIds: string[],
): EvidenceCitation[] {
	return policyIds
		.map((policyId) => {
			const policy = knowledge.policies.find((item) => item.id === policyId)

			if (!policy) {
				return null
			}

			const card = buildPolicyCardViewModel(knowledge, policy)

			return {
				reportId: policy.id,
				reportTitle: card.name,
				hospital: policy.insurerName,
				date:
					policy.renewalDate ?? policy.expiryDate ?? policy.inceptionDate ?? '',
				source: 'insurance' as const,
			}
		})
		.filter((item): item is EvidenceCitation => item != null)
}

function buildTrustResponse(input: {
	answer: string
	evidenceLabels: string[]
	followUps: string[]
	confidence: number
	dataAvailable: boolean
	citations: EvidenceCitation[]
}): TrustResponse {
	return {
		directAnswer: input.answer,
		evidence: input.evidenceLabels,
		supportingReports: input.citations.map((citation) => ({
			id: citation.reportId,
			title: citation.reportTitle,
			date: citation.date,
		})),
		timelineSummary: [],
		confidence: {
			level:
				input.confidence >= 0.75
					? 'high'
					: input.confidence >= 0.5
						? 'medium'
						: 'low',
			score: input.confidence,
			factors: input.dataAvailable
				? ['Based on your policies and claims on record.']
				: ['Limited personal insurance data available.'],
		},
		missingInformation: input.dataAvailable
			? []
			: ['Connect your Insurance folder to unlock personalized answers.'],
		disagreements: [],
		followUpQuestions: input.followUps,
		evidenceItems: input.citations.map((citation, index) => ({
			id: `evidence-${index}`,
			reportId: citation.reportId,
			reportTitle: citation.reportTitle,
			reportDate: citation.date,
			hospital: citation.hospital,
			claimKind: 'known_fact' as const,
			source: 'insurance' as const,
		})),
		explainabilityPrompts: [
			'Which policies did you use?',
			'What coverage gaps remain?',
		],
	}
}

function defaultFollowUps(intent: InsuranceAskIntent): string[] {
	switch (intent) {
		case 'protection_overview':
			return [
				'Which policy expires next?',
				'Do I have duplicate coverage?',
				'Summarize my claims.',
			]
		case 'coverage_lookup':
			return [
				'Should I increase health cover?',
				'Compare my health policies.',
				'Who is covered?',
			]
		case 'claim_lookup':
			return ['Show pending claims.', 'What was my largest claim?']
		case 'renewal':
			return [
				'Show all renewals this year.',
				'Which policies are expiring soon?',
			]
		case 'comparison':
			return ['Do I have duplicate coverage?', 'What changed since last year?']
		case 'recommendation':
			return ['Should I increase coverage?', 'Do I have travel insurance?']
		case 'financial_summary':
			return ['Show premium history.', 'Which policy is most expensive?']
		default:
			return [
				'Am I adequately insured?',
				'Which policy expires next?',
				'What claims have I made?',
			]
	}
}

function answerProtectionOverview(knowledge: InsuranceKnowledge): {
	answer: string
	evidencePolicyIds: string[]
	followUps: string[]
} {
	const protection = buildProtectionOverviewViewModel(knowledge)
	const cards = resolvePolicyCards(knowledge)
	const status = deriveConsumerProtectionStatus(knowledge)
	const narrative = consumerProtectionSummary(status)

	if (knowledge.policies.length === 0) {
		return {
			answer:
				"I don't see any policies in your archive yet. Once your insurance documents are connected, I can give you a personalized protection summary.",
			evidencePolicyIds: [],
			followUps: ['How do I add my policies?'],
		}
	}

	const lines = [
		`Based on your policies, ${narrative.charAt(0).toLowerCase()}${narrative.slice(1)}`,
	]

	const health = protection.areas.find((area) => area.id === 'health')
	const life = protection.areas.find((area) => area.id === 'life_term')
	const motor = protection.areas.find((area) => area.id === 'motor')

	if (health && health.status !== 'Missing') {
		lines.push(
			`Your family has ${health.coverageLabel.toLowerCase() === '—' ? 'health cover' : health.coverageLabel + ' health coverage'}.`,
		)
	}

	if (life && life.status !== 'Missing') {
		lines.push(`You have ${life.coverageLabel} life cover in place.`)
	}

	if (motor && motor.status !== 'Missing') {
		lines.push(
			`${motor.coverageLabel} ${motor.coverageSubLabel ? `(${motor.coverageSubLabel})` : ''}`.trim() +
				'.',
		)
	}

	if (protection.recommendations.length > 0) {
		lines.push(
			`The biggest opportunity today: ${protection.recommendations[0]!.title.toLowerCase()}.`,
		)
	} else if (knowledge.coverageGaps.length > 0) {
		lines.push(
			`One area to review: ${knowledge.coverageGaps[0]!.message.toLowerCase()}`,
		)
	}

	return {
		answer: lines.join('\n\n'),
		evidencePolicyIds: cards.map((card) => card.id),
		followUps: defaultFollowUps('protection_overview'),
	}
}

function answerCoverageLookup(
	knowledge: InsuranceKnowledge,
	question: string,
): {
	answer: string
	evidencePolicyIds: string[]
	followUps: string[]
} {
	const q = normalizeQuestion(question)

	if (knowledge.policies.length === 0) {
		return {
			answer:
				"I don't have your policy details yet, so I can't assess your coverage personally.",
			evidencePolicyIds: [],
			followUps: defaultFollowUps('coverage_lookup'),
		}
	}

	if (/life|term/.test(q)) {
		const lifePolicies = knowledge.policies.filter(
			(policy) =>
				policy.categoryId === 'life_term' && policy.status === 'active',
		)
		const total = lifePolicies.reduce(
			(sum, policy) => sum + (policy.sumInsured ?? 0),
			0,
		)

		if (lifePolicies.length === 0) {
			return {
				answer:
					"Based on your policies, I don't see active life insurance on record right now.",
				evidencePolicyIds: [],
				followUps: [
					'Do I have enough health insurance?',
					'Am I missing any important insurance?',
				],
			}
		}

		return {
			answer: `Based on your policies, you have ${formatCoverageAmount(total, lifePolicies[0]!.currency)} total life cover across ${lifePolicies.length} polic${lifePolicies.length === 1 ? 'y' : 'ies'}.`,
			evidencePolicyIds: lifePolicies.map((policy) => policy.id),
			followUps: ['Should I increase coverage?', 'Who is the nominee?'],
		}
	}

	const healthPolicies = knowledge.activePolicies.filter(
		(policy) => policy.categoryId === 'health',
	)
	const totalHealth = healthPolicies.reduce(
		(sum, policy) => sum + (policy.sumInsured ?? 0),
		0,
	)

	if (/health|enough|adequate/.test(q)) {
		if (healthPolicies.length === 0) {
			return {
				answer:
					"Based on your policies, I don't see active health insurance on record.",
				evidencePolicyIds: [],
				followUps: [
					'Am I missing any important insurance?',
					'Summarize my protection.',
				],
			}
		}

		const memberCount = [
			...new Set(
				knowledge.members
					.filter((member) =>
						healthPolicies.some((policy) => policy.id === member.policyId),
					)
					.map((member) => member.name),
			),
		].length

		const adequacy =
			totalHealth >= 1000000
				? 'solid health protection for your family'
				: "meaningful health cover, though you may want to review whether it meets your family's needs"

		return {
			answer: `Based on your policies, you have ${formatCoverageAmount(totalHealth, healthPolicies[0]!.currency)} health coverage across ${healthPolicies.length} polic${healthPolicies.length === 1 ? 'y' : 'ies'}${memberCount > 0 ? ` covering ${memberCount} family member${memberCount === 1 ? '' : 's'}` : ''}. That represents ${adequacy}.`,
			evidencePolicyIds: healthPolicies.map((policy) => policy.id),
			followUps: [
				'Should I increase health cover?',
				'Compare my health policies.',
			],
		}
	}

	return answerProtectionOverview(knowledge)
}

function answerPolicyLookup(
	knowledge: InsuranceKnowledge,
	question: string,
): {
	answer: string
	evidencePolicyIds: string[]
	followUps: string[]
} {
	const q = normalizeQuestion(question)
	const cards = resolvePolicyCards(knowledge)

	if (cards.length === 0) {
		return {
			answer: "I couldn't find policies matching that in your archive.",
			evidencePolicyIds: [],
			followUps: defaultFollowUps('policy_lookup'),
		}
	}

	if (/xev|vehicle|motor|car|mahindra|honda/.test(q)) {
		const motorCards = cards.filter((card) => card.categoryId === 'motor')
		const token = q
			.split(/\s+/)
			.find((word) =>
				['xev', 'mahindra', 'honda', 'vehicle', 'car'].includes(word),
			)
		const matched =
			motorCards.filter(
				(card) =>
					card.assetLabel?.toLowerCase().includes(token ?? '') ||
					card.name.toLowerCase().includes(q),
			) ?? motorCards

		if (matched.length === 0 && motorCards.length > 0) {
			return {
				answer: `Based on your policies, your vehicles are covered under ${motorCards.map((card) => card.assetLabel ?? card.name).join(' and ')}.`,
				evidencePolicyIds: motorCards.map((card) => card.id),
				followUps: ['Which policy expires next?', 'What claims have I made?'],
			}
		}

		if (matched.length > 0) {
			const card = matched[0]!
			return {
				answer: `Based on your policies, ${card.assetLabel ?? card.name} is covered under ${card.name} with ${card.insurer}.${card.renewalLabel ? ` ${card.renewalLabel}.` : ''}`,
				evidencePolicyIds: [card.id],
				followUps: [
					'Explain this policy.',
					'What claims have I made for this vehicle?',
				],
			}
		}
	}

	if (/home/.test(q)) {
		const home = cards.filter((card) => card.categoryId === 'home')

		return {
			answer:
				home.length > 0
					? `Yes — based on your policies, you have home insurance through ${home[0]!.insurer}.`
					: "Based on your policies, I don't see dedicated home insurance on record.",
			evidencePolicyIds: home.map((card) => card.id),
			followUps: ['Am I missing any important insurance?'],
		}
	}

	if (/travel/.test(q)) {
		const travel = cards.filter((card) => card.categoryId === 'travel')

		return {
			answer:
				travel.length > 0
					? `Yes — you have travel insurance through ${travel[0]!.insurer}.`
					: "Based on your policies, I don't see dedicated travel insurance on record.",
			evidencePolicyIds: travel.map((card) => card.id),
			followUps: ['Am I missing any important insurance?'],
		}
	}

	return {
		answer: `Based on your policies, you have ${cards.length} polic${cards.length === 1 ? 'y' : 'ies'} on record across ${[...new Set(cards.map((card) => card.categoryLabel))].join(', ')}.`,
		evidencePolicyIds: cards.slice(0, 4).map((card) => card.id),
		followUps: defaultFollowUps('policy_lookup'),
	}
}

function answerMemberCoverage(
	knowledge: InsuranceKnowledge,
	question: string,
): {
	answer: string
	evidencePolicyIds: string[]
	followUps: string[]
} {
	const match = question.match(/covering\s+([a-z][a-z\s'-]{1,20})/i)
	const memberQuery = match?.[1]?.trim().toLowerCase()
	const cards = resolvePolicyCards(knowledge)

	const matched = cards.filter((card) =>
		card.coveredMembers.some((member) =>
			memberQuery ? member.toLowerCase().includes(memberQuery) : true,
		),
	)

	if (matched.length === 0) {
		return {
			answer: memberQuery
				? `I couldn't find policies covering ${match?.[1]?.trim()} in your archive.`
				: "Tell me which family member you'd like me to check.",
			evidencePolicyIds: [],
			followUps: ['Who is covered on my health policy?'],
		}
	}

	return {
		answer: `Based on your policies, ${match?.[1]?.trim() ?? 'your family member'} is covered under ${matched.map((card) => card.name).join(', ')}.`,
		evidencePolicyIds: matched.map((card) => card.id),
		followUps: ['Compare my health policies.', 'What claims have we made?'],
	}
}

function answerClaims(knowledge: InsuranceKnowledge): {
	answer: string
	evidencePolicyIds: string[]
	followUps: string[]
} {
	const claims = buildClaimCards(knowledge)

	if (claims.length === 0) {
		return {
			answer:
				'Based on your records, you have no claims on file yet — a clean claims history.',
			evidencePolicyIds: knowledge.policies
				.slice(0, 2)
				.map((policy) => policy.id),
			followUps: ['Summarize my protection.', 'Which policy expires next?'],
		}
	}

	const settled = claims.filter((claim) => claim.status === 'Settled')
	const pending = claims.filter(
		(claim) => claim.status === 'Submitted' || claim.status === 'Under Review',
	)

	const lines = [
		`Based on your records, you have ${claims.length} claim${claims.length === 1 ? '' : 's'} on file.`,
	]

	if (settled.length > 0) {
		const latest = settled[0]!
		lines.push(
			`Your most recent settled claim is ${latest.title}${latest.approvedAmountLabel ? ` — ${latest.approvedAmountLabel}` : ''}.`,
		)
	}

	if (pending.length > 0) {
		lines.push(
			`${pending.length} claim${pending.length === 1 ? ' is' : 's are'} still being reviewed.`,
		)
	}

	return {
		answer: lines.join('\n\n'),
		evidencePolicyIds: [...new Set(claims.map((claim) => claim.policyId))],
		followUps: defaultFollowUps('claim_lookup'),
	}
}

function answerRenewal(knowledge: InsuranceKnowledge): {
	answer: string
	evidencePolicyIds: string[]
	followUps: string[]
} {
	const cards = resolvePolicyCards(knowledge).filter(
		(card) => card.renewalLabel,
	)

	if (cards.length === 0) {
		return {
			answer:
				"I couldn't find upcoming renewals in your policy archive right now.",
			evidencePolicyIds: [],
			followUps: ['Summarize my protection.'],
		}
	}

	const sorted = [...knowledge.policies]
		.filter((policy) => policy.renewalDate || policy.expiryDate)
		.sort(
			(a, b) =>
				Date.parse(a.renewalDate ?? a.expiryDate ?? '') -
				Date.parse(b.renewalDate ?? b.expiryDate ?? ''),
		)

	const next = sorted[0]
	const nextCard = next ? buildPolicyCardViewModel(knowledge, next) : cards[0]

	return {
		answer: `Based on your policies, ${nextCard?.name ?? 'your next policy'} renews next${nextCard?.renewalLabel ? ` — ${nextCard.renewalLabel}` : ''}.`,
		evidencePolicyIds: next ? [next.id] : [cards[0]!.id],
		followUps: [
			'Show all renewals this year.',
			'Which policies are expiring soon?',
		],
	}
}

function answerComparison(knowledge: InsuranceKnowledge): {
	answer: string
	evidencePolicyIds: string[]
	followUps: string[]
} {
	const healthPolicies = knowledge.activePolicies.filter(
		(policy) => policy.categoryId === 'health',
	)

	if (healthPolicies.length >= 2) {
		const descriptions = healthPolicies.map((policy) => {
			const card = buildPolicyCardViewModel(knowledge, policy)
			return `${card.name} (${card.coverageLabel})`
		})

		return {
			answer: `Based on your policies, you have ${healthPolicies.length} active health policies: ${descriptions.join(' and ')}. Review whether the combined cover meets your needs or overlaps.`,
			evidencePolicyIds: healthPolicies.map((policy) => policy.id),
			followUps: [
				'Do I have duplicate coverage?',
				'Should I increase health cover?',
			],
		}
	}

	const duplicateInsurers = knowledge.policies.reduce<Record<string, number>>(
		(counts, policy) => {
			counts[policy.insurerName] = (counts[policy.insurerName] ?? 0) + 1
			return counts
		},
		{},
	)

	const overlap = Object.entries(duplicateInsurers).find(
		([, count]) => count > 1,
	)

	if (overlap) {
		return {
			answer: `Based on your policies, you have multiple policies with ${overlap[0]}. Worth confirming they serve different purposes rather than duplicating cover.`,
			evidencePolicyIds: knowledge.policies
				.filter((policy) => policy.insurerName === overlap[0])
				.map((policy) => policy.id),
			followUps: ['Compare my health policies.', 'Summarize my protection.'],
		}
	}

	return {
		answer:
			'Based on your policies, I do not see obvious duplicate coverage — your policies appear to cover different areas.',
		evidencePolicyIds: knowledge.activePolicies.map((policy) => policy.id),
		followUps: defaultFollowUps('comparison'),
	}
}

function answerRecommendation(knowledge: InsuranceKnowledge): {
	answer: string
	evidencePolicyIds: string[]
	followUps: string[]
} {
	if (knowledge.recommendations.length > 0) {
		return {
			answer: `Based on your policies, ${knowledge.recommendations
				.slice(0, 3)
				.map((item) => item.text)
				.join(' ')}`,
			evidencePolicyIds: knowledge.activePolicies.slice(0, 3).map((p) => p.id),
			followUps: defaultFollowUps('recommendation'),
		}
	}

	if (knowledge.coverageGaps.length > 0) {
		return {
			answer: `Based on your policies, ${knowledge.coverageGaps
				.slice(0, 2)
				.map((gap) => gap.recommendation)
				.join(' ')}`,
			evidencePolicyIds: knowledge.activePolicies.slice(0, 3).map((p) => p.id),
			followUps: defaultFollowUps('recommendation'),
		}
	}

	const missingTravel = !knowledge.activePolicies.some(
		(policy) => policy.categoryId === 'travel',
	)

	if (missingTravel) {
		return {
			answer:
				'Based on your policies, your core protection looks reasonable. One area often worth adding is dedicated travel insurance for trips abroad.',
			evidencePolicyIds: knowledge.activePolicies.map((policy) => policy.id),
			followUps: [
				'Do I have home insurance?',
				'Should I increase health cover?',
			],
		}
	}

	return {
		answer:
			'Based on your policies, I do not see major protection gaps right now. Your coverage appears well-rounded across the areas on record.',
		evidencePolicyIds: knowledge.activePolicies.map((policy) => policy.id),
		followUps: defaultFollowUps('recommendation'),
	}
}

function answerFinancialSummary(knowledge: InsuranceKnowledge): {
	answer: string
	evidencePolicyIds: string[]
	followUps: string[]
} {
	const total = knowledge.premiums.reduce(
		(sum, premium) => sum + premium.amount,
		0,
	)
	const currency = knowledge.premiums[0]?.currency ?? 'INR'

	if (knowledge.premiums.length === 0) {
		return {
			answer:
				"I don't have premium payment history on record yet, so I can't total your annual spend.",
			evidencePolicyIds: knowledge.policies
				.slice(0, 2)
				.map((policy) => policy.id),
			followUps: ['Show premium history.', 'Summarize my protection.'],
		}
	}

	return {
		answer: `Based on your policies, your recorded premiums total ${formatCoverageAmount(total, currency)} across ${knowledge.premiums.length} payment${knowledge.premiums.length === 1 ? '' : 's'}.`,
		evidencePolicyIds: [
			...new Set(knowledge.premiums.map((premium) => premium.policyId)),
		],
		followUps: ['Which policy is most expensive?', 'Show premium history.'],
	}
}

function answerPolicyExplanation(
	knowledge: InsuranceKnowledge,
	scope?: InsuranceAskScope,
): {
	answer: string
	evidencePolicyIds: string[]
	followUps: string[]
} {
	const policyId = scope?.policyId
	const policy = policyId
		? knowledge.policies.find((item) => item.id === policyId)
		: knowledge.activePolicies[0]

	if (!policy) {
		return {
			answer:
				"Tell me which policy you'd like explained, or open a policy and ask from there.",
			evidencePolicyIds: [],
			followUps: ['Summarize my protection.'],
		}
	}

	const card = buildPolicyCardViewModel(knowledge, policy)
	const members = knowledge.members
		.filter((member) => member.policyId === policy.id)
		.map((member) => member.name)
	const benefits = knowledge.benefits
		.filter((benefit) => benefit.policyId === policy.id)
		.slice(0, 2)
		.map((benefit) => benefit.description)

	const lines = [
		`Based on your policies, ${card.name} provides ${card.coverageLabel} cover with ${card.insurer}.`,
	]

	if (members.length > 0) {
		lines.push(`It covers ${members.join(', ')}.`)
	}

	if (card.renewalLabel) {
		lines.push(card.renewalLabel + '.')
	}

	if (benefits.length > 0) {
		lines.push(`Notable benefits include ${benefits.join(' and ')}.`)
	}

	return {
		answer: lines.join('\n\n'),
		evidencePolicyIds: [policy.id],
		followUps: ['Who is covered?', 'What claims have I made on this policy?'],
	}
}

function answerRiskScenario(
	knowledge: InsuranceKnowledge,
	question: string,
): {
	answer: string
	evidencePolicyIds: string[]
	followUps: string[]
} {
	const q = normalizeQuestion(question)
	const healthPolicies = knowledge.activePolicies.filter(
		(policy) => policy.categoryId === 'health',
	)

	if (/hospital|hospitalized|admission/.test(q)) {
		if (healthPolicies.length === 0) {
			return {
				answer: `${GENERIC_PREFIX}a hospitalization would typically be covered by an active health policy with cashless network access. I don't see your health policy details yet.`,
				evidencePolicyIds: [],
				followUps: ['Do I have enough health insurance?'],
			}
		}

		const total = healthPolicies.reduce(
			(sum, policy) => sum + (policy.sumInsured ?? 0),
			0,
		)

		return {
			answer: `Based on your policies, a hospitalization would typically be covered under your health insurance (${formatCoverageAmount(total, healthPolicies[0]!.currency)} combined cover). Cashless treatment may be available through your insurer's network — check pre-authorization requirements for planned admissions.`,
			evidencePolicyIds: healthPolicies.map((policy) => policy.id),
			followUps: ['What claims have I made?', 'Who is covered?'],
		}
	}

	return answerProtectionOverview(knowledge)
}

function answerFollowUp(
	knowledge: InsuranceKnowledge,
	memory?: InsuranceAskMemoryContext,
): {
	answer: string
	evidencePolicyIds: string[]
	followUps: string[]
} {
	if (
		memory?.lastIntent === 'recommendation' ||
		memory?.lastIntent === 'coverage_lookup'
	) {
		return answerFinancialSummary(knowledge)
	}

	return answerProtectionOverview(knowledge)
}

function buildAnswerForIntent(
	knowledge: InsuranceKnowledge,
	intent: InsuranceAskIntent,
	question: string,
	scope?: InsuranceAskScope,
	memory?: InsuranceAskMemoryContext,
) {
	switch (intent) {
		case 'protection_overview':
			return answerProtectionOverview(knowledge)
		case 'coverage_lookup':
			return answerCoverageLookup(knowledge, question)
		case 'policy_lookup':
			return answerPolicyLookup(knowledge, question)
		case 'member_coverage':
			return answerMemberCoverage(knowledge, question)
		case 'claim_lookup':
			return answerClaims(knowledge)
		case 'renewal':
			return answerRenewal(knowledge)
		case 'comparison':
			return answerComparison(knowledge)
		case 'recommendation':
			return answerRecommendation(knowledge)
		case 'financial_summary':
			return answerFinancialSummary(knowledge)
		case 'policy_explanation':
			return answerPolicyExplanation(knowledge, scope)
		case 'risk_scenario':
			return answerRiskScenario(knowledge, question)
		case 'follow_up':
			return answerFollowUp(knowledge, memory)
		default:
			return answerProtectionOverview(knowledge)
	}
}

export function buildInsuranceAskTurn(input: {
	knowledge: InsuranceKnowledge
	question: string
	memberId: string | null
	memberName: string | null
	sessionKey: string
	scope?: InsuranceAskScope
	onStream?: (partial: string) => void
}): AskConversationTurn {
	const previousTopic = conversationMemory.getPreviousTopic(input.sessionKey)
	const memory: InsuranceAskMemoryContext = {
		lastIntent: previousTopic?.intent as InsuranceAskIntent | undefined,
		lastQuestion: previousTopic?.lastQuestion,
		policyId: input.scope?.policyId,
		categoryId: input.scope?.categoryId,
	}

	const intent = classifyInsuranceAskIntent(input.question, memory)
	const result = buildAnswerForIntent(
		input.knowledge,
		intent,
		input.question,
		input.scope,
		memory,
	)

	const citations = buildEvidenceCitations(
		input.knowledge,
		result.evidencePolicyIds,
	)
	const evidenceLabels = citations.map((citation) => citation.reportTitle)
	const dataAvailable = input.knowledge.policies.length > 0
	const confidence = dataAvailable
		? Math.min(0.95, 0.55 + citations.length * 0.08)
		: 0.25

	if (input.onStream) {
		input.onStream(result.answer)
	}

	const timestamp = new Date().toISOString()
	const trust = buildTrustResponse({
		answer: result.answer,
		evidenceLabels,
		followUps: result.followUps,
		confidence,
		dataAvailable,
		citations,
	})

	const turn: AskConversationTurn = {
		id: crypto.randomUUID(),
		question: input.question,
		answer: result.answer,
		cards: [],
		relatedReports: citations.map((citation) => ({
			id: citation.reportId,
			title: citation.reportTitle,
			date: citation.date,
		})),
		relatedMetrics: [],
		citations,
		evidence: evidenceLabels,
		followUpQuestions: result.followUps,
		memberId: input.memberId,
		memberName: input.memberName,
		domains: ['insurance'],
		dataAvailable,
		confidence,
		confidenceLevel: trust.confidence.level,
		trust,
		timestamp,
		displayTimestamp: new Date(timestamp).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		}),
	}

	conversationMemory.addTurn(input.sessionKey, turn, {
		intent,
		categoryId: input.scope?.categoryId,
	})

	return turn
}

export const INSURANCE_ASK_SUGGESTIONS = [
	'Am I adequately insured?',
	'Do I have enough health insurance?',
	'Which policy covers my vehicle?',
	'What claims have I made?',
	'Which policy expires next?',
	'Do I have duplicate coverage?',
	'How much premium do I pay every year?',
	'Am I missing any important insurance?',
] as const
