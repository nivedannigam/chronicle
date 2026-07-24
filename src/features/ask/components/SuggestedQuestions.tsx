import { useMemo } from 'react'
import { C } from '@/constants/colors'
import { buildSuggestedQuestions } from '@/features/ask/services/suggested-questions.service'

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
	const prompts = useMemo(() => buildSuggestedQuestions(userId), [userId])

	return (
		<>
			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Suggested Questions
			</div>
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: 8,
					marginBottom: 30,
				}}
			>
				{prompts.map((prompt) => (
					<button
						key={prompt}
						type="button"
						disabled={disabled}
						onClick={() => onSelect(prompt)}
						style={{
							background: 'none',
							border: `1px solid ${C.border}`,
							borderRadius: 100,
							padding: '8px 15px',
							fontSize: 13,
							color: C.textSec,
							cursor: disabled ? 'not-allowed' : 'pointer',
							fontFamily: 'inherit',
							opacity: disabled ? 0.6 : 1,
						}}
					>
						{prompt}
					</button>
				))}
			</div>
		</>
	)
}
