import { useCallback, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ConversationTurnView } from '@/features/ask/components/ConversationTurnView'
import { useAskAutoScroll } from '@/features/ask/hooks/useAskAutoScroll'
import type { AskConversationTurn } from '@/features/ask/types'
import {
	buildCollapsedTurnPreview,
	shouldCollapseTurnByDefault,
} from '@/features/ask/utils/conversation-thread-collapse'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

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

function CollapsedTurnRow({
	turn,
	onExpand,
}: {
	turn: AskConversationTurn
	onExpand: () => void
}) {
	return (
		<button
			type="button"
			onClick={onExpand}
			style={{
				...figmaCardStyle,
				width: '100%',
				borderRadius: 14,
				padding: '10px 12px',
				marginBottom: 6,
				display: 'flex',
				alignItems: 'flex-start',
				gap: 8,
				cursor: 'pointer',
				textAlign: 'left',
				fontFamily: 'inherit',
				border: `1px solid ${FC.line}`,
				background: `${FC.bg}88`,
			}}
		>
			<ChevronRight
				size={14}
				color={FC.dim}
				style={{ flexShrink: 0, marginTop: 2 }}
			/>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						fontSize: 13,
						fontWeight: 600,
						color: FC.fg,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{turn.question}
				</div>
				<div
					style={{
						fontSize: 12,
						color: FC.mid,
						marginTop: 2,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{buildCollapsedTurnPreview(turn)}
				</div>
			</div>
			<span style={{ fontSize: 10, color: FC.dim, flexShrink: 0 }}>
				{turn.displayTimestamp}
			</span>
		</button>
	)
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
	const [expandedTurnIds, setExpandedTurnIds] = useState<Set<string>>(
		() => new Set(),
	)

	const collapseByIndex = useMemo(
		() =>
			turns.map((turn, index) =>
				shouldCollapseTurnByDefault({
					turn,
					index,
					totalTurns: turns.length,
				}),
			),
		[turns],
	)

	const expandTurn = useCallback((turnId: string) => {
		setExpandedTurnIds((current) => {
			const next = new Set(current)
			next.add(turnId)
			return next
		})
	}, [])

	const { containerRef, bottomRef } = useAskAutoScroll([
		turns.length,
		streamingTurn?.answer,
		isTyping,
	])

	if (turns.length === 0 && !streamingTurn) {
		return null
	}

	const collapsedCount = turns.filter(
		(turn, index) => collapseByIndex[index] && !expandedTurnIds.has(turn.id),
	).length

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
			{collapsedCount > 0 ? (
				<div
					style={{
						fontSize: 11,
						color: FC.dim,
						fontWeight: 600,
						padding: '4px 2px 8px',
						display: 'flex',
						alignItems: 'center',
						gap: 4,
					}}
				>
					<ChevronDown size={12} />
					{collapsedCount} earlier message{collapsedCount === 1 ? '' : 's'}{' '}
					collapsed — tap to expand
				</div>
			) : null}

			{turns.map((turn, index) => {
				const collapsed =
					collapseByIndex[index] && !expandedTurnIds.has(turn.id)

				if (collapsed) {
					return (
						<CollapsedTurnRow
							key={turn.id}
							turn={turn}
							onExpand={() => expandTurn(turn.id)}
						/>
					)
				}

				return (
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
						onCollapse={
							collapseByIndex[index]
								? () =>
										setExpandedTurnIds((current) => {
											const next = new Set(current)
											next.delete(turn.id)
											return next
										})
								: undefined
						}
					/>
				)
			})}

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
