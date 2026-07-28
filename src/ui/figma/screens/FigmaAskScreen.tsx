import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Square } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { AskErrorBanner } from '@/features/ask/components/AskErrorBanner'
import { ConversationHistoryDrawer } from '@/features/ask/components/ConversationHistoryDrawer'
import { ConversationThread } from '@/features/ask/components/ConversationThread'
import { useAskChronicle } from '@/features/ask/hooks/useAskChronicle'
import { buildAskHomeView } from '@/features/ask/services/ask-home.service'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { usePersonalPreferences } from '@/features/personalization/hooks/usePersonalPreferences'
import {
	AskGreetingCard,
	AskHistoryButton,
	AskInsightRow,
	AskQuickActionCard,
	AskRecentSessionRow,
	AskSectionLabel,
	AskSuggestedQuestionRow,
} from '@/ui/figma/ask/ask-ui'
import { FigmaAskComposer, FC } from '@/ui/figma/v2/atoms'
import {
	FigmaHeaderSearchButton,
	FigmaScreenHeader,
} from '@/ui/figma/shell/FigmaScreenHeader'

export function FigmaAskScreen() {
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const userName =
		(typeof user?.user_metadata?.full_name === 'string'
			? user.user_metadata.full_name
			: null) ??
		(typeof user?.user_metadata?.name === 'string'
			? user.user_metadata.name
			: null)

	const { members, selectedMember, selectedMemberId } = useFamilyContext()
	const { preferences } = usePersonalPreferences()
	const uploadedQuery = useMemberHealthReports()
	const documentsQuery = useMemberDocuments()
	const driveConnector = useGoogleDriveConnector(userId)
	const [input, setInput] = useState('')
	const [historyOpen, setHistoryOpen] = useState(false)
	const taRef = useRef<HTMLTextAreaElement>(null)
	const initialQueryHandled = useRef(false)
	const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(
		null,
	)

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
		regenerateTurn,
		continueTurn,
		clearConversation,
		loadConversation,
		dismissError,
		isLoading,
		turns,
		pendingTurn,
		error,
		regeneratingTurnId,
		activeSessionId,
	} = useAskChronicle(
		userId,
		uploadedQuery.data ?? [],
		memberContext,
		driveConnector.registry ?? [],
		preferences,
		documentsQuery.data ?? [],
	)

	const home = useMemo(
		() =>
			buildAskHomeView({
				userId,
				userName,
				selectedMember: selectedMember ?? null,
				members,
				uploadedReports: uploadedQuery.data ?? [],
				documents: documentsQuery.data ?? [],
			}),
		[
			documentsQuery.data,
			members,
			selectedMember,
			uploadedQuery.data,
			userId,
			userName,
		],
	)

	const resize = useCallback(() => {
		const element = taRef.current
		if (!element) return
		element.style.height = 'auto'
		element.style.height = `${Math.min(element.scrollHeight, 140)}px`
	}, [])

	const send = useCallback(
		(text = input) => {
			const question = text.trim()
			if (!question || isLoading) return
			setInput('')
			if (taRef.current) {
				taRef.current.style.height = 'auto'
			}
			setLastFailedQuestion(question)
			void ask(question)
		},
		[ask, input, isLoading],
	)

	const handleDismissError = useCallback(() => {
		setLastFailedQuestion(null)
		dismissError()
	}, [dismissError])

	useEffect(() => {
		const initialQuery = searchParams.get('q')?.trim()

		if (!initialQuery || initialQueryHandled.current || isLoading) {
			return
		}

		initialQueryHandled.current = true
		setSearchParams({}, { replace: true })
		void ask(initialQuery)
	}, [ask, isLoading, searchParams, setSearchParams])

	const hasConversation = turns.length > 0 || Boolean(pendingTurn)

	return (
		<div
			style={{
				flex: 1,
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
				minHeight: 0,
			}}
		>
			<FigmaScreenHeader
				title="Ask Chronicle"
				subtitle="Your personal intelligence assistant"
				actions={
					<div style={{ display: 'flex', gap: 8 }}>
						<AskHistoryButton onClick={() => setHistoryOpen(true)} />
						<FigmaHeaderSearchButton onClick={() => navigate(ROUTES.search)} />
					</div>
				}
				paddingBottom={12}
			/>

			{error ? (
				<div style={{ padding: '0 22px 10px' }}>
					<AskErrorBanner
						kind={error.kind}
						message={error.message}
						onDismiss={handleDismissError}
						onRetry={
							lastFailedQuestion
								? () => void ask(lastFailedQuestion)
								: undefined
						}
					/>
				</div>
			) : null}

			<div
				style={{
					flex: 1,
					overflowY: 'auto',
					padding: '0 22px 20px',
					scrollbarWidth: 'none',
				}}
			>
				{!hasConversation ? (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
						<AskGreetingCard
							greeting={home.greeting}
							subGreeting={home.subGreeting}
						/>

						{home.recentInsights.length > 0 ? (
							<div>
								<div style={{ marginBottom: 10 }}>
									<AskSectionLabel>Recent insights</AskSectionLabel>
								</div>
								<div
									style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
								>
									{home.recentInsights.map((insight) => (
										<AskInsightRow key={insight.id} insight={insight} />
									))}
								</div>
							</div>
						) : null}

						<div style={{ display: 'flex', gap: 10 }}>
							{home.quickActions.map((action) => (
								<AskQuickActionCard
									key={action.id}
									action={action}
									onSelect={(route) => navigate(route)}
								/>
							))}
						</div>

						{home.suggestedQuestions.length > 0 ? (
							<div>
								<div style={{ marginBottom: 10 }}>
									<AskSectionLabel>Suggested questions</AskSectionLabel>
								</div>
								<div
									style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
								>
									{home.suggestedQuestions.slice(0, 6).map((chip) => (
										<AskSuggestedQuestionRow
											key={chip.id}
											chip={chip}
											onSelect={send}
										/>
									))}
								</div>
							</div>
						) : null}

						{home.recentSessions.length > 0 ? (
							<div>
								<div style={{ marginBottom: 10 }}>
									<AskSectionLabel>Recent conversations</AskSectionLabel>
								</div>
								<div
									style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
								>
									{home.recentSessions.map((session) => (
										<AskRecentSessionRow
											key={session.id}
											session={session}
											onSelect={(sessionId) => {
												loadConversation(sessionId)
												setHistoryOpen(false)
											}}
										/>
									))}
								</div>
							</div>
						) : null}
					</div>
				) : (
					<ConversationThread
						turns={turns}
						streamingTurn={pendingTurn}
						isTyping={isLoading}
						onRegenerateTurn={regenerateTurn}
						onContinueTurn={continueTurn}
						regeneratingTurnId={regeneratingTurnId}
						onFollowUpSelect={(question) => void ask(question)}
					/>
				)}
			</div>

			<div
				style={{
					padding: '10px 18px 14px',
					borderTop: '1px solid rgba(255,255,255,0.05)',
					flexShrink: 0,
				}}
			>
				<FigmaAskComposer
					taRef={taRef}
					input={input}
					setInput={setInput}
					thinking={isLoading}
					resize={resize}
					send={send}
				/>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginTop: 8,
					}}
				>
					<p
						style={{
							color: 'rgba(255,255,255,0.15)',
							fontSize: 11,
							margin: 0,
						}}
					>
						Chronicle can make mistakes. Verify important information.
					</p>
					{isLoading ? (
						<button
							type="button"
							onClick={cancel}
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 6,
								background: `${FC.orange}14`,
								border: `1px solid ${FC.orange}33`,
								borderRadius: 100,
								padding: '5px 10px',
								cursor: 'pointer',
								fontFamily: 'inherit',
								color: FC.orange,
								fontSize: 11,
								fontWeight: 600,
							}}
						>
							<Square size={10} fill={FC.orange} />
							Stop
						</button>
					) : null}
				</div>
			</div>

			<ConversationHistoryDrawer
				userId={userId}
				open={historyOpen}
				activeSessionId={activeSessionId}
				onClose={() => setHistoryOpen(false)}
				onSelectSession={(sessionId) => {
					loadConversation(sessionId)
					setHistoryOpen(false)
				}}
				onNewConversation={() => {
					clearConversation()
					setHistoryOpen(false)
				}}
			/>
		</div>
	)
}
