import { useCallback, useMemo, useRef, useState } from 'react'
import { ChevronRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/features/auth'
import { AskErrorBanner } from '@/features/ask/components/AskErrorBanner'
import { ConversationThread } from '@/features/ask/components/ConversationThread'
import { useAskChronicle } from '@/features/ask/hooks/useAskChronicle'
import { buildDynamicSuggestionChips } from '@/features/ask/services/dynamic-suggestions.service'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { usePersonalPreferences } from '@/features/personalization/hooks/usePersonalPreferences'
import { FigmaAskComposer, FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function FigmaAskScreen() {
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const { members, selectedMember, selectedMemberId } = useFamilyContext()
	const { preferences } = usePersonalPreferences()
	const uploadedQuery = useMemberHealthReports()
	const documentsQuery = useMemberDocuments()
	const driveConnector = useGoogleDriveConnector(userId)
	const [input, setInput] = useState('')
	const taRef = useRef<HTMLTextAreaElement>(null)

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
	} = useAskChronicle(
		userId,
		uploadedQuery.data ?? [],
		memberContext,
		driveConnector.registry ?? [],
		preferences,
		documentsQuery.data ?? [],
	)

	const chips = useMemo(
		() =>
			buildDynamicSuggestionChips({
				uploadedReports: uploadedQuery.data ?? [],
				documents: documentsQuery.data ?? [],
				memberName: selectedMember?.displayName ?? null,
			}).map((chip) => chip.label),
		[documentsQuery.data, selectedMember?.displayName, uploadedQuery.data],
	)

	const contextChips = useMemo(() => {
		const items: { label: string; color: string }[] = []
		const reportCount = uploadedQuery.data?.length ?? 0
		const documentCount = documentsQuery.data?.length ?? 0

		if (reportCount > 0) {
			items.push({
				label:
					reportCount === 1
						? 'Health records'
						: `${reportCount} health records`,
				color: FC.green,
			})
		} else {
			items.push({ label: 'Health records', color: FC.green })
		}

		if (documentCount > 0) {
			items.push({
				label:
					documentCount === 1 ? '1 document' : `${documentCount} documents`,
				color: FC.blue,
			})
		}

		if (members.length > 0) {
			items.push({
				label: `Family · ${members.length}`,
				color: FC.purple,
			})
		}

		return items
	}, [documentsQuery.data, members.length, uploadedQuery.data])

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
			void ask(question)
		},
		[ask, input, isLoading],
	)

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
			<div
				style={{
					padding: '0 20px 14px',
					flexShrink: 0,
					borderBottom: '1px solid rgba(255,255,255,0.05)',
				}}
			>
				<p style={{ color: FC.dim, fontSize: 12, marginBottom: 8 }}>
					Chronicle has context for
				</p>
				<div
					style={{
						display: 'flex',
						gap: 7,
						overflowX: 'auto',
						scrollbarWidth: 'none',
					}}
				>
					{contextChips.map((chip) => (
						<div
							key={chip.label}
							style={{
								flexShrink: 0,
								background: `${chip.color}12`,
								border: `1px solid ${chip.color}25`,
								borderRadius: 20,
								padding: '5px 12px',
							}}
						>
							<span
								style={{ color: chip.color, fontSize: 12, fontWeight: 500 }}
							>
								{chip.label}
							</span>
						</div>
					))}
				</div>
			</div>

			{error ? (
				<div style={{ padding: '10px 20px 0' }}>
					<AskErrorBanner
						kind={error.kind}
						message={error.message}
						onDismiss={dismissError}
					/>
				</div>
			) : null}

			<div
				style={{
					flex: 1,
					overflowY: 'auto',
					padding: '18px 20px 20px',
					scrollbarWidth: 'none',
				}}
			>
				{!hasConversation ? (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
						<div
							style={{
								background:
									'linear-gradient(160deg,rgba(99,102,241,0.14) 0%,rgba(59,130,246,0.08) 50%,rgba(139,92,246,0.1) 100%)',
								border: '1px solid rgba(99,102,241,0.22)',
								borderRadius: 26,
								padding: '24px 22px',
								boxShadow:
									'0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
								animation: 'figma-gradient-shift 6s ease infinite',
							}}
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 14,
									marginBottom: 14,
								}}
							>
								<div
									style={{
										width: 46,
										height: 46,
										borderRadius: 15,
										background: `linear-gradient(135deg,${FC.indigo},${FC.purple})`,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										flexShrink: 0,
									}}
								>
									<Sparkles size={22} color="#fff" />
								</div>
								<div>
									<h2
										style={{
											color: FC.fg,
											fontSize: 20,
											fontWeight: 700,
											letterSpacing: -0.7,
											lineHeight: 1.2,
											marginBottom: 4,
											marginTop: 0,
										}}
									>
										Ask anything about your family.
									</h2>
									<p
										style={{
											color: FC.mid,
											fontSize: 13,
											lineHeight: 1.5,
											margin: 0,
										}}
									>
										Health records · Documents · Context
									</p>
								</div>
							</div>
						</div>

						<FigmaAskComposer
							taRef={taRef}
							input={input}
							setInput={setInput}
							thinking={isLoading}
							resize={resize}
							send={send}
						/>

						{chips.length > 0 ? (
							<div>
								<p
									style={{
										color: 'rgba(255,255,255,0.22)',
										fontSize: 11,
										fontWeight: 600,
										letterSpacing: '0.07em',
										textTransform: 'uppercase',
										marginBottom: 10,
									}}
								>
									Try asking
								</p>
								<div
									style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
								>
									{chips.slice(0, 4).map((chip) => (
										<button
											key={chip}
											type="button"
											onClick={() => send(chip)}
											style={{
												...figmaCardStyle,
												borderRadius: 16,
												padding: '13px 16px',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'space-between',
												cursor: 'pointer',
												textAlign: 'left',
												fontFamily: 'inherit',
											}}
										>
											<span
												style={{
													color: 'rgba(255,255,255,0.72)',
													fontSize: 14,
												}}
											>
												{chip}
											</span>
											<ChevronRight size={14} color="rgba(255,255,255,0.2)" />
										</button>
									))}
								</div>
							</div>
						) : null}
					</div>
				) : (
					<div style={{ minHeight: '100%' }}>
						<ConversationThread
							turns={turns}
							streamingTurn={pendingTurn}
							isTyping={isLoading}
							onRegenerateTurn={regenerateTurn}
							onContinueTurn={continueTurn}
							regeneratingTurnId={regeneratingTurnId}
							onFollowUpSelect={(question) => void ask(question)}
						/>
						{!isLoading && chips.length > 0 ? (
							<div
								style={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: 8,
									paddingTop: 12,
								}}
							>
								{chips.slice(0, 2).map((chip) => (
									<button
										key={chip}
										type="button"
										onClick={() => send(chip)}
										style={{
											background: FC.surface,
											border: `1px solid ${FC.line}`,
											borderRadius: 20,
											padding: '7px 14px',
											cursor: 'pointer',
											fontFamily: 'inherit',
										}}
									>
										<span style={{ color: FC.mid, fontSize: 12.5 }}>
											{chip}
										</span>
									</button>
								))}
							</div>
						) : null}
					</div>
				)}
			</div>

			{hasConversation ? (
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
					<p
						style={{
							color: 'rgba(255,255,255,0.15)',
							fontSize: 11,
							textAlign: 'center',
							marginTop: 8,
							marginBottom: 0,
						}}
					>
						Chronicle can make mistakes. Verify important information.
					</p>
				</div>
			) : null}
		</div>
	)
}
