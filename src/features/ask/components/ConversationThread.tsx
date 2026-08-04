import { useEffect, useMemo, useRef } from 'react'
import { ConversationTurnView } from '@/features/ask/components/ConversationTurnView'
import type { AskConversationTurn } from '@/features/ask/types'

interface ConversationThreadProps {
	turns: AskConversationTurn[]
	streamingTurn?: AskConversationTurn | null
	isTyping?: boolean
	onFollowUpSelect?: (question: string) => void
}

export function ConversationThread({
	turns,
	streamingTurn,
	isTyping = false,
	onFollowUpSelect,
}: ConversationThreadProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const topRef = useRef<HTMLDivElement>(null)

	const orderedTurns = useMemo(() => [...turns].reverse(), [turns])

	useEffect(() => {
		topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
	}, [turns.length, streamingTurn?.question, isTyping])

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
				gap: 20,
			}}
		>
			<div ref={topRef} aria-hidden style={{ height: 1 }} />

			{streamingTurn ? (
				<ConversationTurnView
					turn={streamingTurn}
					isTyping={isTyping}
					isStreaming
					showFollowUps={false}
				/>
			) : null}

			{orderedTurns.map((turn, index) => (
				<ConversationTurnView
					key={turn.id}
					turn={turn}
					onFollowUpSelect={
						index === 0 && !streamingTurn ? onFollowUpSelect : undefined
					}
					showFollowUps={index === 0 && !streamingTurn}
				/>
			))}
		</div>
	)
}
