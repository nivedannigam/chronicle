import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Menu, Square } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { AskConversationMenu } from '@/features/ask/components/AskConversationMenu'
import { AskErrorBanner } from '@/features/ask/components/AskErrorBanner'
import { ConversationHistoryDrawer } from '@/features/ask/components/ConversationHistoryDrawer'
import { ConversationThread } from '@/features/ask/components/ConversationThread'
import { useAskChronicle } from '@/features/ask/hooks/useAskChronicle'
import type { AskScopeContext } from '@/features/ask/services/knowledge-query.interface'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { resolveMemberDisplayName } from '@/features/family/utils/member-display'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { useHealthMetrics } from '@/features/health/hooks/useHealthMetrics'
import { useHealthContextOptional } from '@/features/health/context/HealthContext'
import { buildHealthVisits } from '@/features/health/services/health-visit.mapper'
import { useFinanceSources } from '@/features/finance/hooks/useFinanceSources'
import { usePersonalPreferences } from '@/features/personalization/hooks/usePersonalPreferences'
import { resolveAskContextCopy } from '@/features/ask/constants/ask-context-copy'
import { AskPremiumEmptyState } from '@/ui/figma/ask/AskPremiumEmptyState'
import { resolveAskEmptyReportCount } from '@/ui/figma/ask/resolve-ask-empty-report-count'
import { FigmaAskComposer, FC } from '@/ui/figma/v2/atoms'
import {
	FigmaHeaderIconButton,
	FigmaHeaderSearchButton,
	FigmaScreenHeader,
} from '@/ui/figma/shell/FigmaScreenHeader'

export function FigmaAskScreen({
	consumerMode = false,
}: {
	consumerMode?: boolean
}) {
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
	const healthContext = useHealthContextOptional()
	const uploadedQuery = useMemberHealthReports()
	const metricsQuery = useHealthMetrics()
	const documentsQuery = useMemberDocuments()
	const driveConnector = useGoogleDriveConnector(userId)
	const financeSources = useFinanceSources(userId)
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
			members,
		}),
		[members, selectedMember, selectedMemberId, userName],
	)

	const reports =
		consumerMode && healthContext
			? healthContext.reports
			: (uploadedQuery.data ?? [])
	const storedMetrics =
		consumerMode && healthContext
			? healthContext.storedMetrics
			: (metricsQuery.data ?? [])
	const visits =
		consumerMode && healthContext
			? healthContext.visits
			: buildHealthVisits(reports)

	const askScope = useMemo((): AskScopeContext | undefined => {
		const reportId = searchParams.get('reportId')?.trim()
		const visitId = searchParams.get('visitId')?.trim()
		const categoryId = searchParams.get('categoryId')?.trim()
		const contextModule = searchParams.get('context')?.trim() as
			AskScopeContext['contextModule'] | undefined
		const documentId = searchParams.get('documentId')?.trim()
		const policyId = searchParams.get('policyId')?.trim()
		const claimId = searchParams.get('claimId')?.trim()
		const vehicleSlug = searchParams.get('vehicleSlug')?.trim()

		if (contextModule === 'identity') {
			return {
				contextModule: 'identity',
				categoryId: 'identity',
				documentId: documentId || undefined,
			}
		}

		if (contextModule === 'insurance') {
			return {
				contextModule: 'insurance',
				categoryId: categoryId || 'insurance',
				policyId: policyId || undefined,
				claimId: claimId || undefined,
			}
		}

		if (contextModule === 'vehicles') {
			return {
				contextModule: 'vehicles',
				categoryId: categoryId || 'vehicles',
				vehicleSlug: vehicleSlug || undefined,
			}
		}

		if (contextModule === 'finance') {
			return {
				contextModule: 'finance',
				categoryId: categoryId || 'financial',
				documentId: documentId || undefined,
				entityId: searchParams.get('entity')?.trim() || undefined,
				hasFinanceFolderAssigned: financeSources.assignments.length > 0,
			}
		}

		if (contextModule === 'property') {
			const propertyDocuments = (documentsQuery.data ?? []).filter(
				(document) => document.category_id === 'property',
			)
			return {
				contextModule: 'property',
				categoryId: categoryId || 'property',
				documentId: documentId || undefined,
				entityId: searchParams.get('entity')?.trim() || undefined,
				hasPropertyFolderAssigned: propertyDocuments.length > 0,
			}
		}

		if (contextModule === 'health') {
			if (visitId) {
				const visit = visits.find((entry) => entry.id === visitId)

				if (visit?.reportIds.length) {
					return {
						contextModule: 'health',
						reportIds: visit.reportIds,
						categoryId: categoryId || undefined,
					}
				}
			}

			return {
				contextModule: 'health',
				reportId: reportId || undefined,
				categoryId: categoryId || undefined,
			}
		}

		if (visitId) {
			const visit = visits.find((entry) => entry.id === visitId)

			if (visit?.reportIds.length) {
				return {
					reportIds: visit.reportIds,
					categoryId: categoryId || undefined,
				}
			}
		}

		if (reportId || categoryId) {
			return {
				reportId: reportId || undefined,
				categoryId: categoryId || undefined,
			}
		}

		return undefined
	}, [
		visits,
		searchParams,
		financeSources.assignments.length,
		documentsQuery.data,
	])

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
	} = useAskChronicle(
		userId,
		reports,
		memberContext,
		driveConnector.registry ?? [],
		preferences,
		documentsQuery.data ?? [],
		storedMetrics,
		askScope,
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

		const nextParams = new URLSearchParams(searchParams)
		nextParams.delete('q')
		setSearchParams(nextParams, { replace: true })
		void ask(initialQuery)
	}, [ask, isLoading, searchParams, setSearchParams])

	const askContextCopy = useMemo(
		() => resolveAskContextCopy(askScope?.contextModule),
		[askScope?.contextModule],
	)

	const hasConversation = turns.length > 0 || Boolean(pendingTurn)
	const reportCount = resolveAskEmptyReportCount(reports)

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
				subtitle={hasConversation ? undefined : askContextCopy.subtitle}
				leading={
					<FigmaHeaderIconButton
						onClick={() => setHistoryOpen(true)}
						ariaLabel="Open conversation history"
					>
						<Menu size={20} color={FC.dim} strokeWidth={1.8} />
					</FigmaHeaderIconButton>
				}
				actions={
					<div style={{ display: 'flex', gap: 8 }}>
						<AskConversationMenu
							hasConversation={hasConversation}
							onNewConversation={() => clearConversation()}
							onClearConversation={() => clearConversation()}
						/>
						{!consumerMode ? (
							<FigmaHeaderSearchButton
								onClick={() => navigate(ROUTES.search)}
							/>
						) : null}
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
					minHeight: 0,
					overflowY: 'auto',
					padding: hasConversation ? '8px 22px 24px' : '0 22px 20px',
					scrollbarWidth: 'none',
					WebkitOverflowScrolling: 'touch',
				}}
			>
				{!hasConversation ? (
					<AskPremiumEmptyState
						onSelectQuestion={send}
						consumerMode={consumerMode}
						reportCount={reportCount}
						headline={askContextCopy.emptyHeadline}
						healthSummary={
							consumerMode && healthContext ? healthContext.snapshot : undefined
						}
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
				onClearAll={() => {
					clearConversation()
				}}
			/>
		</div>
	)
}
