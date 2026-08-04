import { useMemo } from 'react'
import { AskPremiumAnswer } from '@/features/ask/components/AskPremiumAnswer'
import { AskStreamingSkeleton } from '@/features/ask/components/AskStreamingSkeleton'
import { FollowUpChips } from '@/features/ask/components/FollowUpChips'
import { TypingIndicator } from '@/features/ask/components/TypingIndicator'
import { buildStructuredResponse } from '@/features/ask/services/structured-response.service'
import type { AskConversationTurn } from '@/features/ask/types'
import { FC } from '@/ui/figma/v2/atoms'

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
				paddingBottom: hideQuestion ? 0 : 48,
				borderBottom: hideQuestion ? 'none' : `1px solid ${FC.line}`,
				marginBottom: hideQuestion ? 0 : 32,
			}}
		>
			{hideQuestion ? null : (
				<h2
					style={{
						fontSize: 17,
						fontWeight: 600,
						color: FC.fg,
						lineHeight: 1.45,
						margin: '0 0 24px',
						letterSpacing: -0.3,
					}}
				>
					{turn.question}
				</h2>
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
				<p style={{ fontSize: 15, color: FC.mid, lineHeight: 1.65, margin: 0 }}>
					I couldn't generate an answer for that question.
				</p>
			)}

			{!showTyping &&
			showFollowUps &&
			onFollowUpSelect &&
			followUps.length > 0 ? (
				<FollowUpChips questions={followUps} onSelect={onFollowUpSelect} />
			) : null}
		</section>
	)
}
