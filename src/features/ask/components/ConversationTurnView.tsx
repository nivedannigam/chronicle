import { useMemo, useState } from 'react'
import { AskMarkdownContent } from '@/features/ask/components/AskMarkdownContent'
import { AskMessageActions } from '@/features/ask/components/AskMessageActions'
import { AskStreamingSkeleton } from '@/features/ask/components/AskStreamingSkeleton'
import { AskUserMessage } from '@/features/ask/components/AskMessageBubble'
import { DisagreementPanel } from '@/features/ask/components/DisagreementPanel'
import { EvidencePanel } from '@/features/ask/components/EvidencePanel'
import { FollowUpChips } from '@/features/ask/components/FollowUpChips'
import { TypingIndicator } from '@/features/ask/components/TypingIndicator'
import { AnswerCardRenderer } from '@/features/ask/components/AnswerCardRenderer'
import { buildStructuredResponse } from '@/features/ask/services/structured-response.service'
import type { AskConversationTurn } from '@/features/ask/types'
import type { AskFeedbackRating } from '@/features/ask/beta/beta-observability.service'
import {
	getFeedbackForTurn,
	recordAskFeedback,
} from '@/features/ask/beta/beta-observability.service'
import {
	AskSectionLabel,
	AskStructuredResponseView,
} from '@/ui/figma/ask/ask-ui'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

interface ConversationTurnViewProps {
	turn: AskConversationTurn
	userId?: string
	isTyping?: boolean
	isStreaming?: boolean
	onFollowUpSelect?: (question: string) => void
	onRegenerate?: () => void
	onContinue?: () => void
	isRegenerating?: boolean
	showUserBubble?: boolean
}

export function ConversationTurnView({
	turn,
	userId,
	isTyping = false,
	isStreaming = false,
	onFollowUpSelect,
	onRegenerate,
	onContinue,
	isRegenerating = false,
	showUserBubble = true,
}: ConversationTurnViewProps) {
	const trust = turn.trust
	const showTyping = isTyping && !turn.answer.trim()
	const hasAnswer = turn.answer.trim().length > 0
	const [feedbackRating, setFeedbackRating] =
		useState<AskFeedbackRating | null>(() =>
			userId ? getFeedbackForTurn(userId, turn.id) : null,
		)

	const structured = useMemo(() => buildStructuredResponse(turn), [turn])

	const followUps = Array.from(
		new Set([
			...structured.relatedQuestions,
			...(trust?.explainabilityPrompts ?? []),
		]),
	).slice(0, 5)

	return (
		<div>
			{showUserBubble ? <AskUserMessage question={turn.question} /> : null}

			<div
				style={{
					...figmaCardStyle,
					borderRadius: 20,
					padding: '18px 16px',
					border: isStreaming
						? `1px solid ${FC.indigo}33`
						: `1px solid ${FC.line}`,
				}}
			>
				{showTyping ? (
					<>
						<TypingIndicator />
						<AskStreamingSkeleton />
					</>
				) : hasAnswer ? (
					<AskStructuredResponseView
						structured={structured}
						memberName={turn.memberName}
					>
						<AnswerCardRenderer cards={turn.cards} />

						<DisagreementPanel disagreements={trust?.disagreements ?? []} />

						{trust && structured.hasEvidence ? (
							<div style={{ marginTop: 16 }}>
								<AskSectionLabel>Supporting evidence</AskSectionLabel>
								<div style={{ marginTop: 10 }}>
									<EvidencePanel trust={trust} defaultExpanded={false} />
								</div>
							</div>
						) : null}

						{trust && trust.timelineSummary.length > 0 ? (
							<div style={{ marginTop: 16 }}>
								<AskSectionLabel>Timeline</AskSectionLabel>
								<ul
									style={{
										margin: '8px 0 0',
										paddingLeft: 18,
										display: 'flex',
										flexDirection: 'column',
										gap: 4,
									}}
								>
									{trust.timelineSummary.map((line) => (
										<li
											key={line}
											style={{
												fontSize: 12.5,
												color: FC.mid,
												lineHeight: 1.5,
											}}
										>
											{line}
										</li>
									))}
								</ul>
							</div>
						) : null}
					</AskStructuredResponseView>
				) : (
					<div style={{ fontSize: 14, color: FC.mid }}>
						<AskMarkdownContent content="I couldn't generate an answer for that question." />
					</div>
				)}

				{!showTyping && onFollowUpSelect && followUps.length > 0 ? (
					<div style={{ marginTop: 16 }}>
						<AskSectionLabel>Related questions</AskSectionLabel>
						<FollowUpChips questions={followUps} onSelect={onFollowUpSelect} />
					</div>
				) : null}

				{!showTyping ? (
					<AskMessageActions
						answer={turn.answer}
						onRegenerate={onRegenerate}
						onContinue={onContinue}
						isRegenerating={isRegenerating}
						feedbackRating={feedbackRating}
						onFeedback={
							userId
								? (rating) => {
										recordAskFeedback({
											userId,
											turnId: turn.id,
											experienceId: turn.betaExperienceId,
											question: turn.question,
											rating,
										})
										setFeedbackRating(rating)
									}
								: undefined
						}
					/>
				) : null}

				<div
					style={{
						display: 'flex',
						justifyContent: 'flex-end',
						marginTop: 10,
					}}
				>
					<span style={{ fontSize: 11, color: FC.dim }}>
						{turn.displayTimestamp}
					</span>
				</div>
			</div>
		</div>
	)
}
