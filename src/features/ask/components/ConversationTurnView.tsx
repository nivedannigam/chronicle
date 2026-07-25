import { C } from '@/constants/colors'
import { AskMarkdownContent } from '@/features/ask/components/AskMarkdownContent'
import { AskMessageActions } from '@/features/ask/components/AskMessageActions'
import { AskStreamingSkeleton } from '@/features/ask/components/AskStreamingSkeleton'
import { AskUserMessage } from '@/features/ask/components/AskMessageBubble'
import { DisagreementPanel } from '@/features/ask/components/DisagreementPanel'
import { FollowUpChips } from '@/features/ask/components/FollowUpChips'
import { SourceCardsPanel } from '@/features/ask/components/SourceCardsPanel'
import { TypingIndicator } from '@/features/ask/components/TypingIndicator'
import { AnswerCardRenderer } from '@/features/ask/components/AnswerCardRenderer'
import { confidenceLevelLabel } from '@/features/intelligence/types/confidence.types'
import type { AskConversationTurn } from '@/features/ask/types'

interface ConversationTurnViewProps {
	turn: AskConversationTurn
	isTyping?: boolean
	isStreaming?: boolean
	onFollowUpSelect?: (question: string) => void
	onRegenerate?: () => void
	onContinue?: () => void
	isRegenerating?: boolean
	showUserBubble?: boolean
}

function confidenceColor(
	level: AskConversationTurn['confidenceLevel'],
): string {
	switch (level) {
		case 'high':
			return C.greenAlt
		case 'medium':
			return C.orange
		default:
			return C.textMuted
	}
}

export function ConversationTurnView({
	turn,
	isTyping = false,
	isStreaming = false,
	onFollowUpSelect,
	onRegenerate,
	onContinue,
	isRegenerating = false,
	showUserBubble = true,
}: ConversationTurnViewProps) {
	const trust = turn.trust
	const confidenceLevel = trust?.confidence.level ?? turn.confidenceLevel
	const confidenceTextColor = confidenceColor(confidenceLevel)
	const showTyping = isTyping && !turn.answer.trim()
	const hasAnswer = turn.answer.trim().length > 0
	const followUps = Array.from(
		new Set([
			...turn.followUpQuestions,
			...(trust?.explainabilityPrompts ?? []),
		]),
	)

	return (
		<div>
			{showUserBubble ? <AskUserMessage question={turn.question} /> : null}

			<div
				style={{
					background: C.card,
					border: `1px solid ${isStreaming ? `${C.accent}33` : C.border}`,
					borderRadius: 18,
					padding: '16px',
				}}
			>
				{turn.memberName ? (
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							color: C.textMuted,
							marginBottom: 10,
							letterSpacing: '0.04em',
						}}
					>
						For {turn.memberName}
					</div>
				) : null}

				{showTyping ? (
					<>
						<TypingIndicator />
						<AskStreamingSkeleton />
					</>
				) : (
					<>
						{hasAnswer ? (
							<AskMarkdownContent content={turn.answer} />
						) : (
							<div style={{ fontSize: 14, color: C.textMuted }}>
								No answer available.
							</div>
						)}
					</>
				)}

				{!showTyping ? <AnswerCardRenderer cards={turn.cards} /> : null}

				{!showTyping ? (
					<DisagreementPanel disagreements={trust?.disagreements ?? []} />
				) : null}

				{!showTyping ? <SourceCardsPanel turn={turn} /> : null}

				{trust && trust.timelineSummary.length > 0 && !showTyping ? (
					<div
						style={{
							marginTop: 16,
							paddingTop: 14,
							borderTop: `1px solid ${C.border}`,
						}}
					>
						<div
							style={{
								fontSize: 11,
								fontWeight: 600,
								letterSpacing: '0.08em',
								textTransform: 'uppercase',
								color: C.textMuted,
								marginBottom: 8,
							}}
						>
							Timeline
						</div>
						<ul
							style={{
								margin: 0,
								paddingLeft: 18,
								display: 'flex',
								flexDirection: 'column',
								gap: 4,
							}}
						>
							{trust.timelineSummary.map((line) => (
								<li
									key={line}
									style={{ fontSize: 12, color: C.textSec, lineHeight: 1.5 }}
								>
									{line}
								</li>
							))}
						</ul>
					</div>
				) : null}

				{trust && trust.missingInformation.length > 0 && !showTyping ? (
					<div
						style={{
							marginTop: 16,
							paddingTop: 14,
							borderTop: `1px solid ${C.border}`,
						}}
					>
						<div
							style={{
								fontSize: 11,
								fontWeight: 600,
								letterSpacing: '0.08em',
								textTransform: 'uppercase',
								color: C.textMuted,
								marginBottom: 8,
							}}
						>
							What Chronicle does not know
						</div>
						<ul
							style={{
								margin: 0,
								paddingLeft: 18,
								display: 'flex',
								flexDirection: 'column',
								gap: 4,
							}}
						>
							{trust.missingInformation.map((line) => (
								<li
									key={line}
									style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}
								>
									{line}
								</li>
							))}
						</ul>
					</div>
				) : null}

				{!showTyping && onFollowUpSelect ? (
					<FollowUpChips questions={followUps} onSelect={onFollowUpSelect} />
				) : null}

				{!showTyping ? (
					<AskMessageActions
						answer={turn.answer}
						onRegenerate={onRegenerate}
						onContinue={onContinue}
						isRegenerating={isRegenerating}
					/>
				) : null}

				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'flex-start',
						gap: 12,
						marginTop: 14,
						paddingTop: 12,
						borderTop: `1px solid ${C.border}`,
					}}
				>
					<div>
						<span
							style={{
								fontSize: 11,
								fontWeight: 700,
								color: confidenceTextColor,
								display: 'block',
							}}
						>
							{confidenceLevelLabel(confidenceLevel, turn.dataAvailable)}
						</span>
						{trust?.confidence.factors.slice(0, 2).map((factor) => (
							<span
								key={factor}
								style={{
									fontSize: 10,
									color: C.textMuted,
									display: 'block',
									marginTop: 2,
								}}
							>
								{factor}
							</span>
						))}
					</div>
					<span style={{ fontSize: 11, color: C.textMuted }}>
						{turn.displayTimestamp}
					</span>
				</div>
			</div>
		</div>
	)
}
