import { C } from '@/constants/colors'

const CATEGORY_COLORS = {
	health: C.teal,
	documents: C.accent,
	timeline: C.accentBlue,
	general: C.textSec,
} as const

interface FollowUpChipsProps {
	questions: string[]
	onSelect: (question: string) => void
	disabled?: boolean
}

export function FollowUpChips({
	questions,
	onSelect,
	disabled = false,
}: FollowUpChipsProps) {
	if (questions.length === 0) {
		return null
	}

	return (
		<div
			style={{
				display: 'flex',
				flexWrap: 'wrap',
				gap: 8,
				marginTop: 12,
			}}
			role="list"
			aria-label="Follow-up questions"
		>
			{questions.map((question) => (
				<button
					key={question}
					type="button"
					disabled={disabled}
					onClick={() => onSelect(question)}
					role="listitem"
					style={{
						fontSize: 12,
						fontWeight: 600,
						color: C.textSec,
						background: `${C.accent}10`,
						border: `1px solid ${C.border}`,
						borderRadius: 100,
						padding: '8px 12px',
						cursor: disabled ? 'not-allowed' : 'pointer',
						fontFamily: 'inherit',
						lineHeight: 1.35,
						textAlign: 'left',
					}}
				>
					{question}
				</button>
			))}
		</div>
	)
}

interface DynamicSuggestionChipsProps {
	chips: Array<{
		id: string
		label: string
		question: string
		category: keyof typeof CATEGORY_COLORS
	}>
	onSelect: (question: string) => void
	disabled?: boolean
}

export function DynamicSuggestionChips({
	chips,
	onSelect,
	disabled = false,
}: DynamicSuggestionChipsProps) {
	return (
		<div
			style={{
				display: 'flex',
				flexWrap: 'wrap',
				gap: 8,
				marginBottom: 18,
			}}
			role="list"
			aria-label="Suggested questions"
		>
			{chips.map((chip) => (
				<button
					key={chip.id}
					type="button"
					disabled={disabled}
					onClick={() => onSelect(chip.question)}
					role="listitem"
					style={{
						fontSize: 13,
						fontWeight: 600,
						color: CATEGORY_COLORS[chip.category],
						background: `${CATEGORY_COLORS[chip.category]}12`,
						border: `1px solid ${CATEGORY_COLORS[chip.category]}33`,
						borderRadius: 100,
						padding: '8px 14px',
						cursor: disabled ? 'not-allowed' : 'pointer',
						fontFamily: 'inherit',
					}}
				>
					{chip.label}
				</button>
			))}
		</div>
	)
}
