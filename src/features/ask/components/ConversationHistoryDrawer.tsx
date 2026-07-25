import { useMemo, useState, type CSSProperties } from 'react'
import { Check, MessageSquare, Pencil, Search, Trash2, X } from 'lucide-react'
import { C } from '@/constants/colors'
import {
	deleteAskSession,
	listAskSessions,
	renameAskSession,
	searchAskSessions,
	type AskSessionMeta,
} from '@/features/ask/services/ask-session.service'

interface ConversationHistoryDrawerProps {
	userId: string
	open: boolean
	activeSessionId: string | null
	onClose: () => void
	onSelectSession: (sessionId: string) => void
	onNewConversation: () => void
}

export function ConversationHistoryDrawer({
	userId,
	open,
	activeSessionId,
	onClose,
	onSelectSession,
	onNewConversation,
}: ConversationHistoryDrawerProps) {
	const [query, setQuery] = useState('')
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editTitle, setEditTitle] = useState('')
	const [refreshKey, setRefreshKey] = useState(0)

	const sessions = useMemo(() => {
		void refreshKey
		return query.trim()
			? searchAskSessions(userId, query)
			: listAskSessions(userId)
	}, [userId, query, refreshKey])

	if (!open) {
		return null
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
				aria-label="Conversation history"
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
						}}
					>
						<MessageSquare size={15} />
						New conversation
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
						<div
							style={{
								fontSize: 13,
								color: C.textMuted,
								textAlign: 'center',
								padding: '24px 12px',
							}}
						>
							{query.trim()
								? 'No conversations match your search.'
								: 'No conversations yet. Ask your first question!'}
						</div>
					) : (
						sessions.map((session) => (
							<SessionRow
								key={session.id}
								session={session}
								isActive={session.id === activeSessionId}
								isEditing={editingId === session.id}
								editTitle={editTitle}
								onEditTitleChange={setEditTitle}
								onStartEdit={() => {
									setEditingId(session.id)
									setEditTitle(session.title)
								}}
								onSaveEdit={() => {
									renameAskSession(session.id, editTitle)
									setEditingId(null)
									setRefreshKey((value) => value + 1)
								}}
								onCancelEdit={() => setEditingId(null)}
								onSelect={() => {
									onSelectSession(session.id)
									onClose()
								}}
								onDelete={() => {
									deleteAskSession(session.id)
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
	isEditing,
	editTitle,
	onEditTitleChange,
	onStartEdit,
	onSaveEdit,
	onCancelEdit,
	onSelect,
	onDelete,
}: {
	session: AskSessionMeta
	isActive: boolean
	isEditing: boolean
	editTitle: string
	onEditTitleChange: (value: string) => void
	onStartEdit: () => void
	onSaveEdit: () => void
	onCancelEdit: () => void
	onSelect: () => void
	onDelete: () => void
}) {
	return (
		<div
			style={{
				borderRadius: 12,
				border: `1px solid ${isActive ? `${C.accent}55` : C.border}`,
				background: isActive ? C.accentDim : C.card2,
				marginBottom: 6,
				overflow: 'hidden',
			}}
		>
			{isEditing ? (
				<div style={{ padding: '10px 12px' }}>
					<input
						value={editTitle}
						onChange={(event) => onEditTitleChange(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								onSaveEdit()
							}

							if (event.key === 'Escape') {
								onCancelEdit()
							}
						}}
						autoFocus
						style={{
							width: '100%',
							background: C.card,
							border: `1px solid ${C.border}`,
							borderRadius: 8,
							padding: '8px 10px',
							fontSize: 13,
							color: C.text,
							fontFamily: 'inherit',
							marginBottom: 8,
						}}
					/>
					<div style={{ display: 'flex', gap: 6 }}>
						<button
							type="button"
							onClick={onSaveEdit}
							style={iconButtonStyle}
							aria-label="Save title"
						>
							<Check size={14} color={C.greenAlt} />
						</button>
						<button
							type="button"
							onClick={onCancelEdit}
							style={iconButtonStyle}
							aria-label="Cancel edit"
						>
							<X size={14} color={C.textMuted} />
						</button>
					</div>
				</div>
			) : (
				<button
					type="button"
					onClick={onSelect}
					style={{
						width: '100%',
						textAlign: 'left',
						background: 'transparent',
						border: 'none',
						padding: '10px 12px',
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					<div
						style={{
							fontSize: 13,
							fontWeight: 600,
							color: C.text,
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
						{session.memberName ? ` · ${session.memberName}` : ''}
					</div>
				</button>
			)}

			{!isEditing ? (
				<div
					style={{
						display: 'flex',
						justifyContent: 'flex-end',
						gap: 4,
						padding: '0 8px 8px',
					}}
				>
					<button
						type="button"
						onClick={(event) => {
							event.stopPropagation()
							onStartEdit()
						}}
						style={iconButtonStyle}
						aria-label="Rename conversation"
					>
						<Pencil size={13} color={C.textMuted} />
					</button>
					<button
						type="button"
						onClick={(event) => {
							event.stopPropagation()
							onDelete()
						}}
						style={iconButtonStyle}
						aria-label="Delete conversation"
					>
						<Trash2 size={13} color={C.red} />
					</button>
				</div>
			) : null}
		</div>
	)
}

const iconButtonStyle: CSSProperties = {
	background: 'transparent',
	border: 'none',
	cursor: 'pointer',
	padding: 4,
	borderRadius: 6,
}
