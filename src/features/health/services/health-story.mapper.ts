import { ROUTES, healthVisitPath, healthAskPath } from '@/constants/routes'
import type {
	HealthChangeItem,
	HealthCompanionView,
	HealthNextStep,
} from '@/features/health/types/health-companion.types'
import type { HealthVisit } from '@/features/health/types/health-visit.types'
import type { HealthCanonicalSnapshot } from '@/features/health/types/health-context.types'
import { buildHealthGreeting } from '@/features/health/services/health-product.mapper'
import { consumerOverallSummary } from '@/features/health/services/health-consumer-status.service'

export interface SinceLastVisitItem {
	id: string
	label: string
	tone: 'improved' | 'stable' | 'attention'
}

export interface StoryRecommendation {
	id: string
	title: string
	actionPath?: string
}

export interface JourneyVisitItem {
	id: string
	title: string
	displayMonthYear: string
}

export interface HealthStoryViewModel {
	greeting: string
	howAmIDoing: string
	snapshot: HealthCanonicalSnapshot
	storyParagraphs: string[]
	sinceLastVisit: SinceLastVisitItem[]
	recommendations: StoryRecommendation[]
	journeyVisits: JourneyVisitItem[]
	isEarlyStory: boolean
}

const ABNORMAL_STATUSES = new Set(['low', 'high', 'critical', 'borderline'])

function normalizeTopic(value: string): string {
	return value.trim().toLowerCase()
}

function storyMentionsTopic(paragraphs: string[], topic: string): boolean {
	const needle = normalizeTopic(topic)
	return paragraphs.some((paragraph) =>
		normalizeTopic(paragraph).includes(needle),
	)
}

function changeTone(change: HealthChangeItem): SinceLastVisitItem['tone'] {
	if (change.direction === 'improved' || change.direction === 'resolved') {
		return 'improved'
	}

	if (change.direction === 'worsened') {
		return 'attention'
	}

	return 'stable'
}

function formatSinceLastVisitLabel(change: HealthChangeItem): string {
	const base = change.label.trim()

	switch (change.direction) {
		case 'improved':
			return `${base} improved`
		case 'worsened':
			return `${base} decreased`
		case 'resolved':
			return `${base} resolved`
		default:
			return `${base} unchanged`
	}
}

function buildStoryOpening(companion: HealthCompanionView): string {
	const summary = companion.healthSummary

	if (summary?.overallStatus === 'improving') {
		return "Overall you're moving in a positive direction."
	}

	if (summary?.overallStatus === 'needs_attention') {
		return 'A few areas deserve attention across your recent visits.'
	}

	if (summary?.overallStatus === 'mixed') {
		return 'Your health picture is mixed — some markers are improving while others need watching.'
	}

	if (
		companion.status === 'Partial Results' ||
		companion.status === 'Awaiting Data'
	) {
		return "We're still learning your health history."
	}

	return 'Your health has remained stable over the last year.'
}

export function buildHealthStoryParagraphs(
	companion: HealthCompanionView,
	reportCount: number,
): string[] {
	if (reportCount === 0) {
		return ['Your health story will begin after your first report.']
	}

	if (reportCount === 1) {
		return [
			"We're just getting to know your health. As you add more visits, Chronicle will tell the story of how you're doing over time.",
		]
	}

	const paragraphs: string[] = [buildStoryOpening(companion)]
	const mentioned = new Set<string>()

	for (const change of companion.changes) {
		if (change.direction !== 'improved') {
			continue
		}

		const sentence = `Your ${change.label} improved.`

		if (storyMentionsTopic(paragraphs, change.label)) {
			continue
		}

		paragraphs.push(sentence)
		mentioned.add(normalizeTopic(change.label))
	}

	for (const change of companion.changes) {
		if (change.direction !== 'stable') {
			continue
		}

		const sentence = `${change.label} remained normal.`

		if (storyMentionsTopic(paragraphs, change.label)) {
			continue
		}

		paragraphs.push(sentence)
		mentioned.add(normalizeTopic(change.label))
	}

	for (const metric of companion.profile?.priorityMetrics ?? []) {
		if (!ABNORMAL_STATUSES.has(metric.status)) {
			continue
		}

		if (mentioned.has(normalizeTopic(metric.displayName))) {
			continue
		}

		const sentence =
			metric.status === 'low'
				? `${metric.displayName} has been consistently low.`
				: `${metric.displayName} has been outside the usual range.`

		paragraphs.push(sentence)
		mentioned.add(normalizeTopic(metric.displayName))
	}

	for (const highlight of companion.trendHighlights) {
		if (highlight.status !== 'improving') {
			continue
		}

		if (storyMentionsTopic(paragraphs, highlight.label)) {
			continue
		}

		paragraphs.push(`${highlight.label} is trending in the right direction.`)
	}

	if (
		companion.healthSummary?.overallStatus === 'improving' &&
		!paragraphs.some((paragraph) => paragraph.includes('positive direction'))
	) {
		paragraphs.push("Overall you're moving in a positive direction.")
	}

	return paragraphs.slice(0, 5)
}

