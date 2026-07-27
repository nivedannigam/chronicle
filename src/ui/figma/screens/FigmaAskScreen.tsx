import { useCallback, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, FileText, Send, Sparkles } from 'lucide-react'
import { isAskAiProviderConfigured } from '@/config/ask-ai'
import { C } from '@/constants/colors'
import { ASK_COPY } from '@/constants/product-copy'
import { useAuth } from '@/features/auth'
import { AskErrorBanner } from '@/features/ask/components/AskErrorBanner'
import { ConversationThread } from '@/features/ask/components/ConversationThread'
import { buildDynamicSuggestionChips } from '@/features/ask/services/dynamic-suggestions.service'
import { useAskChronicle } from '@/features/ask/hooks/useAskChronicle'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { usePersonalPreferences } from '@/features/personalization/hooks/usePersonalPreferences'
import { FigmaCard, FigmaSectionLabel } from '@/ui/figma/components/primitives'

export function FigmaAskScreen() {
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const { members, selectedMember, selectedMemberId } = useFamilyContext()
	const { preferences } = usePersonalPreferences()
	const uploadedQuery = useMemberHealthReports()
	const documentsQuery = useMemberDocuments()
	const driveConnector = useGoogleDriveConnector(userId)
	const [query, setQuery] = useState('')
	const [expandedRecent, setExpandedRecent] = useState<number | null>(0)

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
		regenerateTurn,
		continueTurn,
		dismissError,
		isLoading,
		turns,
		pendingTurn,
		error,
		regeneratingTurnId,
		recentQuestions,
	} = useAskChronicle(
		userId,
		uploadedQuery.data ?? [],
		memberContext,
		driveConnector.registry ?? [],
		preferences,
		documentsQuery.data ?? [],
	)

	const prompts = useMemo(
		() =>
			buildDynamicSuggestionChips({
				uploadedReports: uploadedQuery.data ?? [],
				documents: documentsQuery.data ?? [],
				memberName: selectedMember?.displayName ?? null,
			}).slice(0, 5),
		[documentsQuery.data, selectedMember?.displayName, uploadedQuery.data],
	)

	const handleSubmit = useCallback(async () => {
		const question = query.trim()
		if (!question || isLoading) return
		setQuery('')
		await ask(question)
	}, [ask, isLoading, query])

	const hasConversation = turns.length > 0 || Boolean(pendingTurn)
	const recents = recentQuestions.slice(0, 3).map((entry, index) => ({
		q: entry.question,
		when: index === 0 ? 'Recent' : '',
		answer:
			entry.turn?.answer ??
			turns.find((turn) => turn.question === entry.question)?.answer ??
			'',
	}))

	if (hasConversation) {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					height: '100%',
					minHeight: 0,
					color: C.text,
				}}
			>
				<div style={{ padding: '18px 18px 12px', flexShrink: 0 }}>
					<div
						style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}
					>
						Ask Chronicle
					</div>
				</div>
				{error ? (
					<div style={{ padding: '0 18px 8px' }}>
						<AskErrorBanner
							kind={error.kind}
							message={error.message}
							onDismiss={dismissError}
						/>
					</div>
				) : null}
				<div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
					<ConversationThread
						turns={turns}
						streamingTurn={pendingTurn}
						isTyping={isLoading}
						onRegenerateTurn={regenerateTurn}
						onContinueTurn={continueTurn}
						regeneratingTurnId={regeneratingTurnId}
						onFollowUpSelect={(question) => void ask(question)}
					/>
				</div>
				<div
					style={{
						padding: '12px 18px calc(12px + env(safe-area-inset-bottom))',
						flexShrink: 0,
					}}
				>
					<div
						style={{
							background: C.card,
							border: `1px solid ${C.border}`,
							borderRadius: 18,
							padding: '12px 52px 12px 14px',
							position: 'relative',
						}}
					>
						<input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') void handleSubmit()
							}}
							placeholder={ASK_COPY.placeholder}
							style={{
								width: '100%',
								background: 'none',
								border: 'none',
								outline: 'none',
								fontSize: 15,
								color: C.text,
								fontFamily: 'inherit',
							}}
						/>
						<button
							type="button"
							onClick={() => void handleSubmit()}
							disabled={isLoading || !query.trim()}
							style={{
								position: 'absolute',
								bottom: 10,
								right: 10,
								width: 36,
								height: 36,
								borderRadius: '50%',
								background: C.accent,
								border: 'none',
								cursor: isLoading ? 'not-allowed' : 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								opacity: isLoading || !query.trim() ? 0.5 : 1,
							}}
						>
							<Send size={16} color="white" strokeWidth={2} />
						</button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div style={{ padding: '22px 18px 20px', color: C.text }}>
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
				Ask Chronicle
			</div>
			<div
				style={{
					fontSize: 15,
					color: C.textSec,
					marginBottom: 28,
					lineHeight: 1.5,
				}}
			>
				Your <em style={{ fontStyle: 'italic', color: C.text }}>life</em>, one
				question away.
				{isAskAiProviderConfigured()
					? ` ${ASK_COPY.capabilityNoticeEnhanced}`
					: ` ${ASK_COPY.capabilityNotice}`}
			</div>

			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					padding: '14px 14px 12px',
					marginBottom: 20,
					position: 'relative',
					minHeight: 100,
				}}
			>
				<textarea
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault()
							void handleSubmit()
						}
					}}
					placeholder="Ask about your health records, documents, and family..."
					style={{
						width: '100%',
						background: 'none',
						border: 'none',
						outline: 'none',
						fontSize: 15,
						color: C.text,
						fontFamily: 'inherit',
						resize: 'none',
						minHeight: 72,
						lineHeight: 1.55,
					}}
				/>
				<button
					type="button"
					onClick={() => void handleSubmit()}
					disabled={isLoading || !query.trim()}
					style={{
						position: 'absolute',
						bottom: 12,
						right: 12,
						width: 36,
						height: 36,
						borderRadius: '50%',
						background: C.accent,
						border: 'none',
						cursor: isLoading ? 'not-allowed' : 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						boxShadow: `0 4px 16px rgba(108,111,255,0.35)`,
						opacity: isLoading || !query.trim() ? 0.5 : 1,
					}}
				>
					<Send size={16} color="white" strokeWidth={2} />
				</button>
			</div>

			<div
				style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 30 }}
			>
				{prompts.map((chip) => (
					<button
						key={chip.id}
						type="button"
						onClick={() => {
							setQuery(chip.label)
							void ask(chip.label)
						}}
						style={{
							background: 'none',
							border: `1px solid ${C.border}`,
							borderRadius: 100,
							padding: '8px 15px',
							fontSize: 13,
							color: C.textSec,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						{chip.label}
					</button>
				))}
			</div>

			{recents.length > 0 ? (
				<>
					<FigmaSectionLabel>Recent</FigmaSectionLabel>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{recents.map((recent, index) => (
							<FigmaCard key={recent.q}>
								<div
									role="button"
									tabIndex={0}
									onClick={() =>
										setExpandedRecent(expandedRecent === index ? null : index)
									}
									onKeyDown={() => {}}
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
										{recent.q}
									</span>
									{recent.when ? (
										<span
											style={{
												fontSize: 12,
												color: C.textMuted,
												flexShrink: 0,
											}}
										>
											{recent.when}
										</span>
									) : null}
									{expandedRecent === index ? (
										<ChevronUp size={16} color={C.textMuted} />
									) : (
										<ChevronDown size={16} color={C.textMuted} />
									)}
								</div>
								{expandedRecent === index && recent.answer ? (
									<div
										style={{
											padding: '0 16px 14px',
											borderTop: `1px solid ${C.border}`,
											paddingTop: 12,
										}}
									>
										<div
											style={{
												display: 'flex',
												alignItems: 'flex-start',
												gap: 8,
											}}
										>
											<FileText
												size={14}
												color={C.accentBlue}
												style={{ flexShrink: 0, marginTop: 2 }}
											/>
											<span
												style={{
													fontSize: 13,
													color: C.textSec,
													lineHeight: 1.6,
												}}
											>
												{recent.answer}
											</span>
										</div>
									</div>
								) : null}
							</FigmaCard>
						))}
					</div>
				</>
			) : null}
		</div>
	)
}
