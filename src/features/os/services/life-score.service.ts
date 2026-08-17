import { ROUTES } from '@/constants/routes'
import { documentsExpiringWithin } from '@/features/documents/services/document.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { computeHealthScoreFromHistories } from '@/features/health-knowledge/services/health-scoring.service'
import type { HealthMetricHistory } from '@/features/health-knowledge/types'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type {
	LifeScore,
	LifeScoreDimension,
	LifeScoreStatus,
} from '@/features/os/types/os.types'

const DIMENSION_COLORS: Record<string, string> = {
	health: '#2DCFC1',
	protection: '#3B82F6',
	identity: '#8B5CF6',
	finance: '#30D158',
	vehicles: '#FF9F0A',
	property: '#F97316',
}

function scoreStatus(score: number | null): LifeScoreStatus {
	if (score == null) {
		return 'unknown'
	}

	if (score >= 90) {
		return 'excellent'
	}

	if (score >= 75) {
		return 'good'
	}

	return 'attention'
}

function formatScoreDisplay(
	score: number | null,
	status: LifeScoreStatus,
): string {
	if (score != null) {
		return String(score)
	}

	if (status === 'excellent') {
		return 'Excellent'
	}

	return '—'
}

function computeIdentityScore(documents: ChronicleDocument[]): number | null {
	const identityDocs = documents.filter(
		(document) =>
			document.category_id === 'identity' && document.status !== 'failed',
	)

	if (identityDocs.length === 0) {
		return null
	}

	const expiring = documentsExpiringWithin(identityDocs, 90)
	const valid = identityDocs.filter(
		(document) =>
			!document.expiry_date ||
			new Date(document.expiry_date).getTime() > Date.now(),
	)

	if (valid.length === 0) {
		return 40
	}

	const base = Math.round((valid.length / identityDocs.length) * 100)
	const penalty = expiring.length * 15

	return Math.max(50, Math.min(100, base - penalty))
}

function computeOverallScore(dimensions: LifeScoreDimension[]): {
	score: number | null
	label: string
	headline: string
} {
	const scored = dimensions.filter(
		(dimension) => dimension.enabled && dimension.score != null,
	)

	if (scored.length === 0) {
		return {
			score: null,
			label: 'Getting started',
			headline: 'Connect your records to see your life summary',
		}
	}

	const weights: Partial<Record<LifeScoreDimension['id'], number>> = {
		health: 1.2,
		protection: 1.1,
		identity: 0.9,
	}

	let totalWeight = 0
	let weightedSum = 0

	for (const dimension of scored) {
		const weight = weights[dimension.id] ?? 1
		totalWeight += weight
		weightedSum += dimension.score! * weight
	}

	const overall = Math.round(weightedSum / totalWeight)

	let label = 'Good'
	if (overall >= 90) {
		label = 'Excellent'
	} else if (overall >= 75) {
		label = 'Good'
	} else {
		label = 'Needs attention'
	}

	const attention = dimensions.filter(
		(dimension) => dimension.enabled && dimension.status === 'attention',
	)

	const headline =
		attention.length > 0
			? `${attention[0]?.label} could use a look`
			: 'Everything looks good today'

	return { score: overall, label, headline }
}

export function buildLifeScore(input: {
	metricHistories: HealthMetricHistory[]
	insuranceKnowledge: InsuranceKnowledge | null
	documents: ChronicleDocument[]
}): LifeScore {
	const healthScore = computeHealthScoreFromHistories(input.metricHistories)
	const healthStatus = scoreStatus(healthScore)

	const protectionScore =
		input.insuranceKnowledge?.protectionScore != null
			? Math.round(input.insuranceKnowledge.protectionScore)
			: null
	const protectionStatus = scoreStatus(protectionScore)

	const identityScore = computeIdentityScore(input.documents)
	const identityStatus = scoreStatus(identityScore)

	const dimensions: LifeScoreDimension[] = [
		{
			id: 'health',
			label: 'Health',
			score: healthScore,
			displayValue: formatScoreDisplay(healthScore, healthStatus),
			status: healthStatus,
			path: ROUTES.health,
			enabled: true,
			color: DIMENSION_COLORS.health,
		},
		{
			id: 'protection',
			label: 'Protection',
			score: protectionScore,
			displayValue: formatScoreDisplay(protectionScore, protectionStatus),
			status: protectionStatus,
			path: ROUTES.insurance,
			enabled: true,
			color: DIMENSION_COLORS.protection,
		},
		{
			id: 'identity',
			label: 'Identity',
			score: identityScore,
			displayValue: formatScoreDisplay(identityScore, identityStatus),
			status: identityStatus,
			path: ROUTES.documentsLibrary,
			enabled: true,
			color: DIMENSION_COLORS.identity,
		},
		{
			id: 'finance',
			label: 'Finance',
			score: null,
			displayValue: '—',
			status: 'unknown',
			path: ROUTES.modules,
			enabled: false,
			color: DIMENSION_COLORS.finance,
		},
		{
			id: 'vehicles',
			label: 'Vehicles',
			score: null,
			displayValue: '—',
			status: 'unknown',
			path: ROUTES.vehicles,
			enabled: true,
			color: DIMENSION_COLORS.vehicles,
		},
		{
			id: 'property',
			label: 'Property',
			score: null,
			displayValue: '—',
			status: 'unknown',
			path: ROUTES.modules,
			enabled: false,
			color: DIMENSION_COLORS.property,
		},
	]

	const overall = computeOverallScore(dimensions)

	return {
		dimensions: dimensions.filter((dimension) => dimension.enabled),
		overallScore: overall.score,
		overallLabel: overall.label,
		headline: overall.headline,
	}
}
