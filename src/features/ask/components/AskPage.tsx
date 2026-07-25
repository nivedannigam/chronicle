import { isAskAiProviderConfigured } from '@/config/ask-ai'
import { useAuth } from '@/features/auth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { FamilyMemberSwitcher } from '@/features/family/components/FamilyMemberSwitcher'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { usePersonalPreferences } from '@/features/personalization/hooks/usePersonalPreferences'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { AskSearchBar } from '@/features/ask/components/AskSearchBar'
import { AiDebugPanel } from '@/features/ask/components/AiDebugPanel'
import { AskEmptyState } from '@/features/ask/components/AskEmptyState'
import { AskErrorBanner } from '@/features/ask/components/AskErrorBanner'
import { ConversationHistoryDrawer } from '@/features/ask/components/ConversationHistoryDrawer'
import { ConversationThread } from '@/features/ask/components/ConversationThread'
import { ASK_COPY } from '@/constants/product-copy'
import { useAskChronicle } from '@/features/ask/hooks/useAskChronicle'
import { C } from '@/constants/colors'
import { History, Sparkles } from 'lucide-react'
import { useCallback, useState } from 'react'

export function AskPage() {
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const { members, selectedMember, selectedMemberId } = useFamilyContext()
	const { preferences } = usePersonalPreferences()
	const aiConfigured = isAskAiProviderConfigured()
	const uploadedQuery = useMemberHealthReports()
	const documentsQuery = useMemberDocuments()
	const driveConnector = useGoogleDriveConnector(userId)
	const [query, setQuery] = useState('')
	const [historyOpen, setHistoryOpen] = useState(false)
	const memberContext = {
		selectedMemberId,
		selectedMemberName: selectedMember?.displayName ?? null,
		members,
	}
	const {
		ask,
		cancel,
		clearConversation,
		loadConversation,
		regenerateTurn,
		continueTurn,
		dismissError,
		isLoading,
		turns,
		pendingTurn,
		error,
		activeSessionId,
		regeneratingTurnId,
	} = useAskChronicle(
		userId,
		uploadedQuery.data ?? [],
		memberContext,
		driveConnector.registry ?? [],
		preferences,
		documentsQuery.data ?? [],
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

	const hasConversation = turns.length > 0 || Boolean(pendingTurn)
	const capabilityNotice = aiConfigured
		? ASK_COPY.capabilityNoticeEnhanced
		: ASK_COPY.capabilityNotice

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: 'calc(100dvh - 64px)',
				maxHeight: 'calc(100dvh - 64px)',
				color: C.text,
				overflow: 'hidden',
			}}
		>
			<header
				style={{
					flexShrink: 0,
					padding: '16px 18px 12px',
					paddingTop: 'max(16px, env(safe-area-inset-top))',
					borderBottom: `1px solid ${C.border}`,
					background: C.bg,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'flex-start',
						justifyContent: 'space-between',
						gap: 12,
						marginBottom: 12,
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
						<div
							style={{
								width: 40,
								height: 40,
								borderRadius: 12,
								background: C.accentDim,
								border: `1px solid rgba(108,111,255,0.25)`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								boxShadow: `0 0 20px rgba(108,111,255,0.16)`,
							}}
						>
							<Sparkles size={20} color={C.accent} />
						</div>
						<div>
							<div
								style={{
									fontSize: 20,
									fontWeight: 800,
									letterSpacing: '-0.03em',
									lineHeight: 1.1,
								}}
							>
								{ASK_COPY.title}
							</div>
							<div
								style={{
									fontSize: 12,
									color: C.textMuted,
									marginTop: 2,
								}}
							>
								{capabilityNotice}
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={() => setHistoryOpen(true)}
						aria-label="Open conversation history"
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 5,
							fontSize: 12,
							fontWeight: 600,
							color: C.textSec,
							background: C.card2,
							border: `1px solid ${C.border}`,
							borderRadius: 100,
							padding: '7px 12px',
							cursor: 'pointer',
							fontFamily: 'inherit',
							flexShrink: 0,
						}}
					>
						<History size={14} />
						History
					</button>
				</div>

				<FamilyMemberSwitcher />
			</header>

			<main
				style={{
					flex: 1,
					overflowY: 'auto',
					overflowX: 'hidden',
					padding: '16px 18px',
					WebkitOverflowScrolling: 'touch',
				}}
			>
				{error ? (
					<AskErrorBanner
						kind={error.kind}
						message={error.message}
						onRetry={() => {
							dismissError()
						}}
						onDismiss={dismissError}
					/>
				) : null}

				{!hasConversation ? (
					<AskEmptyState
						uploadedReports={uploadedQuery.data ?? []}
						documents={documentsQuery.data ?? []}
						memberName={selectedMember?.displayName ?? null}
						onSelect={(prompt) => void handleSubmit(prompt)}
						disabled={isLoading}
					/>
				) : (
					<ConversationThread
						turns={turns}
						streamingTurn={pendingTurn}
						isTyping={isLoading}
						onFollowUpSelect={(question) => void handleSubmit(question)}
						onRegenerateTurn={(turnId) => void regenerateTurn(turnId)}
						onContinueTurn={(turnId) => void continueTurn(turnId)}
						regeneratingTurnId={regeneratingTurnId}
					/>
				)}
			</main>

			<footer
				style={{
					flexShrink: 0,
					padding: '12px 18px 16px',
					paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
					borderTop: `1px solid ${C.border}`,
					background: C.bg,
				}}
			>
				<AskSearchBar
					value={query}
					onChange={setQuery}
					onSubmit={() => void handleSubmit()}
					onCancel={isLoading ? cancel : undefined}
					isLoading={isLoading}
					pinned
				/>
			</footer>

			<ConversationHistoryDrawer
				userId={userId}
				open={historyOpen}
				activeSessionId={activeSessionId}
				onClose={() => setHistoryOpen(false)}
				onSelectSession={loadConversation}
				onNewConversation={clearConversation}
			/>

			<AiDebugPanel />
		</div>
	)
}
