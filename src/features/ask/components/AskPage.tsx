import { isAskAiProviderConfigured } from '@/config/ask-ai'
import { useAuth } from '@/features/auth'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { AskSearchBar } from '@/features/ask/components/AskSearchBar'
import { AiDebugPanel } from '@/features/ask/components/AiDebugPanel'
import { ConversationTurnView } from '@/features/ask/components/ConversationTurnView'
import { RecentQuestions } from '@/features/ask/components/RecentQuestions'
import { SuggestedQuestions } from '@/features/ask/components/SuggestedQuestions'
import { ASK_COPY } from '@/features/ask/constants/suggested-questions'
import { useAskChronicle } from '@/features/ask/hooks/useAskChronicle'
import { C, pagePadding } from '@/constants/colors'
import { Sparkles } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

export function AskPage() {
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const aiConfigured = isAskAiProviderConfigured()
	const uploadedQuery = useUploadedHealthReports(user?.id)
	const [query, setQuery] = useState('')
	const {
		ask,
		cancel,
		isLoading,
		streamingAnswer,
		currentTurn,
		recentQuestions,
	} = useAskChronicle(userId, uploadedQuery.data ?? [])

	const handleSubmit = useCallback(
		async (questionOverride?: string) => {
			const question = (questionOverride ?? query).trim()

			if (!question || isLoading) {
				return
			}

			setQuery('')
			await ask(question)
		},
		[ask, isLoading, query],
	)

	const displayRecents = useMemo(() => recentQuestions, [recentQuestions])
	const displayTurn =
		currentTurn && streamingAnswer != null && streamingAnswer.length > 0
			? { ...currentTurn, answer: streamingAnswer }
			: currentTurn

	return (
		<div style={{ padding: pagePadding.ask, color: C.text }}>
			<div
				style={{
					width: 52,
					height: 52,
					borderRadius: 16,
					background: C.accentDim,
					border: `1px solid rgba(108,111,255,0.25)`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					marginBottom: 18,
					boxShadow: `0 0 24px rgba(108,111,255,0.20)`,
				}}
			>
				<Sparkles size={26} color={C.accent} />
			</div>

			<div
				style={{
					fontSize: 34,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					lineHeight: 1.05,
					marginBottom: 8,
				}}
			>
				{ASK_COPY.title}
			</div>
			<div
				style={{
					fontSize: 15,
					color: C.textSec,
					marginBottom: aiConfigured ? 28 : 12,
					lineHeight: 1.5,
				}}
			>
				{ASK_COPY.subtitleBefore}
				<em style={{ fontStyle: 'italic', color: C.text }}>
					{ASK_COPY.subtitleEmphasis}
				</em>
				{ASK_COPY.subtitleAfter}
			</div>

			{!aiConfigured ? (
				<div
					style={{
						background: C.card2,
						border: `1px solid ${C.border}`,
						borderRadius: 12,
						padding: '10px 12px',
						fontSize: 12,
						color: C.textMuted,
						lineHeight: 1.5,
						marginBottom: 28,
					}}
				>
					<strong style={{ color: C.textSec }}>Grounded mode</strong> — answers
					use your imported health data only. Set{' '}
					<code>VITE_ASK_PROVIDER=openai</code> (and API key) for AI-enhanced
					responses.
				</div>
			) : null}

			<AskSearchBar
				value={query}
				onChange={setQuery}
				onSubmit={() => void handleSubmit()}
				onCancel={isLoading ? cancel : undefined}
				isLoading={isLoading}
			/>

			{displayTurn ? (
				<div
					style={{
						background: C.card,
						border: `1px solid rgba(108,111,255,0.22)`,
						borderRadius: 18,
						padding: '16px',
						marginBottom: 24,
					}}
				>
					<ConversationTurnView turn={displayTurn} />
				</div>
			) : null}

			<SuggestedQuestions
				userId={userId}
				onSelect={(prompt) => {
					setQuery(prompt)
					void handleSubmit(prompt)
				}}
				disabled={isLoading}
			/>

			<RecentQuestions
				items={displayRecents}
				onSelectQuestion={(question) => {
					setQuery(question)
					void handleSubmit(question)
				}}
				activeTurnId={currentTurn?.id ?? null}
			/>

			<AiDebugPanel />
		</div>
	)
}
