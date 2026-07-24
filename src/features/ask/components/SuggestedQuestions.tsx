import { useMemo } from 'react'
import { C } from '@/constants/colors'
import { buildSuggestedQuestionGroups } from '@/features/ask/services/suggested-questions.service'

interface SuggestedQuestionsProps {
	userId: string
	onSelect: (question: string) => void
	disabled?: boolean
}

export function SuggestedQuestions({
	userId,
	onSelect,
	disabled = false,
}: SuggestedQuestionsProps) {
	const groups = useMemo(() => buildSuggestedQuestionGroups(userId), [userId])

	if (groups.length === 0) {
		return null
	}

	return (
		<section style={{ marginBottom: 8 }}>
			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 14,
				}}
			>
				Try asking
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
				{groups.map((group) => (
					<div key={group.id}>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 8,
								marginBottom: 8,
							}}
						>
							<span
								style={{
									fontSize: 13,
									fontWeight: 700,
									color: C.text,
									letterSpacing: '-0.01em',
								}}
							>
								{group.label}
							</span>
							<span
								style={{
									fontSize: 10,
									fontWeight: 700,
									letterSpacing: '0.05em',
									textTransform: 'uppercase',
									color: group.available ? C.teal : C.textMuted,
									background: group.available ? `${C.teal}18` : C.card2,
									borderRadius: 100,
									padding: '3px 8px',
								}}
							>
								{group.available ? 'Available' : 'Coming soon'}
							</span>
						</div>

						<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
							{group.questions.map((prompt) => (
								<button
									key={prompt}
									type="button"
									disabled={disabled}
									onClick={() => onSelect(prompt)}
									style={{
										width: '100%',
										background: C.card,
										border: `1px solid ${C.border}`,
										borderRadius: 14,
										padding: '11px 14px',
										fontSize: 14,
										fontWeight: 500,
										color: group.available ? C.textSec : C.textMuted,
										cursor: disabled ? 'not-allowed' : 'pointer',
										fontFamily: 'inherit',
										textAlign: 'left',
										lineHeight: 1.35,
										opacity: disabled ? 0.6 : 1,
									}}
								>
									{prompt}
								</button>
							))}
						</div>
					</div>
				))}
			</div>
		</section>
	)
}
