import { C } from '@/constants/colors'
import { COMMAND_CENTER_COPY } from '@/constants/product-copy'
import { HealthInsightsList } from '@/features/health/components/HealthInsightsList'
import type { HealthInsight } from '@/features/health/types'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'

interface CommandCenterInsightsProps {
	insights: HealthInsight[]
	isLoading?: boolean
}

export function CommandCenterInsights({
	insights,
	isLoading = false,
}: CommandCenterInsightsProps) {
	if (isLoading) {
		return (
			<section style={{ marginBottom: 24 }}>
				<HomeSectionLabel>{COMMAND_CENTER_COPY.insightsLabel}</HomeSectionLabel>
				<div
					style={{
						height: 96,
						borderRadius: 16,
						background: C.card,
						border: `1px solid ${C.border}`,
						opacity: 0.55,
					}}
				/>
			</section>
		)
	}

	if (insights.length === 0) {
		return null
	}

	return (
		<section style={{ marginBottom: 24 }}>
			<HomeSectionLabel>{COMMAND_CENTER_COPY.insightsLabel}</HomeSectionLabel>
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					overflow: 'hidden',
				}}
			>
				<HealthInsightsList insights={insights} />
			</div>
		</section>
	)
}
