import { AskColors, AskTypography } from '@/ui/figma/ask/ask-design-tokens'

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
	const visible = questions.slice(0, 4)

	if (visible.length === 0) {
		return null
	}

	return (
		<div style={{ marginTop: 28 }} role="list" aria-label="Related questions">
			<p
				style={{
					...AskTypography.sectionTitle,
					color: AskColors.dim,
					margin: '0 0 10px',
				}}
			>
				Related questions
			</p>
			<div
				style={{
					display: 'flex',
					gap: 8,
					overflowX: 'auto',
					scrollbarWidth: 'none',
					WebkitOverflowScrolling: 'touch',
					paddingBottom: 2,
				}}
			>
				{visible.map((question) => (
					<button
						key={question}
						type="button"
						disabled={disabled}
						onClick={() => onSelect(question)}
						role="listitem"
						style={{
							flexShrink: 0,
							fontSize: 12,
							fontWeight: 500,
							color: AskColors.mid,
							background: AskColors.cardElevated,
							border: `1px solid ${AskColors.line}`,
							borderRadius: 100,
							padding: '7px 12px',
							cursor: disabled ? 'not-allowed' : 'pointer',
							fontFamily: 'inherit',
							lineHeight: 1.3,
							whiteSpace: 'nowrap',
						}}
					>
						{question}
					</button>
				))}
			</div>
		</div>
	)
}

interface DynamicSuggestionChipsProps {
	chips: Array<{
		id: string
		label: string
		question: string
		category: string
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
						fontWeight: 500,
						color: AskColors.mid,
						background: AskColors.cardElevated,
						border: `1px solid ${AskColors.line}`,
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
