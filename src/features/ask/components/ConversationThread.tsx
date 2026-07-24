import { C } from '@/constants/colors'
import { ConversationTurnView } from '@/features/ask/components/ConversationTurnView'
import type { AskConversationTurn } from '@/features/ask/types'

interface ConversationThreadProps {
	turns: AskConversationTurn[]
	streamingTurn?: AskConversationTurn | null
	onFollowUpSelect?: (question: string) => void
}

export function ConversationThread({
	turns,
	streamingTurn,
	onFollowUpSelect,
}: ConversationThreadProps) {
	if (turns.length === 0 && !streamingTurn) {
		return null
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
			{turns.map((turn) => (
				<div
					key={turn.id}
					style={{
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 18,
						padding: '16px',
					}}
				>
					<ConversationTurnView
						turn={turn}
						onFollowUpSelect={onFollowUpSelect}
					/>
				</div>
			))}

			{streamingTurn ? (
				<div
					style={{
						background: C.card,
						border: `1px solid rgba(108,111,255,0.22)`,
						borderRadius: 18,
						padding: '16px',
					}}
				>
					<ConversationTurnView turn={streamingTurn} />
				</div>
			) : null}
		</div>
	)
}
