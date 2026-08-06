import type { AttentionItem } from '@/features/command-center/types/command-center.types'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { DailyBrief } from '@/features/os/types/os.types'
import type { LifeScore } from '@/features/os/types/os.types'

function timeGreeting(): string {
	const hour = new Date().getHours()
	if (hour < 12) {
		return 'Good morning'
	}

	if (hour < 17) {
		return 'Good afternoon'
	}

	return 'Good evening'
}

export function buildDailyBrief(input: {
	greetingName: string
	hasAnyData: boolean
	lifeScore: LifeScore
	attentionItems: AttentionItem[]
	insuranceKnowledge: InsuranceKnowledge | null
	expiringDocumentCount: number
	healthReportCount: number
}): DailyBrief {
	const greeting = timeGreeting()
	const paragraphs: string[] = []

	if (!input.hasAnyData) {
		return {
			greeting,
			paragraphs: [
				`${input.greetingName}, welcome to Chronicle.`,
				'Connect health records or add documents to your library — Chronicle will keep track of everything that matters.',
			],
			tone: 'welcome',
		}
	}

	const actionable = input.attentionItems.filter((item) => item.tone !== 'info')

	if (actionable.length === 0) {
		paragraphs.push('Everything looks good today.')
	} else if (actionable.length === 1) {
		paragraphs.push(`One thing needs your attention: ${actionable[0]!.title}.`)
	} else {
		paragraphs.push(`${actionable.length} items need your attention today.`)
	}

	const expiringPolicy = input.insuranceKnowledge?.expiringPolicies[0]
	if (
		expiringPolicy?.daysUntilExpiry != null &&
		expiringPolicy.daysUntilExpiry <= 30
	) {
		const days = expiringPolicy.daysUntilExpiry
		paragraphs.push(
			`Your ${expiringPolicy.productName ?? 'insurance policy'} renews in ${days} day${days === 1 ? '' : 's'}.`,
		)
	}

	if (
		input.healthReportCount > 0 &&
		input.lifeScore.dimensions.find((d) => d.id === 'health')?.status !==
			'attention'
	) {
		paragraphs.push('Your health has remained stable.')
	}

	if (
		input.expiringDocumentCount === 0 &&
		actionable.every((item) => item.module !== 'documents')
	) {
		paragraphs.push('No important documents require attention.')
	} else if (input.expiringDocumentCount > 0) {
		paragraphs.push(
			`${input.expiringDocumentCount} document${input.expiringDocumentCount === 1 ? '' : 's'} expiring soon — worth a look.`,
		)
	}

	if (paragraphs.length === 0) {
		paragraphs.push(
			`${input.greetingName}, your life records are organized. Ask Chronicle if you need anything.`,
		)
	}

	const tone: DailyBrief['tone'] = actionable.length > 0 ? 'attention' : 'calm'

	return { greeting, paragraphs, tone }
}
