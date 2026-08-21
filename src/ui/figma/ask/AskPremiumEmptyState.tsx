import { UNIVERSAL_ASK_EMPTY_SUGGESTIONS } from '@/features/ask/constants/ask-empty-state'
import { buildHealthCompanionSuggestions } from '@/features/ask/services/health-companion-suggestions.service'
import type { HealthCanonicalSnapshot } from '@/features/health/types/health-context.types'
import {
	AskColors,
	AskLayout,
	AskTypography,
} from '@/ui/figma/ask/ask-design-tokens'

export function AskPremiumEmptyState({
	onSelectQuestion,
	consumerMode = false,
	reportCount = 0,
	healthSummary,
	headline,
}: {
	onSelectQuestion: (question: string) => void
	consumerMode?: boolean
	reportCount?: number
	healthSummary?: Pick<
		HealthCanonicalSnapshot,
		'overallStatus' | 'overallSummary' | 'score'
	>
	headline?: string
}) {
	const suggestions = consumerMode
		? buildHealthCompanionSuggestions({ reportCount }).map(
				(item) => item.question,
			)
		: [...UNIVERSAL_ASK_EMPTY_SUGGESTIONS]

	const resolvedHeadline =
		headline ??
		(consumerMode
			? 'Ask anything about your health records.'
			: 'Ask anything about your health.')

	const headlineText = resolvedHeadline

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
				{headlineText}
			</h2>

			{consumerMode ? (
				<>
					{healthSummary && reportCount > 0 ? (
						<div
							style={{
								background: AskColors.card,
								border: `1px solid ${AskColors.line}`,
								borderRadius: 16,
								padding: '14px 16px',
								marginBottom: 20,
								maxWidth: 360,
							}}
						>
							<p
								style={{
									...AskTypography.sectionTitle,
									color: AskColors.dim,
									margin: '0 0 4px',
									textTransform: 'uppercase',
								}}
							>
								{healthSummary.overallStatus}
								{healthSummary.score != null
									? ` · ${healthSummary.score}/100`
									: ''}
							</p>
							<p
								style={{
									...AskTypography.body,
									color: AskColors.mid,
									margin: 0,
								}}
							>
								{healthSummary.overallSummary}
							</p>
						</div>
					) : null}
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
				</>
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
