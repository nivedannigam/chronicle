import { MessageCircle } from 'lucide-react'
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
		<div
			style={{
				marginTop: 28,
				paddingTop: 24,
				borderTop: `1px solid ${AskColors.line}`,
			}}
			role="list"
			aria-label="Suggested follow-ups"
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					marginBottom: 12,
				}}
			>
				<MessageCircle size={14} color={AskColors.primary} />
				<p
					style={{
						...AskTypography.sectionTitle,
						color: AskColors.primary,
						margin: 0,
					}}
				>
					Suggested follow-ups
				</p>
			</div>
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: 8,
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
							fontSize: 13,
							fontWeight: 500,
							color: AskColors.mid,
							background: AskColors.cardElevated,
							border: `1px solid ${AskColors.line}`,
							borderRadius: 100,
							padding: '8px 14px',
							cursor: disabled ? 'not-allowed' : 'pointer',
							fontFamily: 'inherit',
							lineHeight: 1.35,
							transition: 'border-color 0.15s ease, background 0.15s ease',
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
