import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, FileText, Sparkles } from 'lucide-react'
import { documentPath, ROUTES } from '@/constants/routes'
import type {
	ChronicleDocumentSummary,
	DocumentActivityItem,
	DocumentAiDiscoveryItem,
	DocumentAttentionItem,
	DocumentConsumerStatus,
} from '@/features/documents/types/document-intelligence.types'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function DocumentSectionLabel({ children }: { children: ReactNode }) {
	return (
		<span
			style={{
				color: 'rgba(255,255,255,0.28)',
				fontSize: 11,
				fontWeight: 600,
				letterSpacing: '0.09em',
				textTransform: 'uppercase',
			}}
		>
			{children}
		</span>
	)
}

export function DocumentAiBadge() {
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 4,
				background: 'rgba(59,130,246,0.12)',
				border: '1px solid rgba(59,130,246,0.22)',
				borderRadius: 100,
				padding: '3px 8px',
			}}
		>
			<Sparkles size={10} color={FC.blue} />
			<span style={{ color: FC.blue, fontSize: 10, fontWeight: 700 }}>AI</span>
		</span>
	)
}

export function DocumentFilterChip({
	label,
	active = false,
	onClick,
}: {
	label: string
	active?: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				background: active ? `${FC.blue}18` : FC.surface,
				border: `1px solid ${active ? `${FC.blue}35` : FC.line}`,
				borderRadius: 100,
				padding: '7px 12px',
				cursor: 'pointer',
				fontFamily: 'inherit',
				color: active ? FC.blue : FC.mid,
				fontSize: 12,
				fontWeight: 600,
				flexShrink: 0,
			}}
		>
			{label}
		</button>
	)
}

function statusColor(status: DocumentConsumerStatus): string {
	switch (status) {
		case 'Ready':
			return FC.green
		case 'Needs Help':
			return FC.orange
		case 'Still Organizing':
			return FC.amber
	}
}

export function DocumentStatusBadge({
	status,
}: {
	status: DocumentConsumerStatus
}) {
	const color = statusColor(status)

	return (
		<span
			style={{
				background: `${color}14`,
				border: `1px solid ${color}33`,
				borderRadius: 100,
				padding: '3px 8px',
				color,
				fontSize: 10,
				fontWeight: 700,
			}}
		>
			{status}
		</span>
	)
}

export function DocumentModuleChip({
	label,
	count,
	emoji,
	onClick,
}: {
	label: string
	count?: number
	emoji?: string
	onClick?: () => void
}) {
	const displayLabel =
		count != null
			? `${emoji ? `${emoji} ` : ''}${label} ${count}`
			: `${emoji ? `${emoji} ` : ''}${label}`

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={!onClick}
			style={{
				background: FC.ghost,
				border: `1px solid ${FC.line}`,
				borderRadius: 100,
				padding: '8px 12px',
				cursor: onClick ? 'pointer' : 'default',
				fontFamily: 'inherit',
				color: FC.mid,
				fontSize: 12,
				fontWeight: 600,
			}}
		>
			{displayLabel}
		</button>
	)
}

export function DocumentDiscoveryCard({
	item,
}: {
	item: DocumentAiDiscoveryItem
}) {
	const navigate = useNavigate()

	return (
		<button
			type="button"
			onClick={() => navigate(documentPath(item.documentId))}
			style={{
				...figmaCardStyle,
				borderRadius: 18,
				padding: '14px 16px',
				marginBottom: 10,
				width: '100%',
				textAlign: 'left',
				cursor: 'pointer',
				fontFamily: 'inherit',
				border: `1px solid ${FC.blue}22`,
				background: `${FC.blue}08`,
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					marginBottom: 6,
				}}
			>
				<DocumentAiBadge />
				<span style={{ color: FC.dim, fontSize: 11, fontWeight: 600 }}>
					{item.categoryLabel}
				</span>
			</div>
			<p
				style={{
					color: FC.fg,
					fontSize: 14,
					fontWeight: 600,
					margin: '0 0 4px',
				}}
			>
				{item.title}
			</p>
			<p style={{ color: FC.mid, fontSize: 12.5, margin: 0 }}>{item.label}</p>
		</button>
	)
}

export function DocumentSearchField({
	value,
	onChange,
	onSubmit,
	placeholder = 'Search documents, people, categories…',
}: {
	value: string
	onChange: (value: string) => void
	onSubmit?: () => void
	placeholder?: string
}) {
	return (
		<input
			value={value}
			onChange={(event) => onChange(event.target.value)}
			onKeyDown={(event) => {
				if (event.key === 'Enter') {
					onSubmit?.()
				}
			}}
			placeholder={placeholder}
			aria-label={placeholder}
			style={{
				width: '100%',
				boxSizing: 'border-box',
				background: FC.surface,
				border: `1px solid ${FC.line}`,
				borderRadius: 16,
				padding: '13px 16px',
				color: FC.fg,
				fontSize: 15,
				fontFamily: 'inherit',
				marginBottom: 18,
				outline: 'none',
			}}
		/>
	)
}

export function DocumentStatPill({
	value,
	label,
	accent = FC.blue,
}: {
	value: string
	label: string
	accent?: string
}) {
	return (
		<div
			style={{
				background: `${accent}10`,
				border: `1px solid ${accent}22`,
				borderRadius: 16,
				padding: '12px 14px',
				flex: 1,
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 22,
					fontWeight: 700,
					margin: '0 0 4px',
					letterSpacing: -0.8,
				}}
			>
				{value}
			</p>
			<p style={{ color: accent, fontSize: 11.5, fontWeight: 600, margin: 0 }}>
				{label}
			</p>
		</div>
	)
}

