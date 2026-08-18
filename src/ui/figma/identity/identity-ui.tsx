import { ChevronRight, Eye, EyeOff, MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import type {
	IdentityAttentionItem,
	IdentityDocumentRecord,
	IdentityMemberWallet,
} from '@/features/identity-knowledge/types/identity-knowledge.types'
import { buildIdentityStatusLabel } from '@/features/identity-knowledge/services/identity-summary.service'
import { C } from '@/constants/colors'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function IdentitySectionLabel({ children }: { children: ReactNode }) {
	return (
		<div style={{ marginBottom: 12 }}>
			<FigmaHealthSectionLabel>{children}</FigmaHealthSectionLabel>
		</div>
	)
}

export function IdentityStatusHero({
	headline,
	subline,
}: {
	headline: string
	subline: string | null
}) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 24,
				padding: '22px 20px',
				marginBottom: 22,
				background: `linear-gradient(145deg, ${C.accentBlue}18, ${C.accentBlue}08)`,
				border: `1px solid ${C.accentBlue}28`,
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 18,
					fontWeight: 700,
					margin: '0 0 6px',
					letterSpacing: -0.3,
					lineHeight: 1.35,
				}}
			>
				{headline}
			</p>
			{subline ? (
				<p style={{ color: FC.dim, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
					{subline}
				</p>
			) : null}
		</div>
	)
}

export function IdentityAttentionCard({
	item,
	onClick,
}: {
	item: IdentityAttentionItem
	onClick: () => void
}) {
	const color = item.tone === 'expired' ? FC.red : FC.amber

	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				width: '100%',
				...figmaCardStyle,
				borderRadius: 18,
				padding: '14px 16px',
				marginBottom: 10,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 12,
				cursor: 'pointer',
				border: `1px solid ${color}30`,
				background: `linear-gradient(145deg, ${color}12, transparent)`,
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<div style={{ minWidth: 0 }}>
				<p
					style={{
						color: FC.fg,
						fontSize: 14,
						fontWeight: 600,
						margin: '0 0 4px',
					}}
				>
					{item.headline}
				</p>
				<p style={{ color, fontSize: 12, margin: 0 }}>{item.subline}</p>
			</div>
			<ChevronRight size={16} color={FC.mid} />
		</button>
	)
}

export function IdentityWalletCard({
	wallet,
	onClick,
}: {
	wallet: IdentityMemberWallet
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				width: '100%',
				...figmaCardStyle,
				borderRadius: 22,
				padding: '18px 18px 16px',
				marginBottom: 10,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 12,
					marginBottom: 14,
				}}
			>
				<div
					style={{
						width: 40,
						height: 40,
						borderRadius: 14,
						background: `${C.accentBlue}18`,
						border: `1px solid ${C.accentBlue}28`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: C.accentBlue,
						fontWeight: 700,
						fontSize: 15,
					}}
				>
					{wallet.avatarInitial}
				</div>
				<p
					style={{
						color: FC.fg,
						fontSize: 16,
						fontWeight: 700,
						margin: 0,
					}}
				>
					{wallet.memberName}
				</p>
			</div>

			{wallet.primaryChips.length > 0 ? (
				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: 8,
						marginBottom: wallet.overflowLabel ? 10 : 0,
					}}
				>
					{wallet.primaryChips.map((chip) => (
						<span
							key={chip.typeId}
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 4,
								padding: '5px 10px',
								borderRadius: 999,
								background: 'rgba(255,255,255,0.04)',
								border: `1px solid ${FC.line}`,
								color: FC.fg,
								fontSize: 12,
								fontWeight: 600,
							}}
						>
							{chip.label}
							{chip.statusLine ? (
								<span style={{ color: FC.dim, fontWeight: 500 }}>
									· {chip.statusLine}
								</span>
							) : (
								<span style={{ color: FC.green }}>✓</span>
							)}
						</span>
					))}
				</div>
			) : (
				<p style={{ color: FC.dim, fontSize: 13, margin: 0 }}>
					No identity documents yet
				</p>
			)}

			{wallet.overflowLabel ? (
				<p style={{ color: FC.mid, fontSize: 12, margin: 0 }}>
					{wallet.overflowLabel}
				</p>
			) : null}
		</button>
	)
}

