import { useMemo, useState } from 'react'
import { MessageSquare, Search, Trash2, X } from 'lucide-react'
import { C } from '@/constants/colors'
import type { AskSessionMeta } from '@/features/ask/services/ask-session.service'
import {
	deleteInsuranceAskSession,
	listInsuranceAskSessions,
	searchInsuranceAskSessions,
} from '@/features/insurance/services/insurance-ask-session.service'

interface InsuranceConversationHistoryDrawerProps {
	userId: string
	open: boolean
	activeSessionId: string | null
	onClose: () => void
	onSelectSession: (sessionId: string) => void
	onNewConversation: () => void
	onClearAll?: () => void
}

function formatSessionDate(iso: string): string {
	const parsed = Date.parse(iso)

	if (Number.isNaN(parsed)) {
		return ''
	}

	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
	})
}

export function InsuranceConversationHistoryDrawer({
	userId,
	open,
	activeSessionId,
	onClose,
	onSelectSession,
	onNewConversation,
	onClearAll,
}: InsuranceConversationHistoryDrawerProps) {
	const [query, setQuery] = useState('')
	const [refreshKey, setRefreshKey] = useState(0)
	const [clearConfirm, setClearConfirm] = useState(false)

	const sessions = useMemo(() => {
		void refreshKey
		return query.trim()
			? searchInsuranceAskSessions(userId, query)
			: listInsuranceAskSessions(userId)
	}, [userId, query, refreshKey])

	if (!open) {
		return null
	}

	const handleClearAll = () => {
		if (!clearConfirm) {
			setClearConfirm(true)
			return
		}

		for (const session of listInsuranceAskSessions(userId)) {
			deleteInsuranceAskSession(session.id)
		}

		setClearConfirm(false)
		setRefreshKey((value) => value + 1)
		onClearAll?.()
		onNewConversation()
	}

	return (
		<>
			<button
				type="button"
				aria-label="Close conversation history"
				onClick={onClose}
				style={{
					position: 'fixed',
					inset: 0,
					background: 'rgba(0,0,0,0.55)',
					border: 'none',
					zIndex: 40,
					cursor: 'pointer',
				}}
			/>
			<aside
				role="dialog"
				aria-label="Insurance conversation history"
				style={{
					position: 'fixed',
					top: 0,
					left: 0,
					bottom: 0,
					width: 'min(340px, 88vw)',
					background: C.card,
					borderRight: `1px solid ${C.border}`,
					zIndex: 41,
					display: 'flex',
					flexDirection: 'column',
					paddingTop: 'env(safe-area-inset-top, 0px)',
				}}
			>
				<div
					style={{
						padding: '16px 16px 12px',
						borderBottom: `1px solid ${C.border}`,
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							marginBottom: 12,
						}}
					>
						<div style={{ fontSize: 16, fontWeight: 700 }}>Conversations</div>
						<button
							type="button"
							onClick={onClose}
							aria-label="Close"
							style={{
								background: 'transparent',
								border: 'none',
								cursor: 'pointer',
								padding: 4,
							}}
						>
							<X size={18} color={C.textMuted} />
						</button>
					</div>

					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							background: C.card2,
							border: `1px solid ${C.border}`,
							borderRadius: 12,
							padding: '8px 10px',
							marginBottom: 10,
						}}
					>
						<Search size={15} color={C.textMuted} />
						<input
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search conversations…"
							aria-label="Search conversations"
							style={{
								flex: 1,
								background: 'transparent',
								border: 'none',
								outline: 'none',
								fontSize: 13,
								color: C.text,
								fontFamily: 'inherit',
							}}
						/>
					</div>

					<button
						type="button"
						onClick={() => {
							onNewConversation()
							onClose()
						}}
						style={{
							width: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 6,
							padding: '10px 12px',
							borderRadius: 12,
							border: `1px solid ${C.border}`,
							background: C.accentDim,
							color: C.accent,
							fontSize: 13,
							fontWeight: 700,
							cursor: 'pointer',
							fontFamily: 'inherit',
							marginBottom: 8,
						}}
					>
						<MessageSquare size={15} />
						New conversation
					</button>

					<button
						type="button"
						onClick={handleClearAll}
						style={{
							width: '100%',
							fontSize: 11,
							fontWeight: 600,
							color: clearConfirm ? C.red : C.textMuted,
							background: clearConfirm ? `${C.red}12` : 'transparent',
							border: `1px solid ${clearConfirm ? `${C.red}44` : C.border}`,
							borderRadius: 8,
							padding: '6px 8px',
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						{clearConfirm ? 'Confirm clear all' : 'Clear all conversations'}
					</button>
				</div>

				<div
					style={{
						flex: 1,
						overflowY: 'auto',
						padding: '8px 10px 16px',
					}}
				>
					{sessions.length === 0 ? (
						<p
							style={{
								color: C.textMuted,
								fontSize: 13,
								textAlign: 'center',
								padding: '24px 12px',
							}}
						>
							{query.trim()
								? 'No conversations match your search.'
								: 'No conversations yet.'}
						</p>
					) : (
						sessions.map((session) => (
							<SessionRow
								key={session.id}
								session={session}
								isActive={session.id === activeSessionId}
								onSelect={() => {
									onSelectSession(session.id)
									onClose()
								}}
								onDelete={() => {
									deleteInsuranceAskSession(session.id)
									setRefreshKey((value) => value + 1)
								}}
							/>
						))
					)}
				</div>
			</aside>
		</>
	)
}

function SessionRow({
	session,
	isActive,
	onSelect,
	onDelete,
}: {
	session: AskSessionMeta
	isActive: boolean
	onSelect: () => void
	onDelete: () => void
}) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'stretch',
				gap: 4,
				marginBottom: 6,
			}}
		>
			<button
				type="button"
				onClick={onSelect}
				style={{
					flex: 1,
					textAlign: 'left',
					background: isActive ? C.accentDim : C.card2,
					border: `1px solid ${isActive ? `${C.accent}44` : C.border}`,
					borderRadius: 12,
					padding: '10px 12px',
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				<div
					style={{
						fontSize: 13,
						fontWeight: 700,
						color: isActive ? C.accent : C.text,
						marginBottom: 4,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{session.title}
				</div>
				<div
					style={{
						fontSize: 11,
						color: C.textMuted,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{session.preview || `${session.turnCount} messages`}
				</div>
				<div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
					{formatSessionDate(session.updatedAt)}
				</div>
			</button>
			<button
				type="button"
				onClick={onDelete}
				aria-label="Delete conversation"
				style={{
					background: 'transparent',
					border: `1px solid ${C.border}`,
					borderRadius: 12,
					padding: '0 10px',
					cursor: 'pointer',
				}}
			>
				<Trash2 size={14} color={C.textMuted} />
			</button>
		</div>
	)
}
