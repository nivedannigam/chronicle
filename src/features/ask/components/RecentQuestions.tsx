import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { C } from '@/constants/colors'
import { ConversationTurnView } from '@/features/ask/components/ConversationTurnView'
import type { AskRecentQuestion } from '@/features/ask/types'

interface RecentQuestionsProps {
	items: AskRecentQuestion[]
	onSelectQuestion: (question: string) => void
	activeTurnId?: string | null
}

export function RecentQuestions({
	items,
	onSelectQuestion,
	activeTurnId = null,
}: RecentQuestionsProps) {
	const [expandedId, setExpandedId] = useState<string | null>(null)

	return (
		<>
			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Recent Questions
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				{items.map((item) => {
					const isExpanded = expandedId === item.id || activeTurnId === item.id

					return (
						<div
							key={item.id}
							style={{
								background: C.card,
								borderRadius: 18,
								overflow: 'hidden',
								border: `1px solid ${activeTurnId === item.id ? 'rgba(108,111,255,0.35)' : C.border}`,
							}}
						>
							<div
								onClick={() => {
									if (item.turn) {
										setExpandedId(isExpanded ? null : item.id)
									} else {
										onSelectQuestion(item.question)
									}
								}}
								style={{
									display: 'flex',
									alignItems: 'center',
									padding: '14px 16px',
									cursor: 'pointer',
									gap: 12,
								}}
							>
								<span
									style={{
										fontSize: 15,
										fontWeight: 600,
										color: C.text,
										flex: 1,
									}}
								>
									{item.question}
								</span>
								<span
									style={{
										fontSize: 12,
										color: C.textMuted,
										flexShrink: 0,
									}}
								>
									{item.displayTimestamp}
								</span>
								{item.turn ? (
									isExpanded ? (
										<ChevronUp size={16} color={C.textMuted} />
									) : (
										<ChevronDown size={16} color={C.textMuted} />
									)
								) : null}
							</div>
							{isExpanded && item.turn ? (
								<div
									style={{
										padding: '0 16px 16px',
										borderTop: `1px solid ${C.border}`,
									}}
								>
									<ConversationTurnView turn={item.turn} compact />
								</div>
							) : null}
						</div>
					)
				})}
			</div>
		</>
	)
}