export function IdentityAskBlock({
	suggestions,
	onSelect,
}: {
	suggestions: string[]
	onSelect: (question: string) => void
}) {
	return (
		<div style={{ marginTop: 8, marginBottom: 18 }}>
			<IdentitySectionLabel>Ask Chronicle</IdentitySectionLabel>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				{suggestions.map((question) => (
					<button
						key={question}
						type="button"
						onClick={() => onSelect(question)}
						style={{
							...figmaCardStyle,
							borderRadius: 16,
							padding: '14px 16px',
							color: FC.fg,
							fontSize: 13,
							fontWeight: 500,
							textAlign: 'left',
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						{question}
					</button>
				))}
			</div>
		</div>
	)
}

export function IdentityLibraryLink({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				background: 'none',
				border: 'none',
				padding: 0,
				color: C.accentBlue,
				fontSize: 13,
				fontWeight: 600,
				cursor: 'pointer',
				fontFamily: 'inherit',
			}}
		>
			Browse all identity documents in Library →
		</button>
	)
}

export function IdentityDocumentCard({
	document,
	onClick,
}: {
	document: IdentityDocumentRecord
	onClick: () => void
}) {
	const statusColor =
		document.status === 'expired'
			? FC.red
			: document.status === 'expires_soon'
				? FC.amber
				: FC.dim

	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				width: '100%',
				...figmaCardStyle,
				borderRadius: 20,
				padding: '16px 18px',
				marginBottom: 10,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 12,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<div style={{ minWidth: 0 }}>
				<p
					style={{
						color: FC.fg,
						fontSize: 15,
						fontWeight: 700,
						margin: '0 0 4px',
					}}
				>
					{document.typeLabel}
				</p>
				<p style={{ color: statusColor, fontSize: 12, margin: 0 }}>
					{buildIdentityStatusLabel(document)}
				</p>
			</div>
			<ChevronRight size={16} color={FC.mid} />
		</button>
	)
}

export function IdentityCompactRow({
	label,
	value,
}: {
	label: string
	value: string
}) {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				gap: 16,
				padding: '10px 0',
				borderBottom: `1px solid ${FC.line}`,
			}}
		>
			<span style={{ color: FC.mid, fontSize: 13 }}>{label}</span>
			<span
				style={{
					color: FC.fg,
					fontSize: 13,
					fontWeight: 600,
					textAlign: 'right',
				}}
			>
				{value}
			</span>
		</div>
	)
}

export function IdentityDetailField({
	label,
	value,
	revealed,
	onToggleReveal,
}: {
	label: string
	value: string | null
	revealed?: boolean
	onToggleReveal?: () => void
}) {
	if (!value) {
		return null
	}

	const isSensitive = label.toLowerCase().includes('number')
	const displayValue =
		isSensitive && !revealed
			? value.replace(/[^\s•]/g, (char) => (char === '•' ? char : '•'))
			: value

	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				gap: 16,
				padding: '11px 0',
				borderBottom: `1px solid ${FC.line}`,
			}}
		>
			<span style={{ color: FC.mid, fontSize: 13 }}>{label}</span>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
				<span
					style={{
						color: FC.fg,
						fontSize: 13,
						fontWeight: 600,
						textAlign: 'right',
					}}
				>
					{displayValue}
				</span>
				{isSensitive && onToggleReveal ? (
					<button
						type="button"
						onClick={onToggleReveal}
						style={{
							background: 'none',
							border: 'none',
							padding: 4,
							cursor: 'pointer',
							color: FC.mid,
						}}
						aria-label={revealed ? 'Hide value' : 'Show value'}
					>
						{revealed ? <EyeOff size={15} /> : <Eye size={15} />}
					</button>
				) : null}
			</div>
		</div>
	)
}

export function IdentityStatusPill({ label }: { label: string }) {
	return (
		<div
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				padding: '6px 12px',
				borderRadius: 999,
				background: `${C.accentBlue}18`,
				border: `1px solid ${C.accentBlue}30`,
				color: C.accentBlue,
				fontSize: 12,
				fontWeight: 700,
				marginBottom: 18,
			}}
		>
			{label}
		</div>
	)
}

