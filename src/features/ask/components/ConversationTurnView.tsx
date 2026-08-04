import { useMemo } from 'react'
import { AskPremiumAnswer } from '@/features/ask/components/AskPremiumAnswer'
import { AskStreamingSkeleton } from '@/features/ask/components/AskStreamingSkeleton'
import { FollowUpChips } from '@/features/ask/components/FollowUpChips'
import { TypingIndicator } from '@/features/ask/components/TypingIndicator'
import { buildStructuredResponse } from '@/features/ask/services/structured-response.service'
import type { AskConversationTurn } from '@/features/ask/types'
import {
	AskColors,
	AskLayout,
	AskTypography,
} from '@/ui/figma/ask/ask-design-tokens'

interface ConversationTurnViewProps {
	turn: AskConversationTurn
	isTyping?: boolean
	isStreaming?: boolean
	onFollowUpSelect?: (question: string) => void
	showFollowUps?: boolean
	hideQuestion?: boolean
}

export function ConversationTurnView({
	turn,
	isTyping = false,
	isStreaming = false,
	onFollowUpSelect,
	showFollowUps = true,
	hideQuestion = false,
}: ConversationTurnViewProps) {
	const trust = turn.trust
	const showTyping = isTyping && !turn.answer.trim()
	const hasAnswer = turn.answer.trim().length > 0
	const structured = useMemo(() => buildStructuredResponse(turn), [turn])

	const followUps = Array.from(
		new Set([
			...structured.relatedQuestions,
			...(trust?.followUpQuestions ?? []),
		]),
	)
		.filter(
			(question) =>
				!/why did you say|what evidence supports|which reports contributed|what information is missing/i.test(
					question,
				),
		)
		.slice(0, 4)

	return (
		<section
			style={{
				maxWidth: AskLayout.maxContentWidth,
				margin: '0 auto',
				paddingBottom: hideQuestion ? 0 : 32,
			}}
		>
			<div
				style={{
					background: AskColors.card,
					borderRadius: AskLayout.cardRadius,
					border: `1px solid ${AskColors.line}`,
					boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
					padding: '24px 22px 28px',
				}}
			>
				{hideQuestion ? null : (
					<div
						style={{
							display: 'flex',
							justifyContent: 'flex-end',
							marginBottom: 24,
						}}
					>
						<p
							style={{
								...AskTypography.question,
								color: AskColors.primary,
								margin: 0,
								maxWidth: '85%',
								textAlign: 'right',
							}}
						>
							{turn.question}
						</p>
					</div>
				)}

				{showTyping ? (
					<div>
						<TypingIndicator />
						<AskStreamingSkeleton />
					</div>
				) : hasAnswer ? (
					<AskPremiumAnswer
						structured={structured}
						trust={trust}
						rawAnswer={turn.answer}
						isStreaming={isStreaming}
					/>
				) : (
					<p
						style={{
							...AskTypography.body,
							color: AskColors.mid,
							margin: 0,
						}}
					>
						I couldn't generate an answer for that question.
					</p>
				)}

				{!showTyping &&
				showFollowUps &&
				onFollowUpSelect &&
				followUps.length > 0 ? (
					<FollowUpChips questions={followUps} onSelect={onFollowUpSelect} />
				) : null}
			</div>
		</section>
	)
}
