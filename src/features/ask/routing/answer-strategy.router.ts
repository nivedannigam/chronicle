import type { AskIntent } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type { AnswerStrategyResult } from '@/features/ask/routing/answer-strategy.types'

const META_PATTERNS = [
	/why did you say/i,
	/what evidence supports/i,
	/which reports contributed/i,
	/what information is missing/i,
	/show supporting reports/i,
	/show (the )?evidence/i,
	/explain (the )?evidence/i,
]

const FACT_LOOKUP_PATTERNS = [
	/^what is my\b/i,
	/^what's my\b/i,
	/^what was my\b/i,
	/^latest\b/i,
	/^my latest\b/i,
	/^show my (ldl|hdl|hba1c|tsh|vitamin|creatinine|hemoglobin|glucose|weight)\b/i,
]

const NARRATIVE_INTENTS = new Set<AskIntent>([
	'summarize_report',
	'latest_report',
	'summarize_health',
	'general_health',
	'compare_reports',
	'doctor_discussion',
	'health_journey',
	'since_last_report',
	'organ_status',
	'metric_trend',
	'metric_history',
	'abnormal_reports',
	'attention_summary',
	'improving_metrics',
	'declining_metrics',
	'resolved_findings',
])

const FACT_LOOKUP_INTENTS = new Set<AskIntent>(['metric_lookup'])

function isMetaQuestion(question: string): boolean {
	return META_PATTERNS.some((pattern) => pattern.test(question.trim()))
}

function isExplicitFactLookup(question: string, intent: AskIntent): boolean {
	if (FACT_LOOKUP_INTENTS.has(intent)) {
		return true
	}

	const normalized = question.trim()

	if (FACT_LOOKUP_PATTERNS.some((pattern) => pattern.test(normalized))) {
		return true
	}

	// Short metric-specific questions without narrative framing
	if (
		intent === 'metric_lookup' ||
		(/^(what is|what's|what was|latest)\b/i.test(normalized) &&
			!/(report|health|heart|summary|compare|doctor|explain my latest)/i.test(
				normalized,
			))
	) {
		return true
	}

	return false
}

/**
 * Routes every Ask question to one of three strategies.
 * NARRATIVE is the default for health questions that require synthesis.
 */
export function resolveAnswerStrategy(input: {
	question: string
	legacyIntent: AskIntent
}): AnswerStrategyResult {
	const { question, legacyIntent } = input

	if (legacyIntent === 'explain_response' || isMetaQuestion(question)) {
		return {
			strategy: 'META',
			reason: 'explainability or evidence request',
			legacyIntent,
		}
	}

	if (isExplicitFactLookup(question, legacyIntent)) {
		return {
			strategy: 'FACT_LOOKUP',
			reason: 'specific metric or value lookup',
			legacyIntent,
		}
	}

	if (
		NARRATIVE_INTENTS.has(legacyIntent) ||
		/explain|summarize|summary|how is my|how am i|what changed|compare|doctor|worried|prepare|overall|doing/i.test(
			question,
		)
	) {
		return {
			strategy: 'NARRATIVE',
			reason: 'requires synthesis or clinical framing',
			legacyIntent,
		}
	}

	// Document / timeline intents stay narrative (LLM or future domain handlers)
	if (
		legacyIntent.startsWith('document_') ||
		legacyIntent.startsWith('timeline_') ||
		legacyIntent === 'find_document' ||
		legacyIntent === 'list_documents' ||
		legacyIntent === 'general_documents'
	) {
		return {
			strategy: 'NARRATIVE',
			reason: 'cross-domain question',
			legacyIntent,
		}
	}

	return {
		strategy: 'NARRATIVE',
		reason: 'default — companion synthesis',
		legacyIntent,
	}
}