export function IdentityOriginalDocumentBlock({
	fileName,
	onView,
	thumbnailUrl,
}: {
	fileName: string
	onView: () => void
	thumbnailUrl?: string | null
}) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 20,
				padding: 16,
				display: 'flex',
				alignItems: 'center',
				gap: 14,
			}}
		>
			<div
				style={{
					width: 52,
					height: 64,
					borderRadius: 10,
					background: 'rgba(255,255,255,0.05)',
					border: `1px solid ${FC.line}`,
					overflow: 'hidden',
					flexShrink: 0,
				}}
			>
				{thumbnailUrl ? (
					<img
						src={thumbnailUrl}
						alt=""
						style={{ width: '100%', height: '100%', objectFit: 'cover' }}
					/>
				) : null}
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<p
					style={{
						color: FC.fg,
						fontSize: 14,
						fontWeight: 600,
						margin: '0 0 4px',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{fileName}
				</p>
				<button
					type="button"
					onClick={onView}
					style={{
						background: 'none',
						border: 'none',
						padding: 0,
						color: C.accentBlue,
						fontSize: 13,
						fontWeight: 600,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					View
				</button>
			</div>
		</div>
	)
}

export function IdentitySecondaryMenu({
	onMarkPrevious,
	onMarkCurrent,
	onOpenLibrary,
}: {
	onMarkPrevious?: () => void
	onMarkCurrent?: () => void
	onOpenLibrary: () => void
}) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 18,
				padding: '8px 0',
				marginTop: 16,
			}}
		>
			{onMarkPrevious ? (
				<IdentityMenuRow
					label="Mark as previous version"
					onClick={onMarkPrevious}
				/>
			) : null}
			{onMarkCurrent ? (
				<IdentityMenuRow label="Mark as current" onClick={onMarkCurrent} />
			) : null}
			<IdentityMenuRow label="Open in Library" onClick={onOpenLibrary} />
		</div>
	)
}

function IdentityMenuRow({
	label,
	onClick,
	muted,
}: {
	label: string
	onClick: () => void
	muted?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				width: '100%',
				background: 'none',
				border: 'none',
				padding: '12px 18px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				color: muted ? FC.mid : FC.fg,
				fontSize: 14,
				cursor: muted ? 'default' : 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			{label}
			{!muted ? <MoreHorizontal size={16} color={FC.mid} /> : null}
		</button>
	)
}

export function IdentityEmptyState({
	emoji,
	title,
	body,
	primaryLabel,
	onPrimary,
	secondaryLabel,
}: {
	emoji: string
	title: string
	body: string
	primaryLabel: string
	onPrimary: () => void
	secondaryLabel?: string
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				textAlign: 'center',
				padding: '48px 12px 24px',
			}}
		>
			<div style={{ fontSize: 48, marginBottom: 16 }}>{emoji}</div>
			<h2
				style={{
					color: FC.fg,
					fontSize: 22,
					fontWeight: 700,
					margin: '0 0 10px',
					letterSpacing: -0.4,
				}}
			>
				{title}
			</h2>
			<p
				style={{
					color: FC.dim,
					fontSize: 14,
					lineHeight: 1.55,
					margin: '0 0 24px',
					maxWidth: 320,
				}}
			>
				{body}
			</p>
			<button
				type="button"
				onClick={onPrimary}
				style={{
					background: C.accentBlue,
					color: '#fff',
					border: 'none',
					borderRadius: 18,
					padding: '14px 22px',
					fontSize: 14,
					fontWeight: 700,
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				{primaryLabel}
			</button>
			{secondaryLabel ? (
				<p style={{ color: FC.mid, fontSize: 12, marginTop: 14 }}>
					{secondaryLabel}
				</p>
			) : null}
		</div>
	)
}

export function IdentityHomeSkeleton() {
	return (
		<div style={{ paddingBottom: 24 }}>
			<div
				style={{
					...figmaCardStyle,
					borderRadius: 24,
					height: 96,
					marginBottom: 22,
					background: 'rgba(255,255,255,0.04)',
				}}
			/>
			<div
				style={{
					...figmaCardStyle,
					borderRadius: 22,
					height: 132,
					marginBottom: 10,
					background: 'rgba(255,255,255,0.04)',
				}}
			/>
			<div
				style={{
					...figmaCardStyle,
					borderRadius: 22,
					height: 132,
					background: 'rgba(255,255,255,0.04)',
				}}
			/>
		</div>
	)
}

export function IdentityBackLink({
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
				background: 'none',
				border: 'none',
				padding: 0,
				marginBottom: 10,
				color: FC.mid,
				fontSize: 12,
				fontWeight: 600,
				cursor: 'pointer',
				fontFamily: 'inherit',
			}}
		>
			← {label}
		</button>
	)
}
