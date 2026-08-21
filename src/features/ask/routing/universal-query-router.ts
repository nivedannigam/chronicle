import type { AskScopeContext } from '@/features/ask/services/knowledge-query.interface'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'

export type UniversalQuestionKind =
	| 'FACT_LOOKUP'
	| 'ENTITY_LOOKUP'
	| 'LATEST_VALUE'
	| 'STATUS'
	| 'HISTORY'
	| 'COVERAGE'
	| 'EXPLAIN'
	| 'CROSS_MODULE'
	| 'GENERAL'

export interface UniversalQueryClassification {
	questionKind: UniversalQuestionKind
	domains: KnowledgeDomainId[]
	isCrossModule: boolean
	entityHints: string[]
	reasons: string[]
}

const DOMAIN_PATTERNS: Array<{
	domain: KnowledgeDomainId
	patterns: RegExp[]
}> = [
	{
		domain: 'health',
		patterns: [
			/\b(ldl|hdl|hba1c|tsh|vitamin|creatinine|hemoglobin|glucose|blood pressure|cholesterol|health report|lab result|medical)\b/i,
			/\bhow is my health\b/i,
			/\bhow am i doing health\b/i,
		],
	},
	{
		domain: 'insurance',
		patterns: [
			/\binsurance\b/i,
			/\bpolicy\b/i,
			/\bpremium\b/i,
			/\bcoverage\b/i,
			/\bclaim\b/i,
			/\bsum insured\b/i,
		],
	},
	{
		domain: 'vehicles',
		patterns: [
			/\bvehicle\b/i,
			/\bcar\b/i,
			/\bbike\b/i,
			/\bpuc\b/i,
			/\bregistration number\b/i,
			/\bxev\b/i,
			/\bregistration\b/i,
		],
	},
	{
		domain: 'identity',
		patterns: [
			/\bpassport\b/i,
			/\baadhaar\b/i,
			/\bpan\b/i,
			/\bidentity document\b/i,
			/\blicen[cs]e\b/i,
		],
	},
	{
		domain: 'finance',
		patterns: [
			/\bfinance\b/i,
			/\bbank\b/i,
			/\bloan\b/i,
			/\bbalance\b/i,
			/\boutstanding\b/i,
			/\binvest(ment|ed)\b/i,
			/\bnet worth\b/i,
			/\bfinancial position\b/i,
			/\bhome loan balance\b/i,
			/\bcredit card\b/i,
		],
	},
	{
		domain: 'property',
		patterns: [
			/\bproperty\b/i,
			/\bhome\b/i,
			/\bhouse\b/i,
			/\bapartment\b/i,
			/\bpune home\b/i,
			/\bregistration deed\b/i,
			/\bproperty tax\b/i,
			/\bpossession\b/i,
		],
	},
]

function detectDomains(
	question: string,
	contextHint?: AskScopeContext['contextModule'],
): KnowledgeDomainId[] {
	const normalized = question.toLowerCase()
	const scores = new Map<KnowledgeDomainId, number>()

	for (const entry of DOMAIN_PATTERNS) {
		let score = 0

		for (const pattern of entry.patterns) {
			if (pattern.test(normalized)) {
				score += 1
			}
		}

		if (score > 0) {
			scores.set(entry.domain, score)
		}
	}

	if (contextHint) {
		scores.set(contextHint, (scores.get(contextHint) ?? 0) + 2)
	}

	const ranked = [...scores.entries()]
		.sort((left, right) => right[1] - left[1])
		.map(([domain]) => domain)

	if (ranked.length === 0) {
		return contextHint ? [contextHint] : ['health']
	}

	return ranked
}

function detectEntityHints(question: string): string[] {
	const hints: string[] = []
	const patterns = [
		/xev[\s-]?9e/i,
		/pune home/i,
		/nagpur home/i,
		/hdfc home loan/i,
		/my car/i,
		/my home/i,
	]

	for (const pattern of patterns) {
		const match = question.match(pattern)
		if (match?.[0]) {
			hints.push(match[0])
		}
	}

	return hints
}

function classifyQuestionKind(
	question: string,
	domains: KnowledgeDomainId[],
): UniversalQuestionKind {
	const normalized = question.toLowerCase()

	if (
		domains.length > 1 ||
		/(car insurance|home loan|pune home|everything about|show me everything|do i have insurance for)/i.test(
			normalized,
		)
	) {
		return 'CROSS_MODULE'
	}

	if (
		/what documents|which documents|missing|do you have all|coverage|do i have all/i.test(
			normalized,
		)
	) {
		return 'COVERAGE'
	}

	if (
		/what changed|recently|history|over time|last updated|when was this/i.test(
			normalized,
		)
	) {
		return 'HISTORY'
	}

	if (
		/how is my|overall|financial position|status|active|valid|expire|expiry|when does/i.test(
			normalized,
		)
	) {
		if (/balance|outstanding|amount|how much/i.test(normalized)) {
			return 'LATEST_VALUE'
		}

		return 'STATUS'
	}

	if (
		/what is my|what's my|what was my|when did i buy|when was|who owns|purchase date|passport number ending/i.test(
			normalized,
		)
	) {
		return 'FACT_LOOKUP'
	}

	if (/what .* do i have|what do i have|list my|show my/i.test(normalized)) {
		return 'ENTITY_LOOKUP'
	}

	if (/explain|why|how come/i.test(normalized)) {
		return 'EXPLAIN'
	}

	return 'GENERAL'
}

export function classifyUniversalQuery(input: {
	question: string
	contextModule?: AskScopeContext['contextModule']
}): UniversalQueryClassification {
	const domains = detectDomains(input.question, input.contextModule)
	const entityHints = detectEntityHints(input.question)
	const questionKind = classifyQuestionKind(input.question, domains)
	const isCrossModule = domains.length > 1 || questionKind === 'CROSS_MODULE'

	return {
		questionKind: isCrossModule ? 'CROSS_MODULE' : questionKind,
		domains: isCrossModule
			? [...new Set(domains)].slice(0, 4)
			: [domains[0] ?? input.contextModule ?? 'health'],
		isCrossModule,
		entityHints,
		reasons: [
			`domains=${domains.join(',')}`,
			`kind=${questionKind}`,
			input.contextModule
				? `context=${input.contextModule}`
				: 'context=universal',
		],
	}
}

export function isHealthOnlyQuestion(
	classification: UniversalQueryClassification,
): boolean {
	return (
		!classification.isCrossModule &&
		classification.domains.length === 1 &&
		classification.domains[0] === 'health' &&
		classification.questionKind !== 'COVERAGE'
	)
}

export function prefersStructuredAnswer(kind: UniversalQuestionKind): boolean {
	return [
		'FACT_LOOKUP',
		'ENTITY_LOOKUP',
		'LATEST_VALUE',
		'STATUS',
		'COVERAGE',
		'HISTORY',
	].includes(kind)
}
