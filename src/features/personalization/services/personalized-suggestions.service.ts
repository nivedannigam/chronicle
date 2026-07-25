import type { AskQuestionGroup } from '@/constants/product-copy'
import { ASK_QUESTION_GROUPS } from '@/constants/product-copy'
import { healthInsightsService } from '@/features/health-insights/services/health-insights.service'
import type { ChroniclePersonalPreferences } from '@/features/personalization/types/personal-context.types'
import type { UploadedHealthReport } from '@/features/health/types'

function memberReports(
	uploadedReports: UploadedHealthReport[],
	memberId: string | null,
): UploadedHealthReport[] {
	if (!memberId) {
		return uploadedReports
	}

	return uploadedReports.filter(
		(report) =>
			report.family_member_id === memberId || !report.family_member_id,
	)
}

export function buildPersonalizedSuggestions(input: {
	userId: string
	memberId: string | null
	memberName: string | null
	uploadedReports: UploadedHealthReport[]
	preferences: ChroniclePersonalPreferences
	recentQuestions: string[]
}): string[] {
	const suggestions = new Set<string>()
	const prefix = input.memberName ? `${input.memberName}'s ` : 'My '
	const reports = memberReports(input.uploadedReports, input.memberId)
	const sortedReports = [...reports].sort((left, right) => {
		const leftDate = left.report_date ?? left.uploaded_at
		const rightDate = right.report_date ?? right.uploaded_at
		return rightDate.localeCompare(leftDate)
	})

	const latestReport = sortedReports[0]

	if (latestReport) {
		suggestions.add(`Continue reviewing ${prefix}latest report.`)
		suggestions.add(`Summarize ${prefix}latest report.`)
	}

	const insights = healthInsightsService.getProactiveHealthInsights({
		userId: input.userId,
		uploadedReports: reports,
		limit: 5,
	})

	for (const insight of insights.healthInsights.slice(0, 2)) {
		if (insight.title) {
			suggestions.add(`Explain: ${insight.title}`)
		}
	}

	if (reports.length >= 2) {
		suggestions.add('Compare recent cholesterol results.')
		suggestions.add('What changed since my last report?')
	}

	if (insights.healthInsights.some((item) => item.tone === 'warning')) {
		suggestions.add('Review unresolved findings.')
	}

	for (const topic of input.preferences.frequentTopics.slice(0, 2)) {
		suggestions.add(`Explain ${topic} trend.`)
	}

	for (const question of input.recentQuestions.slice(0, 2)) {
		if (!question.toLowerCase().startsWith('why did you')) {
			suggestions.add(question)
		}
	}

	if (suggestions.size === 0) {
		suggestions.add('What should I pay attention to in my health records?')
		suggestions.add('Summarize my health.')
	}

	return [...suggestions].slice(0, 6)
}

export function buildPersonalizedQuestionGroups(input: {
	userId: string
	memberId: string | null
	memberName: string | null
	uploadedReports: UploadedHealthReport[]
	preferences: ChroniclePersonalPreferences
	recentQuestions: string[]
}): AskQuestionGroup[] {
	const personalized = buildPersonalizedSuggestions(input)
	const baseGroups = ASK_QUESTION_GROUPS.map((group) => ({
		...group,
		questions: [...group.questions],
	}))

	const healthGroup = baseGroups.find((group) => group.id === 'health')

	if (!healthGroup) {
		return baseGroups
	}

	healthGroup.questions = [
		...new Set([...personalized, ...healthGroup.questions]),
	].slice(0, 8)

	return baseGroups
}
