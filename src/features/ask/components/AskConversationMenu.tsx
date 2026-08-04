import { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { FC } from '@/ui/figma/v2/atoms'

interface AskConversationMenuProps {
	hasConversation: boolean
	onNewConversation: () => void
	onClearConversation: () => void
}

interface MenuItem {
	id: string
	label: string
	onClick?: () => void
	disabled?: boolean
}

export function AskConversationMenu({
	hasConversation,
	onNewConversation,
	onClearConversation,
}: AskConversationMenuProps) {
	const [open, setOpen] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) {
			return
		}

		const handlePointerDown = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setOpen(false)
			}
		}

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setOpen(false)
			}
		}

		document.addEventListener('mousedown', handlePointerDown)
		document.addEventListener('keydown', handleEscape)

		return () => {
			document.removeEventListener('mousedown', handlePointerDown)
			document.removeEventListener('keydown', handleEscape)
		}
	}, [open])

	const items: MenuItem[] = [
		{
			id: 'new',
			label: 'New conversation',
			onClick: () => {
				onNewConversation()
				setOpen(false)
			},
		},
		{
			id: 'clear',
			label: 'Clear conversation',
			onClick: () => {
				onClearConversation()
				setOpen(false)
			},
			disabled: !hasConversation,
		},
		{
			id: 'rename',
			label: 'Rename conversation',
			disabled: true,
		},
		{
			id: 'delete',
			label: 'Delete conversation',
			disabled: true,
		},
		{
			id: 'export',
			label: 'Export conversation',
			disabled: true,
		},
		{
			id: 'pin',
			label: 'Pin conversation',
			disabled: true,
		},
	]

	return (
		<div ref={containerRef} style={{ position: 'relative' }}>
			<button
				type="button"
				aria-label="Conversation options"
				aria-expanded={open}
				aria-haspopup="menu"
				onClick={() => setOpen((value) => !value)}
				style={{
					width: 36,
					height: 36,
					borderRadius: 12,
					border: `1px solid ${FC.line}`,
					background: `${FC.bg}88`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				<MoreVertical size={16} color={FC.mid} />
			</button>

			{open ? (
				<div
					role="menu"
					style={{
						position: 'absolute',
						top: 'calc(100% + 6px)',
						right: 0,
						minWidth: 210,
						background: FC.surface,
						border: `1px solid ${FC.line}`,
						borderRadius: 14,
						padding: 6,
						boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
						zIndex: 40,
					}}
				>
					{items.map((item) => (
						<button
							key={item.id}
							type="button"
							role="menuitem"
							disabled={item.disabled}
							onClick={item.onClick}
							style={{
								width: '100%',
								textAlign: 'left',
								padding: '10px 12px',
								borderRadius: 10,
								border: 'none',
								background: 'transparent',
								color: item.disabled ? FC.dim : FC.fg,
								fontSize: 13,
								fontWeight: 500,
								cursor: item.disabled ? 'default' : 'pointer',
								fontFamily: 'inherit',
								opacity: item.disabled ? 0.45 : 1,
							}}
						>
							{item.label}
						</button>
					))}
				</div>
			) : null}
		</div>
	)
}
