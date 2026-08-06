import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Menu, Square } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { AskConversationMenu } from '@/features/ask/components/AskConversationMenu'
import { AskErrorBanner } from '@/features/ask/components/AskErrorBanner'
import { ConversationThread } from '@/features/ask/components/ConversationThread'
import { InsuranceConversationHistoryDrawer } from '@/features/insurance/components/InsuranceConversationHistoryDrawer'
import { useInsuranceContext } from '@/features/insurance/context/InsuranceContext'
import { useInsuranceAsk } from '@/features/insurance/hooks/useInsuranceAsk'
import type { InsuranceAskScope } from '@/features/insurance/types/insurance-ask.types'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { resolveMemberDisplayName } from '@/features/family/utils/member-display'
import { InsuranceAskEmptyState } from '@/ui/figma/insurance/InsuranceAskEmptyState'
import { FigmaAskComposer, FC } from '@/ui/figma/v2/atoms'
import {
	FigmaHeaderIconButton,
	FigmaScreenHeader,
} from '@/ui/figma/shell/FigmaScreenHeader'

export function FigmaInsuranceAskScreen() {
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
	const {
		knowledge,
		home,
		hasPolicies,
		isLoading: contextLoading,
	} = useInsuranceContext()
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
			selectedMemberName: resolveMemberDisplayName({
				profileName: userName,
				memberDisplayName: selectedMember?.displayName,
				isAccountOwner: selectedMember?.isAccountOwner,
			}),
		}),
		[members, selectedMember, selectedMemberId, userName],
	)

	const askScope = useMemo((): InsuranceAskScope | undefined => {
		const policyId = searchParams.get('policyId')?.trim()
		const claimId = searchParams.get('claimId')?.trim()
		const categoryId = searchParams.get('categoryId')?.trim()

		if (!policyId && !claimId && !categoryId) {
			return undefined
		}

		return {
			policyId: policyId || undefined,
			claimId: claimId || undefined,
			categoryId: categoryId || undefined,
		}
	}, [searchParams])

	const {
		ask,
		cancel,
		clearConversation,
		loadConversation,
		dismissError,
		isLoading,
		turns,
		pendingTurn,
		error,
		activeSessionId,
	} = useInsuranceAsk(userId, knowledge, memberContext, askScope)

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

		if (
			!initialQuery ||
			initialQueryHandled.current ||
			isLoading ||
			contextLoading
		) {
			return
		}

		initialQueryHandled.current = true

		const nextParams = new URLSearchParams(searchParams)
		nextParams.delete('q')
		setSearchParams(nextParams, { replace: true })
		void ask(initialQuery)
	}, [ask, contextLoading, isLoading, searchParams, setSearchParams])

	const hasConversation = turns.length > 0 || Boolean(pendingTurn)
	const policyCount = knowledge.policies.length

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
				title="Insurance Ask"
				subtitle={hasConversation ? undefined : 'Your insurance advisor'}
				leading={
					<FigmaHeaderIconButton
						onClick={() => setHistoryOpen(true)}
						ariaLabel="Open conversation history"
					>
						<Menu size={20} color={FC.dim} strokeWidth={1.8} />
					</FigmaHeaderIconButton>
				}
				actions={
					<AskConversationMenu
						hasConversation={hasConversation}
						onNewConversation={() => clearConversation()}
						onClearConversation={() => clearConversation()}
					/>
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
					minHeight: 0,
					overflowY: 'auto',
					padding: hasConversation ? '8px 22px 24px' : '0 22px 20px',
					scrollbarWidth: 'none',
					WebkitOverflowScrolling: 'touch',
				}}
			>
				{!hasConversation ? (
					<InsuranceAskEmptyState
						onSelectQuestion={send}
						homeSummary={hasPolicies ? home.protection : undefined}
						policyCount={policyCount}
					/>
				) : (
					<ConversationThread
						turns={turns}
						streamingTurn={pendingTurn}
						isTyping={isLoading}
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

			<InsuranceConversationHistoryDrawer
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
				onClearAll={() => {
					clearConversation()
				}}
			/>
		</div>
	)
}
