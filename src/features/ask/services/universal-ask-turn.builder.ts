import type { UniversalQueryClassification } from '@/features/ask/routing/universal-query-router'
import { prefersStructuredAnswer } from '@/features/ask/routing/universal-query-router'
import type { AskConversationTurn } from '@/features/ask/types'
import { toAskKnowledgeDomains } from '@/features/ask/utils/ask-domain.mapper'
import { toConfidenceLevel } from '@/features/intelligence/types/confidence.types'
import { formatEvidenceCitations } from '@/shared/ai/evidence-planning/cross-module-evidence.adapter'
import type { CrossModuleEvidenceBundle } from '@/shared/ai/evidence-planning/cross-module-evidence.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'

function generateUniversalFollowUps(input: {
	question: string
	classification: UniversalQueryClassification
	bundle: CrossModuleEvidenceBundle
}): string[] {
	const followUps: string[] = []
	const normalized = input.question.toLowerCase()
	const domains = input.classification.domains

	if (
		domains.includes('vehicles') &&
		/insurance|valid|cover/i.test(normalized) &&
		!/when does|expir/i.test(normalized)
	) {
		followUps.push('Want me to check when it expires?')
	}

	if (domains.includes('finance') && /loan|balance|owe/i.test(normalized)) {
		followUps.push('Want to see how the balance changed over time?')
	}

	if (domains.includes('property') && /home|property|pune/i.test(normalized)) {
		followUps.push('Want to see the documents linked to this property?')
	}

	if (
		domains.includes('identity') &&
		/passport|aadhaar|pan/i.test(normalized)
	) {
		followUps.push('Want me to check when it expires?')
	}

	if (
		domains.includes('insurance') &&
		!/missing|coverage|all/i.test(normalized)
	) {
		followUps.push('Want me to check what might be missing?')
	}

	return followUps.slice(0, 3)
}

function buildConflictSection(bundle: CrossModuleEvidenceBundle): string[] {
	if (bundle.conflicts.length === 0) {
		return []
	}

	const lines = ['I found two different values in your records.']

	for (const conflict of bundle.conflicts.slice(0, 2)) {
		const details = conflict.items
			.map((item) => {
				const dateSuffix = item.observedAt ? ` (${item.observedAt})` : ''
				const sourceSuffix = item.sourceDocument
					? ` — ${item.sourceDocument}`
					: ''
				return `${item.value}${dateSuffix}${sourceSuffix}`
			})
			.join(' vs ')
		lines.push(`${conflict.entity} · ${conflict.fact}: ${details}`)
	}

	return lines
}

function buildAmbiguityClarification(input: {
	question: string
	classification: UniversalQueryClassification
	bundle: CrossModuleEvidenceBundle
}): string | null {
	const normalized = input.question.toLowerCase()

	if (
		/what is my latest balance|what's my latest balance|my latest balance/i.test(
			normalized,
		) &&
		!/loan|credit card|bank|savings|home loan|mortgage|account/i.test(
			normalized,
		)
	) {
		return 'Which balance should I check — for example, your home loan, a credit card, or a bank account?'
	}

	if (
		input.classification.questionKind === 'LATEST_VALUE' &&
		input.classification.domains.length > 1 &&
		/balance|amount|how much/i.test(normalized) &&
		input.bundle.summaryLines.length === 0
	) {
		return 'I found a few possible balances. Tell me which account or loan you mean so I do not guess.'
	}

	return null
}

function buildAnswerSections(input: {
	question: string
	classification: UniversalQueryClassification
	bundle: CrossModuleEvidenceBundle
}): { answer: string; evidenceLines: string[]; citations: string[] } {
	const { bundle, classification } = input
	const primaryLines =
		bundle.summaryLines.length > 0
			? bundle.summaryLines
			: bundle.items.map((item) => item.value).filter(Boolean)

	const limitationLines = bundle.limitations.filter(Boolean)
	const conflictLines = buildConflictSection(bundle)
	const citations = formatEvidenceCitations(bundle.items)
	const ambiguityLine = buildAmbiguityClarification({
		question: input.question,
		classification,
		bundle,
	})

	let answerParts: string[] = []

	if (ambiguityLine) {
		answerParts.push(ambiguityLine)
	} else if (primaryLines.length > 0) {
		if (
			classification.questionKind === 'COVERAGE' &&
			limitationLines.length > 0
		) {
			answerParts.push(primaryLines.join('\n'))
			answerParts.push(limitationLines[0]!)
		} else if (classification.isCrossModule) {
			answerParts.push(primaryLines.slice(0, 6).join('\n'))
		} else {
			answerParts.push(primaryLines.join('\n'))
		}
	} else if (limitationLines.length > 0) {
		answerParts.push(limitationLines.join('\n'))
	} else {
		answerParts.push(
			"I don't have enough information in your records to answer that yet.",
		)
	}

	if (conflictLines.length > 0) {
		answerParts = [...answerParts, ...conflictLines]
	}

	if (
		limitationLines.length > 0 &&
		classification.questionKind !== 'COVERAGE' &&
		!answerParts.some((part) =>
			limitationLines.some((line) => part.includes(line)),
		)
	) {
		answerParts.push(limitationLines.slice(0, 2).join('\n'))
	}

	if (citations.length > 0) {
		answerParts.push(['Based on:', ...citations].join('\n'))
	}

	return {
		answer: answerParts.filter(Boolean).join('\n\n'),
		evidenceLines: primaryLines.slice(0, 8),
		citations,
	}
}

export function buildStructuredUniversalTurn(input: {
	question: string
	classification: UniversalQueryClassification
	bundle: CrossModuleEvidenceBundle
	memberId: string | null
	memberName: string | null
	domains: KnowledgeDomainId[]
}): AskConversationTurn {
	const sections = buildAnswerSections({
		question: input.question,
		classification: input.classification,
		bundle: input.bundle,
	})
	const dataAvailable = sections.evidenceLines.length > 0
	const confidence = dataAvailable ? 0.84 : 0.35
	const timestamp = new Date().toISOString()

	return {
		id: crypto.randomUUID(),
		question: input.question,
		answer: sections.answer,
		cards: [],
		relatedReports: [],
		relatedMetrics: [],
		citations: [],
		evidence: sections.evidenceLines,
		followUpQuestions: generateUniversalFollowUps({
			question: input.question,
			classification: input.classification,
			bundle: input.bundle,
		}),
		confidence,
		confidenceLevel: toConfidenceLevel(confidence),
		dataAvailable,
		memberId: input.memberId,
		memberName: input.memberName,
		displayTimestamp: 'Now',
		timestamp,
		domains: toAskKnowledgeDomains(input.domains),
	}
}

export function buildNarrativeUniversalTurn(input: {
	question: string
	classification: UniversalQueryClassification
	bundle: CrossModuleEvidenceBundle
	memberId: string | null
	memberName: string | null
	domains: KnowledgeDomainId[]
}): AskConversationTurn {
	return buildStructuredUniversalTurn(input)
}

export function shouldUseStructuredUniversalTurn(
	classification: UniversalQueryClassification,
): boolean {
	return prefersStructuredAnswer(classification.questionKind)
}
