import type { AskQuestionGroup } from '@/constants/product-copy'
import { buildPersonalizedQuestionGroups } from '@/features/personalization/services/personalized-suggestions.service'
import type { ChroniclePersonalPreferences } from '@/features/personalization/types/personal-context.types'
import type { UploadedHealthReport } from '@/features/health/types'

export function buildSuggestedQuestionGroups(input: {
	userId: string
	memberId?: string | null
	memberName?: string | null
	uploadedReports?: UploadedHealthReport[]
	preferences?: ChroniclePersonalPreferences
	recentQuestions?: string[]
}): AskQuestionGroup[] {
	return buildPersonalizedQuestionGroups({
		userId: input.userId,
		memberId: input.memberId ?? null,
		memberName: input.memberName ?? null,
		uploadedReports: input.uploadedReports ?? [],
		preferences:
			input.preferences ??
			({
				language: 'en',
				units: 'metric',
				communicationStyle: 'detailed',
				displayFormat: 'detailed',
				dashboardLayout: 'expanded',
				notificationPreferences: {
					healthAlerts: true,
					importComplete: true,
				},
				frequentlyAccessedReportIds: [],
				frequentTopics: [],
			} satisfies ChroniclePersonalPreferences),
		recentQuestions: input.recentQuestions ?? [],
	})
}

/** @deprecated Use buildSuggestedQuestionGroups with personalization input */
export function buildSuggestedQuestions(userId: string): string[] {
	return buildSuggestedQuestionGroups({ userId })
		.flatMap((group) => group.questions)
		.slice(0, 8)
}
