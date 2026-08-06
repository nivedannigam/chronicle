import { INSURANCE_ASK_SUGGESTIONS } from '@/features/insurance/services/insurance-ask.engine'
import type { InsuranceHomeViewModel } from '@/features/insurance/services/insurance-home.mapper'
import {
	AskColors,
	AskLayout,
	AskTypography,
} from '@/ui/figma/ask/ask-design-tokens'

export function InsuranceAskEmptyState({
	onSelectQuestion,
	homeSummary,
	policyCount = 0,
}: {
	onSelectQuestion: (question: string) => void
	homeSummary?: Pick<
		InsuranceHomeViewModel['protection'],
		'protectionStatus' | 'narrative'
	>
	policyCount?: number
}) {
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
				Ask anything about your insurance.
			</h2>

			{homeSummary && policyCount > 0 ? (
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
						{homeSummary.protectionStatus}
					</p>
					<p
						style={{
							...AskTypography.body,
							color: AskColors.mid,
							margin: 0,
						}}
					>
						{homeSummary.narrative}
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
				Chronicle reads your policies, renewals, and claims to give personalized
				answers — not generic insurance advice.
			</p>

			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: 8,
				}}
				role="list"
				aria-label="Suggested questions"
			>
				{INSURANCE_ASK_SUGGESTIONS.map((question) => (
					<button
						key={question}
						type="button"
						onClick={() => onSelectQuestion(question)}
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
							textAlign: 'left',
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
