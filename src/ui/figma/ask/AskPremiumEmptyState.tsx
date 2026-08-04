import { ASK_EMPTY_SUGGESTIONS } from '@/features/ask/constants/ask-empty-state'
import { FC } from '@/ui/figma/v2/atoms'

export function AskPremiumEmptyState({
	onSelectQuestion,
}: {
	onSelectQuestion: (question: string) => void
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				minHeight: 'min(420px, 55vh)',
				padding: '12px 0 24px',
			}}
		>
			<h2
				style={{
					fontSize: 26,
					fontWeight: 600,
					color: FC.fg,
					lineHeight: 1.25,
					letterSpacing: -0.6,
					margin: '0 0 28px',
					maxWidth: 320,
				}}
			>
				Ask anything about your health.
			</h2>

			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: 8,
				}}
				role="list"
				aria-label="Suggested questions"
			>
				{ASK_EMPTY_SUGGESTIONS.map((question) => (
					<button
						key={question}
						type="button"
						onClick={() => onSelectQuestion(question)}
						role="listitem"
						style={{
							fontSize: 13,
							fontWeight: 500,
							color: FC.mid,
							background: `${FC.bg}`,
							border: `1px solid ${FC.line}`,
							borderRadius: 100,
							padding: '9px 14px',
							cursor: 'pointer',
							fontFamily: 'inherit',
							lineHeight: 1.35,
						}}
					>
						{question}
					</button>
				))}
			</div>
		</div>
	)
}
