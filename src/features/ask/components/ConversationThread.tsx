import { ConversationTurnView } from '@/features/ask/components/ConversationTurnView'
import { useAskAutoScroll } from '@/features/ask/hooks/useAskAutoScroll'
import type { AskConversationTurn } from '@/features/ask/types'

interface ConversationThreadProps {
	turns: AskConversationTurn[]
	userId?: string
	streamingTurn?: AskConversationTurn | null
	isTyping?: boolean
	onFollowUpSelect?: (question: string) => void
	onRegenerateTurn?: (turnId: string) => void
	onContinueTurn?: (turnId: string) => void
	regeneratingTurnId?: string | null
}

export function ConversationThread({
	turns,
	userId,
	streamingTurn,
	isTyping = false,
	onFollowUpSelect,
	onRegenerateTurn,
	onContinueTurn,
	regeneratingTurnId,
}: ConversationThreadProps) {
	const { containerRef, bottomRef } = useAskAutoScroll([
		turns.length,
		streamingTurn?.answer,
		isTyping,
	])

	if (turns.length === 0 && !streamingTurn) {
		return null
	}

	return (
		<div
			ref={containerRef}
			role="log"
			aria-live="polite"
			aria-relevant="additions text"
			aria-label="Conversation"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 4,
				paddingBottom: 8,
			}}
		>
			{turns.map((turn) => (
				<ConversationTurnView
					key={turn.id}
					turn={turn}
					userId={userId}
					onFollowUpSelect={onFollowUpSelect}
					onRegenerate={
						onRegenerateTurn ? () => onRegenerateTurn(turn.id) : undefined
					}
					onContinue={
						onContinueTurn ? () => onContinueTurn(turn.id) : undefined
					}
					isRegenerating={regeneratingTurnId === turn.id}
				/>
			))}

			{streamingTurn ? (
				<ConversationTurnView
					turn={streamingTurn}
					isTyping={isTyping}
					isStreaming
					showUserBubble={turns.length === 0}
				/>
			) : null}

			<div ref={bottomRef} aria-hidden style={{ height: 1 }} />
		</div>
	)
}
