import type { ReactNode } from 'react'
import { C } from '@/constants/colors'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function PropertySectionLabel({ children }: { children: ReactNode }) {
	return (
		<div style={{ marginBottom: 12 }}>
			<FigmaHealthSectionLabel>{children}</FigmaHealthSectionLabel>
		</div>
	)
}

export function PropertyEmptyState({
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
				...figmaCardStyle,
				borderRadius: 24,
				padding: '28px 22px',
				textAlign: 'center',
			}}
		>
			<p style={{ fontSize: 36, margin: '0 0 12px' }}>{emoji}</p>
			<h2
				style={{
					color: FC.fg,
					fontSize: 20,
					fontWeight: 700,
					margin: '0 0 10px',
				}}
			>
				{title}
			</h2>
			<p
				style={{
					color: FC.dim,
					fontSize: 14,
					lineHeight: 1.55,
					margin: '0 0 18px',
				}}
			>
				{body}
			</p>
			<button
				type="button"
				onClick={onPrimary}
				style={{
					width: '100%',
					background: C.orange,
					color: '#fff',
					border: 'none',
					borderRadius: 18,
					padding: '14px 18px',
					fontSize: 14,
					fontWeight: 700,
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				{primaryLabel}
			</button>
			{secondaryLabel ? (
				<p style={{ color: FC.dim, fontSize: 12, margin: '12px 0 0' }}>
					{secondaryLabel}
				</p>
			) : null}
		</div>
	)
}

export function PropertyStatusHero({
	headline,
	subline,
}: {
	headline: string
	subline: string
}) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 24,
				padding: '22px 20px',
				marginBottom: 18,
				background: `linear-gradient(145deg, ${C.orange}18, ${C.orange}08)`,
				border: `1px solid ${C.orange}28`,
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 22,
					fontWeight: 700,
					margin: '0 0 8px',
					letterSpacing: -0.4,
				}}
			>
				{headline}
			</p>
			<p style={{ color: FC.dim, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
				{subline}
			</p>
		</div>
	)
}

export function PropertyCard({
	displayName,
	propertyTypeLabel,
	city,
	ownershipLabel,
	statusLabel,
	attentionCount,
	upcomingLabel,
	onClick,
}: {
	displayName: string
	propertyTypeLabel: string
	city: string | null
	ownershipLabel: string
	statusLabel: string
	attentionCount: number
	upcomingLabel?: string | null
	onClick: () => void
}) {
	const location = [propertyTypeLabel, city].filter(Boolean).join(' · ')

	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				...figmaCardStyle,
				width: '100%',
				borderRadius: 22,
				padding: '18px 18px',
				marginBottom: 12,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
				border:
					attentionCount > 0
						? `1px solid ${C.orange}40`
						: `1px solid ${FC.line}`,
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 18,
					fontWeight: 700,
					margin: '0 0 6px',
				}}
			>
				{displayName}
			</p>
			<p style={{ color: FC.dim, fontSize: 13, margin: '0 0 4px' }}>
				{location}
			</p>
			<p style={{ color: FC.mid, fontSize: 13, margin: '0 0 10px' }}>
				Ownership: {ownershipLabel}
			</p>
			<p
				style={{
					color: attentionCount > 0 ? C.orange : FC.green,
					fontSize: 13,
					fontWeight: 600,
					margin: 0,
				}}
			>
				Status: {statusLabel}
			</p>
			{upcomingLabel ? (
				<p
					style={{
						color: FC.dim,
						fontSize: 12,
						margin: '8px 0 0',
						lineHeight: 1.45,
					}}
				>
					{upcomingLabel}
				</p>
			) : null}
		</button>
	)
}

export function PropertyAttentionRow({
	headline,
	subline,
}: {
	headline: string
	subline: string
}) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 18,
				padding: '14px 16px',
				marginBottom: 10,
				border: `1px solid ${C.orange}28`,
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 14,
					fontWeight: 600,
					margin: '0 0 4px',
				}}
			>
				{headline}
			</p>
			<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>{subline}</p>
		</div>
	)
}

export function PropertyRecentRow({
	title,
	dateLabel,
	onClick,
}: {
	title: string
	dateLabel: string
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				...figmaCardStyle,
				width: '100%',
				borderRadius: 16,
				padding: '12px 14px',
				marginBottom: 8,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 14,
					fontWeight: 600,
					margin: '0 0 4px',
				}}
			>
				{title}
			</p>
			<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>{dateLabel}</p>
		</button>
	)
}

export function PropertyLinkButton({
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
				color: FC.blue,
				fontSize: 13,
				fontWeight: 700,
				cursor: 'pointer',
				fontFamily: 'inherit',
				padding: 0,
			}}
		>
			{label}
		</button>
	)
}

export function PropertyAskBlock({
	suggestions,
	onSelect,
}: {
	suggestions: string[]
	onSelect: (question: string) => void
}) {
	return (
		<div style={{ marginTop: 8 }}>
			<PropertySectionLabel>Ask about your property</PropertySectionLabel>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
				{suggestions.slice(0, 3).map((question) => (
					<button
						key={question}
						type="button"
						onClick={() => onSelect(question)}
						style={{
							background: `${FC.blue}14`,
							border: `1px solid ${FC.blue}30`,
							borderRadius: 100,
							padding: '8px 12px',
							color: FC.blue,
							fontSize: 12,
							fontWeight: 600,
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

export function PropertyDetailFactRow({
	label,
	value,
}: {
	label: string
	value: string
}) {
	return (
		<div style={{ marginBottom: 12 }}>
			<p style={{ color: FC.dim, fontSize: 12, margin: '0 0 4px' }}>{label}</p>
			<p style={{ color: FC.fg, fontSize: 14, margin: 0 }}>{value}</p>
		</div>
	)
}

export function PropertyCrossModuleLink({
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
				...figmaCardStyle,
				width: '100%',
				borderRadius: 16,
				padding: '12px 14px',
				marginBottom: 8,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<p style={{ color: FC.fg, fontSize: 14, fontWeight: 600, margin: 0 }}>
				{label}
			</p>
		</button>
	)
}

export function PropertyDocumentRow({
	title,
	typeLabel,
	dateLabel,
	onClick,
}: {
	title: string
	typeLabel: string
	dateLabel: string | null
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				...figmaCardStyle,
				width: '100%',
				borderRadius: 16,
				padding: '12px 14px',
				marginBottom: 8,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 14,
					fontWeight: 600,
					margin: '0 0 4px',
				}}
			>
				{title}
			</p>
			<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>
				{typeLabel}
				{dateLabel ? ` · ${dateLabel}` : ''}
			</p>
		</button>
	)
}

export function PropertyHistoryEventRow({
	title,
	dateLabel,
	onClick,
}: {
	title: string
	dateLabel: string
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				...figmaCardStyle,
				width: '100%',
				borderRadius: 16,
				padding: '12px 14px',
				marginBottom: 8,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 14,
					fontWeight: 600,
					margin: '0 0 4px',
				}}
			>
				{title}
			</p>
			<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>{dateLabel}</p>
		</button>
	)
}
