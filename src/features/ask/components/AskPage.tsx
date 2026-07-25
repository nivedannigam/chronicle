import { isAskAiProviderConfigured } from '@/config/ask-ai'
import { useAuth } from '@/features/auth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { FamilyMemberSwitcher } from '@/features/family/components/FamilyMemberSwitcher'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { usePersonalPreferences } from '@/features/personalization/hooks/usePersonalPreferences'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { AskSearchBar } from '@/features/ask/components/AskSearchBar'
import { AiDebugPanel } from '@/features/ask/components/AiDebugPanel'
import { ConversationThread } from '@/features/ask/components/ConversationThread'
import { RecentQuestions } from '@/features/ask/components/RecentQuestions'
import { SuggestedQuestions } from '@/features/ask/components/SuggestedQuestions'
import { ASK_COPY } from '@/constants/product-copy'
import { useAskChronicle } from '@/features/ask/hooks/useAskChronicle'
import { C, pagePadding } from '@/constants/colors'
import { Sparkles } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

export function AskPage() {
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const { members, selectedMember, selectedMemberId } = useFamilyContext()
	const { preferences } = usePersonalPreferences()
	const aiConfigured = isAskAiProviderConfigured()
	const uploadedQuery = useMemberHealthReports()
	const driveConnector = useGoogleDriveConnector(userId)
	const [query, setQuery] = useState('')
	const memberContext = useMemo(
		() => ({
			selectedMemberId,
			selectedMemberName: selectedMember?.displayName ?? null,
			members,
		}),
		[members, selectedMember?.displayName, selectedMemberId],
	)
	const {
		ask,
		cancel,
		clearConversation,
		isLoading,
		turns,
		currentTurn,
		pendingTurn,
		recentQuestions,
	} = useAskChronicle(
		userId,
		uploadedQuery.data ?? [],
		memberContext,
		driveConnector.registry ?? [],
		preferences,
	)

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

	const streamingTurn = pendingTurn

	const capabilityNotice = aiConfigured
		? ASK_COPY.capabilityNoticeEnhanced
		: ASK_COPY.capabilityNotice

	return (
		<div
			style={{
				padding: pagePadding.ask,
				paddingBottom: 32,
				color: C.text,
			}}
		>
			<div
				style={{
					width: 48,
					height: 48,
					borderRadius: 14,
					background: C.accentDim,
					border: `1px solid rgba(108,111,255,0.25)`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					marginBottom: 14,
					boxShadow: `0 0 24px rgba(108,111,255,0.20)`,
				}}
			>
				<Sparkles size={24} color={C.accent} />
			</div>

			<div
				style={{
					fontSize: 32,
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
					marginBottom: 12,
					lineHeight: 1.55,
				}}
			>
				{ASK_COPY.subtitle}
			</div>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 12,
					marginBottom: 16,
					flexWrap: 'wrap',
				}}
			>
				<FamilyMemberSwitcher />
				{turns.length > 0 ? (
					<button
						type="button"
						onClick={clearConversation}
						style={{
							fontSize: 12,
							fontWeight: 600,
							color: C.textMuted,
							background: 'transparent',
							border: `1px solid ${C.border}`,
							borderRadius: 100,
							padding: '6px 12px',
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Clear conversation
					</button>
				) : null}
			</div>

			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 14,
					padding: '12px 14px',
					fontSize: 13,
					color: C.textSec,
					lineHeight: 1.55,
					marginBottom: 18,
				}}
			>
				{capabilityNotice}
			</div>

			<AskSearchBar
				value={query}
				onChange={setQuery}
				onSubmit={() => void handleSubmit()}
				onCancel={isLoading ? cancel : undefined}
				isLoading={isLoading}
			/>

			{turns.length > 0 || streamingTurn ? (
				<div style={{ marginBottom: 24 }}>
					<ConversationThread
						turns={turns}
						streamingTurn={streamingTurn}
						isTyping={isLoading}
						onFollowUpSelect={(question) => {
							setQuery(question)
							void handleSubmit(question)
						}}
					/>
				</div>
			) : null}

			{turns.length === 0 ? (
				<>
					<SuggestedQuestions
						userId={userId}
						memberId={selectedMemberId}
						memberName={selectedMember?.displayName ?? null}
						uploadedReports={uploadedQuery.data ?? []}
						preferences={preferences}
						recentQuestions={recentQuestions.map((item) => item.question)}
						onSelect={(prompt) => {
							setQuery(prompt)
							void handleSubmit(prompt)
						}}
						disabled={isLoading}
					/>

					<RecentQuestions
						items={recentQuestions}
						onSelectQuestion={(question) => {
							setQuery(question)
							void handleSubmit(question)
						}}
						activeTurnId={currentTurn?.id ?? null}
					/>
				</>
			) : null}

			<AiDebugPanel />
		</div>
	)
}
