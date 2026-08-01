import {
	BETA_EXPERIENCES,
	type BetaExperience,
	type BetaExperienceId,
} from '@/features/ask/beta/beta-experiences'

export interface BetaExperienceMatch {
	experience: BetaExperience
	score: number
}

function scoreQuestionAgainstExperience(
	question: string,
	experience: BetaExperience,
): number {
	const normalized = question.trim().toLowerCase()
	let score = 0

	if (normalized === experience.canonicalQuestion.toLowerCase()) {
		return 100
	}

	for (const pattern of experience.patterns) {
		if (pattern.test(question)) {
			score += 10
		}
	}

	const titleTokens = experience.title.toLowerCase().split(/\s+/)

	for (const token of titleTokens) {
		if (token.length > 3 && normalized.includes(token)) {
			score += 2
		}
	}

	return score
}

export function resolveBetaExperience(question: string): BetaExperience | null {
	const matches = BETA_EXPERIENCES.map((experience) => ({
		experience,
		score: scoreQuestionAgainstExperience(question, experience),
	})).filter((entry) => entry.score > 0)

	if (matches.length === 0) {
		return null
	}

	matches.sort((left, right) => right.score - left.score)
	return matches[0]!.experience
}

export function resolveBetaExperienceId(
	question: string,
): BetaExperienceId | null {
	return resolveBetaExperience(question)?.id ?? null
}

export function isBetaGroundedExperience(experience: BetaExperience): boolean {
	return experience.route === 'grounded'
}

export function isBetaProductionHealthExperience(
	experience: BetaExperience,
): boolean {
	return experience.route === 'production-health'
}
