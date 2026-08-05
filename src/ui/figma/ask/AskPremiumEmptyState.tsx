import { ASK_EMPTY_SUGGESTIONS } from '@/features/ask/constants/ask-empty-state'
import { buildHealthCompanionSuggestions } from '@/features/ask/services/health-companion-suggestions.service'
import type { UploadedHealthReport } from '@/features/health/types'
import { isReportDisplayReady } from '@/features/health/services/report-readiness.service'
import {
	AskColors,
	AskLayout,
	AskTypography,
} from '@/ui/figma/ask/ask-design-tokens'

export function AskPremiumEmptyState({
	onSelectQuestion,
	consumerMode = false,
	reportCount = 0,
}: {
	onSelectQuestion: (question: string) => void
	consumerMode?: boolean
	reportCount?: number
}) {
	const suggestions = consumerMode
		? buildHealthCompanionSuggestions({ reportCount }).map(
				(item) => item.question,
			)
		: [...ASK_EMPTY_SUGGESTIONS]

	const headline = consumerMode
		? 'Ask anything about your health records.'
		: 'Ask anything about your health.'

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				minHeight: 'min(420px, 55vh)',
				padding: '12px 0 24px',
				maxWidth: AskLayout.maxContentWidth,
				margin: '0 auto',
			}}
		>
			<h2
				style={{
					fontSize: 26,
					fontWeight: 600,
					color: AskColors.fg,
					lineHeight: 1.25,
					letterSpacing: -0.6,
					margin: '0 0 12px',
					maxWidth: 360,
				}}
			>
				{headline}
			</h2>

			{consumerMode ? (
				<p
					style={{
						...AskTypography.body,
						color: AskColors.mid,
						margin: '0 0 24px',
						maxWidth: 340,
					}}
				>
					Chronicle reads your lab reports and visits to give personalized
					answers — not generic health advice.
				</p>
			) : null}

			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: 8,
				}}
				role="list"
				aria-label="Suggested questions"
			>
				{suggestions.map((question) => (
					<button
						key={question}
						type="button"
						onClick={() => onSelectQuestion(question)}
						role="listitem"
						style={{
							...AskTypography.body,
							fontWeight: 500,
							color: AskColors.mid,
							background: AskColors.card,
							border: `1px solid ${AskColors.line}`,
							borderRadius: 100,
							padding: '9px 14px',
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						{question}
					</button>
				))}
			</div>
		</div>
	)
}

export function resolveAskEmptyReportCount(
	reports: UploadedHealthReport[],
): number {
	return reports.filter(isReportDisplayReady).length
}
