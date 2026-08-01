import type { BetaExperienceId } from '@/features/ask/beta/beta-experiences'

export type AskFeedbackRating = 'up' | 'down'

export interface AskFeedbackRecord {
	id: string
	userId: string
	turnId: string
	experienceId?: BetaExperienceId
	question: string
	rating: AskFeedbackRating
	comment?: string
	timestamp: string
}

export interface BetaExperienceObservabilityRecord {
	id: string
	timestamp: string
	userId: string
	memberId: string | null
	experienceId: BetaExperienceId
	question: string
	provider: string
	latencyMs: number
	promptTokens?: number
	completionTokens?: number
	totalTokens?: number
	estimatedCostUsd?: number
	confidence?: number
	feedbackRating?: AskFeedbackRating
}

const FEEDBACK_STORAGE_KEY = 'chronicle:ask-feedback'
const BETA_OBSERVABILITY_KEY = 'chronicle:beta-observability'
const MAX_RECORDS = 200

function readFeedbackStore(): AskFeedbackRecord[] {
	if (typeof window === 'undefined') {
		return []
	}

	try {
		const raw = window.localStorage.getItem(FEEDBACK_STORAGE_KEY)
		return raw ? (JSON.parse(raw) as AskFeedbackRecord[]) : []
	} catch {
		return []
	}
}

function writeFeedbackStore(records: AskFeedbackRecord[]): void {
	if (typeof window === 'undefined') {
		return
	}

	try {
		window.localStorage.setItem(
			FEEDBACK_STORAGE_KEY,
			JSON.stringify(records.slice(-MAX_RECORDS)),
		)
	} catch {
		// Ignore quota errors in beta.
	}
}

function readObservabilityStore(): BetaExperienceObservabilityRecord[] {
	if (typeof window === 'undefined') {
		return []
	}

	try {
		const raw = window.localStorage.getItem(BETA_OBSERVABILITY_KEY)
		return raw ? (JSON.parse(raw) as BetaExperienceObservabilityRecord[]) : []
	} catch {
		return []
	}
}

function writeObservabilityStore(
	records: BetaExperienceObservabilityRecord[],
): void {
	if (typeof window === 'undefined') {
		return
	}

	try {
		window.localStorage.setItem(
			BETA_OBSERVABILITY_KEY,
			JSON.stringify(records.slice(-MAX_RECORDS)),
		)
	} catch {
		// Ignore quota errors in beta.
	}
}

export function recordAskFeedback(input: {
	userId: string
	turnId: string
	experienceId?: BetaExperienceId
	question: string
	rating: AskFeedbackRating
	comment?: string
}): AskFeedbackRecord {
	const record: AskFeedbackRecord = {
		id: crypto.randomUUID(),
		userId: input.userId,
		turnId: input.turnId,
		experienceId: input.experienceId,
		question: input.question,
		rating: input.rating,
		comment: input.comment,
		timestamp: new Date().toISOString(),
	}

	const existing = readFeedbackStore().filter(
		(item) => !(item.userId === input.userId && item.turnId === input.turnId),
	)

	writeFeedbackStore([...existing, record])
	linkFeedbackToObservability(input.rating)

	return record
}

export function getFeedbackForTurn(
	userId: string,
	turnId: string,
): AskFeedbackRating | null {
	return (
		readFeedbackStore().find(
			(item) => item.userId === userId && item.turnId === turnId,
		)?.rating ?? null
	)
}

export function recordBetaExperienceUsage(input: {
	userId: string
	memberId: string | null
	experienceId: BetaExperienceId
	question: string
	provider: string
	latencyMs: number
	promptTokens?: number
	completionTokens?: number
	totalTokens?: number
	estimatedCostUsd?: number
	confidence?: number
}): BetaExperienceObservabilityRecord {
	const record: BetaExperienceObservabilityRecord = {
		id: crypto.randomUUID(),
		timestamp: new Date().toISOString(),
		userId: input.userId,
		memberId: input.memberId,
		experienceId: input.experienceId,
		question: input.question,
		provider: input.provider,
		latencyMs: Math.round(input.latencyMs),
		promptTokens: input.promptTokens,
		completionTokens: input.completionTokens,
		totalTokens: input.totalTokens,
		estimatedCostUsd: input.estimatedCostUsd,
		confidence: input.confidence,
	}

	writeObservabilityStore([...readObservabilityStore(), record])
	return record
}

function linkFeedbackToObservability(rating: AskFeedbackRating): void {
	const records = readObservabilityStore()

	if (records.length === 0) {
		return
	}

	const index = records.length - 1
	records[index] = { ...records[index]!, feedbackRating: rating }
	writeObservabilityStore(records)
}

export function getBetaObservabilityLog(
	userId?: string,
): BetaExperienceObservabilityRecord[] {
	const records = readObservabilityStore()

	if (!userId) {
		return records
	}

	return records.filter((item) => item.userId === userId)
}

export function clearBetaObservabilityLog(): void {
	if (typeof window === 'undefined') {
		return
	}

	window.localStorage.removeItem(BETA_OBSERVABILITY_KEY)
}

export function clearAskFeedbackLog(): void {
	if (typeof window === 'undefined') {
		return
	}

	window.localStorage.removeItem(FEEDBACK_STORAGE_KEY)
}
