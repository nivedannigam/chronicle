import { C } from '@/constants/colors'

interface AskMessageBubbleProps {
	role: 'user' | 'assistant'
	children: React.ReactNode
	isStreaming?: boolean
}

export function AskMessageBubble({
	role,
	children,
	isStreaming = false,
}: AskMessageBubbleProps) {
	const isUser = role === 'user'

	return (
		<div
			style={{
				display: 'flex',
				justifyContent: isUser ? 'flex-end' : 'flex-start',
				marginBottom: 16,
			}}
		>
			<div
				style={{
					maxWidth: isUser ? '85%' : '100%',
					width: isUser ? 'auto' : '100%',
					background: isUser ? C.accentDim : C.card,
					border: `1px solid ${
						isUser ? `${C.accent}33` : isStreaming ? `${C.accent}33` : C.border
					}`,
					borderRadius: isUser ? '18px 18px 4px 18px' : 18,
					padding: isUser ? '12px 16px' : '16px',
				}}
			>
				{children}
			</div>
		</div>
	)
}

export function AskUserMessage({ question }: { question: string }) {
	return (
		<AskMessageBubble role="user">
			<div
				style={{
					fontSize: 15,
					fontWeight: 600,
					color: C.text,
					lineHeight: 1.45,
				}}
			>
				{question}
			</div>
		</AskMessageBubble>
	)
}
