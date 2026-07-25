export type ConfidenceLevel = 'high' | 'medium' | 'low'

export function toConfidenceLevel(score: number): ConfidenceLevel {
	if (score >= 0.85) {
		return 'high'
	}

	if (score >= 0.65) {
		return 'medium'
	}

	return 'low'
}

export function confidenceLevelLabel(
	level: ConfidenceLevel,
	dataAvailable: boolean,
): string {
	if (!dataAvailable) {
		return 'Limited data'
	}

	switch (level) {
		case 'high':
			return 'High confidence'
		case 'medium':
			return 'Medium confidence'
		default:
			return 'Low confidence'
	}
}

export function parseConfidenceLevel(value: unknown): ConfidenceLevel | null {
	if (value === 'high' || value === 'medium' || value === 'low') {
		return value
	}

	if (typeof value === 'number') {
		return toConfidenceLevel(value)
	}

	return null
}

export function computeGroundedConfidence(input: {
	dataAvailable: boolean
	metricCount: number
	reportCount: number
	citationCount: number
	intentConfidence?: number
}): { score: number; level: ConfidenceLevel } {
	if (!input.dataAvailable) {
		return { score: 0.35, level: 'low' }
	}

	const score = Math.min(
		0.95,
		0.5 +
			input.metricCount * 0.04 +
			input.reportCount * 0.03 +
			input.citationCount * 0.02 +
			(input.intentConfidence ?? 0.7) * 0.1,
	)

	return { score, level: toConfidenceLevel(score) }
}