function attentionColor(item: DocumentAttentionItem): string {
	if (item.severity === 'high') return FC.orange
	if (item.severity === 'medium') return FC.amber
	return FC.blue
}

export function DocumentAttentionCard({
	item,
}: {
	item: DocumentAttentionItem
}) {
	const navigate = useNavigate()
	const color = attentionColor(item)

	return (
		<button
			type="button"
			onClick={() => navigate(documentPath(item.documentId))}
			style={{
				...figmaCardStyle,
				borderRadius: 18,
				padding: '16px 18px',
				marginBottom: 10,
				borderLeft: `3px solid ${color}`,
				width: '100%',
				textAlign: 'left',
				cursor: 'pointer',
				fontFamily: 'inherit',
				borderTop: 'none',
				borderRight: 'none',
				borderBottom: 'none',
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 14.5,
					fontWeight: 600,
					margin: '0 0 6px',
				}}
			>
				{item.title}
			</p>
			<p style={{ color: FC.mid, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
				{item.detail}
			</p>
		</button>
	)
}

export function DocumentSummaryCard({
	document,
	showActions = false,
}: {
	document: ChronicleDocumentSummary
	showActions?: boolean
}) {
	const navigate = useNavigate()
	const color = document.isExpired
		? FC.orange
		: document.isExpiringSoon
			? FC.amber
			: FC.blue

	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 20,
				padding: '16px 18px',
				marginBottom: 10,
			}}
		>
			<button
				type="button"
				onClick={() => navigate(documentPath(document.id))}
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					gap: 12,
					width: '100%',
					background: 'none',
					border: 'none',
					padding: 0,
					cursor: 'pointer',
					fontFamily: 'inherit',
					textAlign: 'left',
				}}
			>
				<div
					style={{
						width: 42,
						height: 42,
						borderRadius: 13,
						flexShrink: 0,
						background: `${color}12`,
						border: `1px solid ${color}22`,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 1,
					}}
				>
					<FileText size={14} color={color} strokeWidth={2} />
					<span style={{ color, fontSize: 8, fontWeight: 800 }}>
						{document.fileType}
					</span>
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							flexWrap: 'wrap',
							marginBottom: 4,
						}}
					>
						<p
							style={{ color: FC.fg, fontSize: 15, fontWeight: 600, margin: 0 }}
						>
							{document.title}
						</p>
						{document.hasAiSummary ? <DocumentAiBadge /> : null}
					</div>
					<p style={{ color: FC.mid, fontSize: 12.5, margin: '0 0 6px' }}>
						{document.categoryLabel}
						{document.subCategoryLabel ? ` · ${document.subCategoryLabel}` : ''}
						{' · '}
						{document.ownerLabel}
						{' · '}
						{document.sourceLabel}
					</p>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 6,
							flexWrap: 'wrap',
							marginBottom: 6,
						}}
					>
						<DocumentStatusBadge status={document.consumerStatus} />
						{document.relatedModules.slice(0, 2).map((module) => (
							<DocumentModuleChip key={module.moduleId} label={module.label} />
						))}
					</div>
					<p
						style={{
							color: FC.dim,
							fontSize: 12,
							margin: 0,
							lineHeight: 1.45,
							display: '-webkit-box',
							WebkitLineClamp: 2,
							WebkitBoxOrient: 'vertical',
							overflow: 'hidden',
						}}
					>
						{document.summary}
					</p>
				</div>
				<ChevronRight size={14} color={FC.dim} style={{ marginTop: 4 }} />
			</button>

			{showActions ? (
				<div
					style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}
				>
					<DocumentActionChip
						label="Summarize"
						onClick={() =>
							navigate(
								`${ROUTES.ask}?q=${encodeURIComponent(`Summarize ${document.title}`)}`,
							)
						}
					/>
					<DocumentActionChip
						label="Ask"
						onClick={() =>
							navigate(`${ROUTES.ask}?q=${encodeURIComponent(document.title)}`)
						}
					/>
				</div>
			) : null}
		</div>
	)
}

export function DocumentActivityRow({ item }: { item: DocumentActivityItem }) {
	const navigate = useNavigate()

	return (
		<button
			type="button"
			onClick={() => navigate(documentPath(item.documentId))}
			style={{
				display: 'flex',
				alignItems: 'flex-start',
				gap: 12,
				padding: '12px 0',
				width: '100%',
				background: 'none',
				border: 'none',
				borderBottom: `1px solid ${FC.line}`,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<div style={{ width: 52, flexShrink: 0 }}>
				<span style={{ color: FC.dim, fontSize: 11, fontWeight: 600 }}>
					{item.displayDate}
				</span>
			</div>
			<div style={{ flex: 1 }}>
				<p
					style={{
						color: FC.fg,
						fontSize: 14,
						fontWeight: 600,
						margin: '0 0 3px',
					}}
				>
					{item.title}
				</p>
				<p style={{ color: FC.mid, fontSize: 12.5, margin: 0 }}>
					{item.summary}
				</p>
			</div>
		</button>
	)
}

export function DocumentActionChip({
	label,
	onClick,
}: {
	label: string
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				background: FC.surface,
				border: `1px solid ${FC.line}`,
				borderRadius: 100,
				padding: '7px 12px',
				cursor: 'pointer',
				fontFamily: 'inherit',
				color: FC.mid,
				fontSize: 12,
				fontWeight: 600,
			}}
		>
			{label}
		</button>
	)
}