export function buildSinceLastVisitItems(
	companion: HealthCompanionView,
	storyParagraphs: string[],
): SinceLastVisitItem[] {
	return companion.changes
		.filter((change) => !storyMentionsTopic(storyParagraphs, change.label))
		.slice(0, 3)
		.map((change) => ({
			id: change.id,
			label: formatSinceLastVisitLabel(change),
			tone: changeTone(change),
		}))
		.concat(
			companion.changes
				.filter((change) => storyMentionsTopic(storyParagraphs, change.label))
				.slice(0, 3)
				.map((change) => ({
					id: change.id,
					label: formatSinceLastVisitLabel(change),
					tone: changeTone(change),
				})),
		)
		.slice(0, 3)
}

function consumerRecommendationTitle(step: HealthNextStep): string {
	if (step.title.toLowerCase().includes('review imported')) {
		return 'Review reports that need your help'
	}

	if (step.title.toLowerCase().includes('liver')) {
		return 'Discuss liver findings with your doctor'
	}

	if (step.title.toLowerCase().includes('follow up')) {
		return step.title.replace(/^Follow up on /i, 'Discuss ')
	}

	return step.title
}

function consumerRecommendationPath(step: HealthNextStep): string | undefined {
	if (step.id === 'review-imports') {
		return ROUTES.reviewDocuments
	}

	if (
		step.actionPath?.includes('settings') &&
		step.actionPath.includes('review')
	) {
		return ROUTES.reviewDocuments
	}

	return step.actionPath
}

export function buildStoryRecommendations(
	companion: HealthCompanionView,
	storyParagraphs: string[],
): StoryRecommendation[] {
	const recommendations: StoryRecommendation[] = []
	const seen = new Set<string>()

	const add = (item: StoryRecommendation) => {
		const key = normalizeTopic(item.title)

		if (seen.has(key)) {
			return
		}

		seen.add(key)
		recommendations.push(item)
	}

	for (const step of companion.nextSteps) {
		if (step.id === 'review-imports') {
			continue
		}

		add({
			id: step.id,
			title: consumerRecommendationTitle(step),
			actionPath: consumerRecommendationPath(step),
		})
	}

	for (const group of companion.insightGroups) {
		if (group.trend !== 'Needs attention') {
			continue
		}

		if (storyMentionsTopic(storyParagraphs, group.label)) {
			const action = group.nextStep.includes('doctor')
				? `Discuss ${group.label.toLowerCase()} with your doctor`
				: group.nextStep

			add({
				id: `insight-${group.id}`,
				title: action,
				actionPath: group.reportId
					? healthVisitPath(group.reportId)
					: healthAskPath({
							q: `What should I know about ${group.label}?`,
						}),
			})
			continue
		}

		add({
			id: `group-${group.id}`,
			title: group.nextStep,
			actionPath: group.reportId ? healthVisitPath(group.reportId) : undefined,
		})
	}

	for (const highlight of companion.trendHighlights) {
		if (highlight.status !== 'needs_attention') {
			continue
		}

		if (storyMentionsTopic(storyParagraphs, highlight.label)) {
			add({
				id: `highlight-${highlight.id}`,
				title: `Discuss ${highlight.label.toLowerCase()} with your doctor`,
				actionPath: highlight.metricId
					? healthAskPath({
							q: `What should I know about ${highlight.label}?`,
						})
					: undefined,
			})
		}
	}

	if (
		recommendations.length === 0 &&
		(companion.profile?.reportCount ?? 0) >= 2
	) {
		add({
			id: 'annual-checkup',
			title: 'Schedule your next annual checkup',
		})
	}

	return recommendations.slice(0, 4)
}

export function buildHomeJourneyVisits(
	visits: HealthVisit[],
): JourneyVisitItem[] {
	return visits.slice(0, 4).map((visit) => ({
		id: visit.id,
		title: visit.title,
		displayMonthYear: visit.displayMonthYear,
	}))
}

export function buildHealthStoryViewModel(input: {
	companion: HealthCompanionView
	memberName: string | null
	hasReports: boolean
	reportCount: number
	visits: HealthVisit[]
	snapshot: HealthCanonicalSnapshot
}): HealthStoryViewModel {
	const greeting = buildHealthGreeting(input.memberName)
	const howAmIDoing = consumerOverallSummary(input.snapshot.overallStatus)
	const storyParagraphs = buildHealthStoryParagraphs(
		input.companion,
		input.reportCount,
	)
	const sinceLastVisit = buildSinceLastVisitItems(
		input.companion,
		storyParagraphs,
	)
	const recommendations = buildStoryRecommendations(
		input.companion,
		storyParagraphs,
	)

	return {
		greeting,
		howAmIDoing,
		snapshot: input.snapshot,
		storyParagraphs,
		sinceLastVisit,
		recommendations,
		journeyVisits: buildHomeJourneyVisits(input.visits),
		isEarlyStory: input.reportCount <= 1,
	}
}
